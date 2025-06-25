#!/usr/bin/env ts-node
/**
 * Phase 10: Documentation and Training
 * Implements comprehensive documentation, training modules, and knowledge base
 */

import * as fs from 'fs';
import * as path from 'path';
import { marked } from 'marked';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import * as handlebars from 'handlebars';

// =====================================================
// DOCUMENTATION GENERATOR
// =====================================================

interface DocumentationSection {
  title: string;
  content: string;
  subsections?: DocumentationSection[];
  examples?: CodeExample[];
  diagrams?: Diagram[];
}

interface CodeExample {
  title: string;
  language: string;
  code: string;
  description?: string;
}

interface Diagram {
  title: string;
  type: 'mermaid' | 'plantuml' | 'image';
  content: string;
}

export class DocumentationGenerator {
  private sections: Map<string, DocumentationSection> = new Map();
  private templates: Map<string, handlebars.TemplateDelegate> = new Map();

  constructor() {
    this.loadTemplates();
    this.generateDocumentation();
  }

  private loadTemplates() {
    const templateDir = path.join(process.cwd(), 'docs/templates');
    
    const templates = {
      'api': 'api-documentation.hbs',
      'user-guide': 'user-guide.hbs',
      'admin-guide': 'admin-guide.hbs',
      'developer-guide': 'developer-guide.hbs'
    };

    for (const [name, file] of Object.entries(templates)) {
      const templatePath = path.join(templateDir, file);
      if (fs.existsSync(templatePath)) {
        const template = fs.readFileSync(templatePath, 'utf8');
        this.templates.set(name, handlebars.compile(template));
      }
    }
  }

  private generateDocumentation() {
    // API Documentation
    this.sections.set('api', {
      title: 'API Documentation',
      content: this.generateAPIDocumentation(),
      subsections: [
        {
          title: 'Authentication',
          content: this.generateAuthDocumentation(),
          examples: [
            {
              title: 'Login Request',
              language: 'bash',
              code: `curl -X POST https://api.manufacturing.com/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{"email": "user@example.com", "password": "secure-password"}'`,
              description: 'Authenticate and receive JWT token'
            }
          ]
        },
        {
          title: 'Equipment Endpoints',
          content: this.generateEquipmentAPIDocumentation(),
          examples: this.getEquipmentAPIExamples()
        },
        {
          title: 'Metrics Endpoints',
          content: this.generateMetricsAPIDocumentation(),
          examples: this.getMetricsAPIExamples()
        }
      ]
    });

    // User Guide
    this.sections.set('user-guide', {
      title: 'User Guide',
      content: this.generateUserGuide(),
      subsections: [
        {
          title: 'Getting Started',
          content: this.generateGettingStarted(),
          diagrams: [
            {
              title: 'Dashboard Overview',
              type: 'image',
              content: '/images/dashboard-overview.png'
            }
          ]
        },
        {
          title: 'Dashboard Navigation',
          content: this.generateDashboardGuide()
        },
        {
          title: 'Alert Management',
          content: this.generateAlertGuide()
        },
        {
          title: 'Report Generation',
          content: this.generateReportGuide()
        }
      ]
    });

    // Administrator Guide
    this.sections.set('admin-guide', {
      title: 'Administrator Guide',
      content: this.generateAdminGuide(),
      subsections: [
        {
          title: 'System Configuration',
          content: this.generateSystemConfigGuide()
        },
        {
          title: 'User Management',
          content: this.generateUserManagementGuide()
        },
        {
          title: 'Backup and Recovery',
          content: this.generateBackupGuide()
        },
        {
          title: 'Performance Tuning',
          content: this.generatePerformanceGuide()
        }
      ]
    });

    // Developer Guide
    this.sections.set('developer-guide', {
      title: 'Developer Guide',
      content: this.generateDeveloperGuide(),
      subsections: [
        {
          title: 'Architecture Overview',
          content: this.generateArchitectureGuide(),
          diagrams: [
            {
              title: 'System Architecture',
              type: 'mermaid',
              content: this.generateArchitectureDiagram()
            }
          ]
        },
        {
          title: 'Development Setup',
          content: this.generateDevSetupGuide()
        },
        {
          title: 'API Development',
          content: this.generateAPIDevGuide()
        },
        {
          title: 'Testing Strategy',
          content: this.generateTestingGuide()
        }
      ]
    });

    // Business Rules Documentation
    this.sections.set('business-rules', {
      title: 'Business Rules Documentation',
      content: this.generateBusinessRulesDoc(),
      subsections: [
        {
          title: 'OEE Calculation',
          content: this.generateOEEDocumentation(),
          diagrams: [
            {
              title: 'OEE Calculation Flow',
              type: 'mermaid',
              content: this.generateOEEFlowDiagram()
            }
          ]
        },
        {
          title: 'Quality Metrics',
          content: this.generateQualityDocumentation()
        },
        {
          title: 'Alert Thresholds',
          content: this.generateAlertThresholdDoc()
        }
      ]
    });
  }

  /**
   * Generate HTML documentation
   */
  async generateHTML(outputDir: string): Promise<void> {
    console.log('📄 Generating HTML documentation...');

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Generate index page
    const indexContent = this.generateIndexPage();
    fs.writeFileSync(path.join(outputDir, 'index.html'), indexContent);

    // Generate section pages
    for (const [id, section] of this.sections) {
      const sectionDir = path.join(outputDir, id);
      if (!fs.existsSync(sectionDir)) {
        fs.mkdirSync(sectionDir, { recursive: true });
      }

      const sectionHtml = this.generateSectionHTML(section);
      fs.writeFileSync(path.join(sectionDir, 'index.html'), sectionHtml);

      // Generate subsection pages
      if (section.subsections) {
        for (const subsection of section.subsections) {
          const subsectionHtml = this.generateSectionHTML(subsection);
          const filename = subsection.title.toLowerCase().replace(/\s+/g, '-') + '.html';
          fs.writeFileSync(path.join(sectionDir, filename), subsectionHtml);
        }
      }
    }

    // Copy assets
    this.copyAssets(outputDir);

    console.log(`✅ HTML documentation generated in ${outputDir}`);
  }

  /**
   * Generate PDF documentation
   */
  async generatePDF(outputFile: string): Promise<void> {
    console.log('📄 Generating PDF documentation...');

    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Add title page
    await this.addTitlePage(pdfDoc, font, boldFont);

    // Add table of contents
    await this.addTableOfContents(pdfDoc, font, boldFont);

    // Add sections
    for (const [_, section] of this.sections) {
      await this.addSectionToPDF(pdfDoc, section, font, boldFont);
    }

    // Save PDF
    const pdfBytes = await pdfDoc.save();
    fs.writeFileSync(outputFile, pdfBytes);

    console.log(`✅ PDF documentation generated: ${outputFile}`);
  }

