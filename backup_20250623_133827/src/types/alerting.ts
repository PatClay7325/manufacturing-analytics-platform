/**
 * Adaptive Factory Manufacturing Intelligence Platform
 * Alerting System Type Definitions
 * 
 * Original implementation for manufacturing alert management
 */

import { DataQuery, TimeRange } from './datasource';

// ============================================================================
// ALERT RULE TYPES
// ============================================================================

export interface AlertRule {
  uid: string;
  title: string;
  condition: string;
  data: AlertQuery[];
  intervalSeconds: number;
  maxDataPoints: number;
  noDataState: NoDataState;
  execErrState: ExecErrState;
  for: string;
  annotations: Record<string, string>;
  labels: Record<string, string>;
  folderUID?: string;
  ruleGroup: string;
  created: string;
  updated: string;
  version: number;
  manufacturing?: ManufacturingAlertConfig;
}

export interface AlertQuery extends DataQuery {
  queryType: string;
  model: any;
  relativeTimeRange?: RelativeTimeRange;
}

export interface RelativeTimeRange {
  from: number;
  to: number;
}

export type NoDataState = 'NoData' | 'Alerting' | 'OK';
export type ExecErrState = 'Alerting' | 'OK';

export interface ManufacturingAlertConfig {
  equipmentId?: string;
  processStep?: string;
  severity: ManufacturingSeverity;
  category: ManufacturingAlertCategory;
  oeImpact?: boolean;
  qualityImpact?: boolean;
  safetyImpact?: boolean;
  escalationPolicy?: string;
  maintenanceAction?: string;
}

export type ManufacturingSeverity = 'info' | 'warning' | 'critical' | 'emergency';

export type ManufacturingAlertCategory = 
  | 'equipment'
  | 'quality'
  | 'maintenance'
  | 'safety'
  | 'energy'
  | 'production'
  | 'process';

// ============================================================================
// CONTACT POINT TYPES
// ============================================================================

export interface ContactPoint {
  uid: string;
  name: string;
  type: ContactPointType;
  settings: ContactPointSettings;
  disableResolveMessage: boolean;
}

export type ContactPointType = 
  | 'email'
  | 'slack'
  | 'webhook'
  | 'pagerduty'
  | 'sms'
  | 'teams'
  | 'discord'
  | 'telegram'
  | 'manufacturing-system';

export interface ContactPointSettings {
  // Email settings
  to?: string[];
  from?: string;
  subject?: string;
  body?: string;
  
  // Slack settings
  channel?: string;
  username?: string;
  iconEmoji?: string;
  title?: string;
  text?: string;
  
  // Webhook settings
  url?: string;
  httpMethod?: 'GET' | 'POST' | 'PUT';
  headers?: Record<string, string>;
  basicAuthUser?: string;
  basicAuthPassword?: string;
  
  // PagerDuty settings
  integrationKey?: string;
  severity?: string;
  
  // SMS settings
  phoneNumbers?: string[];
  message?: string;
  
  // Manufacturing system settings
  systemEndpoint?: string;
  systemType?: 'mes' | 'scada' | 'cmms' | 'erp';
  alertCode?: string;
  priority?: number;
}

// ============================================================================
// NOTIFICATION POLICY TYPES
// ============================================================================

export interface NotificationPolicy {
  receiver: string;
  groupBy: string[];
  groupWait: string;
  groupInterval: string;
  repeatInterval: string;
  matchers: Matcher[];
  muteTimeIntervals?: string[];
  continue: boolean;
  routes?: NotificationPolicy[];
}

export interface Matcher {
  name: string;
  value: string;
  isRegex: boolean;
  isEqual: boolean;
}

// ============================================================================
// SILENCE TYPES
// ============================================================================

export interface Silence {
  id: string;
  matchers: Matcher[];
  startsAt: string;
  endsAt: string;
  createdBy: string;
  comment: string;
  status: SilenceStatus;
}

export interface SilenceStatus {
  state: 'active' | 'pending' | 'expired';
}

// ============================================================================
// ALERT INSTANCE TYPES
// ============================================================================

export interface AlertInstance {
  fingerprint: string;
  status: AlertStatus;
  labels: Record<string, string>;
  annotations: Record<string, string>;
  startsAt: string;
  endsAt?: string;
  generatorURL: string;
  silenceIDs?: string[];
  inhibitedBy?: string[];
  activeAt?: string;
  value?: string;
}

export interface AlertStatus {
  state: AlertState;
  silencedBy?: string[];
  inhibitedBy?: string[];
}

export type AlertState = 'inactive' | 'pending' | 'firing';

