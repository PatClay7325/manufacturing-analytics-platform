'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RefreshCw, AlertTriangle, CheckCircle, XCircle, Clock } from 'lucide-react';

interface CircuitBreakerMetrics {
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  failures: number;
  successes: number;
  totalRequests: number;
  lastFailureTime?: string;
  lastSuccessTime?: string;
  nextAttempt?: string;
}

interface HealthCheckResult {
  status: 'HEALTHY' | 'UNHEALTHY' | 'DEGRADED' | 'UNKNOWN';
  message?: string;
  responseTime?: number;
  timestamp: string;
}

interface ResilienceMetrics {
  timestamp: string;
  circuitBreakers: Record<string, CircuitBreakerMetrics>;
  healthChecks: Record<string, HealthCheckResult>;
  summary: {
    totalCircuitBreakers: number;
    openCircuitBreakers: number;
    halfOpenCircuitBreakers: number;
    totalHealthChecks: number;
    healthyChecks: number;
    unhealthyChecks: number;
  };
}

export function ResilienceDashboard() {
  const [metrics, setMetrics] = useState<ResilienceMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchMetrics = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/metrics/resilience');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      setMetrics(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch metrics');
    } finally {
      setLoading(false);
    }
  };

  const resetCircuitBreaker = async (name: string) => {
    try {
      const response = await fetch('/api/metrics/resilience', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset_circuit_breaker', name }),
      });

      if (!response.ok) {
        throw new Error('Failed to reset circuit breaker');
      }

      await fetchMetrics(); // Refresh data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset circuit breaker');
    }
  };

  const resetAllCircuitBreakers = async () => {
    try {
      const response = await fetch('/api/metrics/resilience', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset_circuit_breakers' }),
      });

      if (!response.ok) {
        throw new Error('Failed to reset circuit breakers');
      }

      await fetchMetrics(); // Refresh data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset circuit breakers');
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(fetchMetrics, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const getCircuitBreakerIcon = (state: string) => {
    switch (state) {
      case 'CLOSED':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'OPEN':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'HALF_OPEN':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getHealthCheckIcon = (status: string) => {
    switch (status) {
      case 'HEALTHY':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'UNHEALTHY':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'DEGRADED':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStateColor = (state: string) => {
    switch (state) {
      case 'CLOSED':
      case 'HEALTHY':
        return 'bg-green-100 text-green-800';
      case 'OPEN':
      case 'UNHEALTHY':
        return 'bg-red-100 text-red-800';
      case 'HALF_OPEN':
      case 'DEGRADED':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (!metrics && loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin mr-2" />
        Loading metrics...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">System Resilience Dashboard</h1>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            {autoRefresh ? 'Disable' : 'Enable'} Auto Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchMetrics}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={resetAllCircuitBreakers}
          >
            Reset All Breakers
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {metrics && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Circuit Breakers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.summary.totalCircuitBreakers}</div>
                <div className="text-xs text-muted-foreground">
                  {metrics.summary.openCircuitBreakers} open, {metrics.summary.halfOpenCircuitBreakers} half-open
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Health Checks</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.summary.totalHealthChecks}</div>
                <div className="text-xs text-muted-foreground">
                  {metrics.summary.healthyChecks} healthy, {metrics.summary.unhealthyChecks} unhealthy
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">System Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2">
                  {metrics.summary.openCircuitBreakers > 0 ? (
                    <>
                      <XCircle className="h-6 w-6 text-red-500" />
                      <span className="text-red-600 font-semibold">Degraded</span>
                    </>
                  ) : metrics.summary.unhealthyChecks > 0 ? (
                    <>
                      <AlertTriangle className="h-6 w-6 text-yellow-500" />
                      <span className="text-yellow-600 font-semibold">Warning</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-6 w-6 text-green-500" />
                      <span className="text-green-600 font-semibold">Healthy</span>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Last Updated</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground">
                  {new Date(metrics.timestamp).toLocaleTimeString()}
                </div>
                <div className="text-xs text-muted-foreground">
                  Auto-refresh: {autoRefresh ? 'ON' : 'OFF'}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Circuit Breakers */}
          <Card>
            <CardHeader>
              <CardTitle>Circuit Breakers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(metrics.circuitBreakers).map(([name, breaker]) => (
                  <div key={name} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        {getCircuitBreakerIcon(breaker.state)}
                        <span className="font-semibold">{name}</span>
                        <Badge className={getStateColor(breaker.state)}>
                          {breaker.state}
                        </Badge>
                      </div>
                      {breaker.state === 'OPEN' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => resetCircuitBreaker(name)}
                        >
                          Reset
                        </Button>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <div className="text-muted-foreground">Total Requests</div>
                        <div className="font-medium">{breaker.totalRequests}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Failures</div>
                        <div className="font-medium text-red-600">{breaker.failures}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Successes</div>
                        <div className="font-medium text-green-600">{breaker.successes}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Success Rate</div>
                        <div className="font-medium">
                          {breaker.totalRequests > 0 
                            ? `${((breaker.successes / breaker.totalRequests) * 100).toFixed(1)}%`
                            : 'N/A'
                          }
                        </div>
                      </div>
                    </div>

                    {breaker.nextAttempt && (
                      <div className="mt-2 text-sm text-muted-foreground">
                        Next attempt: {new Date(breaker.nextAttempt).toLocaleTimeString()}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Health Checks */}
          <Card>
            <CardHeader>
              <CardTitle>Health Checks</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(metrics.healthChecks).map(([name, check]) => (
                  <div key={name} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        {getHealthCheckIcon(check.status)}
                        <span className="font-semibold">{name}</span>
                        <Badge className={getStateColor(check.status)}>
                          {check.status}
                        </Badge>
                      </div>
                      {check.responseTime && (
                        <div className="text-sm text-muted-foreground">
                          {check.responseTime}ms
                        </div>
                      )}
                    </div>
                    
                    {check.message && (
                      <div className="text-sm text-muted-foreground mb-2">
                        {check.message}
                      </div>
                    )}
                    
                    <div className="text-xs text-muted-foreground">
                      Last checked: {new Date(check.timestamp).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}