  /**
   * Generate OpenAPI specification
   */
  generateOpenAPISpec(): any {
    return {
      openapi: '3.0.0',
      info: {
        title: 'Manufacturing Analytics Platform API',
        version: '2.0.0',
        description: 'API for manufacturing analytics and monitoring'
      },
      servers: [
        {
          url: 'https://api.manufacturing.com/v2',
          description: 'Production server'
        },
        {
          url: 'https://staging-api.manufacturing.com/v2',
          description: 'Staging server'
        }
      ],
      paths: this.generateAPIPaths(),
      components: {
        schemas: this.generateAPISchemas(),
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT'
          }
        }
      }
    };
  }

  // Content generation methods
  private generateAPIDocumentation(): string {
    return `
# API Documentation

The Manufacturing Analytics Platform provides a comprehensive REST API for accessing manufacturing data, 
managing equipment, tracking metrics, and handling alerts.

## Base URL

Production: \`https://api.manufacturing.com/v2\`  
Staging: \`https://staging-api.manufacturing.com/v2\`

## Authentication

All API requests require authentication using JWT tokens. Include the token in the Authorization header:

\`\`\`
Authorization: Bearer <your-jwt-token>
\`\`\`

## Rate Limiting

API requests are rate limited to:
- 1000 requests per minute for authenticated users
- 100 requests per minute for unauthenticated requests

## Response Format

All responses are in JSON format with the following structure:

\`\`\`json
{
  "success": true,
  "data": { ... },
  "meta": {
    "timestamp": "2024-01-15T10:30:00Z",
    "version": "2.0.0"
  }
}
\`\`\`

Error responses include:

\`\`\`json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request parameters",
    "details": { ... }
  }
}
\`\`\`
    `;
  }

  private generateAuthDocumentation(): string {
    return `
## Authentication

### Login

Authenticate with email and password to receive a JWT token.

**Endpoint:** \`POST /auth/login\`

**Request Body:**
\`\`\`json
{
  "email": "user@example.com",
  "password": "secure-password"
}
\`\`\`

**Response:**
\`\`\`json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "user-123",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "operator"
    },
    "expiresIn": 3600
  }
}
\`\`\`

### Refresh Token

Refresh an expired token.

**Endpoint:** \`POST /auth/refresh\`

**Headers:**
\`\`\`
Authorization: Bearer <expired-token>
\`\`\`

### Logout

Invalidate the current token.

**Endpoint:** \`POST /auth/logout\`
    `;
  }

  private generateEquipmentAPIDocumentation(): string {
    return `
## Equipment Endpoints

### List Equipment

Get a paginated list of all equipment.

**Endpoint:** \`GET /equipment\`

**Query Parameters:**
- \`page\` (integer): Page number (default: 1)
- \`limit\` (integer): Items per page (default: 20, max: 100)
- \`site\` (string): Filter by site code
- \`type\` (string): Filter by equipment type
- \`status\` (string): Filter by status (active, inactive, maintenance)

### Get Equipment Details

Get detailed information about specific equipment.

**Endpoint:** \`GET /equipment/{id}\`

**Path Parameters:**
- \`id\` (string): Equipment ID

### Get Equipment Metrics

Get real-time metrics for specific equipment.

**Endpoint:** \`GET /equipment/{id}/metrics\`

**Query Parameters:**
- \`range\` (string): Time range (1h, 24h, 7d, 30d)
- \`metrics\` (array): Specific metrics to include
    `;
  }

  private getEquipmentAPIExamples(): CodeExample[] {
    return [
      {
        title: 'List Equipment',
        language: 'javascript',
        code: `const response = await fetch('https://api.manufacturing.com/v2/equipment?site=detroit&status=active', {
  headers: {
    'Authorization': 'Bearer ' + token
  }
});

const data = await response.json();
console.log(data.data.equipment);`,
        description: 'Fetch active equipment from Detroit site'
      },
      {
        title: 'Get Equipment OEE',
        language: 'javascript',
        code: `const response = await fetch('https://api.manufacturing.com/v2/equipment/eq-001/oee?range=24h', {
  headers: {
    'Authorization': 'Bearer ' + token
  }
});

const oeeData = await response.json();
console.log('Current OEE:', oeeData.data.current);
console.log('Average OEE:', oeeData.data.average);`,
        description: 'Get OEE data for last 24 hours'
      }
    ];
  }

  private generateUserGuide(): string {
    return `
# User Guide

Welcome to the Manufacturing Analytics Platform! This guide will help you navigate the system and make the most of its features.

## Overview

The Manufacturing Analytics Platform provides real-time visibility into your manufacturing operations, including:

- Equipment performance monitoring
- OEE (Overall Equipment Effectiveness) tracking
- Quality metrics and defect analysis
- Alert management and notifications
- Comprehensive reporting

## System Requirements

- Modern web browser (Chrome, Firefox, Safari, Edge)
- Minimum screen resolution: 1280x720
- Stable internet connection

## Getting Help

- In-app help: Click the ? icon in the top navigation
- Support email: support@manufacturing.com
- Phone: 1-800-MFG-HELP (Monday-Friday, 8 AM - 6 PM EST)
    `;
  }

  private generateArchitectureDiagram(): string {
    return `
graph TB
    subgraph "Frontend"
        UI[Next.js Application]
        Mobile[Mobile App]
    end
    
    subgraph "API Gateway"
        GW[API Gateway]
        Auth[Auth Service]
        RL[Rate Limiter]
    end
    
    subgraph "Backend Services"
        API[REST API]
        WS[WebSocket Server]
        Queue[Message Queue]
        Cache[Redis Cache]
    end
    
    subgraph "Data Layer"
        TS[TimescaleDB]
        PG[PostgreSQL]
        S3[Object Storage]
    end
    
    subgraph "External Systems"
        MQTT[MQTT Broker]
        OPC[OPC-UA Server]
        ERP[ERP System]
    end
    
    UI --> GW
    Mobile --> GW
    GW --> Auth
    GW --> RL
    GW --> API
    GW --> WS
    
    API --> Queue
    API --> Cache
    API --> TS
    API --> PG
    
    Queue --> API
    
    MQTT --> Queue
    OPC --> Queue
    ERP --> API
    
    style UI fill:#e1f5fa
    style API fill:#c8e6c9
    style TS fill:#fff3b2
    style MQTT fill:#ffccbc
    `;
  }

  private generateOEEFlowDiagram(): string {
    return `
graph LR
    A[Collect Time Data] --> B{Categorize Time}
    B -->|Production| C[Run Time]
    B -->|Breakdown| D[Downtime]
    B -->|Changeover| E[Planned Downtime]
    
    C --> F[Calculate Availability]
    D --> F
    E --> F
    
    G[Collect Production Data] --> H[Ideal Cycle Time]
    G --> I[Total Pieces]
    H --> J[Calculate Performance]
    I --> J
    C --> J
    
    K[Collect Quality Data] --> L[Good Pieces]
    K --> M[Total Pieces]
    L --> N[Calculate Quality]
    M --> N
    
    F --> O[Calculate OEE]
    J --> O
    N --> O
    
    O --> P[OEE Result]
    
    style A fill:#e3f2fd
    style P fill:#c8e6c9
    `;
  }

  private generateBusinessRulesDoc(): string {
    return `
# Business Rules Documentation

## Overview

This document outlines the business rules and calculations used throughout the Manufacturing Analytics Platform.

## Key Performance Indicators (KPIs)

### Overall Equipment Effectiveness (OEE)

OEE is the gold standard for measuring manufacturing productivity. It identifies the percentage of manufacturing time that is truly productive.

**Formula:** OEE = Availability × Performance × Quality

Where:
- **Availability** = Run Time / Planned Production Time
- **Performance** = (Ideal Cycle Time × Total Count) / Run Time  
- **Quality** = Good Count / Total Count

### World-Class OEE

- **85%** - World Class (for discrete manufacturers)
- **60%** - Typical (average across industries)
- **40%** - Low (but not uncommon for manufacturers just starting to track OEE)

## Time Categories (SEMI E10 Standard)

1. **Production Time** - Equipment is producing parts
2. **Standby Time** - Equipment is ready but not producing
3. **Engineering Time** - Equipment is being tested or developed
4. **Scheduled Downtime** - Planned maintenance or no demand
5. **Unscheduled Downtime** - Breakdowns or failures
6. **Non-scheduled Time** - Equipment is not scheduled for production

## Quality Classifications

### Defect Severity Levels

1. **Critical** - Safety hazard or complete failure
2. **Major** - Significant impact on functionality
3. **Minor** - Cosmetic or slight functional impact
4. **Observation** - Does not affect form, fit, or function

### Cost Impact Calculation

\`\`\`
Defect Cost = (Scrap Cost × Scrap Quantity) + 
              (Rework Cost × Rework Quantity) + 
              (Warranty Risk × Potential Warranty Cost)
\`\`\`
    `;
  }

  private generateAPIPaths(): any {
    return {
      '/equipment': {
        get: {
          summary: 'List all equipment',
          tags: ['Equipment'],
          parameters: [
            {
              name: 'page',
              in: 'query',
              schema: { type: 'integer', default: 1 }
            },
            {
              name: 'limit',
              in: 'query',
              schema: { type: 'integer', default: 20, maximum: 100 }
            }
          ],
          responses: {
            '200': {
              description: 'Successful response',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/EquipmentListResponse'
                  }
                }
              }
            }
          }
        }
      },
      '/equipment/{id}': {
        get: {
          summary: 'Get equipment by ID',
          tags: ['Equipment'],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string' }
            }
          ],
          responses: {
            '200': {
              description: 'Successful response',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Equipment'
                  }
                }
              }
            }
          }
        }
      }
    };
  }

  private generateAPISchemas(): any {
    return {
      Equipment: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          code: { type: 'string' },
          name: { type: 'string' },
          type: { type: 'string' },
          siteCode: { type: 'string' },
          status: {
            type: 'string',
            enum: ['active', 'inactive', 'maintenance']
          },
          attributes: { type: 'object' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' }
        }
      },
      EquipmentListResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: {
            type: 'object',
            properties: {
              equipment: {
                type: 'array',
                items: { $ref: '#/components/schemas/Equipment' }
              },
              pagination: {
                type: 'object',
                properties: {
                  page: { type: 'integer' },
                  limit: { type: 'integer' },
                  total: { type: 'integer' },
                  pages: { type: 'integer' }
                }
              }
            }
          }
        }
      }
    };
  }

  private generateSectionHTML(section: DocumentationSection): string {
    const template = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${section.title} - Manufacturing Analytics Documentation</title>
    <link rel="stylesheet" href="/assets/css/documentation.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism-tomorrow.min.css">
</head>
<body>
    <nav class="sidebar">
        <h2>Documentation</h2>
        <ul>
            <li><a href="/">Home</a></li>
            <li><a href="/api">API Documentation</a></li>
            <li><a href="/user-guide">User Guide</a></li>
            <li><a href="/admin-guide">Admin Guide</a></li>
            <li><a href="/developer-guide">Developer Guide</a></li>
        </ul>
    </nav>
    
    <main class="content">
        <h1>${section.title}</h1>
        ${marked.parse(section.content)}
        
        ${section.subsections ? `
            <div class="subsections">
                ${section.subsections.map(sub => `
                    <section>
                        <h2>${sub.title}</h2>
                        ${marked.parse(sub.content)}
                        ${this.renderExamples(sub.examples)}
                        ${this.renderDiagrams(sub.diagrams)}
                    </section>
                `).join('')}
            </div>
        ` : ''}
        
        ${this.renderExamples(section.examples)}
        ${this.renderDiagrams(section.diagrams)}
    </main>
    
    <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/prism.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-javascript.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-bash.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/mermaid/9.4.0/mermaid.min.js"></script>
    <script>mermaid.initialize({ startOnLoad: true });</script>
</body>
</html>
    `;
    
    return template;
  }

  private renderExamples(examples?: CodeExample[]): string {
    if (!examples || examples.length === 0) return '';
    
    return examples.map(example => `
        <div class="code-example">
            <h3>${example.title}</h3>
            ${example.description ? `<p>${example.description}</p>` : ''}
            <pre><code class="language-${example.language}">${example.code}</code></pre>
        </div>
    `).join('');
  }

  private renderDiagrams(diagrams?: Diagram[]): string {
    if (!diagrams || diagrams.length === 0) return '';
    
    return diagrams.map(diagram => {
      switch (diagram.type) {
        case 'mermaid':
          return `
            <div class="diagram">
                <h3>${diagram.title}</h3>
                <div class="mermaid">${diagram.content}</div>
            </div>
          `;
        case 'image':
          return `
            <div class="diagram">
                <h3>${diagram.title}</h3>
                <img src="${diagram.content}" alt="${diagram.title}" />
            </div>
          `;
        default:
          return '';
      }
    }).join('');
  }

  private generateIndexPage(): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Manufacturing Analytics Platform Documentation</title>
    <link rel="stylesheet" href="/assets/css/documentation.css">
</head>
<body>
    <header>
        <h1>Manufacturing Analytics Platform</h1>
        <p>Comprehensive Documentation and Resources</p>
    </header>
    
    <main class="index-grid">
        ${Array.from(this.sections.entries()).map(([id, section]) => `
            <div class="doc-card">
                <h2><a href="/${id}">${section.title}</a></h2>
                <p>${section.content.split('\n')[2] || ''}</p>
            </div>
        `).join('')}
    </main>
    
    <footer>
        <p>Version 2.0.0 | Last updated: ${new Date().toLocaleDateString()}</p>
    </footer>
</body>
</html>
    `;
  }

  private async addTitlePage(
    pdfDoc: PDFDocument,
    font: any,
    boldFont: any
  ): Promise<void> {
    const page = pdfDoc.addPage();
    const { width, height } = page.getSize();
    
    page.drawText('Manufacturing Analytics Platform', {
      x: 50,
      y: height - 200,
      size: 30,
      font: boldFont,
      color: rgb(0, 0, 0)
    });
    
    page.drawText('Complete Documentation', {
      x: 50,
      y: height - 250,
      size: 20,
      font: font,
      color: rgb(0.3, 0.3, 0.3)
    });
    
    page.drawText(`Version 2.0.0`, {
      x: 50,
      y: height - 350,
      size: 14,
      font: font,
      color: rgb(0.5, 0.5, 0.5)
    });
    
    page.drawText(`Generated: ${new Date().toLocaleDateString()}`, {
      x: 50,
      y: height - 380,
      size: 14,
      font: font,
      color: rgb(0.5, 0.5, 0.5)
    });
  }

  private async addTableOfContents(
    pdfDoc: PDFDocument,
    font: any,
    boldFont: any
  ): Promise<void> {
    const page = pdfDoc.addPage();
    const { height } = page.getSize();
    
    page.drawText('Table of Contents', {
      x: 50,
      y: height - 50,
      size: 24,
      font: boldFont,
      color: rgb(0, 0, 0)
    });
    
    let yPosition = height - 100;
    let pageNumber = 3;
    
    for (const [_, section] of this.sections) {
      page.drawText(`${section.title}`, {
        x: 50,
        y: yPosition,
        size: 14,
        font: font,
        color: rgb(0, 0, 0)
      });
      
      page.drawText(`${pageNumber}`, {
        x: 500,
        y: yPosition,
        size: 14,
        font: font,
        color: rgb(0, 0, 0)
      });
      
      yPosition -= 25;
      pageNumber += Math.ceil(section.content.length / 2000); // Estimate pages
    }
  }

  private async addSectionToPDF(
    pdfDoc: PDFDocument,
    section: DocumentationSection,
    font: any,
    boldFont: any
  ): Promise<void> {
    // Add section content
    const lines = section.content.split('\n');
    let currentPage = pdfDoc.addPage();
    let { width, height } = currentPage.getSize();
    let yPosition = height - 50;
    
    // Section title
    currentPage.drawText(section.title, {
      x: 50,
      y: yPosition,
      size: 20,
      font: boldFont,
      color: rgb(0, 0, 0)
    });
    
    yPosition -= 40;
    
    // Content
    for (const line of lines) {
      if (yPosition < 50) {
        currentPage = pdfDoc.addPage();
        yPosition = height - 50;
      }
      
      const isHeading = line.startsWith('#');
      const text = line.replace(/^#+\s*/, '');
      
      currentPage.drawText(text, {
        x: 50,
        y: yPosition,
        size: isHeading ? 14 : 12,
        font: isHeading ? boldFont : font,
        color: rgb(0, 0, 0),
        maxWidth: width - 100
      });
      
      yPosition -= isHeading ? 25 : 20;
    }
  }

  private copyAssets(outputDir: string): void {
    const assetsDir = path.join(outputDir, 'assets');
    
    // Create directories
    ['css', 'js', 'images'].forEach(dir => {
      const dirPath = path.join(assetsDir, dir);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
    });
    
    // Create CSS file
    const cssContent = `
body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    line-height: 1.6;
    color: #333;
    margin: 0;
    padding: 0;
}

.sidebar {
    position: fixed;
    left: 0;
    top: 0;
    width: 250px;
    height: 100vh;
    background: #f5f5f5;
    padding: 20px;
    overflow-y: auto;
}

.content {
    margin-left: 290px;
    padding: 40px;
    max-width: 800px;
}

h1, h2, h3 {
    color: #2c3e50;
}

pre {
    background: #2d2d2d;
    color: #f8f8f2;
    padding: 15px;
    border-radius: 5px;
    overflow-x: auto;
}

.code-example {
    margin: 20px 0;
    border: 1px solid #e0e0e0;
    border-radius: 5px;
    padding: 20px;
}

.diagram {
    margin: 30px 0;
    text-align: center;
}

.index-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 20px;
    padding: 40px;
}

.doc-card {
    background: #f9f9f9;
    padding: 20px;
    border-radius: 8px;
    transition: transform 0.2s;
}

.doc-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 5px 15px rgba(0,0,0,0.1);
}
    `;
    
    fs.writeFileSync(path.join(assetsDir, 'css', 'documentation.css'), cssContent);
  }

  // Additional content generation methods...
  private generateGettingStarted(): string {
    return `
## Getting Started

### First Login

1. Navigate to https://analytics.manufacturing.com
2. Enter your email and password provided by your administrator
3. Click "Sign In"

### Dashboard Overview

Upon login, you'll see the main dashboard with:

- **Equipment Status Panel**: Real-time status of all equipment
- **OEE Metrics**: Current and historical OEE data
- **Active Alerts**: Any equipment issues requiring attention
- **Production Summary**: Today's production metrics

### Navigation

Use the left sidebar to navigate between different sections:

- **Dashboard**: Main overview
- **Equipment**: Detailed equipment information
- **Analytics**: Advanced analytics and reporting
- **Alerts**: Alert management and history
- **Reports**: Generate and download reports
    `;
  }

  private generateMetricsAPIDocumentation(): string {
    return `
## Metrics Endpoints

### Get Production Metrics

Retrieve production metrics for analysis.

**Endpoint:** \`GET /metrics/production\`

**Query Parameters:**
- \`startDate\` (ISO 8601): Start of time range
- \`endDate\` (ISO 8601): End of time range
- \`groupBy\` (string): Grouping interval (hour, day, week, month)
- \`equipment\` (array): Filter by equipment IDs
- \`metrics\` (array): Specific metrics to include

### Get Real-time Metrics

Stream real-time metrics via WebSocket.

**Endpoint:** \`WS /metrics/realtime\`

**Message Format:**
\`\`\`json
{
  "action": "subscribe",
  "equipment": ["eq-001", "eq-002"],
  "metrics": ["temperature", "pressure", "vibration"]
}
\`\`\`
    `;
  }

  private getMetricsAPIExamples(): CodeExample[] {
    return [
      {
        title: 'Get Daily Production Metrics',
        language: 'javascript',
        code: `const startDate = new Date();
startDate.setDate(startDate.getDate() - 7);

const params = new URLSearchParams({
  startDate: startDate.toISOString(),
  endDate: new Date().toISOString(),
  groupBy: 'day',
  equipment: ['eq-001', 'eq-002']
});

const response = await fetch(\`https://api.manufacturing.com/v2/metrics/production?\${params}\`, {
  headers: {
    'Authorization': 'Bearer ' + token
  }
});`,
        description: 'Fetch daily production metrics for the last 7 days'
      },
      {
        title: 'WebSocket Real-time Metrics',
        language: 'javascript',
        code: `const ws = new WebSocket('wss://api.manufacturing.com/v2/metrics/realtime');

ws.onopen = () => {
  ws.send(JSON.stringify({
    action: 'subscribe',
    equipment: ['eq-001'],
    metrics: ['temperature', 'pressure']
  }));
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Metric update:', data);
  // Update UI with new metric values
};`,
        description: 'Subscribe to real-time temperature and pressure updates'
      }
    ];
  }

  private generateDashboardGuide(): string {
    return `
## Dashboard Navigation

### Main Dashboard

The main dashboard provides an at-a-glance view of your manufacturing operations.

#### Key Widgets

1. **OEE Overview**
   - Current OEE percentage with trend indicator
   - Breakdown by Availability, Performance, and Quality
   - Click to drill down into detailed metrics

2. **Equipment Status Grid**
   - Color-coded status indicators
   - Green: Running normally
   - Yellow: Warning/Degraded performance
   - Red: Critical issue/Stopped
   - Gray: Offline/Maintenance

3. **Production Metrics**
   - Units produced today vs. target
   - Quality rate and defect trends
   - Shift performance comparison

4. **Alert Summary**
   - Active alerts by severity
   - Recent alert history
   - Quick acknowledge/resolve actions

### Customizing Your Dashboard

1. Click the gear icon in the top-right corner
2. Select "Customize Dashboard"
3. Drag and drop widgets to rearrange
4. Use the widget library to add new components
5. Save your layout for future sessions

### Time Range Selection

Use the time picker in the top navigation to adjust the data range:
- Last Hour
- Last 24 Hours
- Last 7 Days
- Last 30 Days
- Custom Range

### Refresh and Auto-update

- Manual refresh: Click the refresh icon
- Auto-refresh: Toggle in settings (5s, 30s, 1m, 5m intervals)
- Real-time updates: Available for critical metrics
    `;
  }

  private generateAlertGuide(): string {
    return `
## Alert Management

### Understanding Alerts

Alerts are automatically generated when equipment or process parameters exceed defined thresholds.

#### Alert Severities

1. **Critical** (Red)
   - Immediate action required
   - Production impact
   - Safety concerns

2. **High** (Orange)
   - Urgent attention needed
   - Potential production impact
   - Escalation after 15 minutes

3. **Medium** (Yellow)
   - Attention required
   - No immediate production impact
   - Escalation after 1 hour

4. **Low** (Blue)
   - Informational
   - Trend monitoring
   - No escalation

### Managing Alerts

#### Acknowledging Alerts

1. Click on the alert in the list
2. Review the details and any recommended actions
3. Click "Acknowledge" to confirm you're addressing it
4. Add notes if needed for shift handover

#### Resolving Alerts

1. Once the issue is addressed, click "Resolve"
2. Select the resolution type:
   - Fixed
   - Temporary Workaround
   - False Positive
   - No Action Required
3. Add resolution notes for future reference

### Alert Notifications

Configure how you receive alert notifications:

1. Go to Settings > Notifications
2. Set preferences by severity level:
   - Email
   - SMS
   - In-app notifications
   - Mobile push notifications
3. Define quiet hours (no non-critical alerts)
4. Set up escalation contacts
    `;
  }

  private generateReportGuide(): string {
    return `
## Report Generation

### Available Reports

#### Production Reports
- Daily Production Summary
- Shift Performance Report
- OEE Trend Analysis
- Equipment Utilization Report

#### Quality Reports
- Defect Analysis Report
- Quality Trend Report
- Pareto Analysis
- SPC Charts

#### Maintenance Reports
- Maintenance Schedule
- MTBF/MTTR Analysis
- Downtime Analysis
- Spare Parts Usage

### Creating Reports

1. Navigate to Reports section
2. Select report type
3. Configure parameters:
   - Date range
   - Equipment selection
   - Grouping options
   - Include/exclude specific metrics
4. Preview the report
5. Export or schedule

### Report Formats

- **PDF**: Best for sharing and archiving
- **Excel**: For further analysis
- **CSV**: For data integration
- **Dashboard**: Interactive web view

### Scheduling Reports

1. After configuring a report, click "Schedule"
2. Set frequency:
   - Daily (specify time)
   - Weekly (specify day and time)
   - Monthly (specify date and time)
3. Add email recipients
4. Set report format
5. Enable/disable based on conditions

### Report Templates

Save frequently used report configurations as templates:

1. Configure your report
2. Click "Save as Template"
3. Name your template
4. Access later from "My Templates"
    `;
  }

  private generateSystemConfigGuide(): string {
    return `
## System Configuration

### General Settings

#### Company Information
- Company name and logo
- Time zone settings
- Currency and units of measure
- Language preferences

#### System Parameters
- Data retention policies
- Calculation methods (OEE formula variations)
- Shift definitions
- Holiday calendar

### Equipment Configuration

#### Adding New Equipment

1. Navigate to Admin > Equipment Management
2. Click "Add Equipment"
3. Fill in required fields:
   - Equipment Code (unique identifier)
   - Name and Description
   - Type (CNC, Welding Robot, etc.)
   - Site and Area assignment
   - Ideal cycle time (for OEE calculation)
4. Configure sensors and data points
5. Set up alert thresholds
6. Save and activate

#### Modifying Equipment

1. Find equipment in the list
2. Click "Edit"
3. Update necessary fields
4. Review impact on historical data
5. Save changes

### Integration Settings

#### OPC-UA Configuration
\`\`\`
Server URL: opc.tcp://plc-server:4840
Security Mode: SignAndEncrypt
Authentication: Username/Password
Polling Interval: 1000ms
\`\`\`

#### MQTT Configuration
\`\`\`
Broker URL: mqtt://mqtt-broker:1883
Client ID: manufacturing-analytics-001
Topics: 
  - plant/+/equipment/+/metrics
  - plant/+/equipment/+/status
QoS Level: 1
\`\`\`

### Alert Configuration

#### Setting Thresholds

1. Navigate to Admin > Alert Rules
2. Select equipment or create global rule
3. Define conditions:
   - Metric to monitor
   - Operator (>, <, =, !=)
   - Threshold value
   - Duration before triggering
4. Set severity level
5. Configure actions:
   - Notifications
   - Automated responses
   - Escalation rules
    `;
  }

  private generateUserManagementGuide(): string {
    return `
## User Management

### User Roles

#### Administrator
- Full system access
- User management
- System configuration
- All reports and data

#### Supervisor
- View all equipment data
- Acknowledge/resolve alerts
- Generate reports
- Manage operators

#### Operator
- View assigned equipment
- Acknowledge alerts
- Enter production data
- View basic reports

#### Analyst
- Read-only access to all data
- Advanced analytics tools
- Report generation
- No operational actions

### Managing Users

#### Adding Users

1. Navigate to Admin > User Management
2. Click "Add User"
3. Enter user information:
   - Email (used for login)
   - Full name
   - Phone (for SMS alerts)
   - Role assignment
   - Site/Area restrictions
4. Set temporary password
5. Send invitation email

#### Modifying User Access

1. Find user in the list
2. Click "Edit Permissions"
3. Adjust:
   - Role assignment
   - Equipment access
   - Feature permissions
   - Notification preferences
4. Save changes

#### Deactivating Users

1. Find user in the list
2. Click "Deactivate"
3. Confirm action
4. User retains history but cannot log in

### Access Control

#### Site-Based Access
- Users can be restricted to specific sites
- Inherited down to areas and equipment
- Cross-site reports require special permission

#### Feature-Based Access
- Enable/disable specific features per role
- Custom permissions for special cases
- API access tokens separate from UI access

### Password Policies

- Minimum 12 characters
- Complexity requirements enforced
- Password expiry: 90 days
- No reuse of last 5 passwords
- Account lockout after 5 failed attempts
    `;
  }

  private generateBackupGuide(): string {
    return `
## Backup and Recovery

### Backup Strategy

#### Automated Backups
- **Database**: Every 4 hours
- **Configuration**: Daily at 2 AM
- **File Storage**: Daily incremental, weekly full
- **Retention**: 30 days local, 90 days archive

#### Manual Backups

1. Navigate to Admin > Backup Management
2. Select backup type:
   - Full System Backup
   - Database Only
   - Configuration Only
3. Choose destination:
   - Local Storage
   - Cloud Storage (S3)
   - Download to Browser
4. Click "Start Backup"
5. Monitor progress
6. Verify completion

### Recovery Procedures

#### Database Recovery

1. Stop application services:
   \`\`\`bash
   kubectl scale deployment manufacturing-app --replicas=0
   \`\`\`

2. Restore database:
   \`\`\`bash
   pg_restore -h localhost -U postgres -d manufacturing backup_2024_01_15.dump
   \`\`\`

3. Verify data integrity:
   \`\`\`sql
   SELECT COUNT(*) FROM production_metrics WHERE time >= NOW() - INTERVAL '1 day';
   \`\`\`

4. Restart services:
   \`\`\`bash
   kubectl scale deployment manufacturing-app --replicas=3
   \`\`\`

#### Point-in-Time Recovery

For TimescaleDB continuous aggregates:

1. Identify recovery point
2. Restore base backup
3. Apply WAL logs to specific time:
   \`\`\`bash
   recovery_target_time = '2024-01-15 14:30:00'
   \`\`\`

### Disaster Recovery

#### RTO and RPO Targets
- **RTO** (Recovery Time Objective): 4 hours
- **RPO** (Recovery Point Objective): 1 hour

#### DR Procedures

1. **Detection** (15 minutes)
   - Automated monitoring alerts
   - Manual verification
   
2. **Decision** (15 minutes)
   - Assess impact
   - Initiate DR if needed
   
3. **Recovery** (3 hours)
   - Activate DR site
   - Restore data
   - Redirect traffic
   
4. **Validation** (30 minutes)
   - Verify functionality
   - Check data integrity
   - Monitor performance

### Backup Testing

Monthly backup tests:

1. Restore to test environment
2. Verify data completeness
3. Test application functionality
4. Document results
5. Update procedures if needed
    `;
  }

  private generatePerformanceGuide(): string {
    return `
## Performance Tuning

### Database Optimization

#### Index Management

Essential indexes for performance:

\`\`\`sql
-- Time-series queries
CREATE INDEX idx_metrics_equipment_time ON production_metrics(equipment_id, time DESC);

-- OEE calculations
CREATE INDEX idx_metrics_oee ON production_metrics(time DESC, oee) WHERE oee IS NOT NULL;

-- Alert queries
CREATE INDEX idx_alerts_status_severity ON alerts(status, severity, created_at DESC);
\`\`\`

#### Continuous Aggregates

Pre-calculate common queries:

\`\`\`sql
CREATE MATERIALIZED VIEW hourly_oee
WITH (timescaledb.continuous) AS
SELECT 
  time_bucket('1 hour', time) AS hour,
  equipment_id,
  AVG(oee) as avg_oee,
  COUNT(*) as data_points
FROM production_metrics
GROUP BY hour, equipment_id;
\`\`\`

#### Compression Policies

Compress old data:

\`\`\`sql
ALTER TABLE production_metrics SET (
  timescaledb.compress,
  timescaledb.compress_segmentby = 'equipment_id'
);

SELECT add_compression_policy('production_metrics', INTERVAL '7 days');
\`\`\`

### Application Performance

#### Caching Strategy

1. **Redis Cache Layers**:
   - Session data: 30 minutes
   - API responses: 5 minutes
   - Static lookups: 24 hours
   - Real-time data: 10 seconds

2. **Cache Invalidation**:
   - Event-driven for critical data
   - TTL-based for reports
   - Manual flush available

#### Query Optimization

Best practices:

1. Use pagination for large datasets
2. Implement cursor-based pagination for real-time feeds
3. Avoid N+1 queries with eager loading
4. Use database views for complex joins

#### Connection Pooling

Optimal settings:

\`\`\`javascript
{
  min: 10,
  max: 50,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
}
\`\`\`

### Monitoring Performance

#### Key Metrics to Track

1. **Response Times**
   - API p95 < 200ms
   - Dashboard load < 2s
   - Report generation < 10s

2. **Resource Usage**
   - CPU < 70% sustained
   - Memory < 80% peak
   - Disk I/O < 1000 IOPS

3. **Database Metrics**
   - Active connections < 80% of max
   - Lock waits < 10ms average
   - Cache hit ratio > 95%

#### Performance Alerts

Set up alerts for:
- Response time degradation
- Resource exhaustion
- Database connection spikes
- Cache miss rate increase

### Scaling Guidelines

#### Horizontal Scaling

When to scale out:
- Sustained CPU > 70%
- Memory pressure
- Request queuing

How to scale:
1. Add application instances
2. Implement load balancing
3. Ensure session affinity if needed

#### Vertical Scaling

When to scale up:
- Database CPU bound
- Complex query requirements
- Large dataset processing

Recommendations:
- Database: 16+ cores, 64GB+ RAM for large deployments
- Application: 4 cores, 8GB RAM per instance
- Cache: 8GB+ Redis cluster
    `;
  }

  private generateDevSetupGuide(): string {
    return `
## Development Setup

### Prerequisites

- Node.js 18+ and npm 9+
- PostgreSQL 14+ with TimescaleDB extension
- Redis 6+
- Docker and Docker Compose
- Git

### Environment Setup

1. **Clone the repository**:
   \`\`\`bash
   git clone https://github.com/manufacturing/analytics-platform.git
   cd analytics-platform
   \`\`\`

2. **Install dependencies**:
   \`\`\`bash
   npm install
   \`\`\`

3. **Set up environment variables**:
   \`\`\`bash
   cp .env.example .env.local
   # Edit .env.local with your configuration
   \`\`\`

4. **Start development services**:
   \`\`\`bash
   docker-compose -f docker-compose.dev.yml up -d
   \`\`\`

5. **Run database migrations**:
   \`\`\`bash
   npm run prisma:migrate
   npm run prisma:seed
   \`\`\`

6. **Start development server**:
   \`\`\`bash
   npm run dev
   \`\`\`

### Development Tools

#### VS Code Extensions
- ESLint
- Prettier
- Prisma
- GitLens
- Thunder Client (API testing)

#### Debugging

Launch configuration for VS Code:

\`\`\`json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "attach",
      "name": "Attach to Next.js",
      "port": 9229,
      "skipFiles": ["<node_internals>/**"]
    }
  ]
}
\`\`\`

Start with debugging:
\`\`\`bash
npm run dev:debug
\`\`\`

### Code Style

#### TypeScript Configuration

Key tsconfig.json settings:

\`\`\`json
{
  "compilerOptions": {
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  }
}
\`\`\`

#### Linting and Formatting

Run before committing:
\`\`\`bash
npm run lint
npm run format
npm run type-check
\`\`\`

Pre-commit hook setup:
\`\`\`bash
npm install -D husky lint-staged
npx husky install
\`\`\`
    `;
  }

  private generateAPIDevGuide(): string {
    return `
## API Development Guide

### Creating New Endpoints

#### 1. Define the Route

Create route handler in \`app/api/[resource]/route.ts\`:

\`\`\`typescript
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { authenticate } from '@/middleware/auth';

// Define request schema
const CreateEquipmentSchema = z.object({
  code: z.string().min(1).max(50),
  name: z.string().min(1).max(200),
  type: z.string(),
  siteCode: z.string()
});

export async function POST(request: NextRequest) {
  try {
    // Authenticate
    const user = await authenticate(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Validate request
    const body = await request.json();
    const data = CreateEquipmentSchema.parse(body);

    // Business logic
    const equipment = await prisma.equipment.create({
      data: {
        ...data,
        createdBy: user.id
      }
    });

    // Return response
    return NextResponse.json({
      success: true,
      data: equipment
    }, { status: 201 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
\`\`\`

#### 2. Add Middleware

Common middleware patterns:

\`\`\`typescript
// Rate limiting
export async function rateLimitMiddleware(
  request: NextRequest,
  handler: () => Promise<NextResponse>
): Promise<NextResponse> {
  const ip = request.ip || 'unknown';
  const key = \`rate_limit:\${ip}\`;
  
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, 60); // 1 minute window
  }
  
  if (count > 100) { // 100 requests per minute
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429 }
    );
  }
  
  return handler();
}

// Request logging
export async function loggingMiddleware(
  request: NextRequest,
  handler: () => Promise<NextResponse>
): Promise<NextResponse> {
  const start = Date.now();
  
  const response = await handler();
  
  const duration = Date.now() - start;
  console.log(\`\${request.method} \${request.url} - \${response.status} (\${duration}ms)\`);
  
  return response;
}
\`\`\`

#### 3. Error Handling

Consistent error responses:

\`\`\`typescript
export class APIError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: any
  ) {
    super(message);
  }
}

export function handleAPIError(error: unknown): NextResponse {
  if (error instanceof APIError) {
    return NextResponse.json(
      {
        error: {
          code: error.code,
          message: error.message,
          details: error.details
        }
      },
      { status: error.statusCode }
    );
  }
  
  console.error('Unhandled error:', error);
  return NextResponse.json(
    { error: 'Internal server error' },
    { status: 500 }
  );
}
\`\`\`

### Testing APIs

#### Unit Tests

\`\`\`typescript
import { POST } from '@/app/api/equipment/route';
import { prismaMock } from '@/test/mocks/prisma';

describe('POST /api/equipment', () => {
  it('creates equipment with valid data', async () => {
    const mockEquipment = {
      id: 'eq-123',
      code: 'CNC-001',
      name: 'CNC Machine 1'
    };
    
    prismaMock.equipment.create.mockResolvedValue(mockEquipment);
    
    const request = new Request('http://localhost/api/equipment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer valid-token'
      },
      body: JSON.stringify({
        code: 'CNC-001',
        name: 'CNC Machine 1',
        type: 'CNC',
        siteCode: 'SITE-001'
      })
    });
    
    const response = await POST(request);
    const data = await response.json();
    
    expect(response.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.data).toEqual(mockEquipment);
  });
});
\`\`\`

#### Integration Tests

\`\`\`typescript
import { createTestClient } from '@/test/utils';

describe('Equipment API Integration', () => {
  const client = createTestClient();
  
  beforeEach(async () => {
    await prisma.equipment.deleteMany();
  });
  
  it('full CRUD workflow', async () => {
    // Create
    const created = await client.post('/api/equipment', {
      code: 'TEST-001',
      name: 'Test Equipment'
    });
    
    expect(created.status).toBe(201);
    const { id } = created.data;
    
    // Read
    const fetched = await client.get(\`/api/equipment/\${id}\`);
    expect(fetched.data.code).toBe('TEST-001');
    
    // Update
    const updated = await client.patch(\`/api/equipment/\${id}\`, {
      name: 'Updated Equipment'
    });
    expect(updated.data.name).toBe('Updated Equipment');
    
    // Delete
    const deleted = await client.delete(\`/api/equipment/\${id}\`);
    expect(deleted.status).toBe(204);
  });
});
\`\`\`

### API Documentation

#### Using OpenAPI Annotations

\`\`\`typescript
/**
 * @openapi
 * /api/equipment:
 *   get:
 *     summary: List all equipment
 *     tags: [Equipment]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Successful response
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EquipmentList'
 */
export async function GET(request: NextRequest) {
  // Implementation
}
\`\`\`

Generate documentation:
\`\`\`bash
npm run generate:api-docs
\`\`\`
    `;
  }

  private generateTestingGuide(): string {
    return `
## Testing Strategy

### Testing Pyramid

Our testing strategy follows the testing pyramid:

1. **Unit Tests** (70%)
   - Fast, isolated component tests
   - Business logic validation
   - Utility function tests

2. **Integration Tests** (20%)
   - API endpoint tests
   - Database interaction tests
   - Service integration tests

3. **E2E Tests** (10%)
   - Critical user journeys
   - Cross-browser compatibility
   - Performance benchmarks

### Running Tests

#### All Tests
\`\`\`bash
npm test
\`\`\`

#### Specific Test Suites
\`\`\`bash
npm run test:unit
npm run test:integration
npm run test:e2e
\`\`\`

#### Watch Mode
\`\`\`bash
npm run test:watch
\`\`\`

#### Coverage Report
\`\`\`bash
npm run test:coverage
\`\`\`

### Writing Tests

#### Unit Test Example

\`\`\`typescript
import { calculateOEE } from '@/utils/oee';

describe('OEE Calculation', () => {
  it('calculates OEE correctly', () => {
    const result = calculateOEE({
      availability: 0.9,
      performance: 0.95,
      quality: 0.98
    });
    
    expect(result).toBeCloseTo(0.8379, 4);
  });
  
  it('handles edge cases', () => {
    expect(calculateOEE({
      availability: 0,
      performance: 1,
      quality: 1
    })).toBe(0);
  });
  
  it('validates input ranges', () => {
    expect(() => calculateOEE({
      availability: 1.5,
      performance: 0.9,
      quality: 0.9
    })).toThrow('Invalid availability value');
  });
});
\`\`\`

#### Component Test Example

\`\`\`typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { EquipmentCard } from '@/components/EquipmentCard';

describe('EquipmentCard', () => {
  const mockEquipment = {
    id: 'eq-001',
    name: 'CNC Machine 1',
    status: 'running',
    oee: 0.85
  };
  
  it('renders equipment information', () => {
    render(<EquipmentCard equipment={mockEquipment} />);
    
    expect(screen.getByText('CNC Machine 1')).toBeInTheDocument();
    expect(screen.getByText('85%')).toBeInTheDocument();
    expect(screen.getByText('Running')).toBeInTheDocument();
  });
  
  it('handles click events', () => {
    const handleClick = jest.fn();
    render(
      <EquipmentCard 
        equipment={mockEquipment} 
        onClick={handleClick}
      />
    );
    
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledWith('eq-001');
  });
});
\`\`\`

#### E2E Test Example

\`\`\`typescript
import { test, expect } from '@playwright/test';

test.describe('Equipment Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'testpass123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
  });
  
  test('displays equipment status', async ({ page }) => {
    await page.goto('/equipment');
    
    // Wait for data to load
    await page.waitForSelector('.equipment-grid');
    
    // Check equipment cards are displayed
    const cards = await page.locator('.equipment-card').count();
    expect(cards).toBeGreaterThan(0);
    
    // Check OEE is displayed
    const oeeText = await page.locator('.oee-value').first().textContent();
    expect(oeeText).toMatch(/\d+%/);
  });
  
  test('filters equipment by status', async ({ page }) => {
    await page.goto('/equipment');
    
    // Apply filter
    await page.selectOption('[name="status"]', 'running');
    
    // Verify filtered results
    const statuses = await page.locator('.status-badge').allTextContents();
    expect(statuses.every(s => s === 'Running')).toBe(true);
  });
});
\`\`\`

### Test Data Management

#### Fixtures

\`\`\`typescript
// test/fixtures/equipment.ts
export const equipmentFixtures = {
  running: {
    id: 'eq-001',
    code: 'CNC-001',
    name: 'CNC Machine 1',
    status: 'running',
    oee: 0.85,
    availability: 0.90,
    performance: 0.95,
    quality: 0.99
  },
  maintenance: {
    id: 'eq-002',
    code: 'WELD-001',
    name: 'Welding Robot 1',
    status: 'maintenance',
    oee: 0,
    availability: 0,
    performance: 0,
    quality: 0
  }
};
\`\`\`

#### Database Seeding

\`\`\`typescript
// test/seed.ts
import { prisma } from '@/lib/prisma';
import { equipmentFixtures } from './fixtures/equipment';

export async function seedTestDatabase() {
  // Clear existing data
  await prisma.equipment.deleteMany();
  
  // Insert test data
  await prisma.equipment.createMany({
    data: Object.values(equipmentFixtures)
  });
}
\`\`\`

### Performance Testing

#### Load Test Example

\`\`\`javascript
import http from 'k6/http';
import { check } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 100 },
    { duration: '1m', target: 100 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],
  },
};

export default function () {
  const response = http.get('https://api.manufacturing.com/v2/equipment');
  
  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
}
\`\`\`

### Continuous Integration

#### GitHub Actions Workflow

\`\`\`yaml
name: CI

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: timescale/timescaledb:latest-pg14
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run linting
      run: npm run lint
    
    - name: Run type checking
      run: npm run type-check
    
    - name: Run unit tests
      run: npm run test:unit
    
    - name: Run integration tests
      run: npm run test:integration
      env:
        DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test
    
    - name: Upload coverage
      uses: codecov/codecov-action@v3
      with:
        file: ./coverage/lcov.info
\`\`\`
    `;
  }

  private generateOEEDocumentation(): string {
    return `
## OEE Calculation Methodology

### Overview

Overall Equipment Effectiveness (OEE) is calculated according to ISO 22400 standards with adaptations for specific manufacturing contexts.

### Formula

\`\`\`
OEE = Availability × Performance × Quality
\`\`\`

### Component Calculations

#### Availability

\`\`\`
Availability = Run Time / Planned Production Time
\`\`\`

Where:
- **Run Time** = Planned Production Time - Stop Time
- **Stop Time** = All downtime events during planned production
- **Planned Production Time** = Total time - Planned downtime

Exclusions from Planned Production Time:
- Scheduled maintenance
- Planned changeovers
- No demand periods
- Breaks (configurable)

#### Performance

\`\`\`
Performance = (Ideal Cycle Time × Total Count) / Run Time
\`\`\`

Where:
- **Ideal Cycle Time** = Theoretical fastest cycle time for the product
- **Total Count** = Total units produced (good + bad)
- **Run Time** = Actual production time

Note: Performance can exceed 100% if running faster than ideal cycle time, but is capped at 100% for OEE calculation.

#### Quality

\`\`\`
Quality = Good Count / Total Count
\`\`\`

Where:
- **Good Count** = Units that pass quality inspection first time
- **Total Count** = All units produced

Rework is NOT counted as good production.

### Time State Model

Based on SEMI E10 standard:

1. **Production Time** (VALUE-ADDED)
   - Equipment is producing parts
   - Counted in Run Time

2. **Standby Time** (NON-VALUE-ADDED)
   - Equipment ready but not producing
   - Counted as downtime

3. **Engineering Time** (NON-VALUE-ADDED)
   - Testing, development, trials
   - Usually excluded from OEE

4. **Scheduled Downtime** (EXCLUDED)
   - Planned maintenance
   - No production scheduled
   - Not counted against availability

5. **Unscheduled Downtime** (LOSS)
   - Breakdowns
   - Material shortage
   - Operator unavailable
   - Counted against availability

### Special Considerations

#### Changeovers
- Quick changeovers (< 10 minutes): Performance loss
- Long changeovers (>= 10 minutes): Availability loss
- Configurable threshold per equipment type

#### Speed Losses
- Running below rated speed: Performance loss
- Calculated as: (Actual Speed / Rated Speed)

#### Small Stops
- Stops < 5 minutes: Performance loss
- Stops >= 5 minutes: Availability loss
- Configurable threshold

#### Startup Rejects
- First 10 units after changeover excluded from quality
- Configurable per product

### Example Calculation

Given:
- Shift Length: 480 minutes (8 hours)
- Breaks: 30 minutes
- Planned Maintenance: 0 minutes
- Downtime: 50 minutes
- Ideal Cycle Time: 1 minute per part
- Total Parts Produced: 350
- Good Parts: 340

Calculation:
- Planned Production Time = 480 - 30 = 450 minutes
- Run Time = 450 - 50 = 400 minutes
- Availability = 400 / 450 = 0.889 (88.9%)
- Performance = (1 × 350) / 400 = 0.875 (87.5%)
- Quality = 340 / 350 = 0.971 (97.1%)
- OEE = 0.889 × 0.875 × 0.971 = 0.756 (75.6%)
    `;
  }

  private generateQualityDocumentation(): string {
    return `
## Quality Metrics Documentation

### Quality Rate Calculation

Basic quality rate:
\`\`\`
Quality Rate = Good Units / Total Units Produced
\`\`\`

### First Pass Yield (FPY)

\`\`\`
FPY = Units Passing All Tests First Time / Total Units Tested
\`\`\`

Excludes:
- Reworked units (even if eventually pass)
- Units requiring any adjustment
- Units with any defect (even if within tolerance)

### Rolled Throughput Yield (RTY)

For multi-step processes:
\`\`\`
RTY = FPY₁ × FPY₂ × FPY₃ × ... × FPYₙ
\`\`\`

Example:
- Step 1 FPY: 95%
- Step 2 FPY: 98%
- Step 3 FPY: 99%
- RTY = 0.95 × 0.98 × 0.99 = 92.2%

### Defect Classification

#### By Severity

1. **Critical Defects** (Severity 5)
   - Safety hazards
   - Complete functional failure
   - Regulatory non-compliance
   - Action: 100% containment, immediate escalation

2. **Major Defects** (Severity 4)
   - Significant functional impact
   - Customer dissatisfaction likely
   - Action: Quarantine, root cause analysis

3. **Moderate Defects** (Severity 3)
   - Partial functional impact
   - Cosmetic issues visible to customer
   - Action: Sort and rework if possible

4. **Minor Defects** (Severity 2)
   - Slight cosmetic issues
   - No functional impact
   - Action: Note and monitor trend

5. **Observations** (Severity 1)
   - Within spec but approaching limits
   - Process variation noted
   - Action: Track for trends

#### By Type

- **Dimensional**: Out of specified measurements
- **Visual**: Scratches, dents, discoloration
- **Functional**: Performance not meeting spec
- **Assembly**: Missing or incorrect components
- **Material**: Wrong material or material defects

### Process Capability Indices

#### Cp (Process Capability)

\`\`\`
Cp = (USL - LSL) / (6σ)
\`\`\`

Where:
- USL = Upper Specification Limit
- LSL = Lower Specification Limit
- σ = Process standard deviation

Interpretation:
- Cp < 1.0: Process not capable
- Cp = 1.0-1.33: Marginally capable
- Cp > 1.33: Process capable
- Cp > 1.67: High capability

#### Cpk (Process Capability Index)

\`\`\`
Cpk = min[(USL - μ) / 3σ, (μ - LSL) / 3σ]
\`\`\`

Where:
- μ = Process mean

Interpretation:
- Cpk < 1.0: Process producing defects
- Cpk = 1.0: ~2,700 PPM defects
- Cpk = 1.33: ~64 PPM defects
- Cpk = 1.67: ~0.6 PPM defects

### Statistical Process Control (SPC)

#### Control Limits

- **Upper Control Limit (UCL)**: μ + 3σ
- **Lower Control Limit (LCL)**: μ - 3σ
- **Upper Warning Limit**: μ + 2σ
- **Lower Warning Limit**: μ - 2σ

#### Western Electric Rules

Process out of control if:
1. One point beyond 3σ
2. Two of three consecutive points beyond 2σ (same side)
3. Four of five consecutive points beyond 1σ (same side)
4. Eight consecutive points on same side of centerline
5. Six consecutive points increasing or decreasing
6. Fifteen consecutive points within 1σ
7. Fourteen consecutive points alternating up/down

### Cost of Quality (COQ)

#### Prevention Costs
- Training
- Process improvement
- Preventive maintenance
- Quality planning

#### Appraisal Costs
- Inspection
- Testing
- Audits
- Calibration

#### Internal Failure Costs
- Scrap
- Rework
- Re-inspection
- Downgrading

#### External Failure Costs
- Returns
- Warranty claims
- Customer complaints
- Lost business

Target: Prevention + Appraisal < 5% of revenue
    `;
  }

  private generateAlertThresholdDoc(): string {
    return `
## Alert Threshold Configuration

### Temperature Monitoring

#### Equipment-Specific Thresholds

**CNC Machines**
- Normal: 20-35°C
- Warning: 35-40°C or 15-20°C
- Critical: >40°C or <15°C
- Hysteresis: 2°C

**Welding Equipment**
- Normal: 20-45°C
- Warning: 45-50°C
- Critical: >50°C
- Hysteresis: 3°C

**Measurement Points**
- Spindle bearing
- Motor housing
- Coolant temperature
- Ambient temperature

### Vibration Monitoring

#### ISO 10816 Vibration Severity

**Class I** (Small machines <15kW)
- Good: <1.8 mm/s RMS
- Satisfactory: 1.8-4.5 mm/s
- Unsatisfactory: 4.5-11.2 mm/s
- Unacceptable: >11.2 mm/s

**Class II** (Medium machines 15-75kW)
- Good: <2.8 mm/s RMS
- Satisfactory: 2.8-7.1 mm/s
- Unsatisfactory: 7.1-18 mm/s
- Unacceptable: >18 mm/s

### Performance Thresholds

#### OEE Alerts
- World Class: >85% (no alert)
- Good: 75-85% (info)
- Warning: 60-75% (low priority)
- Poor: 40-60% (medium priority)
- Critical: <40% (high priority)

#### Availability Alerts
- Unplanned downtime >10 minutes: Medium
- Unplanned downtime >30 minutes: High
- Unplanned downtime >60 minutes: Critical

### Quality Thresholds

#### Defect Rate Alerts
- <1%: No alert
- 1-3%: Low priority
- 3-5%: Medium priority
- 5-10%: High priority
- >10%: Critical + Stop production

#### SPC Violations
- 1 point beyond 3σ: High priority
- 2/3 points beyond 2σ: Medium priority
- Trending patterns: Low priority

### Maintenance Alerts

#### Time-Based
- 90% of maintenance interval: Info
- 100% of maintenance interval: Low
- 110% of maintenance interval: Medium
- 120% of maintenance interval: High

#### Condition-Based
- Vibration trend +20%: Low
- Vibration trend +50%: Medium
- Vibration exceeds limit: High
- Multiple parameters degrading: Critical

### Alert Suppression Rules

#### Time-Based Suppression
- Duplicate alerts: 5 minute window
- Flapping detection: 5 alerts in 15 minutes
- Maintenance window: No alerts except critical

#### Conditional Suppression
- During changeover: Suppress performance alerts
- First 10 parts: Suppress quality alerts
- Startup period: 10 minutes grace period

### Escalation Matrix

#### Response Times
- Critical: Immediate (SMS + Phone)
- High: 15 minutes (SMS + Email)
- Medium: 1 hour (Email)
- Low: Next shift (Dashboard only)

#### Escalation Path
1. Level 1: Operator (0 minutes)
2. Level 2: Supervisor (15 minutes)
3. Level 3: Manager (30 minutes)
4. Level 4: Director (60 minutes)

### Alert Acknowledgment

#### Required Actions
- Critical: Acknowledge within 5 minutes
- High: Acknowledge within 15 minutes
- Medium: Acknowledge within 1 hour
- Low: Acknowledge by end of shift

#### Resolution Requirements
- Document root cause
- Record corrective action
- Update knowledge base
- Schedule follow-up if needed
    `;
  }
}

