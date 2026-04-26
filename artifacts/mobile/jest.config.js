module.exports = {
  preset: "jest-expo",
  setupFiles: ["<rootDir>/jest.setup.js"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
    "^@workspace/brand$": "<rootDir>/__mocks__/@workspace/brand.js",
    "^@workspace/api-client-react$": "<rootDir>/__mocks__/@workspace/api-client-react.js",
    "^expo/virtual/metro-env$": "<rootDir>/__mocks__/expo-winter-stub.js",
    "^expo/src/winter/(.*)$": "<rootDir>/__mocks__/expo-winter-stub.js",
    "^expo/build/winter/(.*)$": "<rootDir>/__mocks__/expo-winter-stub.js",
  },
  testMatch: ["**/__tests__/**/*.test.[jt]s?(x)"],
  testPathIgnorePatterns: ["/node_modules/", "/build/"],
};
