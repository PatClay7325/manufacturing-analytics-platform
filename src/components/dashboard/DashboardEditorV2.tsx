'use client';

import React from 'react';
import DashboardEditor from './DashboardEditor';
import { Dashboard } from '@/types/dashboard';

interface DashboardEditorV2Props {
  dashboard: Dashboard;
  onSave?: (dashboard: Dashboard) => void;
  onCancel?: () => void;
}

// DashboardEditorV2 is a wrapper around DashboardEditor with enhanced features
// For now, it simply delegates to DashboardEditor
export default function DashboardEditorV2(props: DashboardEditorV2Props) {
  return <DashboardEditor {...props} />;
}