// =====================================================
// TRAINING MODULE SYSTEM
// =====================================================

interface TrainingModule {
  id: string;
  title: string;
  description: string;
  role: 'operator' | 'supervisor' | 'analyst' | 'admin';
  duration: number; // minutes
  content: TrainingContent[];
  quiz?: Quiz;
  certificate?: boolean;
}

interface TrainingContent {
  type: 'video' | 'interactive' | 'document' | 'simulation';
  title: string;
  content: string;
  duration: number;
}

interface Quiz {
  questions: QuizQuestion[];
  passingScore: number;
  timeLimit?: number;
}

interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

export class TrainingSystem {
  private modules: Map<string, TrainingModule> = new Map();
  private progress: Map<string, UserProgress> = new Map();

  constructor() {
    this.initializeModules();
  }

  private initializeModules() {
    // Operator Training Modules
    this.modules.set('operator-basics', {
      id: 'operator-basics',
      title: 'Operator Basics',
      description: 'Introduction to the manufacturing analytics platform',
      role: 'operator',
      duration: 30,
      content: [
        {
          type: 'video',
          title: 'Welcome to Manufacturing Analytics',
          content: '/training/videos/operator-welcome.mp4',
          duration: 5
        },
        {
          type: 'interactive',
          title: 'Dashboard Navigation',
          content: this.generateInteractiveDashboard(),
          duration: 10
        },
        {
          type: 'document',
          title: 'Quick Reference Guide',
          content: this.generateQuickReference(),
          duration: 5
        },
        {
          type: 'simulation',
          title: 'Practice Alert Response',
          content: this.generateAlertSimulation(),
          duration: 10
        }
      ],
      quiz: {
        passingScore: 80,
        timeLimit: 10,
        questions: [
          {
            question: 'What does OEE stand for?',
            options: [
              'Overall Equipment Efficiency',
              'Overall Equipment Effectiveness',
              'Operational Equipment Efficiency',
              'Operational Excellence Evaluation'
            ],
            correctAnswer: 1,
            explanation: 'OEE stands for Overall Equipment Effectiveness, which measures how well equipment is utilized.'
          },
          {
            question: 'What should you do when a critical alert appears?',
            options: [
              'Wait for supervisor',
              'Acknowledge immediately and take action',
              'Ignore if busy',
              'Log out of the system'
            ],
            correctAnswer: 1,
            explanation: 'Critical alerts require immediate acknowledgment and action to prevent production issues.'
          }
        ]
      },
      certificate: true
    });

    // Supervisor Training Modules
    this.modules.set('supervisor-analytics', {
      id: 'supervisor-analytics',
      title: 'Advanced Analytics for Supervisors',
      description: 'Using analytics to improve production performance',
      role: 'supervisor',
      duration: 45,
      content: [
        {
          type: 'video',
          title: 'Understanding Production Analytics',
          content: '/training/videos/supervisor-analytics.mp4',
          duration: 10
        },
        {
          type: 'interactive',
          title: 'Analyzing OEE Trends',
          content: this.generateOEEAnalysis(),
          duration: 15
        },
        {
          type: 'simulation',
          title: 'Shift Handover Process',
          content: this.generateShiftHandover(),
          duration: 20
        }
      ],
      certificate: true
    });

    // Add more modules...
  }

