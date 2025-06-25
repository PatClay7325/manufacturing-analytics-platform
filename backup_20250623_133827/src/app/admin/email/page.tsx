'use client';

import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmailComposer } from '@/components/email/EmailComposer';
import { EmailTemplateEditor } from '@/components/email/EmailTemplateEditor';
import { EmailSettings } from '@/components/email/EmailSettings';
import { EmailHistory } from '@/components/email/EmailHistory';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/ui/button';

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  html: string;
  text?: string;
  variables: string[];
  category: string;
  customizable: boolean;
}

export default function EmailAdminPage() {
  const [activeTab, setActiveTab] = useState('compose');
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | undefined>();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/email/templates');
      const data = await response.json();
      setTemplates(data.templates || []);
    } catch (error) {
      console.error('Failed to fetch templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendEmail = async (email: any) => {
    const response = await fetch('/api/email/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(email),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to send email');
    }

    return data;
  };

  const handleTestEmail = async (email: string) => {
    const response = await fetch('/api/email/test', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to send test email');
    }

    return data;
  };

  const handleSaveTemplate = async (template: Partial<EmailTemplate>) => {
    const url = template.id 
      ? `/api/email/templates/${template.id}`
      : '/api/email/templates';
    
    const method = template.id ? 'PUT' : 'POST';

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(template),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to save template');
    }

    await fetchTemplates();
    setIsEditing(false);
    setSelectedTemplate(undefined);
  };

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Email Management</h1>
        <p className="text-gray-600">Configure email settings, send emails, and manage templates</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="compose">Compose</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="compose">
          <EmailComposer
            onSend={handleSendEmail}
            templates={templates.filter(t => t.category !== 'system')}
          />
        </TabsContent>

        <TabsContent value="templates">
          {isEditing ? (
            <EmailTemplateEditor
              template={selectedTemplate}
              onSave={handleSaveTemplate}
              onCancel={() => {
                setIsEditing(false);
                setSelectedTemplate(undefined);
              }}
            />
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Email Templates</h2>
                <Button onClick={() => setIsEditing(true)}>
                  Create Template
                </Button>
              </div>

              {loading ? (
                <div className="text-center py-8">Loading templates...</div>
              ) : templates.length === 0 ? (
                <Card className="p-8 text-center">
                  <p className="text-gray-500">No templates found</p>
                  <Button 
                    className="mt-4"
                    onClick={() => setIsEditing(true)}
                  >
                    Create Your First Template
                  </Button>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {templates.map(template => (
                    <Card 
                      key={template.id} 
                      className="p-4 hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => {
                        setSelectedTemplate(template);
                        setIsEditing(true);
                      }}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium">{template.name}</h3>
                          <p className="text-sm text-gray-500 mt-1">{template.subject}</p>
                          <div className="flex gap-2 mt-2">
                            <span className="text-xs px-2 py-1 bg-gray-100 rounded">
                              {template.category}
                            </span>
                            {!template.customizable && (
                              <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-800 rounded">
                                System Template
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-sm text-gray-500">
                          {template.variables.length} variables
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="history">
          <EmailHistory />
        </TabsContent>

        <TabsContent value="settings">
          <EmailSettings onTestEmail={handleTestEmail} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
