const authController = require('../../src/controllers/authController');
const authService = require('../../src/services/authService');
const { BadRequestError } = require('../../src/utils/errors');

// Mock authService
jest.mock('../../src/services/authService');

describe('AuthController', () => {
    let req, res;

    beforeEach(() => {
        req = {
            body: {},
            ip: '127.0.0.1',
            connection: { remoteAddress: '127.0.0.1' },
            user: { _id: 'user123' },
            sessionId: 'session123',
        };

        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
        };

        jest.clearAllMocks();
    });

    describe('login', () => {
        it('should successfully login with valid credentials', async () => {
            const mockResult = {
                user: { id: 'user123', email: 'test@example.com' },
                accessToken: 'access-token',
                refreshToken: 'refresh-token',
                sessionId: 'session-id',
            };

            req.body = {
                email: 'test@example.com',
                password: 'password123',
            };

            authService.login.mockResolvedValue(mockResult);

            await authController.login(req, res);

            expect(authService.login).toHaveBeenCalledWith({
                email: 'test@example.com',
                password: 'password123',
                ipAddress: '127.0.0.1',
            });

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Login successful',
                data: mockResult,
            });
        });

        it('should return 400 for invalid input', async () => {
            req.body = {
                email: 'invalid-email',
                password: '',
            };

            await authController.login(req, res);

            expect(res.status).toHaveBeenCalled();
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    error: expect.any(Object),
                })
            );
        });

        it('should return 401 for invalid credentials', async () => {
            req.body = {
                email: 'test@example.com',
                password: 'wrongpassword',
            };

            authService.login.mockRejectedValue(
                Object.assign(new Error('Invalid user. Please try again.'), {
                    statusCode: 401,
                    code: 'UNAUTHORIZED',
                })
            );

            await authController.login(req, res);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                error: {
                    code: 'UNAUTHORIZED',
                    message: 'Invalid user. Please try again.',
                },
            });
        });
    });

    describe('forgotPassword', () => {
        it('should send OTP for valid email', async () => {
            req.body = { email: 'test@example.com' };

            authService.forgotPassword.mockResolvedValue({
                message: 'OTP sent to email successfully',
            });

            await authController.forgotPassword(req, res);

            expect(authService.forgotPassword).toHaveBeenCalledWith({
                email: 'test@example.com',
            });

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'OTP sent to email successfully',
            });
        });

        it('should return 404 for non-existent user', async () => {
            req.body = { email: 'nonexistent@example.com' };

            authService.forgotPassword.mockRejectedValue(
                Object.assign(new Error('User with this email does not exist'), {
                    statusCode: 404,
                    code: 'NOT_FOUND',
                })
            );

            await authController.forgotPassword(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                error: {
                    code: 'NOT_FOUND',
                    message: 'User with this email does not exist',
                },
            });
        });
    });

    describe('googleLogin', () => {
        it('should successfully login with valid Google token', async () => {
            req.body = {
                idToken: 'valid-firebase-id-token',
                email: 'test@example.com',
            };

            const mockResult = {
                user: { id: 'user123', email: 'test@example.com' },
                accessToken: 'access-token',
                refreshToken: 'refresh-token',
                sessionId: 'session-id',
            };

            authService.googleLogin.mockResolvedValue(mockResult);

            await authController.googleLogin(req, res);

            expect(authService.googleLogin).toHaveBeenCalledWith({
                idToken: 'valid-firebase-id-token',
                emailcheck: 'test@example.com',
                ipAddress: '127.0.0.1',
            });

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Google login successful',
                data: mockResult,
            });
        });

        it('should return 400 if idToken is missing', async () => {
            req.body = {
                email: 'test@example.com',
            };

            await authController.googleLogin(req, res);

            expect(res.status).toHaveBeenCalled();
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                })
            );
        });
    });
});
