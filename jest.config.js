module.exports = {
    // Test environment
    testEnvironment: 'node',

    // Coverage directory
    coverageDirectory: 'coverage',

    // Coverage reporters
    coverageReporters: ['text', 'lcov', 'html'],

    // Collect coverage from these files
    collectCoverageFrom: [
        'src/**/*.js',
        '!src/server.js',
        '!src/app.js',
        '!src/config/**',
        '!src/middleware/**',
        '!**/node_modules/**',
    ],

    // Test match patterns
    testMatch: [
        '**/__tests__/**/*.js',
        '**/?(*.)+(spec|test).js',
    ],

    // Setup files
    setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],

    // Module paths
    roots: ['<rootDir>/src', '<rootDir>/__tests__'],

    // Clear mocks between tests
    clearMocks: true,

    // Coverage thresholds (optional)
    coverageThresholds: {
        global: {
            branches: 50,
            functions: 50,
            lines: 50,
            statements: 50,
        },
    },

    // Ignore patterns
    testPathIgnorePatterns: ['/node_modules/', '/dist/'],

    // Verbose output
    verbose: true,
};
