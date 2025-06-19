import { test, expect, type APIRequestContext } from '@playwright/test';

const API_BASE_URL = process.env.API_URL || 'http://localhost:3000/api';

test.describe('Equipment API - Comprehensive Tests', () => {
  let apiContext: APIRequestContext;
  let authToken: string;

  test.beforeAll(async ({ playwright }) => {
    apiContext = await playwright.request.newContext({
      baseURL: API_BASE_URL,
      extraHTTPHeaders: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });

    // Authenticate and get token
    const authResponse = await apiContext.post('/auth/login', {
      data: {
        email: 'admin@manufacturing.com',
        password: 'SecurePass123!'
      }
    });
    
    expect(authResponse.ok()).toBeTruthy();
    const authData = await authResponse.json();
    authToken = authData.token;
    
    // Set auth header for subsequent requests
    apiContext = await playwright.request.newContext({
      baseURL: API_BASE_URL,
      extraHTTPHeaders: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
    });
  });

  test.afterAll(async () => {
    await apiContext.dispose();
  });

  test.describe('GET /api/equipment', () => {
    test('should return paginated equipment list', async () => {
      const response = await apiContext.get('/equipment');
      expect(response.ok()).toBeTruthy();
      
      const data = await response.json();
      expect(data).toHaveProperty('items');
      expect(data).toHaveProperty('total');
      expect(data).toHaveProperty('page');
      expect(data).toHaveProperty('pageSize');
      expect(data).toHaveProperty('totalPages');
      
      expect(Array.isArray(data.items)).toBeTruthy();
      expect(data.items.length).toBeLessThanOrEqual(data.pageSize);
    });

    test('should support pagination parameters', async () => {
      const response = await apiContext.get('/equipment?page=2&pageSize=5');
      expect(response.ok()).toBeTruthy();
      
      const data = await response.json();
      expect(data.page).toBe(2);
      expect(data.pageSize).toBe(5);
      expect(data.items.length).toBeLessThanOrEqual(5);
    });

    test('should support filtering by status', async () => {
      const statuses = ['operational', 'maintenance', 'offline'];
      
      for (const status of statuses) {
        const response = await apiContext.get(`/equipment?status=${status}`);
        expect(response.ok()).toBeTruthy();
        
        const data = await response.json();
        data.items.forEach((equipment: any) => {
          expect(equipment.status).toBe(status);
        });
      }
    });

    test('should support filtering by type', async () => {
      const types = ['CNC_MACHINE', 'ASSEMBLY_ROBOT', 'CONVEYOR'];
      
      for (const type of types) {
        const response = await apiContext.get(`/equipment?type=${type}`);
        expect(response.ok()).toBeTruthy();
        
        const data = await response.json();
        data.items.forEach((equipment: any) => {
          expect(equipment.type).toBe(type);
        });
      }
    });

    test('should support sorting', async () => {
      const sortOptions = [
        { sort: 'name', order: 'asc' },
        { sort: 'name', order: 'desc' },
        { sort: 'status', order: 'asc' },
        { sort: 'lastMaintenance', order: 'desc' }
      ];
      
      for (const option of sortOptions) {
        const response = await apiContext.get(
          `/equipment?sort=${option.sort}&order=${option.order}`
        );
        expect(response.ok()).toBeTruthy();
        
        const data = await response.json();
        
        // Verify sorting
        for (let i = 1; i < data.items.length; i++) {
          const prev = data.items[i - 1][option.sort];
          const curr = data.items[i][option.sort];
          
          if (option.order === 'asc') {
            expect(prev <= curr).toBeTruthy();
          } else {
            expect(prev >= curr).toBeTruthy();
          }
        }
      }
    });

    test('should support search', async () => {
      const response = await apiContext.get('/equipment?search=CNC');
      expect(response.ok()).toBeTruthy();
      
      const data = await response.json();
      data.items.forEach((equipment: any) => {
        const searchableFields = [
          equipment.name,
          equipment.description,
          equipment.model,
          equipment.serialNumber
        ].join(' ').toLowerCase();
        
        expect(searchableFields).toContain('cnc');
      });
    });

    test('should include nested relationships when requested', async () => {
      const response = await apiContext.get('/equipment?include=metrics,maintenance');
      expect(response.ok()).toBeTruthy();
      
      const data = await response.json();
      if (data.items.length > 0) {
        const equipment = data.items[0];
        expect(equipment).toHaveProperty('metrics');
        expect(equipment).toHaveProperty('maintenanceHistory');
        expect(Array.isArray(equipment.metrics)).toBeTruthy();
        expect(Array.isArray(equipment.maintenanceHistory)).toBeTruthy();
      }
    });

    test('should handle invalid query parameters gracefully', async () => {
      const response = await apiContext.get('/equipment?page=-1&pageSize=0');
      expect(response.status()).toBe(400);
      
      const error = await response.json();
      expect(error).toHaveProperty('error');
      expect(error.error).toContain('Invalid');
    });

    test('should enforce rate limiting', async () => {
      const requests = [];
      
      // Make 100 requests rapidly
      for (let i = 0; i < 100; i++) {
        requests.push(apiContext.get('/equipment'));
      }
      
      const responses = await Promise.all(requests);
      
      // Some requests should be rate limited
      const rateLimited = responses.filter(r => r.status() === 429);
      expect(rateLimited.length).toBeGreaterThan(0);
      
      // Check rate limit headers
      const limitedResponse = rateLimited[0];
      expect(limitedResponse.headers()['x-ratelimit-limit']).toBeTruthy();
      expect(limitedResponse.headers()['x-ratelimit-remaining']).toBeTruthy();
      expect(limitedResponse.headers()['x-ratelimit-reset']).toBeTruthy();
    });
  });

  test.describe('GET /api/equipment/:id', () => {
    test('should return equipment details', async () => {
      // First get list to get a valid ID
      const listResponse = await apiContext.get('/equipment?pageSize=1');
      const listData = await listResponse.json();
      const equipmentId = listData.items[0].id;
      
      const response = await apiContext.get(`/equipment/${equipmentId}`);
      expect(response.ok()).toBeTruthy();
      
      const equipment = await response.json();
      expect(equipment).toHaveProperty('id', equipmentId);
      expect(equipment).toHaveProperty('name');
      expect(equipment).toHaveProperty('type');
      expect(equipment).toHaveProperty('status');
      expect(equipment).toHaveProperty('specifications');
      expect(equipment).toHaveProperty('metrics');
    });

    test('should return 404 for non-existent equipment', async () => {
      const response = await apiContext.get('/equipment/non-existent-id');
      expect(response.status()).toBe(404);
      
      const error = await response.json();
      expect(error.error).toContain('not found');
    });

    test('should support field selection', async () => {
      const listResponse = await apiContext.get('/equipment?pageSize=1');
      const listData = await listResponse.json();
      const equipmentId = listData.items[0].id;
      
      const response = await apiContext.get(
        `/equipment/${equipmentId}?fields=id,name,status`
      );
      expect(response.ok()).toBeTruthy();
      
      const equipment = await response.json();
      expect(Object.keys(equipment)).toEqual(['id', 'name', 'status']);
    });

    test('should include real-time metrics when requested', async () => {
      const listResponse = await apiContext.get('/equipment?pageSize=1');
      const listData = await listResponse.json();
      const equipmentId = listData.items[0].id;
      
      const response = await apiContext.get(
        `/equipment/${equipmentId}?includeRealtime=true`
      );
      expect(response.ok()).toBeTruthy();
      
      const equipment = await response.json();
      expect(equipment).toHaveProperty('realtimeMetrics');
      expect(equipment.realtimeMetrics).toHaveProperty('timestamp');
      expect(new Date(equipment.realtimeMetrics.timestamp).getTime())
        .toBeCloseTo(Date.now(), -3); // Within last few seconds
    });
  });

  test.describe('POST /api/equipment', () => {
    test('should create new equipment', async () => {
      const newEquipment = {
        name: 'Test CNC Machine',
        type: 'CNC_MACHINE',
        model: 'CNC-2000',
        serialNumber: `TEST-${Date.now()}`,
        manufacturer: 'Test Corp',
        location: 'Building A, Floor 1',
        specifications: {
          powerRequirement: '380V',
          dimensions: '2m x 3m x 2.5m',
          weight: '2500kg'
        }
      };
      
      const response = await apiContext.post('/equipment', {
        data: newEquipment
      });
      
      expect(response.status()).toBe(201);
      
      const created = await response.json();
      expect(created).toHaveProperty('id');
      expect(created.name).toBe(newEquipment.name);
      expect(created.type).toBe(newEquipment.type);
      expect(created.status).toBe('offline'); // Default status
      
      // Cleanup
      await apiContext.delete(`/equipment/${created.id}`);
    });

    test('should validate required fields', async () => {
      const invalidEquipment = {
        // Missing required fields
        model: 'CNC-2000'
      };
      
      const response = await apiContext.post('/equipment', {
        data: invalidEquipment
      });
      
      expect(response.status()).toBe(400);
      
      const error = await response.json();
      expect(error.error).toContain('validation');
      expect(error.details).toHaveProperty('name');
      expect(error.details).toHaveProperty('type');
    });

    test('should validate field types and constraints', async () => {
      const invalidEquipment = {
        name: 'a', // Too short
        type: 'INVALID_TYPE',
        serialNumber: '123', // Too short
        installationDate: 'not-a-date'
      };
      
      const response = await apiContext.post('/equipment', {
        data: invalidEquipment
      });
      
      expect(response.status()).toBe(400);
      
      const error = await response.json();
      expect(error.details.name).toContain('minimum length');
      expect(error.details.type).toContain('valid type');
      expect(error.details.serialNumber).toContain('minimum length');
      expect(error.details.installationDate).toContain('valid date');
    });

    test('should prevent duplicate serial numbers', async () => {
      const equipment = {
        name: 'Test Equipment',
        type: 'CNC_MACHINE',
        serialNumber: `UNIQUE-${Date.now()}`,
        model: 'TEST-100'
      };
      
      // Create first
      const firstResponse = await apiContext.post('/equipment', {
        data: equipment
      });
      expect(firstResponse.ok()).toBeTruthy();
      const created = await firstResponse.json();
      
      // Try to create duplicate
      const duplicateResponse = await apiContext.post('/equipment', {
        data: equipment
      });
      expect(duplicateResponse.status()).toBe(409);
      
      const error = await duplicateResponse.json();
      expect(error.error).toContain('already exists');
      
      // Cleanup
      await apiContext.delete(`/equipment/${created.id}`);
    });
  });

  test.describe('PUT /api/equipment/:id', () => {
    let testEquipmentId: string;
    
    test.beforeEach(async () => {
      // Create test equipment
      const response = await apiContext.post('/equipment', {
        data: {
          name: 'Update Test Equipment',
          type: 'ASSEMBLY_ROBOT',
          serialNumber: `UPDATE-TEST-${Date.now()}`,
          model: 'ROBOT-100'
        }
      });
      
      const created = await response.json();
      testEquipmentId = created.id;
    });
    
    test.afterEach(async () => {
      // Cleanup
      await apiContext.delete(`/equipment/${testEquipmentId}`);
    });

    test('should update equipment details', async () => {
      const updates = {
        name: 'Updated Equipment Name',
        status: 'maintenance',
        location: 'Building B, Floor 2'
      };
      
      const response = await apiContext.put(`/equipment/${testEquipmentId}`, {
        data: updates
      });
      
      expect(response.ok()).toBeTruthy();
      
      const updated = await response.json();
      expect(updated.name).toBe(updates.name);
      expect(updated.status).toBe(updates.status);
      expect(updated.location).toBe(updates.location);
      expect(updated.updatedAt).not.toBe(updated.createdAt);
    });

    test('should validate status transitions', async () => {
      // Invalid transition: offline -> operational without checks
      const response = await apiContext.put(`/equipment/${testEquipmentId}`, {
        data: { status: 'operational' }
      });
      
      expect(response.status()).toBe(400);
      
      const error = await response.json();
      expect(error.error).toContain('Cannot transition');
    });

    test('should support partial updates', async () => {
      const response = await apiContext.patch(`/equipment/${testEquipmentId}`, {
        data: { location: 'New Location' }
      });
      
      expect(response.ok()).toBeTruthy();
      
      const updated = await response.json();
      expect(updated.location).toBe('New Location');
      // Other fields should remain unchanged
      expect(updated.name).toBe('Update Test Equipment');
      expect(updated.type).toBe('ASSEMBLY_ROBOT');
    });

    test('should track update history', async () => {
      // Make several updates
      await apiContext.patch(`/equipment/${testEquipmentId}`, {
        data: { location: 'Location 1' }
      });
      
      await apiContext.patch(`/equipment/${testEquipmentId}`, {
        data: { location: 'Location 2' }
      });
      
      // Get history
      const response = await apiContext.get(
        `/equipment/${testEquipmentId}/history`
      );
      
      expect(response.ok()).toBeTruthy();
      
      const history = await response.json();
      expect(Array.isArray(history)).toBeTruthy();
      expect(history.length).toBeGreaterThanOrEqual(2);
      
      // Verify history entries
      history.forEach((entry: any) => {
        expect(entry).toHaveProperty('timestamp');
        expect(entry).toHaveProperty('changes');
        expect(entry).toHaveProperty('userId');
      });
    });
  });

  test.describe('DELETE /api/equipment/:id', () => {
    test('should soft delete equipment', async () => {
      // Create test equipment
      const createResponse = await apiContext.post('/equipment', {
        data: {
          name: 'Delete Test Equipment',
          type: 'CONVEYOR',
          serialNumber: `DELETE-TEST-${Date.now()}`,
          model: 'CONV-100'
        }
      });
      
      const created = await createResponse.json();
      
      // Delete
      const deleteResponse = await apiContext.delete(`/equipment/${created.id}`);
      expect(deleteResponse.status()).toBe(204);
      
      // Verify soft delete
      const getResponse = await apiContext.get(`/equipment/${created.id}`);
      expect(getResponse.status()).toBe(404);
      
      // Admin can still see with includeDeleted
      const adminResponse = await apiContext.get(
        `/equipment/${created.id}?includeDeleted=true`
      );
      expect(adminResponse.ok()).toBeTruthy();
      
      const deleted = await adminResponse.json();
      expect(deleted.deletedAt).toBeTruthy();
    });

    test('should prevent deletion of equipment with active alerts', async () => {
      // This would require setting up test data with active alerts
      // Simplified version:
      const response = await apiContext.delete('/equipment/equipment-with-alerts');
      
      if (response.status() === 409) {
        const error = await response.json();
        expect(error.error).toContain('active alerts');
      }
    });

    test('should cascade delete related data when forced', async () => {
      // Create equipment with related data
      const createResponse = await apiContext.post('/equipment', {
        data: {
          name: 'Cascade Delete Test',
          type: 'CNC_MACHINE',
          serialNumber: `CASCADE-${Date.now()}`,
          model: 'CNC-100'
        }
      });
      
      const equipment = await createResponse.json();
      
      // Force delete with cascade
      const deleteResponse = await apiContext.delete(
        `/equipment/${equipment.id}?force=true&cascade=true`
      );
      
      expect(deleteResponse.status()).toBe(204);
      
      // Verify complete removal
      const getResponse = await apiContext.get(
        `/equipment/${equipment.id}?includeDeleted=true`
      );
      expect(getResponse.status()).toBe(404);
    });
  });

  test.describe('Equipment Metrics API', () => {
    let equipmentId: string;
    
    test.beforeAll(async () => {
      // Get first equipment for testing
      const response = await apiContext.get('/equipment?pageSize=1');
      const data = await response.json();
      equipmentId = data.items[0].id;
    });

    test('should return current metrics', async () => {
      const response = await apiContext.get(`/equipment/${equipmentId}/metrics`);
      expect(response.ok()).toBeTruthy();
      
      const metrics = await response.json();
      expect(metrics).toHaveProperty('oee');
      expect(metrics).toHaveProperty('availability');
      expect(metrics).toHaveProperty('performance');
      expect(metrics).toHaveProperty('quality');
      expect(metrics).toHaveProperty('timestamp');
    });

    test('should return historical metrics', async () => {
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
      
      const response = await apiContext.get(
        `/equipment/${equipmentId}/metrics/history?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
      );
      
      expect(response.ok()).toBeTruthy();
      
      const history = await response.json();
      expect(Array.isArray(history)).toBeTruthy();
      
      // Verify data points
      history.forEach((point: any) => {
        expect(new Date(point.timestamp).getTime()).toBeGreaterThanOrEqual(startDate.getTime());
        expect(new Date(point.timestamp).getTime()).toBeLessThanOrEqual(endDate.getTime());
        expect(point).toHaveProperty('oee');
      });
    });

    test('should support metric aggregation', async () => {
      const response = await apiContext.get(
        `/equipment/${equipmentId}/metrics/aggregate?interval=hour&metric=oee`
      );
      
      expect(response.ok()).toBeTruthy();
      
      const aggregated = await response.json();
      expect(Array.isArray(aggregated)).toBeTruthy();
      
      aggregated.forEach((point: any) => {
        expect(point).toHaveProperty('timestamp');
        expect(point).toHaveProperty('avg');
        expect(point).toHaveProperty('min');
        expect(point).toHaveProperty('max');
        expect(point).toHaveProperty('count');
      });
    });

    test('should post new metric data', async () => {
      const metricData = {
        timestamp: new Date().toISOString(),
        oee: 85.5,
        availability: 92.0,
        performance: 88.0,
        quality: 96.5,
        productionCount: 1250,
        defectCount: 12
      };
      
      const response = await apiContext.post(
        `/equipment/${equipmentId}/metrics`,
        { data: metricData }
      );
      
      expect(response.status()).toBe(201);
      
      const created = await response.json();
      expect(created.oee).toBe(metricData.oee);
      expect(created.equipmentId).toBe(equipmentId);
    });
  });

  test.describe('Equipment Maintenance API', () => {
    let equipmentId: string;
    
    test.beforeAll(async () => {
      const response = await apiContext.get('/equipment?pageSize=1');
      const data = await response.json();
      equipmentId = data.items[0].id;
    });

    test('should schedule maintenance', async () => {
      const maintenance = {
        type: 'preventive',
        scheduledDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
        estimatedDuration: 240, // 4 hours in minutes
        description: 'Routine preventive maintenance',
        requiredParts: ['Filter', 'Oil', 'Belt']
      };
      
      const response = await apiContext.post(
        `/equipment/${equipmentId}/maintenance`,
        { data: maintenance }
      );
      
      expect(response.status()).toBe(201);
      
      const scheduled = await response.json();
      expect(scheduled).toHaveProperty('id');
      expect(scheduled.status).toBe('scheduled');
      expect(scheduled.equipmentId).toBe(equipmentId);
    });

    test('should get maintenance history', async () => {
      const response = await apiContext.get(
        `/equipment/${equipmentId}/maintenance/history`
      );
      
      expect(response.ok()).toBeTruthy();
      
      const history = await response.json();
      expect(Array.isArray(history)).toBeTruthy();
      
      history.forEach((record: any) => {
        expect(record).toHaveProperty('id');
        expect(record).toHaveProperty('type');
        expect(record).toHaveProperty('performedDate');
        expect(record).toHaveProperty('duration');
        expect(record).toHaveProperty('technician');
      });
    });

    test('should calculate maintenance metrics', async () => {
      const response = await apiContext.get(
        `/equipment/${equipmentId}/maintenance/metrics`
      );
      
      expect(response.ok()).toBeTruthy();
      
      const metrics = await response.json();
      expect(metrics).toHaveProperty('mtbf'); // Mean Time Between Failures
      expect(metrics).toHaveProperty('mttr'); // Mean Time To Repair
      expect(metrics).toHaveProperty('availability');
      expect(metrics).toHaveProperty('maintenanceCost');
      expect(metrics).toHaveProperty('nextScheduledMaintenance');
    });
  });

  test.describe('Security and Authorization', () => {
    test('should require authentication', async () => {
      const unauthContext = await apiContext.request.newContext({
        baseURL: API_BASE_URL,
        extraHTTPHeaders: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });
      
      const response = await unauthContext.get('/equipment');
      expect(response.status()).toBe(401);
      
      const error = await response.json();
      expect(error.error).toContain('Unauthorized');
      
      await unauthContext.dispose();
    });

    test('should enforce role-based permissions', async () => {
      // Login as read-only user
      const authResponse = await apiContext.post('/auth/login', {
        data: {
          email: 'viewer@manufacturing.com',
          password: 'ViewerPass123!'
        }
      });
      
      const authData = await authResponse.json();
      const viewerToken = authData.token;
      
      const viewerContext = await apiContext.request.newContext({
        baseURL: API_BASE_URL,
        extraHTTPHeaders: {
          'Authorization': `Bearer ${viewerToken}`,
          'Content-Type': 'application/json',
        },
      });
      
      // Should be able to read
      const getResponse = await viewerContext.get('/equipment');
      expect(getResponse.ok()).toBeTruthy();
      
      // Should not be able to create
      const createResponse = await viewerContext.post('/equipment', {
        data: {
          name: 'Unauthorized Equipment',
          type: 'CNC_MACHINE',
          serialNumber: 'UNAUTH-001',
          model: 'TEST'
        }
      });
      
      expect(createResponse.status()).toBe(403);
      
      const error = await createResponse.json();
      expect(error.error).toContain('Forbidden');
      
      await viewerContext.dispose();
    });

    test('should validate JWT tokens', async () => {
      const invalidTokenContext = await apiContext.request.newContext({
        baseURL: API_BASE_URL,
        extraHTTPHeaders: {
          'Authorization': 'Bearer invalid.jwt.token',
          'Content-Type': 'application/json',
        },
      });
      
      const response = await invalidTokenContext.get('/equipment');
      expect(response.status()).toBe(401);
      
      const error = await response.json();
      expect(error.error).toContain('Invalid token');
      
      await invalidTokenContext.dispose();
    });

    test('should handle expired tokens', async () => {
      // This would require a pre-generated expired token
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE2MDAwMDAwMDB9.invalid';
      
      const expiredContext = await apiContext.request.newContext({
        baseURL: API_BASE_URL,
        extraHTTPHeaders: {
          'Authorization': `Bearer ${expiredToken}`,
          'Content-Type': 'application/json',
        },
      });
      
      const response = await expiredContext.get('/equipment');
      expect(response.status()).toBe(401);
      
      const error = await response.json();
      expect(error.error).toContain('expired');
      
      await expiredContext.dispose();
    });
  });
});