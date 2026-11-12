/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    testMatch: ['<rootDir>/__test__/**/*.test.ts'],
    testTimeout: 60000,
    clearMocks: true,
    coverageProvider: 'v8',
};
