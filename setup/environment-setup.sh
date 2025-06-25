#!/bin/bash

# Manufacturing Analytics Platform - Development Environment Setup
# This script sets up a complete development environment for all team members

set -e # Exit on any error

echo "🚀 Manufacturing Analytics Platform - Environment Setup"
echo "========================================================"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Utility functions
log_info() {
    echo -e "${BLUE}ℹ️  INFO: $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ SUCCESS: $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  WARNING: $1${NC}"
}

log_error() {
    echo -e "${RED}❌ ERROR: $1${NC}"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check Node.js version
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version | cut -d'v' -f2)
        REQUIRED_NODE="18.0.0"
        if [ "$(printf '%s\n' "$REQUIRED_NODE" "$NODE_VERSION" | sort -V | head -n1)" = "$REQUIRED_NODE" ]; then
            log_success "Node.js $NODE_VERSION is installed"
        else
            log_error "Node.js $REQUIRED_NODE or higher is required. Current: $NODE_VERSION"
            exit 1
        fi
    else
        log_error "Node.js is not installed. Please install Node.js 18+ LTS"
        exit 1
    fi
    
    # Check npm
    if command -v npm &> /dev/null; then
        NPM_VERSION=$(npm --version)
        log_success "npm $NPM_VERSION is installed"
    else
        log_error "npm is not installed"
        exit 1
    fi
    
    # Check Docker
    if command -v docker &> /dev/null; then
        DOCKER_VERSION=$(docker --version | cut -d' ' -f3 | cut -d',' -f1)
        log_success "Docker $DOCKER_VERSION is installed"
    else
        log_error "Docker is not installed. Please install Docker Desktop"
        exit 1
    fi
    
    # Check Docker Compose
    if command -v docker-compose &> /dev/null; then
        COMPOSE_VERSION=$(docker-compose --version | cut -d' ' -f3 | cut -d',' -f1)
        log_success "Docker Compose $COMPOSE_VERSION is installed"
    else
        log_error "Docker Compose is not installed"
        exit 1
    fi
    
    # Check Git
    if command -v git &> /dev/null; then
        GIT_VERSION=$(git --version | cut -d' ' -f3)
        log_success "Git $GIT_VERSION is installed"
    else
        log_error "Git is not installed"
        exit 1
    fi
    
    # Check available disk space (minimum 10GB)
    AVAILABLE_SPACE=$(df . | tail -1 | awk '{print $4}')
    REQUIRED_SPACE=10485760 # 10GB in KB
    
    if [ "$AVAILABLE_SPACE" -gt "$REQUIRED_SPACE" ]; then
        log_success "Sufficient disk space available"
    else
        log_warning "Low disk space. At least 10GB recommended"
    fi
}

# Create project structure
create_project_structure() {
    log_info "Creating project structure..."
    
    # Main directories
    mkdir -p {src,prisma,docs,tests,scripts,deployment,monitoring}
    
    # Source subdirectories
    mkdir -p src/{app,components,lib,hooks,utils,types,services,__tests__}
    mkdir -p src/app/{api,dashboards,auth,admin}
    mkdir -p src/components/{charts,common,forms,layout}
    mkdir -p src/lib/{prisma,auth,validation,connectors}
    mkdir -p src/services/{sap,ignition,ai,etl}
    
    # API routes
    mkdir -p src/app/api/{auth,equipment,metrics,queries,admin}
    
    # Test directories
    mkdir -p tests/{unit,integration,e2e,fixtures}
    
    # Documentation
    mkdir -p docs/{api,architecture,deployment,user-guides}
    
    # Scripts
    mkdir -p scripts/{setup,migration,seed,monitoring}
    
    # Deployment
    mkdir -p deployment/{docker,kubernetes,terraform}
    
    log_success "Project structure created"
}

