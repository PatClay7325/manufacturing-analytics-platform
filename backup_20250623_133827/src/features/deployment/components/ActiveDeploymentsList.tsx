import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Deployment {
  id: string;
  name: string;
  environment: string;
  status: 'running' | 'failed' | 'pending' | 'stopped';
  version: string;
  createdAt: string;
}

interface ActiveDeploymentsListProps {
  deployments?: Deployment[];
}

const ActiveDeploymentsList: React.FC<ActiveDeploymentsListProps> = ({ 
  deployments = [] 
}) => {
  const getStatusColor = (status: Deployment['status']) => {
    switch (status) {
      case 'running':
        return 'default';
      case 'failed':
        return 'destructive';
      case 'pending':
        return 'secondary';
      case 'stopped':
        return 'outline';
      default:
        return 'outline';
    }
  };

  if (deployments.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Active Deployments</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">No active deployments found.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Active Deployments</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {deployments.map((deployment) => (
            <div key={deployment.id} className="flex items-center justify-between border-b pb-2">
              <div>
                <h4 className="font-medium">{deployment.name}</h4>
                <p className="text-sm text-gray-600">
                  Environment: {deployment.environment} | Version: {deployment.version}
                </p>
                <p className="text-xs text-gray-500">{deployment.createdAt}</p>
              </div>
              <Badge variant={getStatusColor(deployment.status)}>
                {deployment.status}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default ActiveDeploymentsList;
export { ActiveDeploymentsList };