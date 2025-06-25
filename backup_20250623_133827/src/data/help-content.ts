import { HelpTopic, HelpCategory, FAQ, Tutorial } from '@/types/help';

export const helpCategories: HelpCategory[] = [
  {
    id: 'getting-started',
    name: 'Getting Started',
    description: 'Learn the basics of the platform',
    icon: 'Home',
    order: 1,
    subcategories: [
      {
        id: 'first-steps',
        name: 'First Steps',
        description: 'Your journey begins here',
        icon: 'Play',
        order: 1
      },
      {
        id: 'navigation',
        name: 'Navigation',
        description: 'Finding your way around',
        icon: 'Compass',
        order: 2
      },
      {
        id: 'concepts',
        name: 'Key Concepts',
        description: 'Understanding the platform',
        icon: 'Book',
        order: 3
      }
    ]
  },
  {
    id: 'dashboards',
    name: 'Dashboards',
    description: 'Create and manage dashboards',
    icon: 'BarChart3',
    order: 2,
    subcategories: [
      {
        id: 'creating-dashboards',
        name: 'Creating Dashboards',
        description: 'Build your first dashboard',
        icon: 'Plus',
        order: 1
      },
      {
        id: 'panel-types',
        name: 'Panel Types',
        description: 'Available visualization options',
        icon: 'Grid',
        order: 2
      },
      {
        id: 'variables',
        name: 'Variables',
        description: 'Dynamic dashboard content',
        icon: 'Variable',
        order: 3
      },
      {
        id: 'sharing',
        name: 'Sharing',
        description: 'Share and export dashboards',
        icon: 'Share',
        order: 4
      }
    ]
  },
  {
    id: 'manufacturing',
    name: 'Manufacturing Analytics',
    description: 'Manufacturing-specific features',
    icon: 'Factory',
    order: 3,
    subcategories: [
      {
        id: 'oee',
        name: 'OEE Monitoring',
        description: 'Overall Equipment Effectiveness',
        icon: 'Gauge',
        order: 1
      },
      {
        id: 'production',
        name: 'Production Metrics',
        description: 'Track production performance',
        icon: 'TrendingUp',
        order: 2
      },
      {
        id: 'quality',
        name: 'Quality Management',
        description: 'Monitor quality metrics',
        icon: 'CheckCircle',
        order: 3
      }
    ]
  },
  {
    id: 'alerts',
    name: 'Alerts & Monitoring',
    description: 'Set up alerts and notifications',
    icon: 'AlertCircle',
    order: 4,
    subcategories: [
      {
        id: 'alert-rules',
        name: 'Alert Rules',
        description: 'Define alert conditions',
        icon: 'Bell',
        order: 1
      },
      {
        id: 'notification-channels',
        name: 'Notification Channels',
        description: 'Configure alert destinations',
        icon: 'Mail',
        order: 2
      }
    ]
  },
  {
    id: 'data-sources',
    name: 'Data Sources',
    description: 'Connect to your data',
    icon: 'Database',
    order: 5
  },
  {
    id: 'administration',
    name: 'Administration',
    description: 'Manage users and settings',
    icon: 'Settings',
    order: 6
  },
  {
    id: 'api',
    name: 'API & Development',
    description: 'Integrate and extend the platform',
    icon: 'Code',
    order: 7
  }
];