# Initialize package.json with all dependencies
setup_package_json() {
    log_info "Setting up package.json..."
    
    cat > package.json << 'EOF'
{
  "name": "manufacturing-analytics-platform",
  "version": "1.0.0",
  "description": "ISO-Compliant AI Analytics Platform for Manufacturing",
  "main": "index.js",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "lint:fix": "next lint --fix",
    "type-check": "tsc --noEmit",
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage",
    "test:integration": "vitest run tests/integration",
    "test:e2e": "playwright test",
    "db:generate": "prisma generate",
    "db:push": "prisma db push",
    "db:migrate": "prisma migrate dev",
    "db:migrate:prod": "prisma migrate deploy",
    "db:seed": "tsx scripts/seed.ts",
    "db:studio": "prisma studio",
    "db:reset": "prisma migrate reset",
    "docker:up": "docker-compose up -d",
    "docker:down": "docker-compose down",
    "docker:logs": "docker-compose logs -f",
    "setup:env": "node scripts/setup-env.js",
    "verify:setup": "node scripts/verify-setup.js"
  },
  "dependencies": {
    "@prisma/client": "^5.7.1",
    "@apollo/server": "^4.9.5",
    "@apollo/experimental-nextjs-app-support": "^0.5.2",
    "graphql": "^16.8.1",
    "graphql-tag": "^2.12.6",
    "next": "^14.0.4",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "typescript": "^5.3.3",
    "@types/node": "^20.10.5",
    "@types/react": "^18.2.45",
    "@types/react-dom": "^18.2.18",
    "tailwindcss": "^3.3.6",
    "autoprefixer": "^10.4.16",
    "postcss": "^8.4.32",
    "@headlessui/react": "^1.7.17",
    "@heroicons/react": "^2.0.18",
    "recharts": "^2.8.0",
    "date-fns": "^2.30.0",
    "zod": "^3.22.4",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.2",
    "@types/bcryptjs": "^2.4.6",
    "@types/jsonwebtoken": "^9.0.5",
    "openai": "^4.20.1",
    "ioredis": "^5.3.2",
    "@types/redis": "^4.0.11",
    "bull": "^4.12.2",
    "@types/bull": "^4.10.0",
    "winston": "^3.11.0",
    "helmet": "^7.1.0",
    "cors": "^2.8.5",
    "@types/cors": "^2.8.17",
    "rate-limiter-flexible": "^4.0.1",
    "express-validator": "^7.0.1",
    "node-cron": "^3.0.3",
    "@types/node-cron": "^3.0.11",
    "sharp": "^0.33.1",
    "csv-parser": "^3.0.0",
    "csv-writer": "^1.6.0",
    "pdf-lib": "^1.17.1",
    "exceljs": "^4.4.0",
    "nodemailer": "^6.9.7",
    "@types/nodemailer": "^6.4.14",
    "dotenv": "^16.3.1",
    "class-transformer": "^0.5.1",
    "class-validator": "^0.14.0",
    "reflect-metadata": "^0.1.13"
  },
  "devDependencies": {
    "prisma": "^5.7.1",
    "vitest": "^1.0.4",
    "@vitejs/plugin-react": "^4.2.1",
    "playwright": "^1.40.1",
    "@playwright/test": "^1.40.1",
    "eslint": "^8.56.0",
    "eslint-config-next": "^14.0.4",
    "@typescript-eslint/eslint-plugin": "^6.15.0",
    "@typescript-eslint/parser": "^6.15.0",
    "prettier": "^3.1.1",
    "prettier-plugin-tailwindcss": "^0.5.9",
    "@types/supertest": "^2.0.16",
    "supertest": "^6.3.3",
    "tsx": "^4.6.2",
    "nodemon": "^3.0.2",
    "@testing-library/react": "^14.1.2",
    "@testing-library/jest-dom": "^6.1.5",
    "msw": "^2.0.11",
    "concurrently": "^8.2.2"
  },
  "keywords": [
    "manufacturing",
    "analytics",
    "iso-22400",
    "oee",
    "ai",
    "typescript",
    "nextjs",
    "prisma"
  ],
  "engines": {
    "node": ">=18.0.0",
    "npm": ">=9.0.0"
  },
  "repository": {
    "type": "git",
    "url": "https://github.com/company/manufacturing-analytics.git"
  },
  "license": "MIT"
}
EOF
    
    log_success "package.json created with all dependencies"
}

