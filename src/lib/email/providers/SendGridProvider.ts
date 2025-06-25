import sgMail from '@sendgrid/mail';
import { EmailProvider, EmailMessage, EmailSendResult, EmailConfig } from '../types';

export class SendGridProvider implements EmailProvider {
  name = 'sendgrid';
  private config: EmailConfig;

  constructor(config: EmailConfig) {
    this.config = config;
    
    if (!config.sendgrid?.apiKey) {
      throw new Error('SendGrid API key is required');
    }

    sgMail.setApiKey(config.sendgrid.apiKey);
  }

  async send(message: EmailMessage): Promise<EmailSendResult> {
    try {
      const msg = {
        from: {
          email: this.config.from.email,
          name: this.config.from.name,
        },
        to: message.to,
        cc: message.cc,
        bcc: message.bcc,
        subject: message.subject,
        html: message.html,
        text: message.text,
        replyTo: this.config.replyTo,
        headers: message.headers,
        attachments: message.attachments?.map(att => ({
          filename: att.filename,
          content: typeof att.content === 'string' ? att.content : att.content.toString('base64'),
          type: att.contentType,
          disposition: 'attachment',
          contentId: att.cid,
        })),
        customArgs: message.metadata,
        categories: message.tags,
        sendAt: message.scheduledAt ? Math.floor(message.scheduledAt.getTime() / 1000) : undefined,
      };

      const [response] = await sgMail.send(msg);

      return {
        success: true,
        messageId: response.headers['x-message-id'],
        details: {
          statusCode: response.statusCode,
          headers: response.headers,
        },
      };
    } catch (error: any) {
      console.error('SendGrid send error:', error);
      return {
        success: false,
        error: error.message || 'Unknown error',
        details: error.response?.body,
      };
    }
  }

  async verify(): Promise<boolean> {
    try {
      // SendGrid doesn't have a direct verify method, so we'll do a simple API call
      const response = await fetch('https://api.sendgrid.com/v3/user/profile', {
        headers: {
          Authorization: `Bearer ${this.config.sendgrid!.apiKey}`,
        },
      });
      return response.ok;
    } catch (error) {
      console.error('SendGrid verification failed:', error);
      return false;
    }
  }
}