# Test Implementation Plan - Manufacturing Analytics Platform

## Overview

This document outlines a systematic approach to improving test coverage from the current ~40% to the target of 80%+ coverage within 4 weeks.

## Current State
- **Overall Coverage**: ~40%
- **Passing Tests**: Unit tests for utilities and some components
- **Failing Tests**: All integration tests due to schema mismatches
- **Missing Tests**: Services, API routes, most components, AI integration

## Week 1: Fix Foundation & Critical Services

### Day 1-2: Fix Failing Integration Tests
**Priority**: CRITICAL
**Files to Update**:
- `src/__tests__/integration/database.integration.test.ts`
- `src/__tests__/integration/api.integration.test.ts`
- `src/__tests__/integration/services.integration.test.ts`
- `src/test-utils/factories.ts`

**Tasks**:
1. Update test factories to match current Prisma schema
2. Remove references to non-existent fields:
   - Remove `specifications` from Equipment tests
   - Remove `measurements` from QualityCheck tests
   - Remove `metadata` from Metric tests
3. Fix equipment-production line relationships
4. Add missing required fields in test data

### Day 3-4: Service Layer Tests
**Priority**: HIGH
**New Test Files to Create**:
- `src/__tests__/services/alertService.test.ts`
- `src/__tests__/services/equipmentService.test.ts`
- `src/__tests__/services/metricsService.test.ts`
- `src/__tests__/services/chatService.test.ts`

**Test Coverage Goals**:
- CRUD operations
- Business logic validation
- Error handling
- Data transformation

### Day 5: API Route Tests
**Priority**: HIGH
**New Test Files to Create**:
- `src/__tests__/api/alerts.test.ts`
- `src/__tests__/api/equipment.test.ts`
- `src/__tests__/api/metrics.test.ts`
- `src/__tests__/api/chat.test.ts`

**Test Coverage Goals**:
- Request/response validation
- Authentication checks
- Error responses
- Data filtering and pagination

## Week 2: Component Testing

### Day 1-2: Critical Component Tests
**Priority**: HIGH
**Components to Test**:
- Equipment Components:
  - `EquipmentCard.tsx`
  - `EquipmentList.tsx`
  - `EquipmentStatusBadge.tsx`
- Alert Components:
  - `AlertBadge.tsx`
  - `AlertCard.tsx`
  - `AlertList.tsx`

### Day 3-4: Chat Component Tests
**Priority**: HIGH
**Components to Test**:
- `ChatMessage.tsx`
- `ChatInput.tsx`
- `StreamingChatMessage.tsx`
- `SampleQuestions.tsx`

### Day 5: Dashboard Component Tests
**Priority**: MEDIUM
**Components to Test**:
- `EquipmentItem.tsx`
- `DashboardCard.tsx`
- Panel components

## Week 3: AI Integration & Real-time Features

### Day 1-2: AI Service Tests
**Priority**: HIGH
**New Test Files**:
- `src/__tests__/core/ai/AIServiceImpl.test.ts`
- `src/__tests__/core/ai/OllamaProvider.test.ts`
- `src/__tests__/core/ai/ManufacturingAssistantImpl.test.ts`

**Test Coverage**:
- Mock Ollama responses
- Query processing
- Context retrieval
- Error handling

### Day 3-4: WebSocket & Real-time Tests
**Priority**: MEDIUM
**New Test Files**:
- `src/__tests__/services/websocketService.test.ts`
- `src/__tests__/api/ws.test.ts`

### Day 5: Integration Test Suite
**Priority**: HIGH
**Tasks**:
- Create end-to-end integration tests
- Test complete workflows
- Verify data flow through system

## Week 4: E2E & Performance

### Day 1-2: E2E Test Suite Enhancement
**Priority**: HIGH
**Tasks**:
- Review and update existing E2E tests
- Add missing user journey tests
- Add data validation tests

### Day 3-4: Performance & Load Tests
**Priority**: MEDIUM
**New Test Files**:
- `tests/performance/api-load.test.ts`
- `tests/performance/database-queries.test.ts`

### Day 5: Coverage Gaps & Documentation
**Priority**: LOW
**Tasks**:
- Fill remaining coverage gaps
- Update test documentation
- Create testing best practices guide

## Test Implementation Guidelines

### 1. Test Structure Template
```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('ComponentName', () => {
  beforeEach(() => {
    // Setup
  });

  describe('Feature/Method', () => {
    it('should handle expected behavior', () => {
      // Arrange
      // Act
      // Assert
    });

    it('should handle edge cases', () => {
      // Test edge cases
    });

    it('should handle errors gracefully', () => {
      // Test error scenarios
    });
  });
});
```

### 2. Mock Strategy
- Use Vitest's `vi.mock()` for module mocking
- Create reusable mock factories
- Mock external services (Ollama, database)
- Use MSW for API mocking in integration tests

### 3. Test Data Management
- Use factories for consistent test data
- Clean up test data after each test
- Use transactions for database tests
- Maintain test data in separate files

### 4. Coverage Requirements
- Minimum 80% line coverage
- Minimum 75% branch coverage
- 100% coverage for critical paths
- Document uncovered code with reasons

## Success Metrics

### Week 1 Goals
- ✅ All integration tests passing
- ✅ Service layer tests at 80% coverage
- ✅ API route tests at 70% coverage

### Week 2 Goals
- ✅ Component tests at 75% coverage
- ✅ Critical user paths fully tested
- ✅ No untested error boundaries

### Week 3 Goals
- ✅ AI integration fully tested
- ✅ Real-time features tested
- ✅ Overall coverage at 70%

### Week 4 Goals
- ✅ E2E tests comprehensive
- ✅ Performance benchmarks established
- ✅ Overall coverage at 80%+

## Testing Commands

```bash
# Run specific test file
npm run test -- src/__tests__/services/alertService.test.ts

# Run tests with coverage for specific directory
npm run test:coverage -- src/services

# Run integration tests only
npm run test:integration

# Run E2E tests for specific feature
npm run test:e2e -- --grep "alerts"

# Generate coverage report
npm run test:coverage && open coverage/index.html
```

## Risk Mitigation

### Potential Blockers
1. **Schema Changes**: Keep tests updated with schema
2. **External Dependencies**: Mock appropriately
3. **Flaky Tests**: Use proper wait strategies
4. **Performance**: Optimize test database queries

### Mitigation Strategies
1. Run tests in CI on every PR
2. Require tests for new features
3. Regular test maintenance sprints
4. Monitor test execution time

## Conclusion

This plan provides a structured approach to achieving 80% test coverage within 4 weeks. The focus is on fixing foundation issues first, then systematically adding coverage for critical business logic, components, and user journeys.