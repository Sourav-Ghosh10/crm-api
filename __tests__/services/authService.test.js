const authService = require('../../src/services/authService');
const User = require('../../src/models/User');
const { UnauthorizedError, NotFoundError } = require('../../src/utils/errors');

// Mock the User model
jest.mock('../../src/models/User');

// Mock Redis
jest.mock('../../src/config/redis', () => ({
    getRedisClient: jest.fn(() => ({
        setEx: jest.fn(),
        del: jest.fn(),
        exists: jest.fn(() => Promise.resolve(1)),
    })),
}));

// Mock token utilities
jest.mock('../../src/utils/tokenUtils', () => ({
    generateAccessToken: jest.fn(() => 'mock-access-token'),
    generateRefreshToken: jest.fn(() => 'mock-refresh-token'),
    generateSessionId: jest.fn(() => 'mock-session-id'),
    verifyRefreshToken: jest.fn(() => ({ userId: 'user123', sessionId: 'session123' })),
}));

describe('AuthService', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('login', () => {
        it('should successfully login a valid user', async () => {
            // Mock user data
            const mockUser = {
                _id: 'user123',
                'personalInfo.email': 'test@example.com',
                passwordHash: 'hashed-password',
                failedLoginAttempts: 0,
                accountLockedUntil: null,
                isActive: true,
                comparePassword: jest.fn(() => Promise.resolve(true)),
                save: jest.fn(() => Promise.resolve()),
                toObject: jest.fn(() => ({
                    _id: 'user123',
                    personalInfo: { email: 'test@example.com' },
                })),
            };

            // Mock User.findOne
            User.findOne = jest.fn(() => ({
                select: jest.fn(() => Promise.resolve(mockUser)),
            }));

            const result = await authService.login({
                email: 'test@example.com',
                password: 'password123',
                ipAddress: '127.0.0.1',
            });

            expect(result).toHaveProperty('user');
            expect(result).toHaveProperty('accessToken', 'mock-access-token');
            expect(result).toHaveProperty('refreshToken', 'mock-refresh-token');
            expect(result).toHaveProperty('sessionId', 'mock-session-id');
            expect(mockUser.comparePassword).toHaveBeenCalledWith('password123');
            expect(mockUser.save).toHaveBeenCalled();
        });

        it('should throw UnauthorizedError for non-existent user', async () => {
            User.findOne = jest.fn(() => ({
                select: jest.fn(() => Promise.resolve(null)),
            }));

            await expect(
                authService.login({
                    email: 'nonexistent@example.com',
                    password: 'password123',
                    ipAddress: '127.0.0.1',
                })
            ).rejects.toThrow(UnauthorizedError);
        });

        it('should throw UnauthorizedError for invalid password', async () => {
            const mockUser = {
                _id: 'user123',
                failedLoginAttempts: 0,
                isActive: true,
                comparePassword: jest.fn(() => Promise.resolve(false)),
                save: jest.fn(() => Promise.resolve()),
            };

            User.findOne = jest.fn(() => ({
                select: jest.fn(() => Promise.resolve(mockUser)),
            }));

            await expect(
                authService.login({
                    email: 'test@example.com',
                    password: 'wrongpassword',
                    ipAddress: '127.0.0.1',
                })
            ).rejects.toThrow(UnauthorizedError);

            expect(mockUser.failedLoginAttempts).toBe(1);
            expect(mockUser.save).toHaveBeenCalled();
        });

        it('should lock account after max failed login attempts', async () => {
            const mockUser = {
                _id: 'user123',
                failedLoginAttempts: 4, // MAX_LOGIN_ATTEMPTS is 5
                accountLockedUntil: null,
                isActive: true,
                comparePassword: jest.fn(() => Promise.resolve(false)),
                save: jest.fn(() => Promise.resolve()),
            };

            User.findOne = jest.fn(() => ({
                select: jest.fn(() => Promise.resolve(mockUser)),
            }));

            await expect(
                authService.login({
                    email: 'test@example.com',
                    password: 'wrongpassword',
                    ipAddress: '127.0.0.1',
                })
            ).rejects.toThrow(UnauthorizedError);

            expect(mockUser.accountLockedUntil).toBeTruthy();
            expect(mockUser.save).toHaveBeenCalled();
        });
    });

    describe('forgotPassword', () => {
        it('should generate OTP and send email for existing user', async () => {
            const mockUser = {
                _id: 'user123',
                'personalInfo.email': 'test@example.com',
                resetPasswordOTP: null,
                resetPasswordExpires: null,
                markModified: jest.fn(),
                save: jest.fn(() => Promise.resolve()),
            };

            User.findOne = jest.fn(() => Promise.resolve(mockUser));

            // Mock emailService
            const emailService = require('../../src/services/emailService');
            emailService.sendEmail = jest.fn(() => Promise.resolve());

            const result = await authService.forgotPassword({
                email: 'test@example.com',
            });

            expect(result.message).toBe('OTP sent to email successfully');
            expect(mockUser.resetPasswordOTP).toBeTruthy();
            expect(mockUser.resetPasswordExpires).toBeTruthy();
            expect(mockUser.markModified).toHaveBeenCalledWith('resetPasswordOTP');
            expect(mockUser.save).toHaveBeenCalled();
            expect(emailService.sendEmail).toHaveBeenCalled();
        });

        it('should throw NotFoundError for non-existent user', async () => {
            User.findOne = jest.fn(() => Promise.resolve(null));

            await expect(
                authService.forgotPassword({
                    email: 'nonexistent@example.com',
                })
            ).rejects.toThrow(NotFoundError);
        });
    });
});