export const helpTopics: HelpTopic[] = [
  {
    id: 'platform-overview',
    title: 'Platform Overview',
    category: helpCategories[0],
    content: `
# Platform Overview

Welcome to the Manufacturing AnalyticsPlatform, a comprehensive solution for monitoring, analyzing, and optimizing your manufacturing operations.

## Key Features

### Real-time Monitoring
- Live data visualization from your production floor
- Instant alerts for critical events
- Performance metrics at your fingertips

### Advanced Analytics
- Historical trend analysis
- Predictive maintenance insights
- Quality control analytics
- Production optimization recommendations

### Manufacturing Intelligence
- OEE (Overall Equipment Effectiveness) tracking
- Production efficiency metrics
- Quality management dashboards
- Energy consumption monitoring

## Getting Started

1. **Set up data sources**: Connect your manufacturing systems
2. **Create dashboards**: Build custom views of your data
3. **Configure alerts**: Get notified of important events
4. **Analyze trends**: Use our tools to gain insights

## Architecture

The platform is built on a modern, scalable architecture:
- **Frontend**: React/Next.js for responsive UI
- **Backend**: Node.js API with TypeScript
- **Database**: PostgreSQL with TimescaleDB for time-series data
- **Real-time**: WebSocket connections for live updates
- **AI/ML**: Integrated machine learning for predictive analytics
`,
    tags: ['overview', 'introduction', 'getting-started'],
    relatedTopics: ['first-steps', 'navigation'],
    lastUpdated: new Date('2024-01-20')
  },
  {
    id: 'creating-first-dashboard',
    title: 'Creating Your First Dashboard',
    category: helpCategories[1],
    content: `
# Creating Your First Dashboard

Dashboards are the primary way to visualize and monitor your manufacturing data. This guide will walk you through creating your first dashboard.

## Step 1: Access Dashboard Creation

1. Navigate to **Dashboards** in the main menu
2. Click the **New Dashboard** button
3. Choose between:
   - **Blank Dashboard**: Start from scratch
   - **Template**: Use a pre-built template
   - **Import**: Import an existing dashboard

## Step 2: Add Your First Panel

1. Click **Add Panel** in the empty dashboard
2. Select a data source (e.g., your production database)
3. Choose a visualization type:
   - **Time Series**: For metrics over time
   - **Gauge**: For current values
   - **Stat**: For single statistics
   - **Table**: For tabular data

## Step 3: Configure Your Query

\`\`\`sql
-- Example: Query for production output
SELECT 
  time,
  machine_id,
  parts_produced
FROM production_metrics
WHERE time > now() - interval '24 hours'
\`\`\`

## Step 4: Customize Visualization

- **Title**: Give your panel a descriptive name
- **Legend**: Configure how series are displayed
- **Axes**: Set up scales and units
- **Thresholds**: Define color-coded ranges

## Step 5: Save Your Dashboard

1. Click **Save** in the top toolbar
2. Enter a dashboard name
3. Choose a folder (optional)
4. Add tags for easy discovery

## Best Practices

- **Organize panels logically**: Group related metrics
- **Use consistent time ranges**: Align panels for comparison
- **Add descriptions**: Help others understand your dashboard
- **Set up variables**: Make dashboards dynamic and reusable
`,
    tags: ['dashboard', 'tutorial', 'beginner'],
    relatedTopics: ['panel-types', 'variables'],
    examples: [
      {
        title: 'Basic Production Dashboard',
        description: 'A simple dashboard showing production metrics',
        code: `{
  "title": "Production Overview",
  "panels": [
    {
      "type": "timeseries",
      "title": "Hourly Production",
      "gridPos": { "x": 0, "y": 0, "w": 12, "h": 8 }
    },
    {
      "type": "gauge",
      "title": "Current OEE",
      "gridPos": { "x": 12, "y": 0, "w": 6, "h": 8 }
    }
  ]
}`
      }
    ],
    lastUpdated: new Date('2024-01-18')
  },
  {
    id: 'oee-monitoring',
    title: 'OEE Monitoring Guide',
    category: helpCategories[2],
    content: `
# OEE Monitoring Guide

Overall Equipment Effectiveness (OEE) is a crucial metric for manufacturing operations. This guide explains how to set up and use OEE monitoring in the platform.

## Understanding OEE

OEE = Availability × Performance × Quality

- **Availability**: Actual runtime vs planned production time
- **Performance**: Actual output vs theoretical maximum
- **Quality**: Good parts vs total parts produced

## Setting Up OEE Monitoring

### 1. Configure Equipment

Define your equipment in the system:
- Machine ID and name
- Theoretical maximum speed
- Planned production time
- Target quality rate

### 2. Connect Data Sources

Ensure these data points are available:
- Machine status (running/stopped)
- Parts produced count
- Quality inspection results
- Downtime reasons

### 3. Create OEE Dashboard

Use our OEE template or build custom visualizations:

\`\`\`typescript
// OEE Calculation Example
const calculateOEE = (data) => {
  const availability = data.runTime / data.plannedTime;
  const performance = data.actualOutput / data.theoreticalOutput;
  const quality = data.goodParts / data.totalParts;
  
  return {
    oee: availability * performance * quality * 100,
    availability: availability * 100,
    performance: performance * 100,
    quality: quality * 100
  };
};
\`\`\`

## Interpreting OEE Results

- **World-class OEE**: 85% or higher
- **Typical OEE**: 60%
- **Low OEE**: Below 40% (significant improvement needed)

## Common Issues and Solutions

### Low Availability
- Excessive changeovers
- Unplanned downtime
- Material shortages

### Low Performance
- Reduced speeds
- Minor stops
- Operator inefficiency

### Low Quality
- Process variations
- Material defects
- Equipment wear

## Advanced Features

- **Real-time OEE tracking**: Monitor live performance
- **Historical analysis**: Identify trends and patterns
- **Predictive alerts**: Anticipate OEE drops
- **Benchmarking**: Compare across machines/plants
`,
    tags: ['oee', 'manufacturing', 'metrics', 'monitoring'],
    relatedTopics: ['production-metrics', 'quality-management'],
    lastUpdated: new Date('2024-01-15')
  }
];

