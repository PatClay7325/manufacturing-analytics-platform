import Link from 'next/link';

export default function Documentation() {
  return (
    <div className="container mx-auto px-4 py-12">
      {/* Header */}
      <div className="mb-12 text-center">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
          Documentation
        </h1>
        <p className="text-lg text-gray-600 max-w-3xl mx-auto">
          Comprehensive documentation for Adaptive Factory AI Solutions, Inc. platform, including guides, tutorials, and reference materials.
        </p>
      </div>

      {/* Documentation Navigation */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 mb-12">
        <div className="md:col-span-3 lg:col-span-2">
          <div className="sticky top-20">
            <nav className="space-y-1">
              <h3 className="font-medium text-gray-900 mb-2">Getting Started</h3>
              <ul className="mb-6 space-y-1">
                <li>
                  <a href="#introduction" className="text-blue-600 hover:text-blue-800 block py-1">Introduction</a>
                </li>
                <li>
                  <a href="#installation" className="text-blue-600 hover:text-blue-800 block py-1">Installation</a>
                </li>
                <li>
                  <a href="#quick-start" className="text-blue-600 hover:text-blue-800 block py-1">Quick Start</a>
                </li>
              </ul>

              <h3 className="font-medium text-gray-900 mb-2">Core Concepts</h3>
              <ul className="mb-6 space-y-1">
                <li>
                  <a href="#architecture" className="text-blue-600 hover:text-blue-800 block py-1">Architecture</a>
                </li>
                <li>
                  <a href="#data-model" className="text-blue-600 hover:text-blue-800 block py-1">Data Model</a>
                </li>
                <li>
                  <a href="#integration-framework" className="text-blue-600 hover:text-blue-800 block py-1">Integration Framework</a>
                </li>
              </ul>

              <h3 className="font-medium text-gray-900 mb-2">Key Features</h3>
              <ul className="mb-6 space-y-1">
                <li>
                  <a href="#dashboard" className="text-blue-600 hover:text-blue-800 block py-1">Dashboard</a>
                </li>
                <li>
                  <a href="#equipment-monitoring" className="text-blue-600 hover:text-blue-800 block py-1">Equipment Monitoring</a>
                </li>
                <li>
                  <a href="#alerts-system" className="text-blue-600 hover:text-blue-800 block py-1">Alerts System</a>
                </li>
                <li>
                  <a href="#manufacturing-chat" className="text-blue-600 hover:text-blue-800 block py-1">Manufacturing Chat</a>
                </li>
              </ul>

              <h3 className="font-medium text-gray-900 mb-2">Advanced Topics</h3>
              <ul className="mb-6 space-y-1">
                <li>
                  <a href="#ai-integration" className="text-blue-600 hover:text-blue-800 block py-1">AI Integration</a>
                </li>
                <li>
                  <a href="#security" className="text-blue-600 hover:text-blue-800 block py-1">Security</a>
                </li>
                <li>
                  <a href="#deployment" className="text-blue-600 hover:text-blue-800 block py-1">Deployment</a>
                </li>
                <li>
                  <a href="#customization" className="text-blue-600 hover:text-blue-800 block py-1">Customization</a>
                </li>
              </ul>

              <h3 className="font-medium text-gray-900 mb-2">References</h3>
              <ul className="mb-6 space-y-1">
                <li>
                  <Link href="/documentation/api-reference" className="text-blue-600 hover:text-blue-800 block py-1">API Reference</Link>
                </li>
                <li>
                  <a href="#configuration" className="text-blue-600 hover:text-blue-800 block py-1">Configuration</a>
                </li>
                <li>
                  <a href="#troubleshooting" className="text-blue-600 hover:text-blue-800 block py-1">Troubleshooting</a>
                </li>
                <li>
                  <a href="#faq" className="text-blue-600 hover:text-blue-800 block py-1">FAQ</a>
                </li>
              </ul>
            </nav>
          </div>
        </div>

        <div className="md:col-span-9 lg:col-span-10">
          <div className="prose prose-blue max-w-none">
            {/* Introduction */}
            <section id="introduction" className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Introduction</h2>
              <p>
                Adaptive Factory AI Solutions is a comprehensive platform designed to provide manufacturing organizations with advanced analytics, 
                real-time monitoring, and AI-driven insights. The platform integrates with existing manufacturing equipment and systems to 
                collect, analyze, and visualize operational data, enabling improved decision-making and operational efficiency.
              </p>
              <p>
                This documentation provides detailed information about installing, configuring, and using the platform, 
                as well as reference materials for developers and system administrators.
              </p>
              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 my-4">
                <h4 className="text-lg font-semibold text-blue-700">Key Capabilities</h4>
                <ul className="list-disc pl-5 mt-2">
                  <li>Real-time equipment monitoring and performance analysis</li>
                  <li>Proactive alerts and notifications for critical issues</li>
                  <li>AI-powered manufacturing assistant for natural language interactions</li>
                  <li>Comprehensive production metrics and KPI tracking</li>
                  <li>Flexible integration with existing manufacturing systems</li>
                </ul>
              </div>
            </section>

            {/* Installation */}
            <section id="installation" className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Installation</h2>
              <p>
                The Adaptive Factory AI Solutions platform can be deployed in various environments, including cloud 
                providers (AWS, Azure, GCP) and on-premise installations. This section provides instructions for 
                setting up the platform in your environment.
              </p>
              
              <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">Prerequisites</h3>
              <ul className="list-disc pl-5 mb-4">
                <li>Node.js 18.17 or later</li>
                <li>npm or yarn package manager</li>
                <li>Docker and Docker Compose (for local development)</li>
                <li>Kubernetes (for production deployments)</li>
                <li>PostgreSQL database</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">Basic Installation</h3>
              <p>To install the platform locally for development or testing:</p>
              <pre className="bg-gray-800 text-white p-4 rounded-md overflow-x-auto">
                <code>
{`# Clone the repository
git clone https://github.com/your-org/manufacturing-analytics-platform.git
cd manufacturing-analytics-platform

# Install dependencies
npm install

# Initialize the Mock Service Worker
npm run msw:init

# Start the development server
npm run dev`}
                </code>
              </pre>

              <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">Production Deployment</h3>
              <p>
                For production deployments, we recommend using our deployment scripts which support multiple 
                cloud providers and deployment options.
              </p>
              <pre className="bg-gray-800 text-white p-4 rounded-md overflow-x-auto">
                <code>
{`# Deploy to AWS with Kubernetes
./deployment/scripts/deploy.sh --cloud aws --env prod --type kubernetes

# Deploy on-premise with Docker Compose
./deployment/scripts/deploy.sh --cloud on-premise --env prod --type docker`}
                </code>
              </pre>
              
              <p>
                For more detailed installation instructions, including advanced configuration options and 
                multi-tenant deployments, please refer to the <a href="#deployment" className="text-blue-600 hover:underline">Deployment Guide</a>.
              </p>
            </section>

            {/* Quick Start */}
            <section id="quick-start" className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Quick Start</h2>
              <p>
                This quick start guide will help you get up and running with the basic features of the platform. 
                Follow these steps to explore the key capabilities.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">1. Access the Dashboard</h3>
              <p>
                The dashboard provides an overview of your manufacturing operations, including key performance 
                indicators, equipment status, and recent alerts.
              </p>
              <ul className="list-disc pl-5 mb-4">
                <li>Navigate to <code className="bg-gray-100 px-1 py-0.5 rounded">http://localhost:3000/dashboard</code> (local) or your deployed URL</li>
                <li>Explore the different widgets and metrics displayed</li>
                <li>Use the time range selector to view data from different periods</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">2. Monitor Equipment</h3>
              <p>
                The equipment monitoring section allows you to track the status and performance of all connected 
                manufacturing equipment.
              </p>
              <ul className="list-disc pl-5 mb-4">
                <li>Navigate to <code className="bg-gray-100 px-1 py-0.5 rounded">http://localhost:3000/equipment</code></li>
                <li>View the list of equipment and their current status</li>
                <li>Click on any equipment to see detailed information, including metrics, specifications, and maintenance history</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">3. Review Alerts</h3>
              <p>
                The alerts section shows all current and historical alerts related to your manufacturing operations.
              </p>
              <ul className="list-disc pl-5 mb-4">
                <li>Navigate to <code className="bg-gray-100 px-1 py-0.5 rounded">http://localhost:3000/alerts</code></li>
                <li>View the list of active alerts, sorted by severity</li>
                <li>Click on an alert to see detailed information and respond to it</li>
                <li>Use the filters to find specific types of alerts</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">4. Try the Manufacturing Chat</h3>
              <p>
                The Manufacturing Chat provides an AI-powered assistant that can answer questions about your 
                manufacturing operations using natural language.
              </p>
              <ul className="list-disc pl-5 mb-4">
                <li>Navigate to <code className="bg-gray-100 px-1 py-0.5 rounded">http://localhost:3000/manufacturing-chat</code></li>
                <li>Start a new conversation by typing a question about your manufacturing data</li>
                <li>Try questions like "What is the current OEE?", "Show me the top causes of downtime", or "When is the next scheduled maintenance?"</li>
              </ul>

              <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 my-4">
                <h4 className="text-lg font-semibold text-yellow-700">Note</h4>
                <p className="mt-2">
                  In the development environment, the platform uses mock data to simulate manufacturing operations. 
                  In a production environment, you'll need to connect to your actual manufacturing systems using 
                  the Integration Framework.
                </p>
              </div>
            </section>

            {/* Architecture */}
            <section id="architecture" className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Architecture</h2>
              <p>
                The Adaptive Factory AI Solutions platform follows a modular, service-oriented architecture designed 
                for flexibility, scalability, and extensibility. This section provides an overview of the platform's 
                architectural components and how they interact.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">High-Level Architecture</h3>
              <div className="bg-white p-4 border border-gray-200 rounded-md mb-6">
                <pre className="text-xs overflow-x-auto">
{`┌─────────────────────────────────────────────────────────────────────┐
│                      Client Access Layer                            │
│                                                                     │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────────┐   │
│  │  Web Browsers   │ │   Mobile Apps   │ │   Equipment APIs    │   │
│  └────────┬────────┘ └────────┬────────┘ └──────────┬──────────┘   │
└───────────┼─────────────────────────────────────────┼──────────────┘
            │                                         │
┌───────────┼─────────────────────────────────────────┼──────────────┐
│           │           Load Balancing Layer          │              │
│           │                                         │              │
│  ┌────────▼────────┐               ┌───────────────▼─────────────┐ │
│  │   Web/UI LB     │               │      API Gateway LB         │ │
│  └────────┬────────┘               └──────────────┬──────────────┘ │
└───────────┼──────────────────────────────────────┬─────────────────┘
            │                                      │
┌───────────┼──────────────────────────────────────┼─────────────────┐
│           │           Application Layer          │                 │
│           │                                      │                 │
│  ┌────────▼────────┐               ┌─────────────▼───────────────┐ │
│  │  Frontend Pods  │◄──────┐       │       API Service Pods      │ │
│  └─────────────────┘       │       └─────────────┬───────────────┘ │
│                            │                     │                 │
│                            │                     │                 │
│  ┌─────────────────┐       │       ┌─────────────▼───────────────┐ │
│  │ Authentication  │◄──────┼───────┤     Integration Service     │ │
│  │    Service      │       │       └─────────────┬───────────────┘ │
│  └─────────────────┘       │                     │                 │
└──────────────────────────────────────────────────┼─────────────────┘
                                                   │
┌──────────────────────────────────────────────────┼─────────────────┐
│                          Data Layer              │                 │
│                                                  │                 │
│  ┌─────────────────┐    ┌─────────────────┐  ┌───▼───────────────┐ │
│  │    Database     │    │  Cache (Redis)  │  │   Message Queue   │ │
│  │   (PostgreSQL)  │    │                 │  │                   │ │
│  └─────────────────┘    └─────────────────┘  └───────────────────┘ │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                   Supporting Infrastructure                          │
│                                                                      │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐  │
│  │    Monitoring   │    │     Logging     │    │    Backups      │  │
│  │  Prometheus +   │    │   ELK Stack     │    │                 │  │
│  │    Grafana      │    │                 │    │                 │  │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘  │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘`}
                </pre>
              </div>

              <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">Core Components</h3>
              
              <h4 className="text-lg font-semibold text-gray-700 mt-4 mb-2">Frontend Layer</h4>
              <p>
                The frontend layer is built with Next.js, React, and TypeScript, providing a responsive and 
                interactive user interface. Key components include:
              </p>
              <ul className="list-disc pl-5 mb-4">
                <li><strong>Dashboard components</strong> for visualizing manufacturing KPIs</li>
                <li><strong>Equipment monitoring views</strong> for real-time equipment status</li>
                <li><strong>Alerts management interface</strong> for handling manufacturing alerts</li>
                <li><strong>Chat interface</strong> for interacting with the AI manufacturing assistant</li>
              </ul>

              <h4 className="text-lg font-semibold text-gray-700 mt-4 mb-2">API Layer</h4>
              <p>
                The API layer provides RESTful endpoints for accessing and manipulating manufacturing data. 
                It includes:
              </p>
              <ul className="list-disc pl-5 mb-4">
                <li><strong>Equipment API</strong> for equipment data and operations</li>
                <li><strong>Alerts API</strong> for managing manufacturing alerts</li>
                <li><strong>Metrics API</strong> for accessing performance metrics</li>
                <li><strong>Chat API</strong> for interacting with the AI assistant</li>
                <li><strong>Authentication API</strong> for user management</li>
              </ul>

              <h4 className="text-lg font-semibold text-gray-700 mt-4 mb-2">Integration Layer</h4>
              <p>
                The Integration Layer connects the platform to external manufacturing systems using various 
                protocols and data formats. It includes:
              </p>
              <ul className="list-disc pl-5 mb-4">
                <li><strong>Protocol adapters</strong> for OPC UA, MQTT, REST, etc.</li>
                <li><strong>Data transformers</strong> for converting between data formats</li>
                <li><strong>Validators</strong> for ensuring data quality</li>
                <li><strong>Integration pipelines</strong> for configurable data processing</li>
              </ul>

              <h4 className="text-lg font-semibold text-gray-700 mt-4 mb-2">Data Layer</h4>
              <p>
                The Data Layer stores and manages all manufacturing data, including:
              </p>
              <ul className="list-disc pl-5 mb-4">
                <li><strong>PostgreSQL database</strong> for persistent storage</li>
                <li><strong>Redis cache</strong> for high-performance data access</li>
                <li><strong>Message queue</strong> for asynchronous processing</li>
              </ul>

              <h4 className="text-lg font-semibold text-gray-700 mt-4 mb-2">AI Layer</h4>
              <p>
                The AI Layer provides artificial intelligence capabilities, including:
              </p>
              <ul className="list-disc pl-5 mb-4">
                <li><strong>Manufacturing Assistant</strong> for natural language interactions</li>
                <li><strong>Anomaly detection</strong> for identifying unusual patterns</li>
                <li><strong>Predictive maintenance</strong> for forecasting equipment failures</li>
                <li><strong>Process optimization</strong> for improving manufacturing efficiency</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">Communication Patterns</h3>
              <p>
                The platform uses several communication patterns:
              </p>
              <ul className="list-disc pl-5 mb-4">
                <li><strong>RESTful APIs</strong> for synchronous request-response interactions</li>
                <li><strong>WebSockets</strong> for real-time updates and notifications</li>
                <li><strong>Message queues</strong> for asynchronous processing</li>
                <li><strong>Event-driven architecture</strong> for loosely coupled components</li>
              </ul>

              <p>
                For more detailed information about the platform architecture, please refer to the 
                <a href="#" className="text-blue-600 hover:underline"> Architecture Reference Guide</a>.
              </p>
            </section>

            {/* Data Model */}
            <section id="data-model" className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Data Model</h2>
              <p>
                The Adaptive Factory AI Solutions platform uses a comprehensive data model to represent manufacturing 
                entities, relationships, and operations. This section provides an overview of the core data models.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">Equipment Model</h3>
              <p>
                The Equipment model represents manufacturing machinery and devices:
              </p>
              <pre className="bg-gray-800 text-white p-4 rounded-md overflow-x-auto text-sm">
                <code>
{`interface Equipment {
  id: string;
  name: string;
  serialNumber: string;
  model: string;
  manufacturer: string;
  type: string;
  location: string;
  department: string;
  installationDate: string;
  lastMaintenanceDate: string;
  nextMaintenanceDate: string;
  status: 'operational' | 'maintenance' | 'offline' | 'error';
  specifications: Record<string, string>;
  metrics: EquipmentMetric[];
  maintenanceHistory: MaintenanceRecord[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
}`}
                </code>
              </pre>

              <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">Alert Model</h3>
              <p>
                The Alert model represents manufacturing alerts and notifications:
              </p>
              <pre className="bg-gray-800 text-white p-4 rounded-md overflow-x-auto text-sm">
                <code>
{`interface Alert {
  id: string;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  status: 'active' | 'acknowledged' | 'resolved' | 'muted';
  source: 'equipment' | 'process' | 'quality' | 'maintenance' | 'inventory' | 'safety' | 'system';
  sourceId?: string;
  sourceName?: string;
  createdAt: string;
  updatedAt: string;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  resolvedAt?: string;
  resolvedBy?: string;
  dueBy?: string;
  assignedTo?: string;
  category?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}`}
                </code>
              </pre>

              <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">Chat Model</h3>
              <p>
                The Chat model represents conversations with the Manufacturing Assistant:
              </p>
              <pre className="bg-gray-800 text-white p-4 rounded-md overflow-x-auto text-sm">
                <code>
{`interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
}

interface ChatMessage {
  id: string;
  role: 'system' | 'user' | 'assistant' | 'function';
  content: string;
  timestamp: string;
  name?: string;
}`}
                </code>
              </pre>

              <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">Metrics Model</h3>
              <p>
                The Metrics model represents performance metrics for manufacturing operations:
              </p>
              <pre className="bg-gray-800 text-white p-4 rounded-md overflow-x-auto text-sm">
                <code>
{`interface ProductionMetrics {
  lineId: string;
  lineName: string;
  target: number;
  actual: number;
  oee: number;
  availability: number;
  performance: number;
  quality: number;
  period?: string;
}

interface EquipmentMetric {
  id: string;
  name: string;
  value: number;
  unit: string;
  timestamp: string;
  min?: number;
  max?: number;
  target?: number;
  warning?: {
    high?: number;
    low?: number;
  };
  critical?: {
    high?: number;
    low?: number;
  };
}`}
                </code>
              </pre>

              <p>
                For a complete reference of all data models used in the platform, please refer to the 
                <a href="#" className="text-blue-600 hover:underline"> Data Model Reference Guide</a>.
              </p>
            </section>

            {/* Integration Framework */}
            <section id="integration-framework" className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Integration Framework</h2>
              <p>
                The Integration Framework is a core component of the Adaptive Factory AI Solutions platform, 
                providing a flexible, robust, and extensible system for connecting to various external manufacturing 
                systems. This section provides an overview of the Integration Framework.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">Key Components</h3>
              <p>
                The Integration Framework includes several key components:
              </p>
              <ul className="list-disc pl-5 mb-4">
                <li><strong>Integration Adapters</strong>: Pluggable components that handle protocol-specific communication with external systems (MQTT, OPC UA, REST, etc.)</li>
                <li><strong>Data Transformers</strong>: Convert between external data formats and internal standardized formats</li>
                <li><strong>Data Validators</strong>: Ensure data integrity and compliance with schemas and industry standards</li>
                <li><strong>Integration Pipelines</strong>: Configurable workflows that process data through multiple stages</li>
                <li><strong>Integration Manager</strong>: Central service that coordinates and monitors all integration components</li>
                <li><strong>Integration Registry</strong>: Repository of available integration adapters and configurations</li>
                <li><strong>Health Monitoring</strong>: Continuous monitoring of connections and automatic recovery from failures</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">Supported Protocols</h3>
              <p>
                The Integration Framework supports various industrial protocols and systems:
              </p>
              <ul className="list-disc pl-5 mb-4">
                <li><strong>MQTT</strong>: For IoT and lightweight messaging</li>
                <li><strong>OPC UA</strong>: For industrial automation systems</li>
                <li><strong>REST API</strong>: For web-based systems and cloud services</li>
                <li><strong>Modbus</strong>: For PLCs and industrial controllers</li>
                <li><strong>SOAP</strong>: For enterprise systems and legacy applications</li>
                <li><strong>Database Connectors</strong>: For direct database integration</li>
                <li><strong>File-based Integration</strong>: For CSV, XML, JSON file processing</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">Integration Pipeline Example</h3>
              <p>
                Here's an example of how to create an integration pipeline:
              </p>
              <pre className="bg-gray-800 text-white p-4 rounded-md overflow-x-auto text-sm">
                <code>
{`// Create a data processing pipeline
const pipeline = integrationManager.createPipeline(
  'temperature-monitoring-pipeline',
  'Temperature Monitoring Pipeline',
  {
    autoStart: true,
    stages: [
      {
        id: 'source',
        name: 'MQTT Source',
        type: PipelineStageType.SOURCE,
        componentId: 'factory-floor-mqtt',
        config: {
          topics: ['factory/sensors/temperature/+/data']
        }
      },
      {
        id: 'transform',
        name: 'JSON Transform',
        type: PipelineStageType.TRANSFORMER,
        componentId: 'json-transformer',
        config: {
          mapping: temperatureSensorMapping
        }
      },
      {
        id: 'validate',
        name: 'Schema Validation',
        type: PipelineStageType.VALIDATOR,
        componentId: 'temperature-schema-validator'
      },
      {
        id: 'filter',
        name: 'Temperature Filter',
        type: PipelineStageType.FILTER,
        componentId: 'threshold-filter',
        config: {
          condition: 'data.payload.temperature > 80'
        }
      },
      {
        id: 'sink',
        name: 'Alert System',
        type: PipelineStageType.SINK,
        componentId: 'alert-system-rest-api',
        config: {
          endpoint: '/alerts/temperature'
        }
      }
    ],
    errorHandling: {
      defaultStrategy: 'retry',
      maxRetries: 3,
      retryDelay: 1000
    }
  }
);

// Start the pipeline
await pipeline.start();`}
                </code>
              </pre>

              <p>
                For more detailed information about the Integration Framework, please refer to the 
                <a href="#" className="text-blue-600 hover:underline"> Integration Framework Guide</a>.
              </p>
            </section>

            {/* Dashboard */}
            <section id="dashboard" className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Dashboard</h2>
              <p>
                The Dashboard provides a real-time overview of your manufacturing operations, including key 
                performance indicators, equipment status, and recent alerts. This section explains how to use 
                and customize the dashboard.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">Dashboard Components</h3>
              <p>
                The dashboard includes several key components:
              </p>
              <ul className="list-disc pl-5 mb-4">
                <li><strong>KPI Cards</strong>: Display key performance indicators like OEE, availability, performance, and quality</li>
                <li><strong>Equipment Status</strong>: Shows a summary of equipment status across the facility</li>
                <li><strong>Production Metrics</strong>: Displays current production targets and actual production</li>
                <li><strong>Alert Summary</strong>: Shows recent and critical alerts requiring attention</li>
                <li><strong>Performance Trends</strong>: Charts showing performance trends over time</li>
                <li><strong>Downtime Analysis</strong>: Breakdown of downtime reasons and impact</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">Customizing the Dashboard</h3>
              <p>
                The dashboard can be customized to focus on specific metrics and information:
              </p>
              <ul className="list-disc pl-5 mb-4">
                <li><strong>Time Range Selection</strong>: Change the time period for displayed metrics</li>
                <li><strong>Department Filtering</strong>: Focus on specific manufacturing departments</li>
                <li><strong>Widget Configuration</strong>: Customize individual widgets and their display options</li>
                <li><strong>Layout Customization</strong>: Rearrange widgets to create custom dashboard layouts</li>
                <li><strong>Saved Views</strong>: Create and save multiple dashboard configurations for different purposes</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">Key Performance Indicators</h3>
              <p>
                The dashboard includes several manufacturing KPIs:
              </p>
              <ul className="list-disc pl-5 mb-4">
                <li><strong>Overall Equipment Effectiveness (OEE)</strong>: Composite metric of availability, performance, and quality</li>
                <li><strong>Availability</strong>: Percentage of scheduled time that equipment is available for operation</li>
                <li><strong>Performance</strong>: Speed at which equipment operates compared to designed speed</li>
                <li><strong>Quality</strong>: Percentage of good units produced compared to total units</li>
                <li><strong>Mean Time Between Failures (MTBF)</strong>: Average time between equipment failures</li>
                <li><strong>Mean Time To Repair (MTTR)</strong>: Average time to repair equipment after failure</li>
              </ul>

              <p>
                For more information about using and customizing the dashboard, please refer to the 
                <a href="#" className="text-blue-600 hover:underline"> Dashboard Guide</a>.
              </p>
            </section>

            {/* Continue with other sections */}
            <section id="equipment-monitoring" className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Equipment Monitoring</h2>
              <p>
                Equipment Monitoring provides real-time visibility into the status and performance of manufacturing equipment.
                This section explains how to use the equipment monitoring features.
              </p>
              <p>
                For detailed information, please refer to the <a href="#" className="text-blue-600 hover:underline">Equipment Monitoring Guide</a>.
              </p>
            </section>

            <section id="alerts-system" className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Alerts System</h2>
              <p>
                The Alerts System provides proactive notifications about critical issues and maintenance requirements.
                This section explains how to use and configure the alerts system.
              </p>
              <p>
                For detailed information, please refer to the <a href="#" className="text-blue-600 hover:underline">Alerts System Guide</a>.
              </p>
            </section>

            <section id="manufacturing-chat" className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Manufacturing Chat</h2>
              <p>
                Manufacturing Chat provides an AI-powered assistant that can answer questions about manufacturing operations.
                This section explains how to use the chat interface.
              </p>
              <p>
                For detailed information, please refer to the <a href="#" className="text-blue-600 hover:underline">Manufacturing Chat Guide</a>.
              </p>
            </section>

            <section id="ai-integration" className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">AI Integration</h2>
              <p>
                AI Integration provides artificial intelligence capabilities for manufacturing operations.
                This section explains how the AI components work and how they can be customized.
              </p>
              <p>
                For detailed information, please refer to the <a href="#" className="text-blue-600 hover:underline">AI Integration Guide</a>.
              </p>
            </section>

            <section id="security" className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Security</h2>
              <p>
                Security features protect your manufacturing data and operations.
                This section explains the security measures implemented in the platform.
              </p>
              <p>
                For detailed information, please refer to the <a href="#" className="text-blue-600 hover:underline">Security Guide</a>.
              </p>
            </section>

            <section id="deployment" className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Deployment</h2>
              <p>
                Deployment options include cloud providers (AWS, Azure, GCP) and on-premise installations.
                This section explains how to deploy the platform in different environments.
              </p>
              <p>
                For detailed information, please refer to the <a href="#" className="text-blue-600 hover:underline">Deployment Guide</a>.
              </p>
            </section>

            <section id="customization" className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Customization</h2>
              <p>
                Customization options allow you to adapt the platform to your specific manufacturing requirements.
                This section explains how to customize various aspects of the platform.
              </p>
              <p>
                For detailed information, please refer to the <a href="#" className="text-blue-600 hover:underline">Customization Guide</a>.
              </p>
            </section>

            <section id="configuration" className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Configuration</h2>
              <p>
                Configuration options control the behavior and appearance of the platform.
                This section explains how to configure various aspects of the platform.
              </p>
              <p>
                For detailed information, please refer to the <a href="#" className="text-blue-600 hover:underline">Configuration Guide</a>.
              </p>
            </section>

            <section id="troubleshooting" className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Troubleshooting</h2>
              <p>
                Troubleshooting helps you identify and resolve issues with the platform.
                This section provides common troubleshooting steps and solutions.
              </p>
              <p>
                For detailed information, please refer to the <a href="#" className="text-blue-600 hover:underline">Troubleshooting Guide</a>.
              </p>
            </section>

            <section id="faq" className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Frequently Asked Questions</h2>
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">What types of manufacturing systems can the platform integrate with?</h3>
                  <p className="mt-2">
                    The platform can integrate with a wide range of manufacturing systems using various protocols including OPC UA, MQTT, REST APIs, Modbus, and others. It can connect to PLCs, SCADA systems, MES, ERP, and custom manufacturing equipment.
                  </p>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">How is manufacturing data secured in the platform?</h3>
                  <p className="mt-2">
                    The platform implements multiple security measures including encrypted data transmission, role-based access control, authentication and authorization, secure credential storage, network segmentation, and audit logging.
                  </p>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">Can the platform be deployed in air-gapped environments?</h3>
                  <p className="mt-2">
                    Yes, the platform can be deployed in air-gapped environments without internet connectivity. The on-premise deployment option provides all necessary components to run without external dependencies.
                  </p>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">How does the AI assistant access manufacturing data?</h3>
                  <p className="mt-2">
                    The AI assistant accesses manufacturing data through the platform's API, with appropriate access controls. It can retrieve equipment status, production metrics, alert information, and other manufacturing data to answer questions.
                  </p>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">What database systems are supported?</h3>
                  <p className="mt-2">
                    The platform primarily uses PostgreSQL for data storage, but can be configured to work with other database systems including MySQL, SQL Server, and Oracle Database. Time-series data can optionally be stored in specialized databases like InfluxDB or TimescaleDB.
                  </p>
                </div>
              </div>
            </section>
            
            {/* Export Options */}
            <section id="export-options" className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Documentation Export</h2>
              <p className="mb-4">
                The documentation can be exported in various formats for offline access or distribution:
              </p>
              <div className="flex flex-wrap gap-4">
                <a href="#" className="inline-flex items-center px-4 py-2 border border-gray-300 bg-white rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                  <svg className="mr-2 h-5 w-5 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V4a2 2 0 00-2-2H6zm1 2a1 1 0 000 2h6a1 1 0 100-2H7zm6 5a1 1 0 00-1-1H8a1 1 0 100 2h4a1 1 0 001-1z" clipRule="evenodd" />
                  </svg>
                  PDF Version
                </a>
                <a href="#" className="inline-flex items-center px-4 py-2 border border-gray-300 bg-white rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                  <svg className="mr-2 h-5 w-5 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 5a2 2 0 012-2h10a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm11 1H6v8l4-2 4 2V6z" clipRule="evenodd" />
                  </svg>
                  EPUB Version
                </a>
                <a href="#" className="inline-flex items-center px-4 py-2 border border-gray-300 bg-white rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                  <svg className="mr-2 h-5 w-5 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 5a2 2 0 012-2h10a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm12 0H5v10h10V5z" clipRule="evenodd" />
                  </svg>
                  HTML Version
                </a>
                <a href="#" className="inline-flex items-center px-4 py-2 border border-gray-300 bg-white rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                  <svg className="mr-2 h-5 w-5 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 2H8.828a2 2 0 00-1.414.586L6.293 3.707A1 1 0 015.586 4H4zm.5 2A.5.5 0 004 6.5v7a.5.5 0 00.5.5h11a.5.5 0 00.5-.5v-7a.5.5 0 00-.5-.5h-11z" clipRule="evenodd" />
                  </svg>
                  Markdown
                </a>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}