  /**
   * Get training modules for a role
   */
  getModulesForRole(role: string): TrainingModule[] {
    return Array.from(this.modules.values())
      .filter(module => module.role === role);
  }

  /**
   * Start a training module
   */
  async startModule(userId: string, moduleId: string): Promise<void> {
    const module = this.modules.get(moduleId);
    if (!module) {
      throw new Error('Module not found');
    }

    const progress: UserProgress = {
      userId,
      moduleId,
      startedAt: new Date(),
      currentContent: 0,
      contentProgress: module.content.map(() => ({ completed: false, score: 0 })),
      quizAttempts: []
    };

    this.progress.set(`${userId}:${moduleId}`, progress);
  }

  /**
   * Complete content item
   */
  async completeContent(
    userId: string,
    moduleId: string,
    contentIndex: number,
    score: number = 100
  ): Promise<void> {
    const progressKey = `${userId}:${moduleId}`;
    const progress = this.progress.get(progressKey);
    
    if (!progress) {
      throw new Error('No progress found');
    }

    progress.contentProgress[contentIndex] = {
      completed: true,
      score,
      completedAt: new Date()
    };

    // Move to next content
    progress.currentContent = contentIndex + 1;
    
    // Check if module completed
    const module = this.modules.get(moduleId)!;
    if (progress.currentContent >= module.content.length) {
      progress.moduleCompleted = true;
      progress.completedAt = new Date();
    }
  }