# Create TypeScript configuration
setup_typescript() {
    log_info "Setting up TypeScript configuration..."
    
    cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["dom", "dom.iterable", "ES6"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@/components/*": ["./src/components/*"],
      "@/lib/*": ["./src/lib/*"],
      "@/utils/*": ["./src/utils/*"],
      "@/types/*": ["./src/types/*"],
      "@/services/*": ["./src/services/*"],
      "@/hooks/*": ["./src/hooks/*"]
    },
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "forceConsistentCasingInFileNames": true,
    "noImplicitReturns": true,
    "noImplicitOverride": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "exactOptionalPropertyTypes": true
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    ".next/types/**/*.ts"
  ],
  "exclude": ["node_modules", ".next", "dist", "build"]
}
EOF
    
    log_success "TypeScript configuration created"
}

# Create Next.js configuration
setup_nextjs() {
    log_info "Setting up Next.js configuration..."
    
    cat > next.config.js << 'EOF'
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client', 'prisma'],
  },
  images: {
    domains: ['localhost'],
  },
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,OPTIONS,PATCH,DELETE,POST,PUT' },
          { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization' },
        ],
      },
    ];
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    return config;
  },
};

module.exports = nextConfig;
EOF
    
    log_success "Next.js configuration created"
}

# Create Tailwind CSS configuration
setup_tailwind() {
    log_info "Setting up Tailwind CSS..."
    
    cat > tailwind.config.js << 'EOF'
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'brand': {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        'manufacturing': {
          primary: '#1f2937',
          secondary: '#374151',
          accent: '#10b981',
          warning: '#f59e0b',
          danger: '#ef4444',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-slow': 'pulse 3s infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
    require('@tailwindcss/aspect-ratio'),
  ],
};
EOF
    
    cat > postcss.config.js << 'EOF'
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
EOF
    
    log_success "Tailwind CSS configuration created"
}

# Create environment files
setup_environment() {
    log_info "Setting up environment files..."
    
    cat > .env.example << 'EOF'
# Database
DATABASE_URL="postgresql://analytics:password@localhost:5432/manufacturing?schema=public"
SHADOW_DATABASE_URL="postgresql://analytics:password@localhost:5432/manufacturing_shadow?schema=public"

# Redis
REDIS_URL="redis://localhost:6379"

# Authentication
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
JWT_REFRESH_SECRET="your-super-secret-refresh-key-change-this-in-production"
NEXTAUTH_SECRET="your-nextauth-secret-change-this-in-production"
NEXTAUTH_URL="http://localhost:3000"

# AI Services
OPENAI_API_KEY="your-openai-api-key"
CLAUDE_API_KEY="your-claude-api-key"

# SAP Connection
SAP_HOST="your-sap-host"
SAP_SYSTEM_NUMBER="00"
SAP_CLIENT="100"
SAP_USER="your-sap-user"
SAP_PASSWORD="your-sap-password"

# Ignition Database
IGNITION_DB_HOST="your-ignition-db-host"
IGNITION_DB_PORT="3306"
IGNITION_DB_USER="your-ignition-db-user"
IGNITION_DB_PASSWORD="your-ignition-db-password"
IGNITION_DB_NAME="your-ignition-db-name"

# Email Configuration
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@company.com"
SMTP_PASSWORD="your-email-password"

# Application Settings
NODE_ENV="development"
LOG_LEVEL="debug"
API_RATE_LIMIT="100"
MAX_QUERY_ROWS="1000"

# Monitoring
PROMETHEUS_PORT="9090"
GRAFANA_PORT="3001"

# Security
ENCRYPTION_KEY="your-32-character-encryption-key"
CORS_ORIGIN="http://localhost:3000"
EOF
    
    # Create actual .env.local for development
    if [ ! -f .env.local ]; then
        cp .env.example .env.local
        log_warning ".env.local created. Please update with your actual values."
    fi
    
    log_success "Environment files created"
}

