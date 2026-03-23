const attendanceService = require('../services/attendanceService');

const attendanceController = {
    clockIn: async (req, res, next) => {
        try {
            const { deviceInfo, remarks } = req.body;
            const ipAddress = req.ip || req.connection.remoteAddress;

            const payload = {
                deviceInfo,
                remarks,
                ipAddress
            };

            const result = await attendanceService.clockIn(req.user.id, payload);

            res.status(201).json({
                success: true,
                message: 'Clocked in successfully',
                data: result,
            });
        } catch (error) {
            next(error);
        }
    },

    clockOut: async (req, res, next) => {
        try {
            const { deviceInfo } = req.body;
            const ipAddress = req.ip || req.connection.remoteAddress;

            const payload = {
                deviceInfo,
                ipAddress
            };

            const result = await attendanceService.clockOut(req.user.id, payload);

            res.status(200).json({
                success: true,
                message: 'Clocked out successfully',
                data: result,
            });
        } catch (error) {
            next(error);
        }
    },

    startBreak: async (req, res, next) => {
        try {
            const result = await attendanceService.startBreak(req.user.id);

            res.status(200).json({
                success: true,
                message: 'Break started',
                data: result,
            });
        } catch (error) {
            next(error);
        }
    },

    resumeWork: async (req, res, next) => {
        try {
            const result = await attendanceService.resumeWork(req.user.id);

            res.status(200).json({
                success: true,
                message: 'Work resumed',
                data: result,
            });
        } catch (error) {
            next(error);
        }
    },

    getAttendanceStatus: async (req, res, next) => {
        try {
            const result = await attendanceService.getAttendanceStatus(req.user.id);
            res.status(200).json({
                success: true,
                message: 'Attendance status fetched successfully',
                data: result
            });
        } catch (error) {
            next(error);
        }
    },

    getAllAttendance: async (req, res, next) => {
        try {
            const result = await attendanceService.getAllAttendance(req.query);
            res.status(200).json({
                success: true,
                message: 'Attendance list fetched successfully',
                data: result
            });
        } catch (error) {
            next(error);
        }
    },

    getMemberAttendance: async (req, res, next) => {
        try {
            const result = await attendanceService.getIndividualAttendance(req.user.id, req.query);
            res.status(200).json({
                success: true,
                message: 'Your attendance history fetched successfully',
                data: result
            });
        } catch (error) {
            next(error);
        }
    },

    getAttendanceById: async (req, res, next) => {
        try {
            const attendance = await attendanceService.getAttendanceById(req.params.id);
            res.status(200).json({
                success: true,
                message: 'Attendance details fetched successfully',
                data: attendance
            });
        } catch (error) {
            next(error);
        }
    },
    correctLogout: async (req, res, next) => {
        try {
            const result = await attendanceService.correctLogout(req.user.id, req.body);
            res.status(200).json({
                success: true,
                message: 'Logout correction submitted successfully',
                data: result
            });
        } catch (error) {
            next(error);
        }
    },
    checkLogoutCorrection: async (req, res, next) => {
        try {
            const result = await attendanceService.getIncompleteShiftStatus(req.user.id);
            res.status(200).json({
                success: true,
                message: 'Incomplete shift status fetched successfully',
                data: result
            });
        } catch (error) {
            next(error);
        }
    }
};

module.exports = attendanceController;