  /**
   * Submit quiz answers
   */
  async submitQuiz(
    userId: string,
    moduleId: string,
    answers: number[]
  ): Promise<QuizResult> {
    const module = this.modules.get(moduleId);
    if (!module || !module.quiz) {
      throw new Error('Quiz not found');
    }

    const quiz = module.quiz;
    let correctAnswers = 0;
    const results = quiz.questions.map((question, index) => {
      const correct = answers[index] === question.correctAnswer;
      if (correct) correctAnswers++;
      
      return {
        question: question.question,
        userAnswer: answers[index],
        correctAnswer: question.correctAnswer,
        correct,
        explanation: question.explanation
      };
    });

    const score = (correctAnswers / quiz.questions.length) * 100;
    const passed = score >= quiz.passingScore;

    const result: QuizResult = {
      score,
      passed,
      results,
      timestamp: new Date()
    };

    // Update progress
    const progressKey = `${userId}:${moduleId}`;
    const progress = this.progress.get(progressKey);
    if (progress) {
      progress.quizAttempts.push(result);
      if (passed) {
        progress.quizPassed = true;
      }
    }

    return result;
  }

  /**
   * Generate certificate
   */
  async generateCertificate(
    userId: string,
    moduleId: string
  ): Promise<Buffer> {
    const module = this.modules.get(moduleId);
    const progress = this.progress.get(`${userId}:${moduleId}`);

    if (!module || !progress || !progress.quizPassed) {
      throw new Error('Certificate requirements not met');
    }

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([600, 400]);
    const { width, height } = page.getSize();

    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

    // Certificate content
    page.drawText('Certificate of Completion', {
      x: width / 2 - 150,
      y: height - 80,
      size: 24,
      font,
      color: rgb(0, 0, 0)
    });

    page.drawText('This certifies that', {
      x: width / 2 - 60,
      y: height - 140,
      size: 14,
      font: regularFont
    });

    // Add user name (would fetch from database)
    page.drawText('John Doe', {
      x: width / 2 - 40,
      y: height - 170,
      size: 20,
      font
    });

    page.drawText('has successfully completed', {
      x: width / 2 - 80,
      y: height - 210,
      size: 14,
      font: regularFont
    });

    page.drawText(module.title, {
      x: width / 2 - 100,
      y: height - 240,
      size: 18,
      font
    });

    page.drawText(`Date: ${progress.completedAt?.toLocaleDateString()}`, {
      x: width / 2 - 60,
      y: height - 300,
      size: 12,
      font: regularFont
    });

    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
  }

