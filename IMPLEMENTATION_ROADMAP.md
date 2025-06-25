# Implementation Roadmap - Production Ready Manufacturing Analytics

## Immediate Actions Required (Today)

### 1. Fix Critical Test Infrastructure Issues

#### 1.1 Database Connection Errors
**Problem**: Integration tests failing with `PrismaClientValidationError`
**Solution**:
```bash
# Set up test database
docker run -d \
  --name test-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=test_manufacturing_analytics \
  -p 5433:5432 \
  postgres:15-alpine

# Update .env.test
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/test_manufacturing_analytics"
```

#### 1.2 Fix Import/Mock Issues
**Problem**: `TypeError: this.purify.setConfig is not a function`
**Solution**: Update InputSanitizer to handle missing DOMPurify properly
```typescript
// Fix in src/lib/security/validation.ts
constructor() {
  this.purify = {
    sanitize: (input: string) => {
      // Basic HTML sanitization
      return input
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');
    }
  };
}
```

#### 1.3 Fix Prisma Enum Issue
**Problem**: `TypeError: Invalid enum value: __esModule`
**Solution**: Update manufacturing integration test imports
```typescript
// Fix in manufacturing.integration.test.ts
import { PrismaClient } from '@prisma/client';
// Remove any incorrect enum imports
```

### 2. Configure Vitest for 100% Coverage

Create comprehensive vitest configuration:
```typescript
// vitest.config.production.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    coverage: {
      enabled: true,
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      all: true,
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'node_modules/',
        'src/**/*.d.ts',
        'src/**/*.test.{ts,tsx}',
        'src/**/*.spec.{ts,tsx}',
        'src/test-utils/**',
        'src/mocks/**',
        '**/*.config.ts',
        '**/types.ts'
      ],
      thresholds: {
        lines: 100,
        functions: 100,
        branches: 100,
        statements: 100
      },
      watermarks: {
        statements: [100, 100],
        functions: [100, 100],
        branches: [100, 100],
        lines: [100, 100]
      }
    }
  }
});
```

### 3. Production Dockerfile

```dockerfile
# Dockerfile.production
FROM node:18-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Dependencies stage
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci --only=production

# Build stage
FROM base AS builder
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build

# Runner stage
FROM base AS runner
WORKDIR /app
ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy necessary files
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT 3000

CMD ["node", "server.js"]
```

### 4. Helm Chart Structure

```yaml
# helm/manufacturing-analytics/Chart.yaml
apiVersion: v2
name: manufacturing-analytics
description: Production-ready manufacturing analytics platform
type: application
version: 1.0.0
appVersion: "1.0.0"

# helm/manufacturing-analytics/values.yaml
replicaCount: 3

image:
  repository: your-registry/manufacturing-analytics
  pullPolicy: IfNotPresent
  tag: ""

service:
  type: ClusterIP
  port: 80
  targetPort: 3000

ingress:
  enabled: true
  className: "nginx"
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
  hosts:
    - host: manufacturing-analytics.yourdomain.com
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: manufacturing-analytics-tls
      hosts:
        - manufacturing-analytics.yourdomain.com

resources:
  limits:
    cpu: 1000m
    memory: 1Gi
  requests:
    cpu: 500m
    memory: 512Mi

autoscaling:
  enabled: true
  minReplicas: 3
  maxReplicas: 10
  targetCPUUtilizationPercentage: 80
  targetMemoryUtilizationPercentage: 80

postgresql:
  enabled: true
  auth:
    postgresPassword: "changeme"
    database: manufacturing_analytics

redis:
  enabled: true
  auth:
    enabled: true
    password: "changeme"

monitoring:
  prometheus:
    enabled: true
    port: 9090
  manufacturingPlatform:
    enabled: true
```

### 5. GitHub Actions CI/CD Pipeline

