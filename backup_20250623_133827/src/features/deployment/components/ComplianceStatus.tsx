import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ComplianceCheck {
  id: string;
  name: string;
  status: 'passing' | 'failing' | 'warning';
  description: string;
}

interface ComplianceStatusProps {
  checks?: ComplianceCheck[];
}

const ComplianceStatus: React.FC<ComplianceStatusProps> = ({ 
  checks = [] 
}) => {
  const getStatusColor = (status: ComplianceCheck['status']) => {
    switch (status) {
      case 'passing':
        return 'default';
      case 'failing':
        return 'destructive';
      case 'warning':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const passingCount = checks.filter(c => c.status === 'passing').length;
  const totalCount = checks.length;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Compliance Status</CardTitle>
        <p className="text-sm text-gray-600">
          {passingCount} of {totalCount} checks passing
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {checks.map((check) => (
            <div key={check.id} className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-sm">{check.name}</h4>
                <p className="text-xs text-gray-600">{check.description}</p>
              </div>
              <Badge variant={getStatusColor(check.status)}>
                {check.status}
              </Badge>
            </div>
          ))}
          {checks.length === 0 && (
            <p className="text-gray-500 text-sm">No compliance checks configured.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ComplianceStatus;
export { ComplianceStatus };