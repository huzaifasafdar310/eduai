// Basic mocks for Expo/React Native
import 'react-native-gesture-handler/jestSetup';

jest.mock('expo-constants', () => ({
  expoConfig: {
    extra: {
      // Mock any extra config if needed
    },
  },
}));

// Mock other expo modules if they cause issues
jest.mock('expo-font', () => ({
  loadAsync: jest.fn(),
  isLoaded: jest.fn(),
}));

jest.mock('expo-asset', () => ({
  Asset: {
    fromModule: jest.fn(),
  },
}));

// Mock the problematic winter runtime that causes ReferenceError in Jest
jest.mock('expo/src/winter/runtime.native', () => ({}));
jest.mock('expo/src/winter/installGlobal', () => ({}));