  // Content generation methods
  private generateInteractiveDashboard(): string {
    return JSON.stringify({
      type: 'interactive',
      components: [
        {
          id: 'equipment-status',
          title: 'Equipment Status Panel',
          description: 'Shows real-time status of all equipment',
          hotspots: [
            {
              x: 100,
              y: 100,
              tooltip: 'Click here to filter by equipment type'
            },
            {
              x: 300,
              y: 200,
              tooltip: 'Green means running, red means stopped'
            }
          ]
        }
      ]
    });
  }

  private generateQuickReference(): string {
    return `
# Quick Reference Guide

## Alert Response

### Critical Alerts (Red)
1. Acknowledge immediately
2. Stop production if safety issue
3. Call supervisor
4. Document actions taken

### High Priority (Orange)
1. Acknowledge within 15 minutes
2. Investigate root cause
3. Implement temporary fix if possible
4. Notify supervisor

## Common Tasks

### Check Equipment Status
1. Dashboard → Equipment Status
2. Click on equipment card
3. View detailed metrics

### Generate Shift Report
1. Reports → Shift Summary
2. Select date range
3. Click Generate
4. Download or email

## Emergency Contacts

- Supervisor: ext. 1234
- Maintenance: ext. 5678
- IT Support: ext. 9012
    `;
  }

