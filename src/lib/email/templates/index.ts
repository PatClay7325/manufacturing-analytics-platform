import { EmailTemplate, EmailTemplateVariable } from '../types';

// Base template with common styles
const baseStyles = `
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
      background-color: #f5f5f5;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      background-color: #1a73e8;
      color: white;
      padding: 24px;
      text-align: center;
    }
    .content {
      padding: 32px 24px;
    }
    .footer {
      background-color: #f8f9fa;
      padding: 24px;
      text-align: center;
      font-size: 14px;
      color: #666;
    }
    .button {
      display: inline-block;
      padding: 12px 24px;
      background-color: #1a73e8;
      color: white;
      text-decoration: none;
      border-radius: 4px;
      font-weight: 500;
      margin: 16px 0;
    }
    .button:hover {
      background-color: #1557b0;
    }
    .alert-box {
      border-left: 4px solid;
      padding: 16px;
      margin: 16px 0;
      background-color: #f8f9fa;
      border-radius: 4px;
    }
    .alert-critical {
      border-color: #ff0000;
      background-color: #ffe6e6;
    }
    .alert-high {
      border-color: #ff6b6b;
      background-color: #ffe6e6;
    }
    .alert-medium {
      border-color: #ffa500;
      background-color: #fff3e0;
    }
    .alert-low {
      border-color: #ffd700;
      background-color: #fffbe6;
    }
    .alert-info {
      border-color: #4ecdc4;
      background-color: #e6f7f7;
    }
    .data-table {
      width: 100%;
      border-collapse: collapse;
      margin: 16px 0;
    }
    .data-table th,
    .data-table td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #e0e0e0;
    }
    .data-table th {
      background-color: #f8f9fa;
      font-weight: 600;
    }
    .metric {
      display: inline-block;
      margin: 8px 16px 8px 0;
    }
    .metric-label {
      font-size: 14px;
      color: #666;
    }
    .metric-value {
      font-size: 24px;
      font-weight: 600;
      color: #333;
    }
  </style>
`;

// Alert notification template
export const alertNotificationTemplate: EmailTemplate = {
  id: 'alert-notification',
  name: 'Alert Notification',
  subject: '{{statusIcon status}} {{capitalize severity}} Alert: {{title}}',
  html: `
    <!DOCTYPE html>
    <html>
    <head>
      ${baseStyles}
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Manufacturing Alert</h1>
        </div>
        <div class="content">
          <div class="alert-box alert-{{severity}}">
            <h2 style="margin-top: 0;">{{title}}</h2>
            <p><strong>Severity:</strong> {{capitalize severity}}</p>
            <p><strong>Status:</strong> {{capitalize status}}</p>
            <p><strong>Source:</strong> {{sourceName}}</p>
            <p><strong>Time:</strong> {{formatDate createdAt "PPpp"}}</p>
          </div>
          
          <h3>Alert Details</h3>
          <p>{{description}}</p>
          
          {{#if metrics}}
          <h3>Current Metrics</h3>
          <div>
            {{#each metrics}}
            <div class="metric">
              <div class="metric-label">{{this.label}}</div>
              <div class="metric-value">{{this.value}}</div>
            </div>
            {{/each}}
          </div>
          {{/if}}
          
          {{#if assignedTo}}
          <p><strong>Assigned to:</strong> {{assignedTo}}</p>
          {{/if}}
          
          {{#if dueBy}}
          <p><strong>Due by:</strong> {{formatDate dueBy "PPp"}}</p>
          {{/if}}
          
          <div style="text-align: center; margin: 32px 0;">
            <a href="{{dashboardUrl}}/alerts/{{alertId}}" class="button">View Alert Details</a>
          </div>
          
          {{#if recommendedActions}}
          <h3>Recommended Actions</h3>
          <ul>
            {{#each recommendedActions}}
            <li>{{this}}</li>
            {{/each}}
          </ul>
          {{/if}}
        </div>
        <div class="footer">
          <p>This is an automated alert from the Manufacturing AnalyticsPlatform.</p>
          <p>
            <a href="{{dashboardUrl}}/profile/notifications">Manage notification preferences</a> |
            <a href="{{unsubscribeUrl}}">Unsubscribe</a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `,
  text: `
Manufacturing Alert: {{title}}

Severity: {{severity}}
Status: {{status}}
Source: {{sourceName}}
Time: {{createdAt}}

{{description}}

{{#if assignedTo}}Assigned to: {{assignedTo}}{{/if}}
{{#if dueBy}}Due by: {{dueBy}}{{/if}}

View alert details: {{dashboardUrl}}/alerts/{{alertId}}

This is an automated alert from the Manufacturing AnalyticsPlatform.
  `,
  variables: ['title', 'severity', 'status', 'sourceName', 'createdAt', 'description', 
              'alertId', 'dashboardUrl', 'assignedTo', 'dueBy', 'metrics', 
              'recommendedActions', 'unsubscribeUrl'],
  category: 'alert',
  createdAt: new Date(),
  updatedAt: new Date(),
  customizable: true,
};

