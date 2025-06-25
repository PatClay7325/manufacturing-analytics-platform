'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/common/Card';
import { AlertBadge } from '@/components/alerts/AlertBadge';

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  variables: string[];
}

interface EmailComposerProps {
  onSend: (email: any) => Promise<void>;
  templates?: EmailTemplate[];
  defaultTo?: string;
  defaultTemplate?: string;
}

export const EmailComposer: React.FC<EmailComposerProps> = ({
  onSend,
  templates = [],
  defaultTo = '',
  defaultTemplate = '',
}) => {
  const [to, setTo] = useState(defaultTo);
  const [cc, setCc] = useState('');
  const [bcc, setBcc] = useState('');
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState(defaultTemplate);
  const [templateData, setTemplateData] = useState<Record<string, any>>({});
  const [priority, setPriority] = useState<'high' | 'normal' | 'low'>('normal');
  const [immediate, setImmediate] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (selectedTemplate) {
      const template = templates.find(t => t.id === selectedTemplate);
      if (template) {
        setSubject(template.subject);
        // Initialize template data with empty values
        const data: Record<string, any> = {};
        template.variables.forEach(v => {
          data[v] = '';
        });
        setTemplateData(data);
      }
    }
  }, [selectedTemplate, templates]);

  const handleSend = async () => {
    setError('');
    setSuccess('');
    setSending(true);

    try {
      const email: any = {
        to: to.split(',').map(e => e.trim()).filter(Boolean),
        priority,
        immediate,
      };

      if (cc) {
        email.cc = cc.split(',').map(e => e.trim()).filter(Boolean);
      }

      if (bcc) {
        email.bcc = bcc.split(',').map(e => e.trim()).filter(Boolean);
      }

      if (selectedTemplate) {
        email.templateId = selectedTemplate;
        email.templateData = templateData;
      } else {
        email.subject = subject;
        email.html = content.replace(/\n/g, '<br>');
        email.text = content;
      }

      await onSend(email);
      setSuccess('Email sent successfully!');
      
      // Reset form
      if (!defaultTo) setTo('');
      setCc('');
      setBcc('');
      if (!defaultTemplate) {
        setSubject('');
        setContent('');
        setSelectedTemplate('');
        setTemplateData({});
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send email');
    } finally {
      setSending(false);
    }
  };

  const selectedTemplateObj = templates.find(t => t.id === selectedTemplate);

  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold mb-4">Compose Email</h2>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded text-green-700">
          {success}
        </div>
      )}

      <div className="space-y-4">
        {/* Recipients */}
        <div>
          <Label htmlFor="to">To *</Label>
          <Input
            id="to"
            type="text"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="email@example.com, another@example.com"
            required
          />
          <p className="text-sm text-gray-500 mt-1">Separate multiple emails with commas</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="cc">CC</Label>
            <Input
              id="cc"
              type="text"
              value={cc}
              onChange={(e) => setCc(e.target.value)}
              placeholder="cc@example.com"
            />
          </div>

          <div>
            <Label htmlFor="bcc">BCC</Label>
            <Input
              id="bcc"
              type="text"
              value={bcc}
              onChange={(e) => setBcc(e.target.value)}
              placeholder="bcc@example.com"
            />
          </div>
        </div>

        {/* Template Selection */}
        {templates.length > 0 && (
          <div>
            <Label htmlFor="template">Email Template</Label>
            <select
              id="template"
              className="w-full p-2 border rounded"
              value={selectedTemplate}
              onChange={(e) => setSelectedTemplate(e.target.value)}
            >
              <option value="">Custom Email (No Template)</option>
              {templates.map(template => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Template Variables */}
        {selectedTemplate && selectedTemplateObj && (
          <div className="p-4 bg-gray-50 rounded">
            <h3 className="font-medium mb-3">Template Variables</h3>
            <div className="space-y-3">
              {selectedTemplateObj.variables.map(variable => (
                <div key={variable}>
                  <Label htmlFor={variable}>{variable}</Label>
                  <Input
                    id={variable}
                    type="text"
                    value={templateData[variable] || ''}
                    onChange={(e) => setTemplateData({
                      ...templateData,
                      [variable]: e.target.value,
                    })}
                    placeholder={`Enter ${variable}`}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Custom Email Content */}
        {!selectedTemplate && (
          <>
            <div>
              <Label htmlFor="subject">Subject *</Label>
              <Input
                id="subject"
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Email subject"
                required
              />
            </div>

            <div>
              <Label htmlFor="content">Message *</Label>
              <Textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Type your message here..."
                rows={10}
                required
              />
            </div>
          </>
        )}

        {/* Options */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <Label htmlFor="priority">Priority</Label>
              <select
                id="priority"
                className="p-2 border rounded"
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="immediate"
                checked={immediate}
                onChange={(e) => setImmediate(e.target.checked)}
              />
              <Label htmlFor="immediate">Send immediately</Label>
            </div>
          </div>

          <Button
            onClick={handleSend}
            disabled={sending || !to || (!selectedTemplate && (!subject || !content))}
          >
            {sending ? 'Sending...' : 'Send Email'}
          </Button>
        </div>
      </div>
    </Card>
  );
};