# Create Docker configuration
setup_docker() {
    log_info "Setting up Docker configuration..."
    
    cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  postgres:
    image: timescale/timescaledb:latest-pg15
    container_name: manufacturing-postgres
    environment:
      POSTGRES_DB: manufacturing
      POSTGRES_USER: analytics
      POSTGRES_PASSWORD: development_password
      TIMESCALEDB_TELEMETRY: 'off'
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./scripts/init-postgres:/docker-entrypoint-initdb.d
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U analytics -d manufacturing"]
      interval: 30s
      timeout: 10s
      retries: 3
    networks:
      - manufacturing-network

  redis:
    image: redis:7-alpine
    container_name: manufacturing-redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 30s
      timeout: 10s
      retries: 3
    networks:
      - manufacturing-network

  prometheus:
    image: prom/prometheus:latest
    container_name: manufacturing-prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'
      - '--storage.tsdb.retention.time=200h'
      - '--web.enable-lifecycle'
    networks:
      - manufacturing-network

  grafana:
    image: grafana/grafana:latest
    container_name: manufacturing-grafana
    ports:
      - "3001:3000"
    environment:
      GF_SECURITY_ADMIN_PASSWORD: admin
    volumes:
      - grafana_data:/var/lib/grafana
      - ./monitoring/grafana/dashboards:/etc/grafana/provisioning/dashboards
      - ./monitoring/grafana/datasources:/etc/grafana/provisioning/datasources
    networks:
      - manufacturing-network

volumes:
  postgres_data:
  redis_data:
  prometheus_data:
  grafana_data:

networks:
  manufacturing-network:
    driver: bridge
EOF
    
    # Create monitoring directory and configs
    mkdir -p monitoring/grafana/{dashboards,datasources}
    
    cat > monitoring/prometheus.yml << 'EOF'
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  # - "first_rules.yml"
  # - "second_rules.yml"

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'manufacturing-app'
    static_configs:
      - targets: ['host.docker.internal:3000']
    metrics_path: '/api/metrics'

  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres:5432']
EOF
    
    log_success "Docker configuration created"
}

# Create ESLint and Prettier configuration
setup_linting() {
    log_info "Setting up ESLint and Prettier..."
    
    cat > .eslintrc.json << 'EOF'
{
  "extends": [
    "next/core-web-vitals",
    "@typescript-eslint/recommended",
    "prettier"
  ],
  "parser": "@typescript-eslint/parser",
  "plugins": ["@typescript-eslint"],
  "rules": {
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/prefer-const": "error",
    "prefer-const": "off",
    "no-var": "error",
    "no-console": "warn",
    "eqeqeq": "error",
    "curly": "error"
  },
  "ignorePatterns": ["node_modules/", ".next/", "dist/", "build/"]
}
EOF
    
    cat > .prettierrc << 'EOF'
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2,
  "useTabs": false,
  "bracketSpacing": true,
  "arrowParens": "avoid",
  "endOfLine": "lf",
  "plugins": ["prettier-plugin-tailwindcss"]
}
EOF
    
    cat > .prettierignore << 'EOF'
node_modules
.next
dist
build
*.min.js
*.min.css
package-lock.json
yarn.lock
.env*
EOF
    
    log_success "ESLint and Prettier configuration created"
}

# Create Git configuration
setup_git() {
    log_info "Setting up Git configuration..."
    
    cat > .gitignore << 'EOF'
# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Production builds
.next/
out/
build/
dist/

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Database
*.db
*.sqlite

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Logs
logs/
*.log

# Runtime data
pids/
*.pid
*.seed
*.pid.lock

# Coverage directory used by tools like istanbul
coverage/

# Test output
test-results/
playwright-report/

# Temporary folders
tmp/
temp/

# Docker
.dockerignore

# Prisma
prisma/migrations/
!prisma/migrations/.gitkeep

# Monitoring
monitoring/data/
EOF
    
    # Initialize git repository if not already done
    if [ ! -d .git ]; then
        git init
        log_success "Git repository initialized"
    fi
    
    log_success "Git configuration created"
}

# Create initial Prisma schema
setup_prisma() {
    log_info "Setting up Prisma schema..."
    
    mkdir -p prisma
    
    cat > prisma/schema.prisma << 'EOF'
// Manufacturing Analytics Platform - Prisma Schema
// ISO 22400 Compliant Data Model

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// User Management
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  name      String
  role      Role     @default(OPERATOR)
  plants    String[] // Array of plant codes user has access to
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  // Audit
  createdBy String?
  updatedBy String?
  
  @@map("users")
}

enum Role {
  ADMIN
  MANAGER
  ENGINEER
  OPERATOR
  VIEWER
}