  private generateAlertSimulation(): string {
    return JSON.stringify({
      type: 'simulation',
      scenario: 'temperature-alert',
      steps: [
        {
          trigger: 'Temperature exceeds 45°C on CNC-001',
          expectedAction: 'acknowledge',
          timeout: 30
        },
        {
          prompt: 'Select appropriate action',
          options: [
            'Stop machine',
            'Reduce speed',
            'Check coolant',
            'Ignore'
          ],
          correctAnswer: 2
        },
        {
          result: 'Temperature returning to normal',
          expectedAction: 'document',
          fields: ['action_taken', 'root_cause']
        }
      ]
    });
  }

  private generateOEEAnalysis(): string {
    return JSON.stringify({
      type: 'interactive',
      scenario: 'oee-trend-analysis',
      data: {
        weekly_oee: [0.72, 0.75, 0.68, 0.71, 0.74, 0.69, 0.73],
        availability: [0.85, 0.88, 0.82, 0.84, 0.87, 0.83, 0.86],
        performance: [0.90, 0.91, 0.88, 0.89, 0.90, 0.87, 0.90],
        quality: [0.94, 0.94, 0.94, 0.95, 0.95, 0.95, 0.94]
      },
      tasks: [
        'Identify the lowest OEE day',
        'Determine which factor contributed most to low OEE',
        'Suggest improvement actions'
      ]
    });
  }

  private generateShiftHandover(): string {
    return JSON.stringify({
      type: 'simulation',
      scenario: 'shift-handover',
      currentState: {
        alerts: [
          { equipment: 'CNC-001', issue: 'Intermittent vibration', status: 'monitoring' },
          { equipment: 'WELD-002', issue: 'Completed maintenance', status: 'resolved' }
        ],
        production: {
          target: 1000,
          actual: 750,
          quality_issues: 12
        },
        notes: 'Material delivery delayed by 1 hour'
      },
      tasks: [
        'Review active alerts',
        'Document production variance',
        'Create handover notes',
        'Brief incoming supervisor'
      ]
    });
  }
}

// =====================================================
// KNOWLEDGE BASE SYSTEM
// =====================================================

interface KnowledgeArticle {
  id: string;
  title: string;
  category: string;
  tags: string[];
  content: string;
  attachments?: Attachment[];
  relatedArticles?: string[];
  lastUpdated: Date;
  author: string;
  helpful: number;
  notHelpful: number;
}

interface Attachment {
  name: string;
  type: string;
  url: string;
  size: number;
}

export class KnowledgeBase {
  private articles: Map<string, KnowledgeArticle> = new Map();
  private searchIndex: Map<string, Set<string>> = new Map();

  constructor() {
    this.initializeArticles();
    this.buildSearchIndex();
  }

