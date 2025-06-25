# Email Notification System Documentation

## Overview

The Manufacturing Analytics Platform includes a comprehensive email notification system that matches manufacturingPlatform's email capabilities. This system provides reliable email delivery with support for multiple providers, templates, queuing, and tracking.

## Features

### 1. **Email Service**
- **Multi-Provider Support**: SMTP, SendGrid, AWS SES
- **Template Engine**: Handlebars-based HTML email templates
- **Queue System**: Reliable delivery with retry mechanism
- **Email Tracking**: Open rates, click tracking, bounce handling
- **Rate Limiting**: Prevent overwhelming recipients or providers

### 2. **Email Templates**
- **Pre-built Templates**:
  - Alert notifications
  - Welcome emails
  - Password reset
  - Scheduled reports
  - Team invitations
  - System notifications
- **Template Editor**: Visual editor for customizing templates
- **Variable Support**: Dynamic content with Handlebars syntax
- **Preview Mode**: Test templates with sample data

### 3. **Configuration**
- Environment-based provider selection
- SMTP/SendGrid/SES credentials
- From address and reply-to configuration
- Rate limiting and throttling settings

### 4. **Integration Points**
- **Alert System**: Automatic email notifications for alerts
- **User Management**: Welcome emails, password resets
- **Report Scheduling**: Scheduled dashboard reports via email
- **Team Collaboration**: Invitation and notification emails

## Setup

### 1. Environment Configuration

Configure your email provider in `.env.local`:

```env
# Email Provider (smtp, sendgrid, ses)
EMAIL_PROVIDER=smtp

# From Address
EMAIL_FROM=noreply@manufacturing.com
EMAIL_FROM_NAME=Manufacturing Analytics Platform
EMAIL_REPLY_TO=support@manufacturing.com

# SMTP Configuration (if EMAIL_PROVIDER=smtp)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_SECURE=true

# SendGrid Configuration (if EMAIL_PROVIDER=sendgrid)
SENDGRID_API_KEY=SG.your-sendgrid-api-key

# AWS SES Configuration (if EMAIL_PROVIDER=ses)
# Uses AWS_* environment variables
```

### 2. Database Migration

Run the migration to create email tables:

```bash
npm run prisma:push
```

### 3. Seed Email Templates

Initialize default email templates:

```bash
npx tsx scripts/seed-email-templates.ts
```

## Usage

### Sending Emails Programmatically

```typescript
import { EmailService } from '@/lib/email/EmailService';

// Initialize service
const emailService = new EmailService({
  provider: 'smtp',
  from: {
    email: 'noreply@example.com',
    name: 'Manufacturing Platform'
  },
  smtp: {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: true,
    user: process.env.SMTP_USER,
    password: process.env.SMTP_PASSWORD
  }
});

// Send email with template
await emailService.send({
  to: 'user@example.com',
  templateId: 'alert-notification',
  templateData: {
    title: 'High Temperature Alert',
    severity: 'high',
    description: 'Equipment temperature exceeded threshold',
    // ... other template variables
  }
});

// Send custom email
await emailService.send({
  to: ['user1@example.com', 'user2@example.com'],
  subject: 'Custom Notification',
  html: '<h1>Hello</h1><p>Custom email content</p>',
  text: 'Hello\n\nCustom email content'
});
```

### Alert Email Integration

The system automatically sends emails for alerts:

```typescript
import { alertEmailService } from '@/services/alertEmailService';

// Send alert notification
await alertEmailService.sendAlertNotification({
  alert: alertData,
  recipients: ['operator@example.com'],
  includeMetrics: true,
  includeDashboardLink: true
});

// Send alert summary
await alertEmailService.sendAlertSummary(
  ['manager@example.com'],
  activeAlerts
);
```

### Email Templates

#### Template Variables

Templates use Handlebars syntax for dynamic content:

```handlebars
<h1>Hello {{userName}}</h1>
<p>You have {{alertCount}} active alerts.</p>

{{#if criticalAlerts}}
<div class="alert-critical">
  <h2>Critical Alerts</h2>
  {{#each criticalAlerts}}
    <p>{{this.title}} - {{this.description}}</p>
  {{/each}}
</div>
{{/if}}
```

#### Available Helpers

- `{{formatDate date "PPP"}}` - Format dates
- `{{formatNumber value 2}}` - Format numbers with decimals
- `{{formatCurrency amount "USD"}}` - Format currency
- `{{formatPercent value 1}}` - Format percentages
- `{{uppercase text}}` - Convert to uppercase
- `{{capitalize text}}` - Capitalize first letter
- `{{severityColor severity}}` - Get color for alert severity
- `{{statusIcon status}}` - Get icon for status