// Equipment Hierarchy (ISO 22400 + ISA-95)
model Equipment {
  id                    String   @id @default(uuid())
  code                  String   @unique
  name                  String
  description           String?
  
  // ISA-95 Hierarchy
  enterprise            String   // Level 1
  site                  String   // Level 2
  area                  String   // Level 3
  workCenter            String   @map("work_center") // Level 4
  workUnit              String   @map("work_unit")   // Level 5
  
  // ISO 14224 Equipment Taxonomy
  equipmentClass        String?  @map("equipment_class")    // Rotating, Static, etc.
  equipmentType         String?  @map("equipment_type")     // Pump, Compressor, etc.
  equipmentSubtype      String?  @map("equipment_subtype")  // Centrifugal, etc.
  
  // Source System References
  sapEquipmentNumber    String?  @map("sap_equipment_number")
  sapFunctionalLocation String?  @map("sap_functional_location")
  ignitionEquipmentPath String?  @map("ignition_equipment_path")
  
  // Technical Specifications
  manufacturer          String?
  model                 String?
  serialNumber          String?  @map("serial_number")
  installationDate      DateTime? @map("installation_date")
  designCapacity        Decimal? @map("design_capacity") @db.Decimal(15,3)
  capacityUnit          String?  @map("capacity_unit")
  criticalityRating     String?  @map("criticality_rating")
  
  // Audit
  createdAt             DateTime @default(now()) @map("created_at")
  updatedAt             DateTime @updatedAt @map("updated_at")
  createdBy             String?  @map("created_by")
  updatedBy             String?  @map("updated_by")
  
  // Relations
  timeElements          TimeElement[]
  productionQuantities  ProductionQuantity[]
  oeeMetrics           OEEMetric[]
  qualityMetrics       QualityMetric[]
  maintenanceEvents    MaintenanceEvent[]
  
  @@map("dim_equipment")
  @@index([site, area])
  @@index([sapEquipmentNumber])
  @@index([workCenter, workUnit])
}

// Product/Material Dimension
model Product {
  id           String   @id @default(uuid())
  code         String   @unique
  name         String
  description  String?
  
  // SAP Reference
  sapMaterialNumber String? @map("sap_material_number")
  
  // Product Attributes
  productType  String   @map("product_type")
  baseUnit     String   @map("base_unit")
  weight       Decimal? @db.Decimal(10,3)
  weightUnit   String?  @map("weight_unit")
  
  // Audit
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")
  
  // Relations
  productionQuantities ProductionQuantity[]
  qualityMetrics      QualityMetric[]
  
  @@map("dim_product")
}

// Time Elements (ISO 22400-2 Section 5)
model TimeElement {
  timestamp             DateTime
  equipmentId           String   @map("equipment_id")
  
  // Basic Time Elements (minutes)
  calendarTime          Decimal  @map("calendar_time") @db.Decimal(10,2)
  scheduledTime         Decimal  @map("scheduled_time") @db.Decimal(10,2)
  
  // Planned Elements
  plannedDowntime       Decimal  @map("planned_downtime") @db.Decimal(10,2)
  plannedSetupTime      Decimal  @map("planned_setup_time") @db.Decimal(10,2)
  
  // Actual Elements
  actualProductionTime  Decimal  @map("actual_production_time") @db.Decimal(10,2)
  unplannedDowntime     Decimal  @map("unplanned_downtime") @db.Decimal(10,2)
  
  // Relations
  equipment             Equipment @relation(fields: [equipmentId], references: [id], onDelete: Cascade)
  
  @@id([timestamp, equipmentId])
  @@map("fact_time_elements")
}

// Production Quantities (ISO 22400-2 Section 6)
model ProductionQuantity {
  timestamp       DateTime
  equipmentId     String   @map("equipment_id")
  productId       String   @map("product_id")
  
  // Quantities
  plannedQuantity Decimal  @map("planned_quantity") @db.Decimal(15,3)
  producedQuantity Decimal @map("produced_quantity") @db.Decimal(15,3)
  goodQuantity    Decimal  @map("good_quantity") @db.Decimal(15,3)
  scrapQuantity   Decimal  @map("scrap_quantity") @db.Decimal(15,3)
  reworkQuantity  Decimal  @map("rework_quantity") @db.Decimal(15,3)
  
  // Rates
  plannedRate     Decimal  @map("planned_rate") @db.Decimal(15,3)
  actualRate      Decimal  @map("actual_rate") @db.Decimal(15,3)
  
  // Relations
  equipment       Equipment @relation(fields: [equipmentId], references: [id], onDelete: Cascade)
  product         Product   @relation(fields: [productId], references: [id], onDelete: Cascade)
  
  @@id([timestamp, equipmentId, productId])
  @@map("fact_production_quantities")
}

