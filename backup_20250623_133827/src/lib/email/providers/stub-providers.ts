// Temporary stub providers for testing without email dependencies

export class SmtpProvider {
  constructor(config: any) {}
  async send(message: any): Promise<any> {
    console.log('SMTP email would be sent:', message);
    return { messageId: 'stub-smtp-' + Date.now() };
  }
}

export class SendGridProvider {
  constructor(config: any) {}
  async send(message: any): Promise<any> {
    console.log('SendGrid email would be sent:', message);
    return { messageId: 'stub-sendgrid-' + Date.now() };
  }
}

export class SesProvider {
  constructor(config: any) {}
  async send(message: any): Promise<any> {
    console.log('SES email would be sent:', message);
    return { messageId: 'stub-ses-' + Date.now() };
  }
}

export class TemplateEngine {
  constructor() {}
  compile(template: string, context: any): string {
    // Simple template replacement without handlebars
    let result = template;
    Object.keys(context).forEach(key => {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      result = result.replace(regex, context[key]);
    });
    return result;
  }
}