// ============================================================================
// ALERT GROUP TYPES
// ============================================================================

export interface AlertGroup {
  labels: Record<string, string>;
  groupKey: string;
  status: AlertGroupStatus;
  alerts: AlertInstance[];
  receiver: string;
}

export interface AlertGroupStatus {
  state: AlertState;
  silencedBy?: string[];
  inhibitedBy?: string[];
}

// ============================================================================
// MANUFACTURING ALERT EXTENSIONS
// ============================================================================

export interface ManufacturingAlert extends AlertInstance {
  manufacturing?: {
    equipmentId?: string;
    lineId?: string;
    processStep?: string;
    severity: ManufacturingSeverity;
    category: ManufacturingAlertCategory;
    impact: {
      oee: boolean;
      quality: boolean;
      safety: boolean;
      production: boolean;
    };
    actions: ManufacturingAction[];
    rootCause?: RootCauseAnalysis;
  };
}

export interface ManufacturingAction {
  type: 'maintenance' | 'operator' | 'process' | 'quality' | 'safety';
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  assignedTo?: string;
  estimatedDuration?: number;
  requiredSkills?: string[];
  tools?: string[];
  procedures?: string[];
}

export interface RootCauseAnalysis {
  primaryCause?: string;
  contributingFactors?: string[];
  recommendations?: string[];
  preventiveActions?: string[];
  confidence: number;
  analysisMethod: 'automated' | 'manual' | 'hybrid';
}

// ============================================================================
// ALERT RULE TEMPLATE TYPES
// ============================================================================

export interface AlertRuleTemplate {
  uid: string;
  name: string;
  description: string;
  category: ManufacturingAlertCategory;
  template: Partial<AlertRule>;
  variables: TemplateVariable[];
  tags: string[];
  author: string;
  version: string;
}

export interface TemplateVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'select';
  description: string;
  defaultValue: any;
  required: boolean;
  options?: TemplateVariableOption[];
  validation?: TemplateVariableValidation;
}

export interface TemplateVariableOption {
  label: string;
  value: any;
}

export interface TemplateVariableValidation {
  min?: number;
  max?: number;
  pattern?: string;
  message?: string;
}

// ============================================================================
// ESCALATION POLICY TYPES
// ============================================================================

export interface EscalationPolicy {
  uid: string;
  name: string;
  description: string;
  steps: EscalationStep[];
  repeat: boolean;
  manufacturing?: ManufacturingEscalationConfig;
}

export interface EscalationStep {
  stepNumber: number;
  delay: string;
  contactPoints: string[];
  condition?: EscalationCondition;
}

export interface EscalationCondition {
  duration: string;
  operator: 'gte' | 'lte' | 'eq';
  value: number;
}

export interface ManufacturingEscalationConfig {
  businessHours?: BusinessHours;
  shiftHandover?: boolean;
  maintenanceTeam?: boolean;
  qualityTeam?: boolean;
  safetyTeam?: boolean;
  managementLevel?: number;
}

export interface BusinessHours {
  timezone: string;
  days: WeekDay[];
  startTime: string;
  endTime: string;
}

export type WeekDay = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

// ============================================================================
// ALERT METRICS AND Analytics
// ============================================================================

export interface AlertMetrics {
  totalRules: number;
  firingAlerts: number;
  pendingAlerts: number;
  silencedAlerts: number;
  alertsByCategory: Record<ManufacturingAlertCategory, number>;
  alertsBySeverity: Record<ManufacturingSeverity, number>;
  meanTimeToResolve: number;
  alertFrequency: AlertFrequencyData[];
  topAlertSources: AlertSourceData[];
}

export interface AlertFrequencyData {
  timestamp: string;
  count: number;
  category: ManufacturingAlertCategory;
}

export interface AlertSourceData {
  source: string;
  count: number;
  severity: ManufacturingSeverity;
}

// ============================================================================
// ALERT CONFIGURATION
// ============================================================================

export interface AlertingConfig {
  evaluationInterval: string;
  evaluationTimeout: string;
  maxAttempts: number;
  minInterval: string;
  resendDelay: string;
  disableResolveMessage: boolean;
  manufacturing: ManufacturingAlertingConfig;
}

export interface ManufacturingAlertingConfig {
  enableOEEAlerts: boolean;
  enableQualityAlerts: boolean;
  enableMaintenanceAlerts: boolean;
  enableSafetyAlerts: boolean;
  enableEnergyAlerts: boolean;
  defaultSeverity: ManufacturingSeverity;
  requireAcknowledgment: boolean;
  autoResolveTimeout: string;
  escalationEnabled: boolean;
  rootCauseAnalysis: boolean;
}