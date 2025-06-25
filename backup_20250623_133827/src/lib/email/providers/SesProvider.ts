import AWS from 'aws-sdk';
import { EmailProvider, EmailMessage, EmailSendResult, EmailConfig } from '../types';

export class SesProvider implements EmailProvider {
  name = 'ses';
  private ses: AWS.SES;
  private config: EmailConfig;

  constructor(config: EmailConfig) {
    this.config = config;
    
    if (!config.ses) {
      throw new Error('SES configuration is required');
    }

    this.ses = new AWS.SES({
      region: config.ses.region,
      accessKeyId: config.ses.accessKeyId,
      secretAccessKey: config.ses.secretAccessKey,
    });
  }

  async send(message: EmailMessage): Promise<EmailSendResult> {
    try {
      const params: AWS.SES.SendEmailRequest = {
        Source: `${this.config.from.name} <${this.config.from.email}>`,
        Destination: {
          ToAddresses: Array.isArray(message.to) ? message.to : [message.to],
          CcAddresses: message.cc ? (Array.isArray(message.cc) ? message.cc : [message.cc]) : undefined,
          BccAddresses: message.bcc ? (Array.isArray(message.bcc) ? message.bcc : [message.bcc]) : undefined,
        },
        Message: {
          Subject: {
            Data: message.subject,
            Charset: 'UTF-8',
          },
          Body: {
            Html: message.html ? {
              Data: message.html,
              Charset: 'UTF-8',
            } : undefined,
            Text: message.text ? {
              Data: message.text,
              Charset: 'UTF-8',
            } : undefined,
          },
        },
        ReplyToAddresses: this.config.replyTo ? [this.config.replyTo] : undefined,
        Tags: message.tags?.map(tag => ({
          Name: tag,
          Value: 'true',
        })),
      };

      const result = await this.ses.sendEmail(params).promise();

      return {
        success: true,
        messageId: result.MessageId,
        details: {
          $metadata: result.$response.data,
        },
      };
    } catch (error: any) {
      console.error('SES send error:', error);
      return {
        success: false,
        error: error.message || 'Unknown error',
        details: {
          code: error.code,
          statusCode: error.statusCode,
        },
      };
    }
  }

  async verify(): Promise<boolean> {
    try {
      // Verify the sending email address
      const result = await this.ses.getIdentityVerificationAttributes({
        Identities: [this.config.from.email],
      }).promise();

      const status = result.VerificationAttributes[this.config.from.email]?.VerificationStatus;
      return status === 'Success';
    } catch (error) {
      console.error('SES verification failed:', error);
      return false;
    }
  }

  async sendRawEmail(rawMessage: string): Promise<EmailSendResult> {
    try {
      const result = await this.ses.sendRawEmail({
        RawMessage: {
          Data: rawMessage,
        },
      }).promise();

      return {
        success: true,
        messageId: result.MessageId,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Unknown error',
      };
    }
  }
}