const Payslip = require('../models/Payslip');
const SalaryConfig = require('../models/SalaryConfig');
const AllowanceDeductionMaster = require('../models/AllowanceDeductionMaster');
const { NotFoundError, ConflictError } = require('../utils/errors');
const logger = require('../utils/logger');

const payslipService = {
  getPayslips: async ({ page, limit, filters }) => {
    const query = {};
    if (filters.employeeId) query.employeeId = filters.employeeId;
    if (filters.month) query.month = filters.month;
    if (filters.year) query.year = filters.year;
    if (filters.status) query.status = filters.status;

    const [payslips, total] = await Promise.all([
      Payslip.find(query)
        .populate('employeeId', 'personalInfo employment')
        .sort({ year: -1, month: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Payslip.countDocuments(query),
    ]);

    return { payslips, total };
  },

  getPayslipById: async (id) => {
    const payslip = await Payslip.findById(id)
      .populate('employeeId', 'personalInfo employment')
      .populate('salaryConfigId')
      .lean();
    if (!payslip) {
      throw new NotFoundError('Payslip not found');
    }
    return payslip;
  },

  generatePayslip: async (data) => {
    const { employeeId, month, year, daysWorked, totalDays, lopDays } = data;

    // Check if payslip already exists
    const existing = await Payslip.findOne({ employeeId, month, year });
    if (existing) {
      throw new ConflictError('Payslip already exists for this month and year');
    }

    // Get active salary config
    const salaryConfig = await SalaryConfig.findOne({ 
      employeeId, 
      isActive: true,
      effectiveFrom: { $lte: new Date(year, month - 1, totalDays) }
    }).populate('items.masterId');

    if (!salaryConfig) {
      throw new NotFoundError('No active salary configuration found for this employee');
    }

    const items = [];
    let grossEarnings = 0;
    let totalDeductions = 0;
    let basicComponentValue = 0;

    // Fallback for monthlyCTC (handling legacy records)
    const baseAmount = Number(salaryConfig.monthlyCTC || salaryConfig.basicSalary || 0);
    const safeTotalDays = Number(totalDays) || 30;
    const safeDaysWorked = Number(daysWorked) || 0;

    // Pro-rata Monthly CTC for reference
    const adjustedCTC = (baseAmount / safeTotalDays) * safeDaysWorked;
    
    // First Pass: Calculate all components based on CTC or FIXED
    const processedItems = [];
    for (const item of salaryConfig.items) {
      if (!item.isActive) continue;
      const master = item.masterId;
      if (!master || master.isBalancing) continue;

      let amount = item.overrideValue !== null ? Number(item.overrideValue) : Number(master.value || 0);

      // We only handle CTC based or fixed in first pass
      if ((master.calculationType === 'PERCENTAGE' || master.calculationType === 'SLAB') && (master.percentageOf === 'BASIC' || master.percentageOf === 'GROSS')) {
        processedItems.push(item); // Save for later passes
        continue;
      }

      if (master.calculationType === 'PERCENTAGE') {
        amount = (baseAmount * amount) / 100;
      }

      // Pro-rata adjustment
      const finalAmount = (amount / safeTotalDays) * safeDaysWorked;

      if (master.code === 'BASIC') {
        basicComponentValue = amount; // Use raw monthly basic for other dependencies
      }

      items.push({
        masterId: master._id,
        name: master.name,
        code: master.code,
        type: master.type,
        amount: Math.round(finalAmount * 100) / 100,
        isManualOverride: false
      });

      if (master.type === 'ALLOWANCE') grossEarnings += finalAmount;
      else totalDeductions += finalAmount;
    }

    // Second Pass: Calculate components based on BASIC
    for (const item of processedItems) {
      const master = item.masterId;
      let amount = item.overrideValue !== null ? Number(item.overrideValue) : Number(master.value || 0);

      if (master.calculationType === 'PERCENTAGE' && master.percentageOf === 'BASIC') {
        amount = (basicComponentValue * amount) / 100;
      }

      const finalAmount = (amount / safeTotalDays) * safeDaysWorked;

      items.push({
        masterId: master._id,
        name: master.name,
        code: master.code,
        type: master.type,
        amount: Math.round(finalAmount * 100) / 100,
        isManualOverride: false
      });

      if (master.type === 'ALLOWANCE') grossEarnings += finalAmount;
      else totalDeductions += finalAmount;
    }

    // Third Pass: Balancing Components (CTC Remainder)
    for (const item of salaryConfig.items) {
      if (!item.isActive) continue;
      const master = item.masterId;
      if (!master || !master.isBalancing) continue;

      // Balancing allowance = Adjusted CTC - Current Gross Earnings
      const balancingAmount = Math.max(0, adjustedCTC - grossEarnings);

      items.push({
        masterId: master._id,
        name: master.name,
        code: master.code,
        type: master.type,
        amount: Math.round(balancingAmount * 100) / 100,
        isManualOverride: false
      });

      if (master.type === 'ALLOWANCE') grossEarnings += balancingAmount;
      else totalDeductions += balancingAmount;
    }

    // Fourth Pass: Calculate components based on GROSS (finalized earnings)
    for (const item of salaryConfig.items) {
      if (!item.isActive) continue;
      const master = item.masterId;
      if (!master || master.isBalancing) continue; // Balancing handled in Pass 3

      if (master.calculationType === 'PERCENTAGE' && master.percentageOf === 'GROSS') {
        const amount = (grossEarnings * master.value) / 100;
        
        items.push({
          masterId: master._id,
          name: master.name,
          code: master.code,
          type: master.type,
          amount: Math.round(amount * 100) / 100,
          isManualOverride: false
        });

        if (master.type === 'ALLOWANCE') grossEarnings += amount;
        else totalDeductions += amount;
      } 
      else if (master.calculationType === 'SLAB') {
        // Slab calculations are typically based on GROSS for things like PTax
        const baseForSlab = master.percentageOf === 'BASIC' ? basicComponentValue : 
                           master.percentageOf === 'GROSS' ? grossEarnings : baseAmount;
        
        const slab = (master.slabs || []).find(s => 
          baseForSlab >= s.minAmount && (!s.maxAmount || baseForSlab <= s.maxAmount)
        );
        
        const amount = slab ? slab.fixedAmount : 0;

        items.push({
          masterId: master._id,
          name: master.name,
          code: master.code,
          type: master.type,
          amount: Math.round(amount * 100) / 100,
          isManualOverride: false
        });

        if (master.type === 'ALLOWANCE') grossEarnings += amount;
        else totalDeductions += amount;
      }
    }

    const netPay = grossEarnings - totalDeductions;

    const payslip = await Payslip.create({
      employeeId,
      salaryConfigId: salaryConfig._id,
      month,
      year,
      monthlyCTC: Math.round(adjustedCTC * 100) / 100,
      items,
      grossEarnings: Math.round(grossEarnings * 100) / 100,
      totalDeductions: Math.round(totalDeductions * 100) / 100,
      netPay: Math.round(netPay * 100) / 100,
      totalDays,
      daysWorked,
      lopDays,
      status: 'DRAFT',
      generatedBy: data.requestedBy
    });

    logger.info(`Payslip generated for employee: ${employeeId}, Month: ${month}, Year: ${year}`);
    return payslip;
  },

  updatePayslipStatus: async (id, status, finalizedBy) => {
    const updateData = { status, updatedAt: new Date() };
    if (status === 'FINALIZED') {
      updateData.finalizedBy = finalizedBy;
      updateData.finalizedAt = new Date();
    }

    const payslip = await Payslip.findByIdAndUpdate(id, updateData, { new: true });
    if (!payslip) {
      throw new NotFoundError('Payslip not found');
    }

    logger.info(`Payslip status updated: ${id} to ${status}`);
    return payslip;
  },

  deletePayslip: async (id) => {
    const payslip = await Payslip.findByIdAndDelete(id);
    if (!payslip) {
      throw new NotFoundError('Payslip not found');
    }
    logger.info(`Payslip deleted: ${id}`);
    return payslip;
  }
};

module.exports = payslipService;
