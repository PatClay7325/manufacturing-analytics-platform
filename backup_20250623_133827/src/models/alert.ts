export type AlertSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';
export type AlertStatus = 'active' | 'acknowledged' | 'resolved' | 'muted';
export type AlertSource = 'equipment' | 'process' | 'quality' | 'maintenance' | 'inventory' | 'safety' | 'system';

export interface Alert {
  id: string;
  title: string;
  description: string;
  severity: AlertSeverity;
  status: AlertStatus;
  source: AlertSource;
  sourceId?: string;
  sourceName?: string;
  createdAt: string;
  updatedAt: string;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  resolvedAt?: string;
  resolvedBy?: string;
  dueBy?: string;
  assignedTo?: string;
  category?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface AlertFilter {
  severity?: AlertSeverity[];
  status?: AlertStatus[];
  source?: AlertSource[];
  search?: string;
  dateRange?: {
    start?: string;
    end?: string;
  };
  assignedTo?: string;
}

export interface AlertNotificationSettings {
  email: boolean;
  sms: boolean;
  push: boolean;
  slack: boolean;
  teams: boolean;
  criticalOnly: boolean;
  muteStartTime?: string; // Format: HH:MM
  muteEndTime?: string; // Format: HH:MM
  muteDays?: ('monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday')[];
}

export interface AlertStatistics {
  total: number;
  bySeverity: Record<AlertSeverity, number>;
  byStatus: Record<AlertStatus, number>;
  bySource: Record<AlertSource, number>;
  trend: {
    date: string;
    count: number;
  }[];
}

export interface AlertRule {
  id: string;
  name: string;
  description?: string;
  condition: AlertRuleCondition;
  severity: AlertSeverity;
  enabled: boolean;
  notifyUsers?: string[];
  autoResolve?: boolean;
  autoResolveAfter?: number; // minutes
  createdAt: string;
  updatedAt: string;
  lastTriggered?: string;
  tags?: string[];
}

export interface AlertRuleCondition {
  type: 'threshold' | 'deviation' | 'rate_of_change' | 'anomaly' | 'pattern' | 'composite';
  source: AlertSource;
  sourceId?: string;
  metric?: string;
  operator?: '>' | '>=' | '<' | '<=' | '==' | '!=' | 'contains' | 'not_contains';
  value?: number | string | boolean;
  duration?: number; // minutes - how long condition must be true before triggering
  lookback?: number; // minutes - historical data to analyze
  sensitivity?: number; // for anomaly detection (0-1)
  subConditions?: AlertRuleCondition[]; // for composite conditions
  logic?: 'and' | 'or'; // for composite conditions
}

export interface AlertResponse {
  id: string;
  alertId: string;
  type: 'acknowledge' | 'resolve' | 'assign' | 'comment' | 'escalate';
  timestamp: string;
  userId: string;
  userName: string;
  comment?: string;
  assignedTo?: string;
  escalatedTo?: string;
}

export interface AlertSummary {
  id: string;
  title: string;
  severity: AlertSeverity;
  status: AlertStatus;
  source: AlertSource;
  sourceName?: string;
  createdAt: string;
}