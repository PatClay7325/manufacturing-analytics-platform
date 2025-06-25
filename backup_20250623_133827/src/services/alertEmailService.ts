import { Alert } from '@/models/alert';
import { EmailMessage } from '@/lib/email/types';
import { prisma } from '@/lib/prisma';

interface AlertEmailOptions {
  alert: Alert;
  recipients: string[];
  includeMetrics?: boolean;
  includeDashboardLink?: boolean;
}

export const alertEmailService = {
  /**
   * Send an email notification for an alert
   */
  async sendAlertNotification(options: AlertEmailOptions): Promise<void> {
    const { alert, recipients, includeMetrics = true, includeDashboardLink = true } = options;

    // Check recipient preferences
    const activeRecipients = await this.filterByPreferences(recipients, 'alerts');
    
    if (activeRecipients.length === 0) {
      console.log('No active recipients for alert notification');
      return;
    }

    // Prepare template data
    const templateData: Record<string, any> = {
      title: alert.title,
      severity: alert.severity,
      status: alert.status,
      sourceName: alert.sourceName || alert.source,
      createdAt: alert.createdAt,
      description: alert.description,
      alertId: alert.id,
      dashboardUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
      assignedTo: alert.assignedTo,
      dueBy: alert.dueBy,
    };

    if (includeMetrics && alert.metadata) {
      templateData.metrics = this.extractMetrics(alert.metadata);
    }

    if (includeDashboardLink) {
      templateData.dashboardUrl = `${templateData.dashboardUrl}/alerts/${alert.id}`;
    }

    // Recommended actions based on alert type
    templateData.recommendedActions = this.getRecommendedActions(alert);

    // Send email
    const response = await fetch('/api/email/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: activeRecipients,
        templateId: 'alert-notification',
        templateData,
        priority: this.getEmailPriority(alert.severity),
        tags: ['alert', alert.severity, alert.source],
        metadata: {
          alertId: alert.id,
          alertSeverity: alert.severity,
          alertSource: alert.source,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to send alert email: ${error.message}`);
    }
  },

  /**
   * Send a bulk alert summary email
   */
  async sendAlertSummary(recipients: string[], alerts: Alert[]): Promise<void> {
    const activeRecipients = await this.filterByPreferences(recipients, 'reports');
    
    if (activeRecipients.length === 0 || alerts.length === 0) {
      return;
    }

    // Group alerts by severity
    const alertsBySeverity = alerts.reduce((acc, alert) => {
      if (!acc[alert.severity]) acc[alert.severity] = [];
      acc[alert.severity].push(alert);
      return acc;
    }, {} as Record<string, Alert[]>);

    const templateData = {
      reportType: 'Alert Summary',
      reportPeriod: `${new Date().toLocaleDateString()}`,
      summary: `You have ${alerts.length} active alerts requiring attention.`,
      metrics: [
        {
          name: 'Critical Alerts',
          current: alertsBySeverity.critical?.length || 0,
          previous: 0,
          change: 0,
        },
        {
          name: 'High Priority Alerts',
          current: alertsBySeverity.high?.length || 0,
          previous: 0,
          change: 0,
        },
        {
          name: 'Medium Priority Alerts',
          current: alertsBySeverity.medium?.length || 0,
          previous: 0,
          change: 0,
        },
      ],
      alerts: {
        critical: alertsBySeverity.critical?.length || 0,
        high: alertsBySeverity.high?.length || 0,
        medium: alertsBySeverity.medium?.length || 0,
        low: alertsBySeverity.low?.length || 0,
      },
      dashboardUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
      reportId: `alert-summary-${Date.now()}`,
    };

    await fetch('/api/email/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: activeRecipients,
        templateId: 'scheduled-report',
        templateData,
        tags: ['report', 'alert-summary'],
      }),
    });
  },

  /**
   * Filter recipients by their email preferences
   */
  async filterByPreferences(recipients: string[], category: string): Promise<string[]> {
    const preferences = await prisma.emailPreferences.findMany({
      where: {
        email: { in: recipients },
        enabled: true,
      },
    });

    return preferences
      .filter(pref => {
        const categories = pref.categories as any;
        return categories[category] !== false;
      })
      .map(pref => pref.email);
  },

  /**
   * Extract metrics from alert metadata
   */
  extractMetrics(metadata: Record<string, any>): Array<{ label: string; value: string }> {
    const metrics: Array<{ label: string; value: string }> = [];

    if (metadata.temperature) {
      metrics.push({ label: 'Temperature', value: `${metadata.temperature}°C` });
    }

    if (metadata.pressure) {
      metrics.push({ label: 'Pressure', value: `${metadata.pressure} PSI` });
    }

    if (metadata.productionRate) {
      metrics.push({ label: 'Production Rate', value: `${metadata.productionRate} units/hr` });
    }

    if (metadata.efficiency) {
      metrics.push({ label: 'Efficiency', value: `${metadata.efficiency}%` });
    }

    if (metadata.downtime) {
      metrics.push({ label: 'Downtime', value: `${metadata.downtime} minutes` });
    }

    return metrics;
  },

  /**
   * Get recommended actions based on alert type
   */
  getRecommendedActions(alert: Alert): string[] {
    const actions: string[] = [];

    switch (alert.source) {
      case 'equipment':
        if (alert.severity === 'critical') {
          actions.push('Immediately stop the equipment and inspect for safety');
          actions.push('Contact maintenance team for urgent repair');
        } else if (alert.severity === 'high') {
          actions.push('Schedule maintenance at next available window');
          actions.push('Monitor equipment performance closely');
        } else {
          actions.push('Add to maintenance schedule');
          actions.push('Review equipment logs for patterns');
        }
        break;

      case 'quality':
        actions.push('Review quality control procedures');
        actions.push('Check recent production batches');
        actions.push('Verify measurement equipment calibration');
        break;

      case 'maintenance':
        actions.push('Review maintenance schedule');
        actions.push('Check spare parts inventory');
        actions.push('Update maintenance logs');
        break;

      case 'safety':
        actions.push('Ensure all personnel are safe');
        actions.push('Document incident details');
        actions.push('Review safety protocols');
        break;

      default:
        actions.push('Review alert details');
        actions.push('Assess impact on production');
        actions.push('Document response actions');
    }

    return actions;
  },

  /**
   * Map alert severity to email priority
   */
  getEmailPriority(severity: string): 'high' | 'normal' | 'low' {
    switch (severity) {
      case 'critical':
      case 'high':
        return 'high';
      case 'low':
      case 'info':
        return 'low';
      default:
        return 'normal';
    }
  },
};