// Welcome email template
export const welcomeEmailTemplate: EmailTemplate = {
  id: 'welcome-email',
  name: 'Welcome Email',
  subject: 'Welcome to Manufacturing AnalyticsPlatform, {{userName}}!',
  html: `
    <!DOCTYPE html>
    <html>
    <head>
      ${baseStyles}
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Welcome to Manufacturing AnalyticsPlatform</h1>
        </div>
        <div class="content">
          <h2>Hello {{userName}}!</h2>
          <p>Welcome to your new manufacturing analytics dashboard. We're excited to have you on board!</p>
          
          <p>Your account has been successfully created with the following details:</p>
          <ul>
            <li><strong>Email:</strong> {{userEmail}}</li>
            <li><strong>Role:</strong> {{userRole}}</li>
            {{#if department}}<li><strong>Department:</strong> {{department}}</li>{{/if}}
          </ul>
          
          <h3>Getting Started</h3>
          <p>Here are some resources to help you get started:</p>
          <ul>
            <li><a href="{{dashboardUrl}}/documentation">Documentation</a> - Learn about all features</li>
            <li><a href="{{dashboardUrl}}/dashboards">Dashboards</a> - View your manufacturing metrics</li>
            <li><a href="{{dashboardUrl}}/alerts">Alerts</a> - Monitor critical events</li>
            <li><a href="{{dashboardUrl}}/profile">Profile</a> - Customize your settings</li>
          </ul>
          
          <div style="text-align: center; margin: 32px 0;">
            <a href="{{dashboardUrl}}" class="button">Go to Dashboard</a>
          </div>
          
          <h3>Need Help?</h3>
          <p>If you have any questions or need assistance, our support team is here to help:</p>
          <ul>
            <li>Email: support@manufacturinganalytics.com</li>
            <li>Documentation: <a href="{{dashboardUrl}}/help">Help Center</a></li>
          </ul>
        </div>
        <div class="footer">
          <p>Thank you for choosing Manufacturing AnalyticsPlatform!</p>
          <p>© 2024 Manufacturing AnalyticsPlatform. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `,
  variables: ['userName', 'userEmail', 'userRole', 'department', 'dashboardUrl'],
  category: 'welcome',
  createdAt: new Date(),
  updatedAt: new Date(),
  customizable: true,
};

