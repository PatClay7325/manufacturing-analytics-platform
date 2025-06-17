export type AlertSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';
export type AlertStatus = 'active' | 'acknowledged' | 'resolved' | 'muted';
export type AlertType = 'maintenance' | 'performance' | 'quality' | 'safety' | 'system' | 'equipment' | 'process' | 'inventory' | 'production' | 'network';

export interface Alert {
  id: string;
  equipmentId: string | null;
  alertType: string;
  severity: string;
  message: string;
  status: string;
  timestamp: string;
  acknowledgedBy: string | null;
  acknowledgedAt: string | null;
  resolvedBy: string | null;
  resolvedAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AlertFilter {
  severity?: string[];
  status?: string[];
  alertType?: string[];
  search?: string;
  dateRange?: {
    start?: string;
    end?: string;
  };
  equipmentId?: string;
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
  bySeverity: Record<string, number>;
  byStatus: Record<string, number>;
  byAlertType: Record<string, number>;
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
  severity: string;
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
  source: string;
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
  message: string;
  severity: string;
  status: string;
  alertType: string;
  equipmentId?: string | null;
  createdAt: string;
}