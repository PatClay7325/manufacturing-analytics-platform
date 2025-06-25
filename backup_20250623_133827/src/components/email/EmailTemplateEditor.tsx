'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/common/Card';
import { Select } from '@/components/ui/select';

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

interface EmailTemplateEditorProps {
  template?: EmailTemplate;
  onSave: (template: Partial<EmailTemplate>) => Promise<void>;
  onCancel: () => void;
}

export const EmailTemplateEditor: React.FC<EmailTemplateEditorProps> = ({
  template,
  onSave,
  onCancel,
}) => {
  const [name, setName] = useState(template?.name || '');
  const [subject, setSubject] = useState(template?.subject || '');
  const [html, setHtml] = useState(template?.html || '');
  const [text, setText] = useState(template?.text || '');
  const [category, setCategory] = useState(template?.category || 'custom');
  const [variables, setVariables] = useState<string[]>(template?.variables || []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [previewMode, setPreviewMode] = useState<'edit' | 'preview'>('edit');

  useEffect(() => {
    // Extract variables from HTML content
    const regex = /\{\{([^}]+)\}\}/g;
    const foundVariables = new Set<string>();
    let match;

    while ((match = regex.exec(html)) !== null) {
      const variable = match[1].trim().split(/[\s(#/]/, 2)[0];
      if (variable && !variable.startsWith('!')) {
        foundVariables.add(variable);
      }
    }

    // Also extract from subject
    regex.lastIndex = 0;
    while ((match = regex.exec(subject)) !== null) {
      const variable = match[1].trim().split(/[\s(#/]/, 2)[0];
      if (variable && !variable.startsWith('!')) {
        foundVariables.add(variable);
      }
    }

    setVariables(Array.from(foundVariables));
  }, [html, subject]);

  const handleSave = async () => {
    setError('');
    setSaving(true);

    try {
      const templateData: Partial<EmailTemplate> = {
        name,
        subject,
        html,
        text,
        category,
        variables,
      };

      if (template?.id) {
        templateData.id = template.id;
      }

      await onSave(templateData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  const generateSampleData = (): Record<string, any> => {
    const sampleData: Record<string, any> = {};
    
    variables.forEach(variable => {
      if (variable.includes('name') || variable.includes('Name')) {
        sampleData[variable] = 'John Doe';
      } else if (variable.includes('email') || variable.includes('Email')) {
        sampleData[variable] = 'john.doe@example.com';
      } else if (variable.includes('date') || variable.includes('Date')) {
        sampleData[variable] = new Date().toLocaleDateString();
      } else if (variable.includes('url') || variable.includes('Url')) {
        sampleData[variable] = 'https://example.com';
      } else {
        sampleData[variable] = `[${variable}]`;
      }
    });

    return sampleData;
  };

  const renderPreview = () => {
    const sampleData = generateSampleData();
    let previewHtml = html;
    let previewSubject = subject;

    // Simple template replacement for preview
    Object.entries(sampleData).forEach(([key, value]) => {
      const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
      previewHtml = previewHtml.replace(regex, value);
      previewSubject = previewSubject.replace(regex, value);
    });

    return (
      <div className="border rounded p-4 bg-gray-50">
        <div className="mb-4">
          <strong>Subject:</strong> {previewSubject}
        </div>
        <div 
          className="bg-white p-4 rounded border"
          dangerouslySetInnerHTML={{ __html: previewHtml }}
        />
      </div>
    );
  };

  return (
    <Card className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">
          {template ? 'Edit Template' : 'Create Template'}
        </h2>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setPreviewMode(previewMode === 'edit' ? 'preview' : 'edit')}
          >
            {previewMode === 'edit' ? 'Preview' : 'Edit'}
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700">
          {error}
        </div>
      )}

      {previewMode === 'edit' ? (
        <div className="space-y-4">
          <div>
            <Label htmlFor="name">Template Name *</Label>
            <Input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Welcome Email"
              required
              disabled={template && !template.customizable}
            />
          </div>

          <div>
            <Label htmlFor="category">Category *</Label>
            <select
              id="category"
              className="w-full p-2 border rounded"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              disabled={template && !template.customizable}
            >
              <option value="alert">Alert</option>
              <option value="welcome">Welcome</option>
              <option value="password-reset">Password Reset</option>
              <option value="report">Report</option>
              <option value="invitation">Invitation</option>
              <option value="system">System</option>
              <option value="custom">Custom</option>
            </select>
          </div>

          <div>
            <Label htmlFor="subject">Subject Line *</Label>
            <Input
              id="subject"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g., Welcome to {{companyName}}!"
              required
            />
            <p className="text-sm text-gray-500 mt-1">
              Use {'{{variable}}'} syntax for dynamic content
            </p>
          </div>

          <div>
            <Label htmlFor="html">HTML Content *</Label>
            <Textarea
              id="html"
              value={html}
              onChange={(e) => setHtml(e.target.value)}
              placeholder="Enter HTML template content..."
              rows={15}
              required
              className="font-mono text-sm"
            />
          </div>

          <div>
            <Label htmlFor="text">Plain Text Content (Optional)</Label>
            <Textarea
              id="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Enter plain text version..."
              rows={10}
              className="font-mono text-sm"
            />
          </div>

          {variables.length > 0 && (
            <div className="p-4 bg-blue-50 rounded">
              <h3 className="font-medium mb-2">Detected Variables:</h3>
              <div className="flex flex-wrap gap-2">
                {variables.map(variable => (
                  <span
                    key={variable}
                    className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm"
                  >
                    {variable}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div>
          <h3 className="font-medium mb-3">Template Preview</h3>
          {renderPreview()}
        </div>
      )}

      <div className="flex justify-end gap-2 mt-6">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          disabled={saving || !name || !subject || !html || (template && !template.customizable)}
        >
          {saving ? 'Saving...' : 'Save Template'}
        </Button>
      </div>
    </Card>
  );
};