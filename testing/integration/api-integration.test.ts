import { describe, it, expect, beforeEach } from 'vitest';
import { server } from '@/mocks/server';
import { errorHandlers } from '@/mocks/handlers';

describe('API Integration Tests', () => {
  describe('Equipment API', () => {
    it('should fetch equipment list', async () => {
      const response = await fetch('/api/equipment');
      const data = await response.json();
      
      expect(response.ok).toBe(true);
      expect(data.equipment).toHaveLength(10);
      expect(data.equipment[0]).toHaveProperty('id');
      expect(data.equipment[0]).toHaveProperty('oee');
    });

    it('should fetch single equipment details', async () => {
      const response = await fetch('/api/equipment/equipment-1');
      const data = await response.json();
      
      expect(response.ok).toBe(true);
      expect(data.id).toBe('equipment-1');
      expect(data.productionData).toHaveLength(24);
    });

    it('should handle equipment API errors', async () => {
      server.use(...errorHandlers);
      
      const response = await fetch('/api/equipment');
      const data = await response.json();
      
      expect(response.ok).toBe(false);
      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });
  });

  describe('Alerts API', () => {
    it('should fetch alerts with filtering', async () => {
      const response = await fetch('/api/alerts?status=active');
      const data = await response.json();
      
      expect(response.ok).toBe(true);
      expect(data.alerts.every((alert: any) => alert.status === 'active')).toBe(true);
    });

    it('should acknowledge an alert', async () => {
      const response = await fetch('/api/alerts/alert-1/acknowledge', {
        method: 'POST',
      });
      const data = await response.json();
      
      expect(response.ok).toBe(true);
      expect(data.status).toBe('acknowledged');
      expect(data.acknowledgedAt).toBeDefined();
    });
  });

  describe('Manufacturing Chat API', () => {
    it('should process chat messages', async () => {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'What is the current status?' }),
      });
      const data = await response.json();
      
      expect(response.ok).toBe(true);
      expect(data.response).toContain('All equipment is operating normally');
      expect(data.timestamp).toBeDefined();
    });

    it('should provide context-aware responses', async () => {
      const testCases = [
        { message: 'Show me alerts', expected: 'active alerts' },
        { message: 'Production rate?', expected: 'production rate' },
      ];

      for (const testCase of testCases) {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: testCase.message }),
        });
        const data = await response.json();
        
        expect(response.ok).toBe(true);
        expect(data.response.toLowerCase()).toContain(testCase.expected);
      }
    });
  });

  describe('Authentication API', () => {
    it('should login with valid credentials', async () => {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password',
        }),
      });
      const data = await response.json();
      
      expect(response.ok).toBe(true);
      expect(data.user).toBeDefined();
      expect(data.token).toBe('mock-jwt-token');
    });

    it('should reject invalid credentials', async () => {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'wrong@example.com',
          password: 'wrongpassword',
        }),
      });
      const data = await response.json();
      
      expect(response.ok).toBe(false);
      expect(response.status).toBe(401);
      expect(data.error).toBe('Invalid credentials');
    });

    it('should fetch user info with valid token', async () => {
      const response = await fetch('/api/auth/me', {
        headers: { 'Authorization': 'Bearer mock-jwt-token' },
      });
      const data = await response.json();
      
      expect(response.ok).toBe(true);
      expect(data.user.email).toBe('test@example.com');
    });
  });
});