// OEE Metrics (Calculated)
model OEEMetric {
  timestamp     DateTime
  equipmentId   String   @map("equipment_id")
  
  // OEE Components (0-1 scale)
  availability  Decimal  @db.Decimal(5,4)
  performance   Decimal  @db.Decimal(5,4)
  quality       Decimal  @db.Decimal(5,4)
  oee           Decimal  @db.Decimal(5,4)
  
  // Additional Metrics
  teep          Decimal? @db.Decimal(5,4) // Total Effective Equipment Performance
  
  // Calculation Context
  calculationMethod String @map("calculation_method")
  dataQualityScore  Decimal @map("data_quality_score") @db.Decimal(3,2)
  
  // Relations
  equipment     Equipment @relation(fields: [equipmentId], references: [id], onDelete: Cascade)
  
  @@id([timestamp, equipmentId])
  @@map("fact_oee_metrics")
}

// Quality Metrics
model QualityMetric {
  id            String   @id @default(uuid())
  timestamp     DateTime
  equipmentId   String   @map("equipment_id")
  productId     String   @map("product_id")
  
  // Quality Data
  defectType    String   @map("defect_type")
  defectCount   Int      @map("defect_count")
  severity      String   // LOW, MEDIUM, HIGH, CRITICAL
  costImpact    Decimal? @map("cost_impact") @db.Decimal(12,2)
  
  // SPC Data
  measurementValue Decimal? @map("measurement_value") @db.Decimal(15,6)
  upperLimit       Decimal? @map("upper_limit") @db.Decimal(15,6)
  lowerLimit       Decimal? @map("lower_limit") @db.Decimal(15,6)
  target           Decimal? @map("target") @db.Decimal(15,6)
  
  // Relations
  equipment     Equipment @relation(fields: [equipmentId], references: [id], onDelete: Cascade)
  product       Product   @relation(fields: [productId], references: [id], onDelete: Cascade)
  
  @@map("fact_quality_metrics")
  @@index([timestamp, equipmentId])
  @@index([defectType])
}

// Maintenance Events
model MaintenanceEvent {
  id              String   @id @default(uuid())
  equipmentId     String   @map("equipment_id")
  eventType       String   @map("event_type") // PLANNED, UNPLANNED, PREVENTIVE, CORRECTIVE
  
  // Timing
  startTime       DateTime @map("start_time")
  endTime         DateTime? @map("end_time")
  plannedDuration Decimal? @map("planned_duration") @db.Decimal(8,2) // minutes
  actualDuration  Decimal? @map("actual_duration") @db.Decimal(8,2)  // minutes
  
  // Details
  description     String
  rootCause       String?  @map("root_cause")
  correctionAction String? @map("correction_action")
  cost            Decimal? @db.Decimal(12,2)
  technician      String?
  
  // Relations
  equipment       Equipment @relation(fields: [equipmentId], references: [id], onDelete: Cascade)
  
  @@map("fact_maintenance_events")
  @@index([equipmentId, startTime])
  @@index([eventType])
}

// Audit Log
model AuditLog {
  id          String   @id @default(uuid())
  timestamp   DateTime @default(now())
  userId      String   @map("user_id")
  action      String   // CREATE, READ, UPDATE, DELETE
  resource    String   // table/entity name
  resourceId  String?  @map("resource_id")
  oldValues   Json?    @map("old_values")
  newValues   Json?    @map("new_values")
  ipAddress   String?  @map("ip_address")
  userAgent   String?  @map("user_agent")
  
  @@map("audit_log")
  @@index([timestamp])
  @@index([userId])
  @@index([resource])
}
EOF
    
    # Create migrations directory
    mkdir -p prisma/migrations
    touch prisma/migrations/.gitkeep
    
    log_success "Prisma schema created"
}

