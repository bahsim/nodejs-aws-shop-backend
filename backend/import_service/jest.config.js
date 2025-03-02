module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/src'],
    testMatch: ['**/*.test.ts'],
    transform: {
      '^.+\\.tsx?$': 'ts-jest'
    },
    setupFiles: ['<rootDir>/src/import_service/__tests__/setup.ts'],
    moduleNameMapper: {
      '^@libs/(.*)$': '<rootDir>/src/libs/$1',
      '^@functions/(.*)$': '<rootDir>/src/functions/$1'
    }
  };