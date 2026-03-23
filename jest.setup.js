// Jest setup file
// This file runs before all tests

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key';
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-key';
process.env.MONGODB_URI = 'mongodb://localhost:27017/pulse-ops-test';

// Mock logger to avoid console noise during tests
jest.mock('./src/utils/logger', () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
}));

// Increase timeout for integration tests
jest.setTimeout(10000);