// Password reset template
export const passwordResetTemplate: EmailTemplate = {
  id: 'password-reset',
  name: 'Password Reset',
  subject: 'Reset Your Password - Manufacturing AnalyticsPlatform',
  html: `
    <!DOCTYPE html>
    <html>
    <head>
      ${baseStyles}
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Password Reset Request</h1>
        </div>
        <div class="content">
          <h2>Hello {{userName}},</h2>
          <p>We received a request to reset your password for your Manufacturing AnalyticsPlatform account.</p>
          
          <p>To reset your password, click the button below:</p>
          
          <div style="text-align: center; margin: 32px 0;">
            <a href="{{resetUrl}}" class="button">Reset Password</a>
          </div>
          
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; background-color: #f8f9fa; padding: 12px; border-radius: 4px;">
            {{resetUrl}}
          </p>
          
          <p><strong>This link will expire in {{expirationHours}} hours.</strong></p>
          
          <p>If you didn't request a password reset, please ignore this email or contact support if you have concerns.</p>
          
          <h3>Security Tips</h3>
          <ul>
            <li>Never share your password with anyone</li>
            <li>Use a strong, unique password</li>
            <li>Enable two-factor authentication for added security</li>
          </ul>
        </div>
        <div class="footer">
          <p>This is an automated message from Manufacturing AnalyticsPlatform.</p>
          <p>For security reasons, this link will expire in {{expirationHours}} hours.</p>
        </div>
      </div>
    </body>
    </html>
  `,
  variables: ['userName', 'resetUrl', 'expirationHours'],
  category: 'password-reset',
  createdAt: new Date(),
  updatedAt: new Date(),
  customizable: true,
};

// Report email template
export const reportEmailTemplate: EmailTemplate = {
  id: 'scheduled-report',
  name: 'Scheduled Report',
  subject: '{{reportType}} Report - {{reportPeriod}}',
  html: `
    <!DOCTYPE html>
    <html>
    <head>
      ${baseStyles}
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>{{reportType}} Report</h1>
          <p style="margin: 0;">{{reportPeriod}}</p>
        </div>
        <div class="content">
          <h2>Executive Summary</h2>
          <p>{{summary}}</p>
          
          <h3>Key Metrics</h3>
          <table class="data-table">
            <thead>
              <tr>
                <th>Metric</th>
                <th>Current Period</th>
                <th>Previous Period</th>
                <th>Change</th>
              </tr>
            </thead>
            <tbody>
              {{#each metrics}}
              <tr>
                <td>{{this.name}}</td>
                <td>{{this.current}}</td>
                <td>{{this.previous}}</td>
                <td style="color: {{#if (gt this.change 0)}}green{{else}}red{{/if}}">
                  {{#if (gt this.change 0)}}+{{/if}}{{formatPercent this.change}}
                </td>
              </tr>
              {{/each}}
            </tbody>
          </table>
          
          {{#if alerts}}
          <h3>Active Alerts Summary</h3>
          <ul>
            <li>Critical: {{alerts.critical}}</li>
            <li>High: {{alerts.high}}</li>
            <li>Medium: {{alerts.medium}}</li>
            <li>Low: {{alerts.low}}</li>
          </ul>
          {{/if}}
          
          {{#if attachments}}
          <p><strong>Attachments:</strong> {{join attachmentNames ", "}}</p>
          {{/if}}
          
          <div style="text-align: center; margin: 32px 0;">
            <a href="{{dashboardUrl}}/reports/{{reportId}}" class="button">View Full Report</a>
          </div>
        </div>
        <div class="footer">
          <p>This is an automated report from Manufacturing AnalyticsPlatform.</p>
          <p>
            <a href="{{dashboardUrl}}/profile/reports">Manage report preferences</a> |
            <a href="{{unsubscribeUrl}}">Unsubscribe from reports</a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `,
  variables: ['reportType', 'reportPeriod', 'summary', 'metrics', 'alerts', 
              'dashboardUrl', 'reportId', 'attachmentNames', 'unsubscribeUrl'],
  category: 'report',
  createdAt: new Date(),
  updatedAt: new Date(),
  customizable: true,
};

