import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface DeploymentFormProps {
  onSubmit?: (data: DeploymentFormData) => void;
  onCancel?: () => void;
}

interface DeploymentFormData {
  name: string;
  environment: string;
  version: string;
  description: string;
  configuration: string;
}

const DeploymentForm: React.FC<DeploymentFormProps> = ({ onSubmit, onCancel }) => {
  const [formData, setFormData] = useState<DeploymentFormData>({
    name: '',
    environment: '',
    version: '',
    description: '',
    configuration: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit?.(formData);
  };

  const handleInputChange = (field: keyof DeploymentFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>New Deployment</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Deployment Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="Enter deployment name"
              required
            />
          </div>

          <div>
            <Label htmlFor="environment">Environment</Label>
            <Select 
              value={formData.environment} 
              onValueChange={(value) => handleInputChange('environment', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select environment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="development">Development</SelectItem>
                <SelectItem value="staging">Staging</SelectItem>
                <SelectItem value="production">Production</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="version">Version</Label>
            <Input
              id="version"
              value={formData.version}
              onChange={(e) => handleInputChange('version', e.target.value)}
              placeholder="e.g., v1.0.0"
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Deployment description"
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="configuration">Configuration (JSON)</Label>
            <Textarea
              id="configuration"
              value={formData.configuration}
              onChange={(e) => handleInputChange('configuration', e.target.value)}
              placeholder='{"key": "value"}'
              rows={5}
            />
          </div>

          <div className="flex gap-2">
            <Button type="submit">Deploy</Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default DeploymentForm;
export { DeploymentForm };