export const faqs: FAQ[] = [
  {
    id: 'faq-1',
    question: 'How do I create my first dashboard?',
    answer: 'Navigate to Dashboards → New Dashboard, then click Add Panel to start building your visualization. You can choose from various panel types and data sources.',
    category: 'dashboards',
    tags: ['beginner', 'dashboard'],
    helpful: 127,
    notHelpful: 5
  },
  {
    id: 'faq-2',
    question: 'What data sources are supported?',
    answer: 'We support PostgreSQL, MySQL, InfluxDB, Prometheus, Elasticsearch, and many industrial protocols like OPC-UA, MQTT, and Modbus through our connector system.',
    category: 'data-sources',
    tags: ['data', 'integration'],
    helpful: 98,
    notHelpful: 7
  },
  {
    id: 'faq-3',
    question: 'How do I set up email notifications for alerts?',
    answer: 'Go to Alerting → Contact Points, create a new email contact point with your SMTP settings, then use it in your alert rules. You can test the configuration before saving.',
    category: 'alerts',
    tags: ['alerts', 'email', 'notifications'],
    helpful: 156,
    notHelpful: 12
  },
  {
    id: 'faq-4',
    question: 'Can I share dashboards with external users?',
    answer: 'Yes! You can share dashboards via public links, embed them in other applications, or export them as PDFs. Go to your dashboard and click the Share button for options.',
    category: 'dashboards',
    tags: ['sharing', 'collaboration'],
    helpful: 89,
    notHelpful: 3
  },
  {
    id: 'faq-5',
    question: 'How do I calculate OEE automatically?',
    answer: 'The platform includes built-in OEE calculation. Connect your machine data (runtime, output, quality) and use the OEE panel type. You can also create custom calculations using our query editor.',
    category: 'manufacturing',
    tags: ['oee', 'calculations', 'automation'],
    helpful: 203,
    notHelpful: 8
  },
  {
    id: 'faq-6',
    question: 'What is the data retention policy?',
    answer: 'By default, raw data is retained for 30 days and aggregated data for 1 year. You can customize retention policies in Settings → Data Management based on your subscription.',
    category: 'administration',
    tags: ['data', 'storage', 'retention'],
    helpful: 67,
    notHelpful: 4
  }
];