// Team invitation template
export const teamInvitationTemplate: EmailTemplate = {
  id: 'team-invitation',
  name: 'Team Invitation',
  subject: '{{inviterName}} invited you to join {{teamName}} on Manufacturing AnalyticsPlatform',
  html: `
    <!DOCTYPE html>
    <html>
    <head>
      ${baseStyles}
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>You're Invited!</h1>
        </div>
        <div class="content">
          <h2>Hello{{#if recipientName}} {{recipientName}}{{/if}},</h2>
          
          <p><strong>{{inviterName}}</strong> has invited you to join the <strong>{{teamName}}</strong> team on Manufacturing AnalyticsPlatform.</p>
          
          {{#if message}}
          <div style="background-color: #f8f9fa; padding: 16px; border-radius: 4px; margin: 16px 0;">
            <p style="margin: 0;"><strong>Message from {{inviterName}}:</strong></p>
            <p style="margin: 8px 0 0 0;">{{message}}</p>
          </div>
          {{/if}}
          
          <h3>Team Details</h3>
          <ul>
            <li><strong>Team:</strong> {{teamName}}</li>
            <li><strong>Role:</strong> {{role}}</li>
            {{#if permissions}}
            <li><strong>Permissions:</strong> {{join permissions ", "}}</li>
            {{/if}}
          </ul>
          
          <div style="text-align: center; margin: 32px 0;">
            <a href="{{invitationUrl}}" class="button">Accept Invitation</a>
          </div>
          
          <p>This invitation will expire in {{expirationDays}} days.</p>
          
          <p>If you have any questions about this invitation, please contact {{inviterName}} at {{inviterEmail}}.</p>
        </div>
        <div class="footer">
          <p>This invitation was sent from Manufacturing AnalyticsPlatform.</p>
          <p>If you believe this email was sent in error, please ignore it.</p>
        </div>
      </div>
    </body>
    </html>
  `,
  variables: ['inviterName', 'inviterEmail', 'teamName', 'recipientName', 
              'role', 'permissions', 'message', 'invitationUrl', 'expirationDays'],
  category: 'invitation',
  createdAt: new Date(),
  updatedAt: new Date(),
  customizable: true,
};

// System notification template
export const systemNotificationTemplate: EmailTemplate = {
  id: 'system-notification',
  name: 'System Notification',
  subject: 'System Notification: {{subject}}',
  html: `
    <!DOCTYPE html>
    <html>
    <head>
      ${baseStyles}
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>System Notification</h1>
        </div>
        <div class="content">
          <h2>{{subject}}</h2>
          
          <div class="alert-box alert-{{#if severity}}{{severity}}{{else}}info{{/if}}">
            <p style="margin: 0;">{{message}}</p>
          </div>
          
          {{#if details}}
          <h3>Details</h3>
          {{#each details}}
          <p><strong>{{@key}}:</strong> {{this}}</p>
          {{/each}}
          {{/if}}
          
          {{#if affectedSystems}}
          <h3>Affected Systems</h3>
          <ul>
            {{#each affectedSystems}}
            <li>{{this}}</li>
            {{/each}}
          </ul>
          {{/if}}
          
          {{#if estimatedResolution}}
          <p><strong>Estimated Resolution:</strong> {{formatDate estimatedResolution "PPp"}}</p>
          {{/if}}
          
          {{#if actionRequired}}
          <div style="background-color: #fff3e0; padding: 16px; border-radius: 4px; margin: 16px 0;">
            <p style="margin: 0;"><strong>Action Required:</strong></p>
            <p style="margin: 8px 0 0 0;">{{actionRequired}}</p>
          </div>
          {{/if}}
          
          {{#if contactInfo}}
          <h3>Contact Information</h3>
          <p>If you have questions or need assistance:</p>
          <ul>
            {{#if contactInfo.email}}<li>Email: {{contactInfo.email}}</li>{{/if}}
            {{#if contactInfo.phone}}<li>Phone: {{contactInfo.phone}}</li>{{/if}}
            {{#if contactInfo.slack}}<li>Slack: {{contactInfo.slack}}</li>{{/if}}
          </ul>
          {{/if}}
        </div>
        <div class="footer">
          <p>This is an automated system notification from Manufacturing AnalyticsPlatform.</p>
          <p>Notification sent: {{formatDate timestamp "PPpp"}}</p>
        </div>
      </div>
    </body>
    </html>
  `,
  variables: ['subject', 'message', 'severity', 'details', 'affectedSystems', 
              'estimatedResolution', 'actionRequired', 'contactInfo', 'timestamp'],
  category: 'system',
  createdAt: new Date(),
  updatedAt: new Date(),
  customizable: true,
};

