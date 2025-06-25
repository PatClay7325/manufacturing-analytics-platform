// AWS SDK stubs to prevent compilation errors when AWS SDK packages are not installed

// CloudWatch stubs
export class CloudWatchClient {
  constructor(config: any) {}
  send(command: any) {
    return Promise.resolve({});
  }
}

export class GetMetricStatisticsCommand {
  constructor(params: any) {}
}

// DynamoDB stubs
export class DynamoDBClient {
  constructor(config: any) {}
  send(command: any) {
    return Promise.resolve({});
  }
}

export class PutItemCommand {
  constructor(params: any) {}
}

export class GetItemCommand {
  constructor(params: any) {}
}

export class QueryCommand {
  constructor(params: any) {}
}

export class UpdateItemCommand {
  constructor(params: any) {}
}

// SES stubs
export class SESClient {
  constructor(config: any) {}
  send(command: any) {
    return Promise.resolve({});
  }
}

export class SendEmailCommand {
  constructor(params: any) {}
}

// SNS stubs
export class SNSClient {
  constructor(config: any) {}
  send(command: any) {
    return Promise.resolve({});
  }
}

export class PublishCommand {
  constructor(params: any) {}
}

// S3 stubs
export class S3Client {
  constructor(config: any) {}
  send(command: any) {
    return Promise.resolve({});
  }
}

export class PutObjectCommand {
  constructor(params: any) {}
}

export class GetObjectCommand {
  constructor(params: any) {}
}

// ELB stubs
export class ElasticLoadBalancingV2Client {
  constructor(config: any) {}
  send(command: any) {
    return Promise.resolve({});
  }
}

export class DescribeTargetHealthCommand {
  constructor(params: any) {}
}

// Utility functions
export function marshall(item: any) {
  return item;
}

export function unmarshall(item: any) {
  return item;
}