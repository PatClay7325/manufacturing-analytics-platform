import nodemailer from 'nodemailer';
import { EmailProvider, EmailMessage, EmailSendResult, EmailConfig } from '../types';

export class SmtpProvider implements EmailProvider {
  name = 'smtp';
  private transporter: nodemailer.Transporter;
  private config: EmailConfig;

  constructor(config: EmailConfig) {
    this.config = config;
    
    if (!config.smtp) {
      throw new Error('SMTP configuration is required');
    }

    this.transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.secure,
      auth: {
        user: config.smtp.user,
        pass: config.smtp.password,
      },
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
      rateLimit: 10, // 10 messages per second
    });
  }

  async send(message: EmailMessage): Promise<EmailSendResult> {
    try {
      const mailOptions: nodemailer.SendMailOptions = {
        from: `${this.config.from.name} <${this.config.from.email}>`,
        to: Array.isArray(message.to) ? message.to.join(', ') : message.to,
        cc: message.cc ? (Array.isArray(message.cc) ? message.cc.join(', ') : message.cc) : undefined,
        bcc: message.bcc ? (Array.isArray(message.bcc) ? message.bcc.join(', ') : message.bcc) : undefined,
        subject: message.subject,
        html: message.html,
        text: message.text,
        replyTo: this.config.replyTo,
        headers: message.headers,
        attachments: message.attachments?.map(att => ({
          filename: att.filename,
          content: att.content,
          contentType: att.contentType,
          encoding: att.encoding,
          cid: att.cid,
        })),
      };

      const info = await this.transporter.sendMail(mailOptions);

      return {
        success: true,
        messageId: info.messageId,
        details: {
          accepted: info.accepted,
          rejected: info.rejected,
          response: info.response,
        },
      };
    } catch (error) {
      console.error('SMTP send error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async verify(): Promise<boolean> {
    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      console.error('SMTP verification failed:', error);
      return false;
    }
  }

  async close(): Promise<void> {
    this.transporter.close();
  }
}