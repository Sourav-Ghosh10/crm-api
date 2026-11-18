const Payslip = require('../models/Payslip');
const SalaryConfig = require('../models/SalaryConfig');
const AllowanceDeductionMaster = require('../models/AllowanceDeductionMaster');
const User = require('../models/User');
const emailService = require('./emailService');
const { generatePayslipPDF } = require('../utils/pdfGenerator');
const { NotFoundError, ConflictError } = require('../utils/errors');
const logger = require('../utils/logger');

const hasNumericOverride = (val) => val !== null && val !== undefined && val !== '' && !isNaN(Number(val));

const isBasicComponent = (master) => {
  const code = String(master?.code || '').trim().toUpperCase();
  const name = String(master?.name || '').trim().toLowerCase();
  return code === 'BASIC' || name === 'basic' || name === 'basic salary';
};

const calculatePayslipComponents = (salaryConfig, totalDays, daysWorked, manualOverrides = {}, additionalEarnings = []) => {
  const items = [];
  let grossEarnings = 0;
  let totalDeductions = 0;
  let basicComponentValue = 0;

  const baseAmount = Number(salaryConfig.monthlyCTC || salaryConfig.basicSalary || 0);
  const safeTotalDays = Number(totalDays) || 30;
  const safeDaysWorked = Number(daysWorked) || 0;
  const prorationRatio = safeDaysWorked / safeTotalDays;

  const adjustedCTC = baseAmount * prorationRatio;
  const activeItems = (salaryConfig.items || []).filter((item) => item.isActive && item.masterId);

  // Track which masterIds have already been calculated
  const resolvedIds = new Set();
  const orderMap = new Map();
  activeItems.forEach((item, idx) => {
    const mId = String(item.masterId._id);
    orderMap.set(mId, item.masterId.displayOrder ?? idx);
  });

  const recordItem = (master, rawFinalAmount, isManualOverride) => {
    let finalAmount = rawFinalAmount;
    let overridden = isManualOverride;

    const mId = String(master._id);
    if (hasNumericOverride(manualOverrides[mId])) {
      finalAmount = Number(manualOverrides[mId]);
      overridden = true;
    }

    const rounded = Math.round(finalAmount * 100) / 100;
    items.push({
      masterId: master._id,
      name: master.name,
      code: master.code,
      type: master.type,
      amount: rounded,
      isManualOverride: overridden,
    });

    if (master.type === 'ALLOWANCE') grossEarnings += rounded;
    else totalDeductions += rounded;

    resolvedIds.add(mId);
  };

  // Pass 1: Explicit Override Values (₹), FIXED components, PERCENTAGE of CTC, and Basic Salary
  // Basic Salary MUST be resolved in Pass 1 so BASIC-dependent components in Pass 2 always have the right base.
  for (const item of activeItems) {
    const master = item.masterId;
    const mId = String(master._id);
    const hasOverride = hasNumericOverride(item.overrideValue);

    if (hasOverride) {
      const monthlyAmount = Number(item.overrideValue);
      if (isBasicComponent(master)) {
        basicComponentValue = monthlyAmount;
      }
      recordItem(master, monthlyAmount * prorationRatio, true);
      continue;
    }

    if (master.isBalancing) continue;

    const isBasic = isBasicComponent(master);
    const isFixed = master.calculationType === 'FIXED';
    const isPctOfCtc = master.calculationType === 'PERCENTAGE' && (!master.percentageOf || master.percentageOf === 'CTC');

    if (isBasic || isFixed || isPctOfCtc) {
      let monthlyAmount = Number(master.value || 0);
      if (master.calculationType === 'PERCENTAGE') {
        monthlyAmount = (baseAmount * monthlyAmount) / 100;
      }

      if (isBasic) {
        basicComponentValue = monthlyAmount;
      }

      recordItem(master, monthlyAmount * prorationRatio, false);
    }
  }

  // Pass 2: Un-overridden components calculated as PERCENTAGE of BASIC
  for (const item of activeItems) {
    const master = item.masterId;
    const mId = String(master._id);
    if (resolvedIds.has(mId) || master.isBalancing) continue;

    if (master.calculationType === 'PERCENTAGE' && master.percentageOf === 'BASIC') {
      const monthlyAmount = (basicComponentValue * Number(master.value || 0)) / 100;
      recordItem(master, monthlyAmount * prorationRatio, false);
    }
  }

  // Pass 3: Un-overridden Balancing Components (CTC Remainder)
  for (const item of activeItems) {
    const master = item.masterId;
    const mId = String(master._id);
    if (resolvedIds.has(mId) || !master.isBalancing) continue;

    const balancingAmount = Math.max(0, adjustedCTC - grossEarnings);
    recordItem(master, balancingAmount, false);
  }

  // Pass 4: Un-overridden components based on GROSS (finalized earnings) and SLAB
  for (const item of activeItems) {
    const master = item.masterId;
    const mId = String(master._id);
    if (resolvedIds.has(mId)) continue;

    if (master.calculationType === 'PERCENTAGE' && master.percentageOf === 'GROSS') {
      const amount = (grossEarnings * Number(master.value || 0)) / 100;
      recordItem(master, amount, false);
    } else if (master.calculationType === 'SLAB') {
      const baseForSlab =
        master.percentageOf === 'BASIC'
          ? basicComponentValue * prorationRatio
          : master.percentageOf === 'GROSS'
            ? grossEarnings
            : adjustedCTC;

      const slab = (master.slabs || []).find(
        (s) => baseForSlab >= s.minAmount && (!s.maxAmount || baseForSlab <= s.maxAmount)
      );

      const amount = slab ? Number(slab.fixedAmount || 0) : 0;
      recordItem(master, amount, false);
    }
  }

  // Keep items in their displayOrder / config order
  items.sort((a, b) => {
    const orderA = orderMap.get(String(a.masterId)) ?? 9999;
    const orderB = orderMap.get(String(b.masterId)) ?? 9999;
    return orderA - orderB;
  });

  // Pass 5: Additional Custom Earnings (like Stacks, Incentives)
  let additionalEarningsTotal = 0;
  for (const extra of additionalEarnings) {
    if (!extra.name || !extra.amount) continue;
    const rounded = Math.round(Number(extra.amount) * 100) / 100;
    items.push({
      masterId: null,
      name: extra.name,
      code: extra.code || 'CUSTOM',
      type: 'ALLOWANCE',
      amount: rounded,
      isManualOverride: true,
    });
    grossEarnings += rounded;
    additionalEarningsTotal += rounded;
  }

  // Net Pay = (Prorated Monthly CTC + Additional Earnings) - Total Deductions
  // (Falls back to grossEarnings - totalDeductions only if monthlyCTC is not set)
  const netPayBase = adjustedCTC > 0 ? adjustedCTC + additionalEarningsTotal : grossEarnings;
  const netPay = netPayBase - totalDeductions;

  return {
    items,
    grossEarnings: Math.round(grossEarnings * 100) / 100,
    totalDeductions: Math.round(totalDeductions * 100) / 100,
    netPay: Math.round(netPay * 100) / 100,
    adjustedCTC: Math.round(adjustedCTC * 100) / 100,
  };
};