# Create initial TypeScript types
setup_types() {
    log_info "Setting up TypeScript types..."
    
    mkdir -p src/types
    
    cat > src/types/index.ts << 'EOF'
// Global type definitions for Manufacturing Analytics Platform

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  plants: string[];
  createdAt: Date;
  updatedAt: Date;
}

export enum Role {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  ENGINEER = 'ENGINEER',
  OPERATOR = 'OPERATOR',
  VIEWER = 'VIEWER'
}

export interface Equipment {
  id: string;
  code: string;
  name: string;
  description?: string;
  enterprise: string;
  site: string;
  area: string;
  workCenter: string;
  workUnit: string;
  sapEquipmentNumber?: string;
  ignitionEquipmentPath?: string;
}

export interface OEEData {
  timestamp: Date;
  equipmentId: string;
  availability: number;
  performance: number;
  quality: number;
  oee: number;
}

export interface QualityMetric {
  id: string;
  timestamp: Date;
  equipmentId: string;
  productId: string;
  defectType: string;
  defectCount: number;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  costImpact?: number;
}

export interface AIQueryRequest {
  query: string;
  context?: Record<string, any>;
  maxRows?: number;
}

export interface AIQueryResponse {
  success: boolean;
  data?: any[];
  error?: string;
  explanation?: string;
  generatedQuery?: string;
}

export interface DashboardFilter {
  equipment?: string[];
  timeRange?: {
    start: Date;
    end: Date;
  };
  products?: string[];
  sites?: string[];
}

export interface ChartData {
  timestamp: Date;
  value: number;
  label?: string;
  color?: string;
}

export interface SystemHealth {
  status: 'healthy' | 'warning' | 'error';
  components: {
    database: 'up' | 'down';
    redis: 'up' | 'down';
    ai: 'up' | 'down';
    sap: 'up' | 'down';
    ignition: 'up' | 'down';
  };
  uptime: number;
  lastChecked: Date;
}
EOF
    
    log_success "TypeScript types created"
}

# Install dependencies
install_dependencies() {
    log_info "Installing NPM dependencies..."
    
    npm install
    
    log_success "Dependencies installed"
}

# Initialize database
init_database() {
    log_info "Initializing database..."
    
    # Start Docker services
    docker-compose up -d postgres redis
    
    # Wait for PostgreSQL to be ready
    log_info "Waiting for PostgreSQL to be ready..."
    sleep 10
    
    # Generate Prisma client
    npx prisma generate
    
    # Push schema to database
    npx prisma db push
    
    log_success "Database initialized"
}

# Create initial seed script
create_seed_script() {
    log_info "Creating seed script..."
    
    mkdir -p scripts
    
    cat > scripts/seed.ts << 'EOF'
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create test user
  const user = await prisma.user.upsert({
    where: { email: 'admin@manufacturing.com' },
    update: {},
    create: {
      email: 'admin@manufacturing.com',
      name: 'System Administrator',
      role: 'ADMIN',
      plants: ['PLANT-001', 'PLANT-002'],
    },
  });

  // Create test equipment
  const equipment = await prisma.equipment.create({
    data: {
      code: 'PKG-L1-FIL-01',
      name: 'Packaging Line 1 Filler',
      description: 'Primary filling machine for Line 1',
      enterprise: 'Manufacturing Corp',
      site: 'Chicago Plant',
      area: 'Packaging',
      workCenter: 'Line 1',
      workUnit: 'Filler 1',
      equipmentClass: 'Filling',
      equipmentType: 'Rotary Filler',
      sapEquipmentNumber: '10001234',
      manufacturer: 'FillTech',
      model: 'RT-500',
      serialNumber: 'FT2023001',
      designCapacity: 500,
      capacityUnit: 'units/hour',
      criticalityRating: 'HIGH',
    },
  });

  // Create test product
  const product = await prisma.product.create({
    data: {
      code: 'PROD-001',
      name: 'Premium Product A',
      description: 'Premium beverage product',
      sapMaterialNumber: 'MAT-001',
      productType: 'Beverage',
      baseUnit: 'EA',
      weight: 0.5,
      weightUnit: 'kg',
    },
  });

  // Create sample OEE data
  const now = new Date();
  const hoursBack = 24;
  
  for (let i = 0; i < hoursBack; i++) {
    const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000);
    
    await prisma.oEEMetric.create({
      data: {
        timestamp,
        equipmentId: equipment.id,
        availability: 0.85 + Math.random() * 0.1,
        performance: 0.82 + Math.random() * 0.15,
        quality: 0.95 + Math.random() * 0.04,
        oee: 0.68 + Math.random() * 0.15,
        calculationMethod: 'ISO_22400',
        dataQualityScore: 0.95,
      },
    });
  }

  console.log('✅ Database seeded successfully');
  console.log(`👤 Created user: ${user.email}`);
  console.log(`🏭 Created equipment: ${equipment.code}`);
  console.log(`📦 Created product: ${product.code}`);
  console.log(`📊 Created ${hoursBack} hours of OEE data`);
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
EOF
    
    log_success "Seed script created"
}

