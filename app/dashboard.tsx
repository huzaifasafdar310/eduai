import React from 'react';
import { AnalyticsScreen } from '../features/analytics/AnalyticsScreen';

import ErrorBoundary from '@/components/ErrorBoundary';

function DashboardPage() {
  return <AnalyticsScreen />;
}

export default function DashboardWithErrorBoundary() {
  return (
    <ErrorBoundary>
      <DashboardPage />
    </ErrorBoundary>
  );
}