```yaml
# .github/workflows/production-ci.yml
name: Production CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  quality-checks:
    name: Code Quality & Tests
    runs-on: ubuntu-latest
    timeout-minutes: 30
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: test_manufacturing_analytics
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run linting
        run: npm run lint
      
      - name: Run type checking
        run: npm run typecheck
      
      - name: Run tests with coverage
        run: npm run test:coverage
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test_manufacturing_analytics
      
      - name: Check coverage thresholds
        run: |
          coverage_json=$(cat coverage/coverage-summary.json)
          lines=$(echo $coverage_json | jq '.total.lines.pct')
          functions=$(echo $coverage_json | jq '.total.functions.pct')
          branches=$(echo $coverage_json | jq '.total.branches.pct')
          statements=$(echo $coverage_json | jq '.total.statements.pct')
          
          if (( $(echo "$lines < 100" | bc -l) )) || \
             (( $(echo "$functions < 100" | bc -l) )) || \
             (( $(echo "$branches < 100" | bc -l) )) || \
             (( $(echo "$statements < 100" | bc -l) )); then
            echo "Coverage thresholds not met!"
            echo "Lines: $lines%, Functions: $functions%, Branches: $branches%, Statements: $statements%"
            exit 1
          fi
      
      - name: Upload coverage reports
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info
          flags: unittests
          name: codecov-umbrella
      
      - name: Security audit
        run: |
          npm audit --audit-level=high
          if [ $? -ne 0 ]; then
            echo "High severity vulnerabilities found!"
            exit 1
          fi

  build-and-push:
    name: Build & Push Docker Image
    needs: quality-checks
    runs-on: ubuntu-latest
    if: github.event_name == 'push'
    
    permissions:
      contents: read
      packages: write
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Log in to Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      
      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=ref,event=branch
            type=ref,event=pr
            type=semver,pattern={{version}}
            type=semver,pattern={{major}}.{{minor}}
            type=sha
      
      - name: Build and push Docker image
        uses: docker/build-push-action@v5
        with:
          context: .
          file: ./Dockerfile.production
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  deploy-staging:
    name: Deploy to Staging
    needs: build-and-push
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/develop'
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Kubectl
        uses: azure/setup-kubectl@v3
        with:
          version: 'v1.28.0'
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-west-2
      
      - name: Update kubeconfig
        run: aws eks update-kubeconfig --name staging-cluster --region us-west-2
      
      - name: Deploy to staging
        run: |
          helm upgrade --install manufacturing-analytics ./helm/manufacturing-analytics \
            --namespace staging \
            --create-namespace \
            --set image.tag=${{ github.sha }} \
            --set-file secrets.env=.env.staging \
            --wait \
            --timeout 10m
      
      - name: Run smoke tests
        run: |
          npm run test:e2e:staging
        env:
          STAGING_URL: https://staging.manufacturing-analytics.com

  deploy-production:
    name: Deploy to Production
    needs: [build-and-push, deploy-staging]
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    environment:
      name: production
      url: https://manufacturing-analytics.com
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-west-2
      
      - name: Update kubeconfig
        run: aws eks update-kubeconfig --name production-cluster --region us-west-2
      
      - name: Deploy to production
        run: |
          helm upgrade --install manufacturing-analytics ./helm/manufacturing-analytics \
            --namespace production \
            --create-namespace \
            --set image.tag=${{ github.sha }} \
            --set-file secrets.env=.env.production \
            --set replicaCount=5 \
            --set resources.requests.cpu=1000m \
            --set resources.requests.memory=1Gi \
            --wait \
            --timeout 10m \
            --atomic
      
      - name: Verify deployment
        run: |
          kubectl rollout status deployment/manufacturing-analytics -n production
          kubectl get pods -n production -l app=manufacturing-analytics
      
      - name: Run production smoke tests
        run: |
          npm run test:e2e:production
        env:
          PRODUCTION_URL: https://manufacturing-analytics.com
```

## Test Coverage Strategy

### Missing Test Areas to Cover

1. **API Routes** - Currently untested
   - Create tests for all /api/* endpoints
   - Test authentication, authorization
   - Test error handling
   - Test rate limiting

2. **Services Layer**
   - manufacturingDataService
   - alertService
   - chatService
   - metricsService

3. **Utility Functions**
   - calculations.ts
   - dataValidation.ts
   - errorHandling.ts

4. **React Hooks**
   - useOptimizedData
   - useStreamingChat
   - useDashboardState

5. **Edge Cases**
   - Network failures
   - Database connection loss
   - Invalid data handling
   - Concurrent user scenarios

## Monitoring Implementation

```typescript
// src/lib/monitoring/metrics.ts
import { register, collectDefaultMetrics, Counter, Histogram, Gauge } from 'prom-client';

// Collect default metrics
collectDefaultMetrics({ register });

// HTTP metrics
export const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'path', 'status']
});

export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request latency',
  labelNames: ['method', 'path', 'status'],
  buckets: [0.1, 0.5, 1, 2, 5]
});

// Business metrics
export const activeUsers = new Gauge({
  name: 'active_users',
  help: 'Number of active users'
});

export const equipmentStatus = new Gauge({
  name: 'equipment_status',
  help: 'Equipment operational status',
  labelNames: ['equipment_id', 'status']
});

// Database metrics
export const dbConnectionPool = new Gauge({
  name: 'db_connection_pool_size',
  help: 'Database connection pool size',
  labelNames: ['status']
});

export const dbQueryDuration = new Histogram({
  name: 'db_query_duration_seconds',
  help: 'Database query duration',
  labelNames: ['query_type'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 5]
});
```

## Final Checklist

### Before Production Release

- [ ] All tests passing (186/186)
- [ ] 100% code coverage achieved
- [ ] No TypeScript errors
- [ ] No ESLint warnings
- [ ] All npm audit vulnerabilities fixed
- [ ] Docker image < 200MB
- [ ] Kubernetes manifests validated
- [ ] Staging deployment successful
- [ ] Load testing completed (1000 req/s)
- [ ] Security scan passed
- [ ] Documentation complete
- [ ] Monitoring dashboards created
- [ ] Alerts configured
- [ ] Runbooks written
- [ ] Rollback tested
- [ ] Backup/restore tested
- [ ] SSL certificates valid
- [ ] DNS configured
- [ ] CDN configured
- [ ] Rate limiting tested