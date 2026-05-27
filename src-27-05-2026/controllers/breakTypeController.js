const BreakType = require('../models/BreakType');
const { NotFoundError, BadRequestError } = require('../utils/errors');
const catchAsync = require('../utils/catchAsync');

const breakTypeController = {
    createBreakType: catchAsync(async (req, res) => {
        const { code } = req.body;
        const existing = await BreakType.findOne({ code: code.toUpperCase() });
        if (existing) {
            throw new BadRequestError(`Break type with code ${code} already exists`);
        }

        const breakType = await BreakType.create(req.body);
        res.status(201).json({
            status: 'success',
            data: breakType,
        });
    }),

    getAllBreakTypes: catchAsync(async (req, res) => {
        const { search, isActive } = req.query;
        const query = {};

        if (isActive !== undefined) {
            query.isActive = isActive === 'true' || isActive === true;
        }

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { code: { $regex: search, $options: 'i' } },
            ];
        }

        const breakTypes = await BreakType.find(query).sort({ name: 1 });

        res.json({
            status: 'success',
            data: breakTypes,
        });
    }),

    getBreakTypeById: catchAsync(async (req, res) => {
        const breakType = await BreakType.findById(req.params.id);
        if (!breakType) {
            throw new NotFoundError('Break type not found');
        }
        res.json({
            status: 'success',
            data: breakType,
        });
    }),

    updateBreakType: catchAsync(async (req, res) => {
        const breakType = await BreakType.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true,
        });

        if (!breakType) {
            throw new NotFoundError('Break type not found');
        }

        res.json({
            status: 'success',
            data: breakType,
        });
    }),

    deleteBreakType: catchAsync(async (req, res) => {
        const breakType = await BreakType.findByIdAndDelete(req.params.id);
        if (!breakType) {
            throw new NotFoundError('Break type not found');
        }

        res.json({
            status: 'success',
            message: 'Break type deleted successfully',
        });
    }),
};

module.exports = breakTypeController;
