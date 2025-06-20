# Manufacturing Analytics Platform - Comprehensive Project Documentation

## Table of Contents

1. [Project Overview](#project-overview)
2. [Tech Stack Specification](#tech-stack-specification)
3. [Project Structure](#project-structure)
4. [Architecture Documentation](#architecture-documentation)
5. [Frontend Specifications](#frontend-specifications)
6. [Backend & Data Management](#backend--data-management)
7. [Deployment & DevOps](#deployment--devops)
8. [Features & Capabilities](#features--capabilities)
9. [API Documentation](#api-documentation)
10. [Database Schema](#database-schema)
11. [Configuration Guide](#configuration-guide)
12. [Development Setup](#development-setup)

---

## Project Overview

**Adaptive Factory AI Solutions, Inc. - Manufacturing Analytics Platform**

A comprehensive, enterprise-grade manufacturing Analytics platform that provides real-time monitoring, AI-powered insights, and predictive Analytics for manufacturing operations. The platform integrates with industrial systems (MQTT, OPC-UA), provides multi-tenant architecture, and features an AI assistant powered by Ollama.

### Key Value Propositions
- Real-time OEE (Overall Equipment Effectiveness) monitoring
- AI-powered manufacturing assistant
- Multi-tenant enterprise architecture
- Industrial protocol integration (MQTT, OPC-UA)
- Comprehensive compliance and quality management
- Predictive maintenance capabilities

---

## Tech Stack Specification

### **Frontend Framework**
- **Next.js 14.1.0** - React framework with App Router
- **React 18.3.1** - UI library
- **TypeScript 5.3.0** - Type-safe JavaScript

### **Styling & UI**
- **Tailwind CSS 3.4.1** - Utility-first CSS framework
- **Lucide React 0.518.0** - Icon library
- **Framer Motion 12.18.1** - Animation library

### **Data Visualization**
- **Recharts 2.15.3** - React charting library (primary)
- **Highcharts 12.2.0** - Advanced charting library
- **Custom Analog Components** - Smooth analog-style displays

### **Backend & API**
- **Next.js API Routes** - Server-side API endpoints
- **Prisma 5.7.0** - Database ORM
- **PostgreSQL 14** - Primary database

### **AI Integration**
- **Ollama** - Local LLM hosting
- **Custom AI Services** - Manufacturing-specific AI assistant
- **Streaming Chat** - Real-time AI interactions

### **Industrial Protocols**
- **MQTT 5.13.1** - IoT messaging protocol
- **node-opcua 2.156.0** - OPC-UA industrial protocol
- **Custom REST Adapters** - API integrations

### **Testing Framework**
- **Vitest 0.34.6** - Unit testing
- **Playwright 1.53.0** - E2E testing
- **Testing Library** - React component testing
- **MSW 2.10.2** - API mocking

### **Development Tools**
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **TypeScript** - Static type checking

### **Deployment & Containerization**
- **Docker & Docker Compose** - Containerization
- **GitHub Actions** - CI/CD pipelines
- **Prometheus** - Metrics collection
- **Node Exporter** - System metrics

---

## Project Structure

```
manufacturing-Analytics-platform/
├── 📁 src/                          # Main application source
│   ├── 📁 app/                      # Next.js App Router pages & API
│   │   ├── 📁 api/                  # Server-side API endpoints
│   │   │   ├── 📁 alerts/           # Alert management APIs
│   │   │   ├── 📁 chat/             # AI chat APIs
│   │   │   ├── 📁 diagnostics/      # System health APIs
│   │   │   ├── 📁 equipment/        # Equipment management APIs
│   │   │   └── 📁 metrics/          # Manufacturing metrics APIs
│   │   ├── 📁 dashboard/            # Main dashboard page
│   │   ├── 📁 equipment/            # Equipment management pages
│   │   ├── 📁 alerts/               # Alert management pages
│   │   ├── 📁 manufacturing-chat/   # AI chat interface
│   │   └── 📁 diagnostics/          # System diagnostics
│   ├── 📁 components/               # React components
│   │   ├── 📁 alerts/               # Alert UI components
│   │   ├── 📁 charts/               # Chart visualization
│   │   ├── 📁 chat/                 # Chat interface components
│   │   ├── 📁 common/               # Shared components
│   │   ├── 📁 dashboard/            # Dashboard components
│   │   ├── 📁 diagnostics/          # Diagnostic components
│   │   ├── 📁 equipment/            # Equipment UI components
│   │   ├── 📁 layout/               # Layout components
│   │   ├── 📁 panels/               # Data visualization panels
│   │   └── 📁 providers/            # React context providers
│   ├── 📁 core/                     # Business logic & services
│   │   ├── 📁 ai/                   # AI service implementations
│   │   ├── 📁 api-gateway/          # API gateway & routing
│   │   ├── 📁 architecture/         # Application services
│   │   ├── 📁 compliance/           # Compliance management
│   │   ├── 📁 integration/          # External integrations
│   │   ├── 📁 multi-tenancy/        # Multi-tenant support
│   │   └── 📁 services/             # Domain services
│   ├── 📁 services/                 # External service clients
│   ├── 📁 lib/                      # Shared libraries
│   ├── 📁 types/                    # TypeScript type definitions
│   └── 📁 utils/                    # Utility functions
├── 📁 prisma/                       # Database ORM
│   ├── schema.prisma                # Database schema
│   ├── 📁 migrations/               # Database migrations
│   └── seed.ts                      # Database seeding
├── 📁 tests/                        # Test suites
│   ├── 📁 e2e/                      # End-to-end tests
│   ├── 📁 unit/                     # Unit tests
│   └── 📁 integration/              # Integration tests
├── 📁 deployment/                   # Deployment configurations
│   ├── 📁 templates/                # Deployment templates
│   └── 📁 scripts/                  # Deployment scripts
├── 📁 docs/                         # Documentation
├── 📁 monitoring/                   # Monitoring configuration
├── docker-compose.yml               # Container orchestration
├── package.json                     # Dependencies & scripts
├── next.config.js                   # Next.js configuration
├── tailwind.config.js               # Tailwind CSS configuration
└── tsconfig.json                    # TypeScript configuration
```

---

## Architecture Documentation

### **System Architecture Overview**

The platform follows a modern, scalable architecture with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────┐
│                     Client Layer                            │
├─────────────────────────────────────────────────────────────┤
│  Next.js Frontend (React + TypeScript)                     │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐          │
│  │  Dashboard  │ │  Equipment  │ │   AI Chat   │          │
│  │     UI      │ │     UI      │ │     UI      │          │
│  └─────────────┘ └─────────────┘ └─────────────┘          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  API Gateway Layer                          │
├─────────────────────────────────────────────────────────────┤
│  Next.js API Routes + Custom API Gateway                   │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐          │
│  │   Equipment │ │    Alerts   │ │  AI Chat    │          │
│  │     API     │ │     API     │ │     API     │          │
│  └─────────────┘ └─────────────┘ └─────────────┘          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                 Business Logic Layer                        │
├─────────────────────────────────────────────────────────────┤
│  Core Services & Domain Logic                              │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐          │
│  │ Equipment   │ │   Alert     │ │     AI      │          │
│  │  Service    │ │  Service    │ │   Service   │          │
│  └─────────────┘ └─────────────┘ └─────────────┘          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  Data Access Layer                          │
├─────────────────────────────────────────────────────────────┤
│  Prisma ORM + Database Adapters                            │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐          │
│  │ PostgreSQL  │ │   MQTT      │ │   OPC-UA    │          │
│  │  Database   │ │ Integration │ │ Integration │          │
│  └─────────────┘ └─────────────┘ └─────────────┘          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│               External Systems & Services                   │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐          │
│  │   Ollama    │ │ Industrial  │ │ Monitoring  │          │
│  │   AI LLM    │ │  Equipment  │ │ & Metrics   │          │
│  └─────────────┘ └─────────────┘ └─────────────┘          │
└─────────────────────────────────────────────────────────────┘
```

### **Data Flow Architecture**

```
┌─────────────────┐    HTTP/WebSocket    ┌─────────────────┐
│   Manufacturing │ ───────────────────► │   Frontend      │
│   Equipment     │                      │   Dashboard     │
│   (MQTT/OPC-UA) │                      └─────────────────┘
└─────────────────┘                               │
         │                                        │ API Calls
         │ Data Ingestion                         ▼
         ▼                              ┌─────────────────┐
┌─────────────────┐                     │   API Gateway   │
│   Integration   │                     │   (Next.js)     │
│   Adapters      │                     └─────────────────┘
│   (MQTT/REST)   │                              │
└─────────────────┘                              │ Business Logic
         │                                       ▼
         │ Metrics Storage                ┌─────────────────┐
         ▼                               │   Core Services │
┌─────────────────┐    Query/Update     │   & Domain      │
│   PostgreSQL    │ ◄─────────────────► │   Logic         │
│   Database      │                     └─────────────────┘
│   (Prisma ORM)  │                              │
└─────────────────┘                              │ AI Queries
                                                 ▼
                                        ┌─────────────────┐
                                        │   Ollama AI     │
                                        │   Service       │
                                        └─────────────────┘
```

---

## Frontend Specifications

### **Framework Configuration**
- **Next.js 14** with App Router architecture
- **React 18** with functional components and hooks
- **TypeScript** for type safety and developer experience

### **State Management**
- **React Context** for global state
- **useState/useEffect** for local component state
- **Custom hooks** for reusable logic
- **Zustand** (if needed for complex state)

### **Styling Architecture**
- **Tailwind CSS** utility-first approach
- **Custom CSS classes** in `globals.css`
- **Component-specific styles** with CSS modules
- **Responsive design** with mobile-first approach

### **Component Architecture**
```typescript
// Example component structure
interface ComponentProps {
  data: MetricData[];
  onUpdate?: (data: MetricData) => void;
}

export default function ManufacturingChart({ data, onUpdate }: ComponentProps) {
  const [loading, setLoading] = useState(false);
  
  return (
    <div className="card animate-fadeIn">
      {/* Component content */}
    </div>
  );
}
```

### **Responsive Design Breakpoints**
```css
/* Tailwind CSS breakpoints */
sm: 640px   /* Small devices */
md: 768px   /* Medium devices */
lg: 1024px  /* Large devices */
xl: 1280px  /* Extra large devices */
2xl: 1536px /* 2X large devices */
```

### **Custom UI Components**
- **AnalogGauge** - SVG-based analog displays
- **SmoothLineChart** - Continuous data streaming charts
- **StreamingChart** - Real-time metric visualization
- **AnimatedNumber** - Smooth number transitions
- **AlertCard** - Alert management UI
- **EquipmentCard** - Equipment status display

---

## Backend & Data Management

### **Database System**
- **PostgreSQL 14** - Primary database
- **Prisma 5.7.0** - Database ORM and query builder
- **Connection pooling** for performance optimization

### **Database Schema Overview**

#### **Hierarchical Manufacturing Structure**
```
Enterprise (1) → Site (N) → Area (N) → WorkCenter (N) → WorkUnit (N)
```

#### **Core Models**
```typescript
// Manufacturing Hierarchy
model Enterprise {
  id    String @id
  name  String
  code  String @unique
  sites Site[]
}

model WorkUnit {
  id               String @id
  name             String
  code             String @unique
  equipmentType    String
  status           String @default("operational")
  metrics          Metric[]
  alerts           Alert[]
  maintenanceRecords MaintenanceRecord[]
}

// Metrics & Performance
model Metric {
  id         String   @id
  workUnitId String
  timestamp  DateTime @default(now())
  name       String
  value      Float
  unit       String?
  workUnit   WorkUnit @relation(fields: [workUnitId], references: [id])
}
```

### **API Architecture**

#### **RESTful API Design**
```typescript
// Equipment APIs
GET    /api/equipment          # List equipment
GET    /api/equipment/[id]     # Get specific equipment
POST   /api/equipment          # Create equipment
PUT    /api/equipment/[id]     # Update equipment
DELETE /api/equipment/[id]     # Delete equipment

// Metrics APIs
POST   /api/metrics/ingest     # Ingest metrics data
POST   /api/metrics/query      # Query metrics with filters
GET    /api/metrics/latest     # Get latest metrics
```

### **Authentication & Authorization**
- **User model** with role-based access control
- **Multi-tenant architecture** with site-based isolation
- **Password hashing** with bcrypt
- **Session management** (implementation ready)

### **Data Validation**
- **Zod schemas** for runtime type validation
- **Prisma schema** for database constraints
- **API input validation** at endpoint level

---

## Deployment & DevOps

### **Containerization**
```yaml
# docker-compose.yml services
services:
  postgres:          # PostgreSQL database
  ollama:            # AI LLM service
  prometheus:        # Metrics collection
  node-exporter:     # System metrics
  metrics-simulator: # Manufacturing data simulation
```

### **CI/CD Pipeline**
```yaml
# GitHub Actions workflow
stages:
  - lint-typecheck:  # Code quality checks
  - unit-tests:      # Unit test execution
  - build:           # Application build
  - e2e-tests:       # End-to-end testing
  - deploy:          # Deployment (CD workflow)
```

### **Environment Configuration**
```bash
# Required environment variables
DATABASE_URL="postgresql://..."
DIRECT_DATABASE_URL="postgresql://..."
OLLAMA_BASE_URL="http://localhost:11434"
NODE_ENV="production"
```

### **Monitoring & Observability**
- **Prometheus** for metrics collection
- **Custom diagnostics APIs** for health checks
- **Application performance monitoring**
- **Error tracking and logging**

---

## Features & Capabilities

### **Manufacturing Analytics**
1. **Real-time OEE Monitoring**
   - Availability, Performance, Quality tracking
   - Historical trend analysis
   - Benchmarking and goal setting

2. **Equipment Management**
   - Asset tracking and maintenance scheduling
   - Performance monitoring
   - Predictive maintenance alerts

3. **Quality Management**
   - Quality metric tracking
   - Compliance reporting
   - Defect analysis and trends

### **AI Integration**
1. **Manufacturing Assistant**
   - Context-aware manufacturing queries
   - Real-time chat interface
   - Streaming responses
   - Manufacturing-specific knowledge base

2. **Predictive Analytics**
   - Equipment failure prediction
   - Maintenance optimization
   - Production forecasting

### **Enterprise Features**
1. **Multi-tenant Architecture**
   - Site-based data isolation
   - Role-based access control
   - Scalable user management

2. **Integration Capabilities**
   - MQTT protocol support
   - OPC-UA integration
   - REST API connections
   - Custom data transformers

### **Visualization & Dashboards**
1. **Real-time Dashboards**
   - Customizable KPI displays
   - Interactive charts and graphs
   - Analog-style continuous displays

2. **Alert Management**
   - Real-time alert notifications
   - Alert escalation workflows
   - Historical alert analysis

---

## API Documentation

### **Equipment Management API**

```typescript
// GET /api/equipment
Response: {
  equipment: Array<{
    id: string;
    name: string;
    code: string;
    status: 'operational' | 'maintenance' | 'offline';
    lastUpdate: string;
  }>
}

// POST /api/metrics/ingest
Request: {
  equipmentId: string;
  metrics: Array<{
    name: string;
    value: number;
    timestamp: string;
    unit?: string;
  }>
}
```

### **AI Chat API**

```typescript
// POST /api/chat/manufacturing
Request: {
  message: string;
  context?: {
    equipmentId?: string;
    timeRange?: { from: string; to: string; }
  }
}

Response: {
  response: string;
  suggestions?: string[];
  context?: object;
}

// POST /api/chat/stream
// Server-Sent Events for real-time responses
```

---

## Database Schema

### **Complete Prisma Schema Structure**

The database follows a hierarchical manufacturing structure with comprehensive metrics tracking:

```typescript
// Core hierarchy: Enterprise → Site → Area → WorkCenter → WorkUnit

// Key relationships:
- WorkUnit (1) → Metrics (N)
- WorkUnit (1) → Alerts (N)
- WorkUnit (1) → MaintenanceRecords (N)
- WorkUnit (1) → PerformanceMetrics (N)
- ProductionOrder (1) → QualityChecks (N)
- User (1) → Dashboards (N)

// KPI Summary tables for performance:
- EnterpriseKPISummary
- SiteKPISummary
- AreaKPISummary
- WorkCenterKPISummary
- WorkUnitKPISummary
```

---

## Configuration Guide

### **Environment Setup**
1. **Database Configuration**
   ```bash
   DATABASE_URL="postgresql://username:password@host:port/database"
   DIRECT_DATABASE_URL="postgresql://..." # For Prisma migrations
   ```

2. **AI Service Configuration**
   ```bash
   OLLAMA_BASE_URL="http://localhost:11434"
   OLLAMA_MODEL="gemma2:2b" # or preferred model
   ```

3. **Feature Flags**
   ```typescript
   // src/config/features.ts
   export const features = {
     enableMetricsTest: true,
     enableAIChat: true,
     enableRealTimeUpdates: true
   };
   ```

### **Development vs Production**
```bash
# Development
NODE_ENV=development
DATABASE_URL="postgresql://localhost:5432/manufacturing_dev"

# Production
NODE_ENV=production
DATABASE_URL="postgresql://prod-host:5432/manufacturing"
```

---

## Development Setup

### **Prerequisites**
- Node.js 18+
- PostgreSQL 14+
- Docker & Docker Compose
- Git

### **Installation Steps**
```bash
# 1. Clone repository
git clone <repository-url>
cd manufacturing-Analytics-platform

# 2. Install dependencies
npm install

# 3. Set up environment
cp .env.example .env.local
# Edit .env.local with your configuration

# 4. Start database
docker-compose up postgres -d

# 5. Set up database
npm run prisma:push
npm run prisma:generate

# 6. Seed database (optional)
npx tsx prisma/seed.ts

# 7. Start development server
npm run dev
```

### **Available Scripts**
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run test         # Run unit tests
npm run test:e2e     # Run end-to-end tests
npm run lint         # Lint code
npm run typecheck    # Type checking
```

### **Docker Development**
```bash
# Start all services
docker-compose up

# Start specific services
docker-compose up postgres ollama
```

---

## Branding & Design System

### **Color Palette**
```css
/* Primary Colors */
--primary-50: #f0f9ff
--primary-500: #0ea5e9 (Main brand color)
--primary-700: #0369a1

/* Status Colors */
--success: #10b981
--warning: #f59e0b
--error: #ef4444
--info: #3b82f6
```

### **Typography**
- **Primary Font**: System font stack
- **Headings**: Bold weight with responsive sizing
- **Body**: Regular weight, optimized for readability

### **Component Design System**
- **Cards**: Rounded corners, subtle shadows
- **Buttons**: Primary, secondary, and outline variants
- **Badges**: Color-coded status indicators
- **Tables**: Clean, responsive design with hover states

---

## Performance Specifications

### **Frontend Performance**
- **Lighthouse Score**: 90+ target
- **First Contentful Paint**: <2s
- **Largest Contentful Paint**: <3s
- **Cumulative Layout Shift**: <0.1

### **Backend Performance**
- **API Response Time**: <500ms average
- **Database Query Time**: <100ms average
- **Real-time Updates**: <100ms latency

### **Scalability Targets**
- **Concurrent Users**: 100+ per instance
- **Equipment Monitoring**: 1000+ devices
- **Data Points**: 1M+ metrics per day
- **Real-time Streams**: 50+ concurrent

---

This comprehensive documentation provides a complete overview of the Manufacturing Analytics Platform, covering all technical aspects, architecture decisions, and implementation details necessary for development, deployment, and maintenance.