export const tutorials: Tutorial[] = [
  {
    id: 'platform-onboarding',
    title: 'Platform Onboarding',
    description: 'Get familiar with the platform interface and key features',
    category: 'getting-started',
    difficulty: 'beginner',
    estimatedTime: 10,
    steps: [
      {
        id: 'welcome',
        title: 'Welcome to Manufacturing Analytics',
        description: 'This tutorial will guide you through the platform basics. Let\'s start by exploring the navigation menu.',
        targetElement: '.navigation-menu',
        position: { placement: 'right' },
        hints: ['The navigation menu is your gateway to all platform features']
      },
      {
        id: 'dashboards-menu',
        title: 'Dashboards Section',
        description: 'This is where you\'ll find all your dashboards. Click on Dashboards to explore.',
        targetElement: 'a[href="/dashboards"]',
        position: { placement: 'right' },
        action: { type: 'click' }
      },
      {
        id: 'create-dashboard',
        title: 'Creating Dashboards',
        description: 'Click the "New Dashboard" button to create your first dashboard.',
        targetElement: 'button[data-testid="new-dashboard"]',
        position: { placement: 'bottom' },
        hints: ['You can also import existing dashboards or use templates']
      },
      {
        id: 'help-system',
        title: 'Getting Help',
        description: 'Remember, help is always available. Click the help button or press "?" anytime.',
        targetElement: '.help-button',
        position: { placement: 'bottom' },
        skipAllowed: false
      }
    ]
  },
  {
    id: 'create-production-dashboard',
    title: 'Create a Production Dashboard',
    description: 'Build a dashboard to monitor your production metrics',
    category: 'dashboards',
    difficulty: 'intermediate',
    estimatedTime: 15,
    prerequisites: ['platform-onboarding'],
    steps: [
      {
        id: 'new-dashboard',
        title: 'Start with a New Dashboard',
        description: 'Click on "New Dashboard" to begin creating your production monitoring dashboard.',
        targetElement: 'button[data-testid="new-dashboard"]',
        action: { type: 'click' }
      },
      {
        id: 'add-panel',
        title: 'Add Your First Panel',
        description: 'Click "Add Panel" to create a visualization for your production data.',
        targetElement: 'button[data-testid="add-panel"]',
        action: { type: 'click' }
      },
      {
        id: 'select-datasource',
        title: 'Choose Data Source',
        description: 'Select your production database from the data source dropdown.',
        targetElement: 'select[data-testid="datasource-picker"]',
        hints: ['If you don\'t see your data source, you may need to configure it first']
      },
      {
        id: 'configure-query',
        title: 'Configure Your Query',
        description: 'Write or select a query to fetch your production metrics. Try selecting "Production Output" from the metric dropdown.',
        targetElement: '.query-editor',
        position: { placement: 'left' }
      },
      {
        id: 'choose-visualization',
        title: 'Select Visualization Type',
        description: 'Choose "Time Series" to show production trends over time.',
        targetElement: '.visualization-picker',
        position: { placement: 'left' }
      },
      {
        id: 'save-panel',
        title: 'Save Your Panel',
        description: 'Click "Apply" to save your panel configuration.',
        targetElement: 'button[data-testid="panel-apply"]',
        action: { type: 'click' }
      },
      {
        id: 'save-dashboard',
        title: 'Save Dashboard',
        description: 'Finally, save your dashboard with a descriptive name like "Production Overview".',
        targetElement: 'button[data-testid="save-dashboard"]',
        action: { type: 'click' },
        skipAllowed: false
      }
    ]
  }
];

// Helper function to search help content
export function searchHelpContent(query: string): HelpTopic[] {
  const searchTerm = query.toLowerCase();
  
  return helpTopics.filter(topic => 
    topic.title.toLowerCase().includes(searchTerm) ||
    topic.content.toLowerCase().includes(searchTerm) ||
    topic.tags.some(tag => tag.toLowerCase().includes(searchTerm))
  );
}

// Helper function to get topics by category
export function getTopicsByCategory(categoryId: string): HelpTopic[] {
  return helpTopics.filter(topic => 
    topic.category.id === categoryId ||
    topic.category.parentId === categoryId
  );
}

// Helper function to get related topics
export function getRelatedTopics(topicId: string): HelpTopic[] {
  const topic = helpTopics.find(t => t.id === topicId);
  if (!topic || !topic.relatedTopics) return [];
  
  return topic.relatedTopics
    .map(id => helpTopics.find(t => t.id === id))
    .filter(Boolean) as HelpTopic[];
}