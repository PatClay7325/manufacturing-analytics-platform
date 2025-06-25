import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface SecurityMetric {
  id: string;
  name: string;
  value: number;
  status: 'good' | 'warning' | 'critical';
  unit?: string;
}

interface SecurityOverviewProps {
  metrics?: SecurityMetric[];
}

const SecurityOverview: React.FC<SecurityOverviewProps> = ({ 
  metrics = [] 
}) => {
  const getStatusColor = (status: SecurityMetric['status']) => {
    switch (status) {
      case 'good':
        return 'default';
      case 'warning':
        return 'secondary';
      case 'critical':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Security Overview</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {metrics.map((metric) => (
            <div key={metric.id} className="border rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-sm">{metric.name}</h4>
                <Badge variant={getStatusColor(metric.status)}>
                  {metric.status}
                </Badge>
              </div>
              <p className="text-lg font-bold">
                {metric.value}{metric.unit && ` ${metric.unit}`}
              </p>
            </div>
          ))}
          {metrics.length === 0 && (
            <div className="col-span-2">
              <p className="text-gray-500 text-sm">No security metrics available.</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default SecurityOverview;
export { SecurityOverview };