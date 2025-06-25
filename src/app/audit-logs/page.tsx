'use client';

import React, { useState } from 'react';
import { PageLayout } from '@/components/layout/PageLayout';
import { AuditLogViewer } from '@/components/audit/AuditLogViewer';
import { AuditLogAnalytics } from '@/components/audit/AuditLogAnalytics';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, BarChart3 } from 'lucide-react';

export default function AuditLogsPage() {
  const [activeTab, setActiveTab] = useState('logs');

  return (
    <PageLayout
      title="Audit Logs"
      description="View and analyze system audit logs for security and compliance"
    >
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="logs" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Audit Logs
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Analytics
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="logs" className="mt-6">
          <AuditLogViewer />
        </TabsContent>
        
        <TabsContent value="analytics" className="mt-6">
          <AuditLogAnalytics />
        </TabsContent>
      </Tabs>
    </PageLayout>
  );
}