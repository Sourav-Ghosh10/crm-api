const authService = require('../services/authService');
const attendanceService = require('../services/attendanceService');
const { loginSchema, forgotPasswordSchema, googleLoginSchema } = require('../validators/authValidator');
const { BadRequestError } = require('../utils/errors');

const authController = {
    login: async (req, res) => {
        try {
            // Validate request body
            const { error, value } = loginSchema.validate(req.body);

            if (error) {
                throw new BadRequestError(error.details[0].message);
            }

            const ipAddress = req.ip || req.connection.remoteAddress;

            const result = await authService.login({
                email: value.email,
                password: value.password,
                ipAddress,
                checked: value.checked
            });

            res.status(200).json({
                success: true,
                message: 'Login successful',
                data: result,
            });
        } catch (error) {
            const status = error.statusCode || 500;
            const code = error.code || (status === 404 ? 'NOT_FOUND' : 'INTERNAL_SERVER_ERROR');
            res.status(status).json({
                success: false,
                error: {
                    code,
                    message: error.message,
                },
            });
        }
    },

    logout: async (req, res, next) => {
        try {
            await authService.logout(req.user._id, req.sessionId);

            res.status(200).json({
                success: true,
                message: 'Logged out successfully',
            });
        } catch (error) {
            next(error);
        }
    },

    refreshToken: async (req, res, next) => {
        try {
            const { refreshToken } = req.body;

            if (!refreshToken) {
                throw new BadRequestError('Refresh token is required');
            }

            const result = await authService.refreshToken(refreshToken);

            res.status(200).json({
                success: true,
                message: 'Token refreshed successfully',
                data: result,
            });
        } catch (error) {
            next(error);
        }
    },
    forgotPassword: async (req, res) => {
        try {
            // Validate that only email is provided
            const { error, value } = forgotPasswordSchema.validate(req.body);

            if (error) {
                throw new BadRequestError(error.details[0].message);
            }

            const result = await authService.forgotPassword({
                email: value.email
            });

            res.status(200).json({
                success: true,
                message: result.message,
            });
        } catch (error) {
            const status = error.statusCode || 500;
            res.status(status).json({
                success: false,
                error: {
                    code: error.code || 'INTERNAL_SERVER_ERROR',
                    message: error.message,
                },
            });
        }
    },
    verifyOTP: async (req, res) => {
        try {
            const { email, otp } = req.body;
            const result = await authService.verifyOTP({ email, otp });
            res.status(200).json({ success: true, ...result });
        } catch (error) {
            res.status(error.statusCode || 500).json({ success: false, error: error.message });
        }
    },

    resetPassword: async (req, res) => {
        try {
            const { email, otp, newPassword } = req.body;
            const result = await authService.resetPassword({ email, otp, newPassword });
            res.status(200).json({ success: true, ...result });
        } catch (error) {
            res.status(error.statusCode || 500).json({ success: false, error: error.message });
        }
    },

    googleLogin: async (req, res) => {
        try {
            // Validate request body with Joi
            const { error, value } = googleLoginSchema.validate(req.body);

            if (error) {
                throw new BadRequestError(error.details[0].message);
            }

            const ipAddress = req.ip || req.connection.remoteAddress;
            const result = await authService.googleLogin({
                idToken: value.idToken,
                emailcheck: value.email,
                ipAddress,
            });
            // console.log(result);
            res.status(200).json({
                success: true,
                message: 'Google login successful',
                data: result,
            });
        } catch (error) {
            const status = error.statusCode || 500;
            const code = error.code || (status === 404 ? 'NOT_FOUND' : 'INTERNAL_SERVER_ERROR');
            res.status(status).json({
                success: false,
                error: {
                    code,
                    message: error.message,
                },
            });
        }
    },

    getMe: async (req, res, next) => {
        try {
            // Check for incomplete shifts even though middleware might have exempted us
            // This allows the frontend to get user details while knowing a correction is needed
            const logoutCorrection = await attendanceService.getIncompleteShiftStatus(req.user._id);

            res.status(200).json({
                success: true,
                data: req.user,
                ...logoutCorrection
            });
        } catch (error) {
            next(error);
        }
    }
};

module.exports = authController;
