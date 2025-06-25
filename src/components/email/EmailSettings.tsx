'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/common/Card';
import { TabNavigation } from '@/components/common/TabNavigation';

interface EmailSettingsProps {
  onTestEmail: (email: string) => Promise<void>;
}

export const EmailSettings: React.FC<EmailSettingsProps> = ({ onTestEmail }) => {
  const [activeTab, setActiveTab] = useState('smtp');
  const [testEmail, setTestEmail] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // SMTP Settings
  const [smtpHost, setSmtpHost] = useState(process.env.NEXT_PUBLIC_SMTP_HOST || '');
  const [smtpPort, setSmtpPort] = useState(process.env.NEXT_PUBLIC_SMTP_PORT || '587');
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPassword, setSmtpPassword] = useState('');
  const [smtpSecure, setSmtpSecure] = useState(false);

  // SendGrid Settings
  const [sendgridApiKey, setSendgridApiKey] = useState('');

  // AWS SES Settings
  const [awsRegion, setAwsRegion] = useState('us-east-1');
  const [awsAccessKey, setAwsAccessKey] = useState('');
  const [awsSecretKey, setAwsSecretKey] = useState('');

  // Common Settings
  const [fromEmail, setFromEmail] = useState('');
  const [fromName, setFromName] = useState('');
  const [replyTo, setReplyTo] = useState('');

  const handleTest = async () => {
    if (!testEmail) {
      setTestResult({
        success: false,
        message: 'Please enter a test email address',
      });
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      await onTestEmail(testEmail);
      setTestResult({
        success: true,
        message: `Test email sent successfully to ${testEmail}`,
      });
    } catch (error) {
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to send test email',
      });
    } finally {
      setTesting(false);
    }
  };

  const tabs = [
    { id: 'smtp', label: 'SMTP' },
    { id: 'sendgrid', label: 'SendGrid' },
    { id: 'ses', label: 'AWS SES' },
    { id: 'common', label: 'Common Settings' },
  ];

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Email Configuration</h2>
        
        <TabNavigation
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />

        <div className="mt-6">
          {activeTab === 'smtp' && (
            <div className="space-y-4">
              <h3 className="font-medium text-lg">SMTP Settings</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="smtp-host">SMTP Host</Label>
                  <Input
                    id="smtp-host"
                    type="text"
                    value={smtpHost}
                    onChange={(e) => setSmtpHost(e.target.value)}
                    placeholder="smtp.example.com"
                  />
                </div>

                <div>
                  <Label htmlFor="smtp-port">SMTP Port</Label>
                  <Input
                    id="smtp-port"
                    type="text"
                    value={smtpPort}
                    onChange={(e) => setSmtpPort(e.target.value)}
                    placeholder="587"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="smtp-user">SMTP Username</Label>
                <Input
                  id="smtp-user"
                  type="text"
                  value={smtpUser}
                  onChange={(e) => setSmtpUser(e.target.value)}
                  placeholder="username@example.com"
                />
              </div>

              <div>
                <Label htmlFor="smtp-password">SMTP Password</Label>
                <Input
                  id="smtp-password"
                  type="password"
                  value={smtpPassword}
                  onChange={(e) => setSmtpPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="smtp-secure"
                  checked={smtpSecure}
                  onChange={(e) => setSmtpSecure(e.target.checked)}
                />
                <Label htmlFor="smtp-secure">Use TLS/SSL</Label>
              </div>
            </div>
          )}

          {activeTab === 'sendgrid' && (
            <div className="space-y-4">
              <h3 className="font-medium text-lg">SendGrid Settings</h3>
              
              <div>
                <Label htmlFor="sendgrid-key">API Key</Label>
                <Input
                  id="sendgrid-key"
                  type="password"
                  value={sendgridApiKey}
                  onChange={(e) => setSendgridApiKey(e.target.value)}
                  placeholder="SG.••••••••••••••••••••••••"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Get your API key from the SendGrid dashboard
                </p>
              </div>
            </div>
          )}

          {activeTab === 'ses' && (
            <div className="space-y-4">
              <h3 className="font-medium text-lg">AWS SES Settings</h3>
              
              <div>
                <Label htmlFor="aws-region">AWS Region</Label>
                <select
                  id="aws-region"
                  className="w-full p-2 border rounded"
                  value={awsRegion}
                  onChange={(e) => setAwsRegion(e.target.value)}
                >
                  <option value="us-east-1">US East (N. Virginia)</option>
                  <option value="us-west-2">US West (Oregon)</option>
                  <option value="eu-west-1">EU (Ireland)</option>
                  <option value="eu-central-1">EU (Frankfurt)</option>
                  <option value="ap-southeast-1">Asia Pacific (Singapore)</option>
                  <option value="ap-southeast-2">Asia Pacific (Sydney)</option>
                </select>
              </div>

              <div>
                <Label htmlFor="aws-access-key">Access Key ID</Label>
                <Input
                  id="aws-access-key"
                  type="text"
                  value={awsAccessKey}
                  onChange={(e) => setAwsAccessKey(e.target.value)}
                  placeholder="AKIA••••••••••••••••"
                />
              </div>

              <div>
                <Label htmlFor="aws-secret-key">Secret Access Key</Label>
                <Input
                  id="aws-secret-key"
                  type="password"
                  value={awsSecretKey}
                  onChange={(e) => setAwsSecretKey(e.target.value)}
                  placeholder="••••••••••••••••••••••••••••••••••••••••"
                />
              </div>
            </div>
          )}

          {activeTab === 'common' && (
            <div className="space-y-4">
              <h3 className="font-medium text-lg">Common Email Settings</h3>
              
              <div>
                <Label htmlFor="from-email">From Email Address</Label>
                <Input
                  id="from-email"
                  type="email"
                  value={fromEmail}
                  onChange={(e) => setFromEmail(e.target.value)}
                  placeholder="noreply@example.com"
                />
              </div>

              <div>
                <Label htmlFor="from-name">From Name</Label>
                <Input
                  id="from-name"
                  type="text"
                  value={fromName}
                  onChange={(e) => setFromName(e.target.value)}
                  placeholder="Manufacturing Analytics"
                />
              </div>

              <div>
                <Label htmlFor="reply-to">Reply-To Address (Optional)</Label>
                <Input
                  id="reply-to"
                  type="email"
                  value={replyTo}
                  onChange={(e) => setReplyTo(e.target.value)}
                  placeholder="support@example.com"
                />
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end">
          <Button>Save Settings</Button>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="font-medium text-lg mb-4">Test Email Configuration</h3>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="test-email">Test Email Address</Label>
            <div className="flex gap-2">
              <Input
                id="test-email"
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="test@example.com"
                className="flex-1"
              />
              <Button 
                onClick={handleTest}
                disabled={testing || !testEmail}
              >
                {testing ? 'Sending...' : 'Send Test'}
              </Button>
            </div>
          </div>

          {testResult && (
            <div className={`p-3 rounded ${
              testResult.success 
                ? 'bg-green-50 border border-green-200 text-green-700'
                : 'bg-red-50 border border-red-200 text-red-700'
            }`}>
              {testResult.message}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};