### Managing Email Preferences

Users can manage their email preferences:

```typescript
// Get user preferences
const preferences = await emailService.getNotificationPreferences(userId);

// Update preferences
await emailService.updateNotificationPreferences(userId, {
  enabled: true,
  categories: {
    alerts: true,
    reports: false,
    system: true,
    marketing: false
  },
  frequency: {
    immediate: true,
    daily: false,
    weekly: true
  }
});
```

### Email Queue

The system uses a queue for reliable delivery:

```typescript
// Email is queued by default
const queueId = await emailService.send(message);

// Send immediately (bypass queue)
const result = await emailService.send(message, { immediate: true });

// Check queue status
const status = await emailService.getQueueStats();
// { pending: 5, processing: 2, sent: 150, failed: 1, total: 158 }
```

### Bulk Emails

Send emails to multiple recipients efficiently:

```typescript
const result = await emailService.sendBulk({
  recipients: [
    { to: 'user1@example.com', templateData: { name: 'User 1' } },
    { to: 'user2@example.com', templateData: { name: 'User 2' } },
    // ... more recipients
  ],
  templateId: 'weekly-report',
  throttle: {
    perSecond: 10,
    perMinute: 100
  }
});
```

## API Endpoints

### POST /api/email/send
Send individual emails

```json
{
  "to": "user@example.com",
  "subject": "Test Email",
  "html": "<p>Email content</p>",
  "templateId": "alert-notification",
  "templateData": {},
  "priority": "high",
  "immediate": false
}
```

### POST /api/email/bulk
Send bulk emails

```json
{
  "recipients": [
    {
      "to": "user1@example.com",
      "templateData": { "name": "User 1" }
    }
  ],
  "templateId": "newsletter",
  "throttle": {
    "perSecond": 10
  }
}
```

### GET /api/email/templates
List all templates

### PUT /api/email/templates/[id]
Update a template

### GET /api/email/history
Get email history with filtering

### POST /api/email/test
Test email configuration

## Email Templates Reference

### Alert Notification Template

**ID**: `alert-notification`

**Variables**:
- `title` - Alert title
- `severity` - Alert severity (critical, high, medium, low)
- `status` - Alert status
- `sourceName` - Source of the alert
- `description` - Alert description
- `metrics` - Array of metric objects
- `recommendedActions` - Array of recommended actions

### Welcome Email Template

**ID**: `welcome-email`

**Variables**:
- `userName` - User's name
- `userEmail` - User's email
- `userRole` - User's role
- `department` - User's department (optional)
- `dashboardUrl` - Dashboard URL

### Password Reset Template

**ID**: `password-reset`

**Variables**:
- `userName` - User's name
- `resetUrl` - Password reset URL
- `expirationHours` - Link expiration time

### Report Email Template

**ID**: `scheduled-report`

**Variables**:
- `reportType` - Type of report
- `reportPeriod` - Report period
- `summary` - Executive summary
- `metrics` - Array of metrics
- `alerts` - Alert counts by severity

## Troubleshooting

### Common Issues

1. **Emails not sending**
   - Check email provider credentials
   - Verify SMTP settings (host, port, security)
   - Check rate limits
   - Review queue status

2. **Template not found**
   - Run seed script to initialize templates
   - Check template ID matches

3. **Rate limiting**
   - Adjust throttle settings
   - Use bulk send for multiple recipients
   - Check provider limits

### Testing

1. **Test email configuration**:
   ```bash
   curl -X POST http://localhost:3000/api/email/test \
     -H "Content-Type: application/json" \
     -d '{"email": "test@example.com"}'
   ```

2. **Check queue status**:
   - Visit `/admin/email` in the dashboard
   - Check the queue stats in the History tab

3. **Preview templates**:
   - Use the template editor's preview mode
   - Send test emails with sample data

## Security Considerations

1. **Authentication**: All email endpoints require authentication
2. **Permissions**: Only admins can manage templates and send bulk emails
3. **Rate Limiting**: Built-in rate limiting prevents abuse
4. **Unsubscribe**: Automatic unsubscribe link handling
5. **Data Sanitization**: All user input is sanitized before rendering

## Performance Optimization

1. **Queue Processing**: Emails are processed in batches
2. **Template Caching**: Compiled templates are cached
3. **Connection Pooling**: SMTP connections are pooled
4. **Retry Logic**: Failed emails retry with exponential backoff
5. **Cleanup**: Old email history is automatically cleaned up

## Future Enhancements

- [ ] Email analytics dashboard
- [ ] A/B testing for templates
- [ ] Webhook support for email events
- [ ] Multi-language template support
- [ ] Email scheduling UI
- [ ] Template marketplace