const payslipService = {
  getPayslips: async ({ page, limit, filters }) => {
    const query = {};
    if (filters.employeeId) query.employeeId = filters.employeeId;
    if (filters.month) query.month = filters.month;
    if (filters.year) query.year = filters.year;
    if (filters.status && filters.excludeStatus && filters.status === filters.excludeStatus) {
      return { payslips: [], total: 0 };
    }
    if (filters.status) query.status = filters.status;
    else if (filters.excludeStatus) query.status = { $ne: filters.excludeStatus };

    const [payslips, total] = await Promise.all([
      Payslip.find(query)
        .populate('employeeId', 'employeeId personalInfo employment')
        .populate('salaryConfigId', 'bankName bankAccountNo')
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
      .populate('employeeId', 'employeeId personalInfo employment')
      .populate('salaryConfigId')
      .lean();
    if (!payslip) {
      throw new NotFoundError('Payslip not found');
    }
    return payslip;
  },

  previewPayslip: async (data) => {
    const { employeeId, month, year, daysWorked, totalDays, manualOverrides, additionalEarnings } = data;

    const salaryConfig = await SalaryConfig.findOne({ 
      employeeId, 
      isActive: true,
      effectiveFrom: { $lte: new Date(year, month - 1, totalDays || 30) }
    }).populate('items.masterId');

    if (!salaryConfig) {
      throw new NotFoundError('No active salary configuration found for this employee');
    }

    return calculatePayslipComponents(salaryConfig, totalDays, daysWorked, manualOverrides, additionalEarnings);
  },

  generatePayslip: async (data) => {
    const { employeeId, month, year, daysWorked, totalDays, lopDays, manualOverrides, additionalEarnings } = data;

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

    const { items, grossEarnings, totalDeductions, netPay, adjustedCTC } = calculatePayslipComponents(salaryConfig, totalDays, daysWorked, manualOverrides, additionalEarnings);

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
  },

  sendPayslipEmail: async (id) => {
    const payslip = await Payslip.findById(id).populate('employeeId');
    if (!payslip) {
      throw new NotFoundError('Payslip not found');
    }

    const user = payslip.employeeId;
    if (!user || !user.personalInfo?.email) {
      throw new ConflictError('Employee email not found');
    }

    let pdfBuffer = null;
    try {
      pdfBuffer = await generatePayslipPDF(payslip, user);
    } catch (pdfError) {
      logger.error('PDF generation failed:', pdfError);
      // We continue without PDF if generation fails, or we could throw error
    }

    const success = await emailService.sendPayslipEmail(user, payslip, pdfBuffer);
    if (!success) {
      throw new Error('Failed to send payslip email');
    }

    return true;
  },

  calculatePayslipComponents,
};

module.exports = payslipService;