# Create verification script
create_verification_script() {
    log_info "Creating verification script..."
    
    cat > scripts/verify-setup.js << 'EOF'
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying Manufacturing Analytics Platform Setup\n');

const checks = [
  {
    name: 'Node.js Version',
    check: () => {
      const version = process.version;
      const major = parseInt(version.slice(1).split('.')[0]);
      return major >= 18;
    },
    fix: 'Install Node.js 18+ LTS from https://nodejs.org'
  },
  {
    name: 'NPM Dependencies',
    check: () => fs.existsSync('./node_modules'),
    fix: 'Run: npm install'
  },
  {
    name: 'Environment File',
    check: () => fs.existsSync('./.env.local'),
    fix: 'Copy .env.example to .env.local and configure'
  },
  {
    name: 'Docker Services',
    check: () => {
      try {
        execSync('docker-compose ps', { stdio: 'pipe' });
        return true;
      } catch {
        return false;
      }
    },
    fix: 'Run: docker-compose up -d'
  },
  {
    name: 'Database Connection',
    check: () => {
      try {
        execSync('npx prisma db pull', { stdio: 'pipe' });
        return true;
      } catch {
        return false;
      }
    },
    fix: 'Ensure PostgreSQL is running and DATABASE_URL is correct'
  },
  {
    name: 'Prisma Client',
    check: () => fs.existsSync('./node_modules/.prisma/client'),
    fix: 'Run: npx prisma generate'
  },
  {
    name: 'TypeScript Compilation',
    check: () => {
      try {
        execSync('npx tsc --noEmit', { stdio: 'pipe' });
        return true;
      } catch {
        return false;
      }
    },
    fix: 'Fix TypeScript errors shown above'
  }
];

let allPassed = true;

checks.forEach(({ name, check, fix }) => {
  const passed = check();
  const status = passed ? '✅' : '❌';
  console.log(`${status} ${name}`);
  
  if (!passed) {
    console.log(`   Fix: ${fix}\n`);
    allPassed = false;
  }
});

console.log('\n' + '='.repeat(50));

if (allPassed) {
  console.log('🎉 All checks passed! Setup is complete.');
  console.log('\nNext steps:');
  console.log('1. Update .env.local with your actual credentials');
  console.log('2. Run: npm run db:seed');
  console.log('3. Run: npm run dev');
  console.log('4. Open: http://localhost:3000');
} else {
  console.log('❌ Some checks failed. Please fix the issues above.');
  process.exit(1);
}
EOF
    
    log_success "Verification script created"
}

# Main execution
main() {
    echo
    log_info "Starting Manufacturing Analytics Platform setup..."
    echo
    
    check_prerequisites
    create_project_structure
    setup_package_json
    setup_typescript
    setup_nextjs
    setup_tailwind
    setup_environment
    setup_docker
    setup_linting
    setup_git
    setup_prisma
    setup_types
    install_dependencies
    init_database
    create_seed_script
    create_verification_script
    
    echo
    log_success "Setup completed successfully! 🎉"
    echo
    log_info "Next steps:"
    echo "1. Update .env.local with your actual credentials"
    echo "2. Run: npm run db:seed"
    echo "3. Run: npm run verify:setup"
    echo "4. Run: npm run dev"
    echo "5. Open: http://localhost:3000"
    echo
    log_info "For team members, run: ./setup/environment-setup.sh"
    echo
}

# Execute main function
main "$@"
EOF

chmod +x /mnt/d/Source/manufacturing-analytics-platform/setup/environment-setup.sh