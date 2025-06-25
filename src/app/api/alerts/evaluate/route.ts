/**
 * Alert Evaluation Engine API
 * Evaluates alert rules against real data
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import { z } from 'zod';

// Alert evaluation schema
const evaluateAlertSchema = z.object({
  ruleId: z.string(),
  force: z.boolean().optional()
});

// Alert evaluation result
interface AlertEvaluationResult {
  ruleId: string;
  state: 'OK' | 'Alerting' | 'Pending' | 'NoData';
  value?: number;
  threshold?: number;
  evaluatedAt: string;
  message: string;
  labels: Record<string, string>;
  annotations: Record<string, string>;
}

// Mock Prometheus query evaluator
class PrometheusEvaluator {
  static async evaluateQuery(expr: string, datasourceUid: string): Promise<{ value: number; timestamp: number } | null> {
    // In a real implementation, this would query Prometheus
    // For now, simulate metric evaluation with manufacturing data
    
    const mockMetrics: Record<string, () => number> = {
      'manufacturing_oee': () => 65 + Math.random() * 30, // OEE percentage
      'equipment_temperature': () => 75 + Math.random() * 20, // Temperature in Celsius
      'production_line_status': () => Math.random() > 0.95 ? 0 : 1, // 0 = down, 1 = up
      'quality_defect_rate': () => Math.random() * 10, // Defect rate percentage
      'avg_over_time(manufacturing_oee[5m])': () => 65 + Math.random() * 30,
      'equipment_temperature{equipment="Machine-3"}': () => 82 + Math.random() * 10,
      'production_line_status{line="Line A"}': () => Math.random() > 0.9 ? 0 : 1,
      'quality_defect_rate{shift="Shift-2"}': () => Math.random() * 8
    };
    
    // Extract metric name from expression
    const metricMatch = expr.match(/([a-zA-Z_][a-zA-Z0-9_]*(?:\{[^}]*\})?(?:\[[^\]]*\])?)/g);
    const metricName = metricMatch?.[0] || expr;
    
    const evaluator = mockMetrics[metricName] || mockMetrics[expr];
    if (evaluator) {
      return {
        value: evaluator(),
        timestamp: Date.now()
      };
    }
    
    return null;
  }
}

// Alert rule evaluator
class AlertEvaluator {
  static async evaluateRule(rule: any): Promise<AlertEvaluationResult> {
    const { uid, title, condition, data, noDataState, labels = {}, annotations = {} } = rule;
    
    try {
      // Parse condition to extract metric, operator, and threshold
      const conditionMatch = condition.match(/(.+?)\s*([<>=!]+)\s*([0-9.]+)/);
      if (!conditionMatch) {
        return {
          ruleId: uid,
          state: 'NoData',
          evaluatedAt: new Date().toISOString(),
          message: 'Invalid condition format',
          labels,
          annotations
        };
      }
      
      const [, metricExpr, operator, thresholdStr] = conditionMatch;
      const threshold = parseFloat(thresholdStr);
      
      // Get the primary data query
      const primaryQuery = data.find((q: any) => q.refId === 'A');
      if (!primaryQuery) {
        return {
          ruleId: uid,
          state: noDataState || 'NoData',
          evaluatedAt: new Date().toISOString(),
          message: 'No primary query found',
          labels,
          annotations
        };
      }
      
      // Evaluate the query
      const result = await PrometheusEvaluator.evaluateQuery(
        primaryQuery.model.expr || metricExpr.trim(),
        primaryQuery.datasourceUid
      );
      
      if (!result) {
        return {
          ruleId: uid,
          state: noDataState || 'NoData',
          evaluatedAt: new Date().toISOString(),
          message: 'No data returned from query',
          labels,
          annotations
        };
      }
      
      // Evaluate condition
      let isAlerting = false;
      const { value } = result;
      
      switch (operator.trim()) {
        case '>':
          isAlerting = value > threshold;
          break;
        case '>=':
          isAlerting = value >= threshold;
          break;
        case '<':
          isAlerting = value < threshold;
          break;
        case '<=':
          isAlerting = value <= threshold;
          break;
        case '==':
        case '=':
          isAlerting = Math.abs(value - threshold) < 0.001;
          break;
        case '!=':
          isAlerting = Math.abs(value - threshold) >= 0.001;
          break;
        default:
          isAlerting = false;
      }
      
      const state = isAlerting ? 'Alerting' : 'OK';
      const message = isAlerting 
        ? `Alert condition met: ${value.toFixed(2)} ${operator} ${threshold}`
        : `Condition not met: ${value.toFixed(2)} ${operator} ${threshold}`;
      
      return {
        ruleId: uid,
        state,
        value,
        threshold,
        evaluatedAt: new Date().toISOString(),
        message,
        labels: {
          ...labels,
          alertname: title,
          value: value.toFixed(2)
        },
        annotations: {
          ...annotations,
          description: message,
          summary: `${title} - ${state}`
        }
      };
      
    } catch (error) {
      console.error('Error evaluating alert rule:', error);
      return {
        ruleId: uid,
        state: 'NoData',
        evaluatedAt: new Date().toISOString(),
        message: `Evaluation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        labels,
        annotations
      };
    }
  }
}

// Notification sender
class NotificationSender {
  static async sendNotification(alertResult: AlertEvaluationResult, contactPoints: any[]) {
    // In a real implementation, this would send notifications via email, Slack, etc.
    console.log('🚨 Alert Notification:', {
      alert: alertResult.labels.alertname,
      state: alertResult.state,
      message: alertResult.message,
      contactPoints: contactPoints.map(cp => cp.name)
    });
    
    // Mock notification sending
    for (const contactPoint of contactPoints) {
      switch (contactPoint.type) {
        case 'email':
          console.log(`📧 Email sent to ${contactPoint.settings.addresses}`);
          break;
        case 'slack':
          console.log(`💬 Slack notification sent to ${contactPoint.settings.channel}`);
          break;
        case 'webhook':
          console.log(`🔗 Webhook called: ${contactPoint.settings.url}`);
          break;
        default:
          console.log(`📢 Notification sent via ${contactPoint.type}`);
      }
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ruleId, force } = evaluateAlertSchema.parse(body);
    
    // Get alert rule from database
    const alertRule = await prisma.alertRule.findUnique({
      where: { uid: ruleId },
      include: {
        data: true,
        contactPoints: true
      }
    });
    
    if (!alertRule) {
      return NextResponse.json(
        { error: 'Alert rule not found' },
        { status: 404 }
      );
    }
    
    // Check if rule is paused
    if (alertRule.isPaused && !force) {
      return NextResponse.json({
        ruleId,
        state: 'Paused',
        evaluatedAt: new Date().toISOString(),
        message: 'Rule is paused'
      });
    }
    
    // Evaluate the rule
    const result = await AlertEvaluator.evaluateRule(alertRule);
    
    // Store evaluation result
    const alertInstance = await prisma.alertInstance.upsert({
      where: {
        fingerprint: `${ruleId}-${JSON.stringify(result.labels)}`
      },
      update: {
        status: result.state,
        value: result.value,
        updatedAt: new Date(),
        annotations: result.annotations
      },
      create: {
        fingerprint: `${ruleId}-${JSON.stringify(result.labels)}`,
        ruleId,
        status: result.state,
        labels: result.labels,
        annotations: result.annotations,
        value: result.value,
        startsAt: new Date(),
        updatedAt: new Date()
      }
    });
    
    // Send notifications if alerting
    if (result.state === 'Alerting' && alertRule.contactPoints.length > 0) {
      await NotificationSender.sendNotification(result, alertRule.contactPoints);
    }
    
    return NextResponse.json({
      ...result,
      instanceId: alertInstance.id
    });
    
  } catch (error) {
    console.error('Alert evaluation error:', error);
    return NextResponse.json(
      { error: 'Failed to evaluate alert' },
      { status: 500 }
    );
  }
}

// Evaluate all active alert rules
export async function GET() {
  try {
    // Get all active alert rules
    const alertRules = await prisma.alertRule.findMany({
      where: {
        isPaused: false,
        OR: [
          { isDraft: false },
          { isDraft: null }
        ]
      },
      include: {
        data: true,
        contactPoints: true
      }
    });
    
    const results = [];
    
    // Evaluate each rule
    for (const rule of alertRules) {
      // Check if it's time to evaluate (based on intervalSeconds)
      const lastEvaluation = await prisma.alertInstance.findFirst({
        where: { ruleId: rule.uid },
        orderBy: { updatedAt: 'desc' }
      });
      
      const now = Date.now();
      const shouldEvaluate = !lastEvaluation || 
        (now - lastEvaluation.updatedAt.getTime()) >= (rule.intervalSeconds * 1000);
      
      if (shouldEvaluate) {
        const result = await AlertEvaluator.evaluateRule(rule);
        
        // Store result
        const alertInstance = await prisma.alertInstance.upsert({
          where: {
            fingerprint: `${rule.uid}-${JSON.stringify(result.labels)}`
          },
          update: {
            status: result.state,
            value: result.value,
            updatedAt: new Date(),
            annotations: result.annotations
          },
          create: {
            fingerprint: `${rule.uid}-${JSON.stringify(result.labels)}`,
            ruleId: rule.uid,
            status: result.state,
            labels: result.labels,
            annotations: result.annotations,
            value: result.value,
            startsAt: new Date(),
            updatedAt: new Date()
          }
        });
        
        // Send notifications if alerting
        if (result.state === 'Alerting' && rule.contactPoints.length > 0) {
          await NotificationSender.sendNotification(result, rule.contactPoints);
        }
        
        results.push({
          ...result,
          instanceId: alertInstance.id
        });
      }
    }
    
    return NextResponse.json({
      evaluatedRules: results.length,
      results
    });
    
  } catch (error) {
    console.error('Bulk alert evaluation error:', error);
    return NextResponse.json(
      { error: 'Failed to evaluate alerts' },
      { status: 500 }
    );
  }
}