  private initializeArticles() {
    // Common troubleshooting articles
    this.addArticle({
      id: 'ts-001',
      title: 'Resolving High Temperature Alerts on CNC Machines',
      category: 'Troubleshooting',
      tags: ['temperature', 'cnc', 'alerts', 'cooling'],
      content: `
# Resolving High Temperature Alerts on CNC Machines

## Symptoms
- Temperature reading exceeds 40°C
- Frequent temperature alerts
- Machine automatically reducing speed

## Common Causes

1. **Insufficient Coolant Flow**
   - Check coolant level
   - Verify pump operation
   - Inspect for blockages

2. **Dirty Heat Exchanger**
   - Visual inspection for debris
   - Clean with compressed air
   - Check fan operation

3. **Ambient Temperature**
   - Measure shop floor temperature
   - Check HVAC operation
   - Consider additional cooling

## Resolution Steps

### Step 1: Immediate Actions
1. Reduce spindle speed by 20%
2. Check coolant flow at nozzles
3. Measure coolant temperature

### Step 2: Coolant System Check
\`\`\`
1. Stop machine safely
2. Check coolant level in reservoir
   - Should be between MIN and MAX marks
   - Top up if needed (use specified coolant only)
3. Check coolant concentration
   - Use refractometer
   - Should be 7-10% for most applications
   - Adjust if needed
\`\`\`

### Step 3: Clean Heat Exchanger
1. Power off machine
2. Access heat exchanger (usually rear panel)
3. Use compressed air to blow out debris
4. Check fan rotation - should be smooth

### Step 4: Verify Fix
1. Restart machine
2. Run at normal speed for 10 minutes
3. Monitor temperature trend
4. Should stabilize below 35°C

## Prevention

- Weekly: Check coolant level
- Monthly: Clean heat exchanger
- Quarterly: Replace coolant filters
- Annually: Full coolant change

## When to Escalate

Contact maintenance if:
- Temperature exceeds 45°C
- Coolant is contaminated (milky/foamy)
- Unusual noises from cooling system
- Temperature fluctuates rapidly

## Related Articles
- [Coolant Maintenance Best Practices](#)
- [CNC Preventive Maintenance Schedule](#)
- [Understanding Temperature Sensors](#)
      `,
      lastUpdated: new Date(),
      author: 'Maintenance Team',
      helpful: 45,
      notHelpful: 2
    });

    // Best practices articles
    this.addArticle({
      id: 'bp-001',
      title: 'Best Practices for Shift Changeover',
      category: 'Best Practices',
      tags: ['shift', 'changeover', 'communication', 'handover'],
      content: `
# Best Practices for Shift Changeover

## Overview

Effective shift changeover is critical for maintaining production continuity and preventing issues from being missed or duplicated.

## Pre-Changeover (15 minutes before)

### Outgoing Shift Responsibilities

1. **Update Production Status**
   - Log final production counts
   - Note any quality issues
   - Update WIP inventory

2. **Document Equipment Status**
   - List any equipment with issues
   - Note any abnormal conditions
   - Update maintenance performed

3. **Prepare Handover Notes**
   - Use standardized format
   - Be specific about issues
   - Include any pending actions

## During Changeover

### Face-to-Face Briefing (5-10 minutes)

1. **Production Review**
   - Actual vs. target
   - Quality metrics
   - Any delays or issues

2. **Equipment Status**
   - Walk through active alerts
   - Discuss any concerning trends
   - Review temporary fixes

3. **Priority Actions**
   - What needs immediate attention
   - Scheduled activities coming up
   - Any safety concerns

### Documentation

Use the shift handover form:

\`\`\`
SHIFT HANDOVER FORM
Date: _______  Shift: From _____ To _____
Outgoing Supervisor: _______  Incoming Supervisor: _______

PRODUCTION SUMMARY
Target: _____  Actual: _____  Variance: _____
Quality Issues: _____  Scrap: _____

EQUIPMENT STATUS
[ ] All equipment normal
Equipment with issues:
- ________________
- ________________

ACTIVE ALERTS
Critical: ___  High: ___  Medium: ___  Low: ___

PENDING ACTIONS
1. ________________
2. ________________

SPECIAL NOTES
_________________________________
_________________________________

Signatures:
Outgoing: _______  Incoming: _______
\`\`\`

## Post-Changeover

### Incoming Shift (First 30 minutes)

1. **Verify Status**
   - Walk the floor
   - Check all equipment
   - Talk to operators

2. **Review Systems**
   - Check alert dashboard
   - Review production schedule
   - Verify material availability

3. **Set Priorities**
   - Address critical issues first
   - Plan preventive actions
   - Communicate with team

## Common Pitfalls to Avoid

1. **Rushing the Handover**
   - Always allow full time
   - Don't skip documentation
   - Ensure understanding

2. **Assuming Knowledge**
   - Explain unusual situations
   - Don't use unclear abbreviations
   - Confirm critical information

3. **Ignoring Small Issues**
   - Small problems become big ones
   - Document everything
   - Track recurring issues

## Digital Tools

### Shift Log Application
- Access at stations or mobile
- Auto-populated from system
- Requires confirmation of critical items

### Alert History
- Review last 24 hours
- Note any patterns
- Check acknowledgments

## Escalation

When to involve management:
- Safety incidents or near-misses
- Major equipment failures
- Significant production delays
- Quality issues affecting customers

## Success Metrics

Track handover effectiveness:
- Issues missed: Target < 1 per month
- Handover duration: 10-15 minutes
- Documentation completeness: 100%
- Follow-up actions completed: > 95%
      `,
      lastUpdated: new Date(),
      author: 'Operations Team',
      helpful: 67,
      notHelpful: 1
    });

    // Add more articles...
  }

  private addArticle(article: KnowledgeArticle) {
    this.articles.set(article.id, article);
  }

  private buildSearchIndex() {
    for (const [id, article] of this.articles) {
      // Index title words
      const titleWords = article.title.toLowerCase().split(/\s+/);
      titleWords.forEach(word => {
        if (!this.searchIndex.has(word)) {
          this.searchIndex.set(word, new Set());
        }
        this.searchIndex.get(word)!.add(id);
      });

      // Index tags
      article.tags.forEach(tag => {
        if (!this.searchIndex.has(tag)) {
          this.searchIndex.set(tag, new Set());
        }
        this.searchIndex.get(tag)!.add(id);
      });

      // Index content words (first 1000 characters)
      const contentWords = article.content
        .substring(0, 1000)
        .toLowerCase()
        .split(/\s+/)
        .filter(word => word.length > 3);
      
      contentWords.forEach(word => {
        if (!this.searchIndex.has(word)) {
          this.searchIndex.set(word, new Set());
        }
        this.searchIndex.get(word)!.add(id);
      });
    }
  }

  /**
   * Search knowledge base
   */
  search(query: string): KnowledgeArticle[] {
    const queryWords = query.toLowerCase().split(/\s+/);
    const articleScores = new Map<string, number>();

    // Score articles based on word matches
    queryWords.forEach(word => {
      const matchingArticles = this.searchIndex.get(word);
      if (matchingArticles) {
        matchingArticles.forEach(articleId => {
          const currentScore = articleScores.get(articleId) || 0;
          articleScores.set(articleId, currentScore + 1);
        });
      }
    });

    // Sort by score and return top results
    const sortedArticles = Array.from(articleScores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([id]) => this.articles.get(id)!)
      .filter(article => article !== undefined);

    return sortedArticles;
  }

  /**
   * Get article by ID
   */
  getArticle(id: string): KnowledgeArticle | undefined {
    return this.articles.get(id);
  }

  /**
   * Get articles by category
   */
  getByCategory(category: string): KnowledgeArticle[] {
    return Array.from(this.articles.values())
      .filter(article => article.category === category);
  }

  /**
   * Rate article helpfulness
   */
  rateArticle(id: string, helpful: boolean): void {
    const article = this.articles.get(id);
    if (article) {
      if (helpful) {
        article.helpful++;
      } else {
        article.notHelpful++;
      }
    }
  }
}

// =====================================================
// INTERFACES FOR TRAINING SYSTEM
// =====================================================

interface UserProgress {
  userId: string;
  moduleId: string;
  startedAt: Date;
  completedAt?: Date;
  currentContent: number;
  contentProgress: Array<{
    completed: boolean;
    score: number;
    completedAt?: Date;
  }>;
  quizAttempts: QuizResult[];
  quizPassed?: boolean;
  moduleCompleted?: boolean;
}

interface QuizResult {
  score: number;
  passed: boolean;
  results: Array<{
    question: string;
    userAnswer: number;
    correctAnswer: number;
    correct: boolean;
    explanation: string;
  }>;
  timestamp: Date;
}

// =====================================================
// MAIN DEMONSTRATION
// =====================================================

async function demonstrateDocumentationAndTraining() {
  console.log('📚 Documentation and Training System Demonstration\n');

  // 1. Generate documentation
  console.log('1️⃣ Generating Documentation');
  const docGenerator = new DocumentationGenerator();
  
  // Generate HTML docs
  await docGenerator.generateHTML('docs/html');
  console.log('   ✅ HTML documentation generated');
  
  // Generate PDF
  await docGenerator.generatePDF('docs/manufacturing-analytics-guide.pdf');
  console.log('   ✅ PDF documentation generated');
  
  // Generate OpenAPI spec
  const openApiSpec = docGenerator.generateOpenAPISpec();
  fs.writeFileSync('docs/openapi.json', JSON.stringify(openApiSpec, null, 2));
  console.log('   ✅ OpenAPI specification generated');

  // 2. Training system
  console.log('\n2️⃣ Training System Demo');
  const training = new TrainingSystem();
  
  // Get operator modules
  const operatorModules = training.getModulesForRole('operator');
  console.log(`   Found ${operatorModules.length} operator training modules`);
  
  // Simulate training progress
  const userId = 'user-123';
  const moduleId = 'operator-basics';
  
  await training.startModule(userId, moduleId);
  console.log('   ✅ Started training module');
  
  // Complete content
  await training.completeContent(userId, moduleId, 0, 100);
  await training.completeContent(userId, moduleId, 1, 95);
  console.log('   ✅ Completed training content');
  
  // Submit quiz
  const quizResult = await training.submitQuiz(userId, moduleId, [1, 1]);
  console.log(`   ✅ Quiz completed: ${quizResult.score}% (${quizResult.passed ? 'Passed' : 'Failed'})`);

  // 3. Knowledge base
  console.log('\n3️⃣ Knowledge Base Demo');
  const kb = new KnowledgeBase();
  
  // Search for articles
  const searchResults = kb.search('temperature cnc');
  console.log(`   Found ${searchResults.length} articles for "temperature cnc"`);
  
  if (searchResults.length > 0) {
    console.log(`   Top result: "${searchResults[0].title}"`);
    kb.rateArticle(searchResults[0].id, true);
    console.log('   ✅ Article rated as helpful');
  }

  console.log('\n✅ Documentation and training demonstration complete!');
}

// Run if executed directly
if (require.main === module) {
  demonstrateDocumentationAndTraining()
    .catch(console.error)
    .finally(() => process.exit(0));
}

export {
  DocumentationGenerator,
  TrainingSystem,
  KnowledgeBase,
  TrainingModule,
  KnowledgeArticle
};