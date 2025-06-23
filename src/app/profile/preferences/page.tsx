'use client';

import React from 'react';

import PageLayout from '@/components/layout/PageLayout';
import UserPreferencesManager from '@/components/settings/UserPreferencesManager';
import { PreferencesProvider } from '@/contexts/PreferencesContext';

export default function PreferencesPage() {
  return (
    <PreferencesProvider>
      <PageLayout
        title="Preferences"
        description="Customize your experience with personalized settings"
      >
        <UserPreferencesManager />
      </PageLayout>
    </PreferencesProvider>
  );
}