import React, { ReactNode } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '@/context/ThemeContext';
import { ToastProvider } from '@/context/ToastContext';
import { LanguageProvider } from '@/context/LanguageContext';
import { AppProvider } from '@/context/AppContext';
import { AuthProvider } from '@/context/AuthContext';
import { UserActivityProvider } from '@/context/UserActivityContext';
import ErrorBoundary from '@/components/ErrorBoundary';

import { ApiGuardProvider } from '@/context/ApiGuardContext';

/**
 * 🔗 AppProviders: The Composition Root
 * Handles the layering of global state providers in the correct order.
 * Order rationale: 
 * 1. UI Infrastructure (Safe Area, Theme)
 * 2. Localization & Feedback (Language, Toast)
 * 3. Identity (Auth) 
 * 4. Data & Logic (App State, Activity Tracking, Security Gates)
 */
const AppProviders = ({ children }: { children: ReactNode }) => {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <ThemeProvider>
          <LanguageProvider>
            <ToastProvider>
              <AuthProvider>
                <AppProvider>
                  <ApiGuardProvider>
                    <UserActivityProvider>
                      {children}
                    </UserActivityProvider>
                  </ApiGuardProvider>
                </AppProvider>
              </AuthProvider>
            </ToastProvider>
          </LanguageProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
};

export default AppProviders;