// Export all templates
export const defaultTemplates: EmailTemplate[] = [
  alertNotificationTemplate,
  welcomeEmailTemplate,
  passwordResetTemplate,
  reportEmailTemplate,
  teamInvitationTemplate,
  systemNotificationTemplate,
];

// Template variables definitions
export const templateVariables: Record<string, EmailTemplateVariable[]> = {
  'alert-notification': [
    { name: 'title', type: 'string', required: true },
    { name: 'severity', type: 'string', required: true },
    { name: 'status', type: 'string', required: true },
    { name: 'sourceName', type: 'string', required: true },
    { name: 'createdAt', type: 'date', required: true },
    { name: 'description', type: 'string', required: true },
    { name: 'alertId', type: 'string', required: true },
    { name: 'dashboardUrl', type: 'string', required: true },
    { name: 'assignedTo', type: 'string', required: false },
    { name: 'dueBy', type: 'date', required: false },
    { name: 'metrics', type: 'array', required: false },
    { name: 'recommendedActions', type: 'array', required: false },
    { name: 'unsubscribeUrl', type: 'string', required: true },
  ],
  'welcome-email': [
    { name: 'userName', type: 'string', required: true },
    { name: 'userEmail', type: 'string', required: true },
    { name: 'userRole', type: 'string', required: true },
    { name: 'department', type: 'string', required: false },
    { name: 'dashboardUrl', type: 'string', required: true },
  ],
  'password-reset': [
    { name: 'userName', type: 'string', required: true },
    { name: 'resetUrl', type: 'string', required: true },
    { name: 'expirationHours', type: 'number', required: true, defaultValue: 24 },
  ],
  'scheduled-report': [
    { name: 'reportType', type: 'string', required: true },
    { name: 'reportPeriod', type: 'string', required: true },
    { name: 'summary', type: 'string', required: true },
    { name: 'metrics', type: 'array', required: true },
    { name: 'alerts', type: 'object', required: false },
    { name: 'dashboardUrl', type: 'string', required: true },
    { name: 'reportId', type: 'string', required: true },
    { name: 'attachmentNames', type: 'array', required: false },
    { name: 'unsubscribeUrl', type: 'string', required: true },
  ],
  'team-invitation': [
    { name: 'inviterName', type: 'string', required: true },
    { name: 'inviterEmail', type: 'string', required: true },
    { name: 'teamName', type: 'string', required: true },
    { name: 'recipientName', type: 'string', required: false },
    { name: 'role', type: 'string', required: true },
    { name: 'permissions', type: 'array', required: false },
    { name: 'message', type: 'string', required: false },
    { name: 'invitationUrl', type: 'string', required: true },
    { name: 'expirationDays', type: 'number', required: true, defaultValue: 7 },
  ],
  'system-notification': [
    { name: 'subject', type: 'string', required: true },
    { name: 'message', type: 'string', required: true },
    { name: 'severity', type: 'string', required: false, defaultValue: 'info' },
    { name: 'details', type: 'object', required: false },
    { name: 'affectedSystems', type: 'array', required: false },
    { name: 'estimatedResolution', type: 'date', required: false },
    { name: 'actionRequired', type: 'string', required: false },
    { name: 'contactInfo', type: 'object', required: false },
    { name: 'timestamp', type: 'date', required: true, defaultValue: new Date() },
  ],
};