module.exports = {
  preset: "jest-expo",
  transformIgnorePatterns: [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg|@rneui/.*|@rneui/base|@rneui/themed|react-native-ratings|react-native-size-matters|react-native-vector-icons)"
  ],
  setupFilesAfterEnv: ["@testing-library/jest-native/extend-expect"],
  setupFiles: ["./jest.setup.js"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1"
  },
  haste: {
    defaultPlatform: 'ios',
    platforms: ['android', 'ios', 'native'],
  },
};
