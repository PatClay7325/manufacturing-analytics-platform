/**
 * Contact Points Page - Grafana-compatible notification channels
 * /alerting/notifications route
 */

'use client';

import { useState, useEffect } from 'react';
import { Plus, Mail, MessageSquare, Webhook, Send, Bell, Settings, TestTube, Trash2, Edit } from 'lucide-react';
import Link from 'next/link';
import { PageLayout } from '@/components/layout/PageLayout';
import { TabNavigation } from '@/components/common/TabNavigation';
import { cn } from '@/lib/utils';

interface ContactPoint {
  uid: string;
  name: string;
  type: 'email' | 'slack' | 'webhook' | 'pagerduty' | 'teams' | 'discord' | 'telegram' | 'line' | 'pushover';
  settings: Record<string, any>;
  disableResolveMessage?: boolean;
  sendReminder?: boolean;
  frequency?: string;
  isDefault?: boolean;
  created?: string;
  updated?: string;
}

interface NotificationTemplate {
  name: string;
  content: string;
}

export default function ContactPointsPage() {
  const [contactPoints, setContactPoints] = useState<ContactPoint[]>([]);
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewModal, setShowNewModal] = useState(false);
  const [selectedType, setSelectedType] = useState<ContactPoint['type'] | ''>('');
  const [testingPoint, setTestingPoint] = useState<string | null>(null);

  const alertingTabs = [
    { id: 'rules', label: 'Alert rules', href: '/alerting/list' },
    { id: 'contact', label: 'Contact points', href: '/alerting/notifications' },
    { id: 'policies', label: 'Notification policies', href: '/alerting/routes' },
    { id: 'silences', label: 'Silences', href: '/alerting/silences' },
    { id: 'groups', label: 'Alert groups', href: '/alerting/groups' },
    { id: 'admin', label: 'Admin', href: '/alerting/admin' },
  ];

  const contactTypes = [
    { type: 'email', label: 'Email', icon: Mail, description: 'Send notifications via email' },
    { type: 'slack', label: 'Slack', icon: MessageSquare, description: 'Send to Slack channels or users' },
    { type: 'webhook', label: 'Webhook', icon: Webhook, description: 'Send to any webhook endpoint' },
    { type: 'pagerduty', label: 'PagerDuty', icon: Bell, description: 'Create PagerDuty incidents' },
    { type: 'teams', label: 'Microsoft Teams', icon: MessageSquare, description: 'Send to Teams channels' },
    { type: 'discord', label: 'Discord', icon: MessageSquare, description: 'Send to Discord channels' },
    { type: 'telegram', label: 'Telegram', icon: Send, description: 'Send to Telegram chats' },
    { type: 'pushover', label: 'Pushover', icon: Bell, description: 'Send push notifications' },
  ];

  useEffect(() => {
    fetchContactPoints();
    fetchTemplates();
  }, []);

  const fetchContactPoints = async () => {
    try {
      const response = await fetch('/api/alerts/contact-points');
      if (response.ok) {
        const data = await response.json();
        setContactPoints(data);
      }
    } catch (error) {
      console.error('Failed to fetch contact points:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/alerts/templates');
      if (response.ok) {
        const data = await response.json();
        setTemplates(data);
      }
    } catch (error) {
      console.error('Failed to fetch templates:', error);
    }
  };

  const handleTest = async (uid: string) => {
    setTestingPoint(uid);
    try {
      const response = await fetch(`/api/alerts/contact-points/${uid}/test`, {
        method: 'POST',
      });

      if (response.ok) {
        alert('Test notification sent successfully!');
      } else {
        alert('Failed to send test notification');
      }
    } catch (error) {
      console.error('Failed to test contact point:', error);
      alert('Failed to send test notification');
    } finally {
      setTestingPoint(null);
    }
  };

  const handleDelete = async (uid: string) => {
    if (!confirm('Are you sure you want to delete this contact point?')) return;

    try {
      const response = await fetch(`/api/alerts/contact-points/${uid}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setContactPoints(contactPoints.filter(cp => cp.uid !== uid));
      }
    } catch (error) {
      console.error('Failed to delete contact point:', error);
    }
  };

  const getTypeIcon = (type: ContactPoint['type']) => {
    const config = contactTypes.find(ct => ct.type === type);
    const Icon = config?.icon || Bell;
    return <Icon className="h-5 w-5" />;
  };

  return (
    <PageLayout
      title="Contact points"
      description="Manage notification channels for alerts"
    >
      <div className="space-y-6">
        {/* Tabs */}
        <TabNavigation tabs={alertingTabs} activeTab="contact" />

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-muted-foreground">
              Define where to send your alert notifications. 
              Create separate contact points for different teams or severity levels.
            </p>
          </div>
          
          <button
            onClick={() => setShowNewModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Add contact point
          </button>
        </div>

        {/* Contact Points List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : contactPoints.length === 0 ? (
          <div className="text-center py-12 border rounded-lg">
            <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No contact points</h3>
            <p className="text-muted-foreground mb-4">
              Create your first contact point to start receiving alert notifications
            </p>
            <button
              onClick={() => setShowNewModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              Add contact point
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {contactPoints.map((point) => (
              <div key={point.uid} className="border rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-accent rounded-md">
                      {getTypeIcon(point.type)}
                    </div>
                    
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{point.name}</h3>
                        {point.isDefault && (
                          <span className="px-2 py-0.5 text-xs bg-primary/10 text-primary rounded-full">
                            Default
                          </span>
                        )}
                      </div>
                      
                      <p className="text-sm text-muted-foreground mt-1">
                        {contactTypes.find(ct => ct.type === point.type)?.label || point.type}
                      </p>
                      
                      {/* Type-specific details */}
                      <div className="text-sm text-muted-foreground mt-2">
                        {point.type === 'email' && point.settings.addresses && (
                          <span>To: {point.settings.addresses.join(', ')}</span>
                        )}
                        {point.type === 'slack' && point.settings.url && (
                          <span>Webhook configured</span>
                        )}
                        {point.type === 'webhook' && point.settings.url && (
                          <span>{point.settings.url}</span>
                        )}
                      </div>
                      
                      {point.sendReminder && (
                        <div className="text-sm text-muted-foreground mt-1">
                          Reminders every {point.frequency}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleTest(point.uid)}
                      disabled={testingPoint === point.uid}
                      className="flex items-center gap-1 px-3 py-1 text-sm border rounded hover:bg-accent disabled:opacity-50"
                    >
                      <TestTube className="h-3 w-3" />
                      {testingPoint === point.uid ? 'Testing...' : 'Test'}
                    </button>
                    
                    <Link
                      href={`/alerting/contact-points/${point.uid}/edit`}
                      className="p-1 hover:bg-accent rounded"
                    >
                      <Edit className="h-4 w-4" />
                    </Link>
                    
                    <button
                      onClick={() => handleDelete(point.uid)}
                      className="p-1 hover:bg-accent rounded text-destructive"
                      disabled={point.isDefault}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Templates Section */}
        <div className="border-t pt-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold">Notification templates</h2>
              <p className="text-sm text-muted-foreground">
                Create reusable templates for your alert notifications
              </p>
            </div>
            
            <Link
              href="/alerting/templates/new"
              className="flex items-center gap-2 px-3 py-1.5 text-sm border rounded-md hover:bg-accent"
            >
              <Plus className="h-3 w-3" />
              New template
            </Link>
          </div>
          
          {templates.length === 0 ? (
            <div className="text-center py-8 border rounded-lg">
              <p className="text-muted-foreground">No notification templates defined</p>
            </div>
          ) : (
            <div className="space-y-2">
              {templates.map((template) => (
                <div key={template.name} className="flex items-center justify-between p-3 border rounded-md">
                  <span className="font-mono text-sm">{template.name}</span>
                  <Link
                    href={`/alerting/templates/${template.name}/edit`}
                    className="text-sm text-primary hover:underline"
                  >
                    Edit
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* New Contact Point Modal */}
        {showNewModal && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-background border rounded-lg shadow-lg max-w-2xl w-full max-h-[80vh] overflow-auto">
              <div className="p-6">
                <h2 className="text-xl font-semibold mb-4">Choose contact point type</h2>
                
                <div className="grid grid-cols-2 gap-4">
                  {contactTypes.map((type) => {
                    const Icon = type.icon;
                    return (
                      <button
                        key={type.type}
                        onClick={() => {
                          setSelectedType(type.type as ContactPoint['type']);
                          setShowNewModal(false);
                          // Navigate to create page with type
                          window.location.href = `/alerting/contact-points/new?type=${type.type}`;
                        }}
                        className="flex items-start gap-3 p-4 border rounded-lg hover:bg-accent text-left"
                      >
                        <Icon className="h-5 w-5 mt-0.5" />
                        <div>
                          <h3 className="font-medium">{type.label}</h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            {type.description}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
                
                <div className="mt-6 flex justify-end">
                  <button
                    onClick={() => setShowNewModal(false)}
                    className="px-4 py-2 border rounded-md hover:bg-accent"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageLayout>
  );
}