import { Stack } from 'expo-router';
import { ThemeProvider } from '@/context/ThemeContext';
import { ToastProvider } from '@/context/ToastContext';
import { LanguageProvider } from '@/context/LanguageContext';
import { AppProvider } from '@/context/AppContext';
import { UserActivityProvider } from '@/context/UserActivityContext';
import ErrorBoundary from '@/components/ErrorBoundary';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useEffect } from 'react';
import { LogBox } from 'react-native';

LogBox.ignoreLogs(['[Reanimated] Reduced motion setting is enabled on this device.']);

// import { registerForPushNotificationsAsync } from '@/utils/push-notifications';

import { FileHandoffProvider } from '@/context/FileHandoffContext';

export default function RootLayout() {
  useEffect(() => {
    // Request permission immediately on app startup
    // NOTE: Commented out because Expo Go SDK 53 throws a giant red screen if it sees this import
    // registerForPushNotificationsAsync().then(token => console.log('Initialized Push Notifications', token));
  }, []);

  return (
    <ErrorBoundary>
      <AppProvider>
        <UserActivityProvider>
          <FileHandoffProvider>
            <SafeAreaProvider>
            <ThemeProvider>
              <LanguageProvider>
                <ToastProvider>
                   <Stack screenOptions={{ headerShown: false }}>
                     <Stack.Screen name="index" />
                     <Stack.Screen name="login" />
                     <Stack.Screen name="register" />
                     <Stack.Screen name="onboarding" />
                     <Stack.Screen name="(tabs)" />
                   </Stack>
                </ToastProvider>
              </LanguageProvider>
            </ThemeProvider>
          </SafeAreaProvider>
          </FileHandoffProvider>
        </UserActivityProvider>
      </AppProvider>
    </ErrorBoundary>
  );
}
