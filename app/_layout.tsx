import AppProviders from '@/context/AppProviders';
import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { LogBox } from 'react-native';

LogBox.ignoreLogs(['[Reanimated] Reduced motion setting is enabled on this device.']);

export default function RootLayout() {
  return (
    <AppProviders>
       <Stack screenOptions={{ headerShown: false }}>
         <Stack.Screen name="index" />
         <Stack.Screen name="login" />
         <Stack.Screen name="register" />
         <Stack.Screen name="onboarding" />
         <Stack.Screen name="(tabs)" />
       </Stack>
    </AppProviders>
  );
}
