'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  X, Search, Book, Video, Code, FileQuestion, 
  MessageCircle, KeyboardIcon, ChevronRight, ChevronDown,
  Home, AlertCircle, BarChart3, Settings, Users, Database,
  Clock, Star, ExternalLink, Copy, Check, ArrowLeft
} from 'lucide-react';
import { HelpTopic, HelpCategory, HelpSearchResult, FAQ, DocumentationPage } from '@/types/help';
import { useDebounce } from '@/hooks/useDebounce';

interface HelpCenterProps {
  isOpen: boolean;
  onClose: () => void;
  initialTopic?: string;
  position?: 'modal' | 'sidebar';
}

export function HelpCenter({ 
  isOpen, 
  onClose, 
  initialTopic,
  position = 'modal' 
}: HelpCenterProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<HelpTopic | null>(null);
  const [searchResults, setSearchResults] = useState<HelpSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['getting-started']));

  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Sample help categories
  const helpCategories: HelpCategory[] = useMemo(() => [
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
        }
      ]
    },
    {
      id: 'alerts',
      name: 'Alerts & Monitoring',
      description: 'Set up alerts and notifications',
      icon: 'AlertCircle',
      order: 3
    },
    {
      id: 'data-sources',
      name: 'Data Sources',
      description: 'Connect to your data',
      icon: 'Database',
      order: 4
    },
    {
      id: 'administration',
      name: 'Administration',
      description: 'Manage users and settings',
      icon: 'Settings',
      order: 5
    },
    {
      id: 'api',
      name: 'API & Development',
      description: 'Integrate and extend the platform',
      icon: 'Code',
      order: 6
    }
  ], []);

  // Sample help topics
  const helpTopics: HelpTopic[] = useMemo(() => [
    {
      id: 'intro-to-dashboards',
      title: 'Introduction to Dashboards',
      category: helpCategories[1],
      content: `
# Introduction to Dashboards

Dashboards are the heart of your monitoring and analytics workflow. They provide a visual representation of your data through various panels and visualizations.

## What is a Dashboard?

A dashboard is a collection of panels arranged on a grid that display your data in real-time. Each panel can show different metrics, logs, or other data visualizations.

## Key Features

- **Real-time Updates**: Data refreshes automatically based on your configured intervals
- **Interactive Panels**: Click, zoom, and explore your data
- **Templating**: Use variables to create dynamic, reusable dashboards
- **Sharing**: Share dashboards with your team or embed them in other applications

## Getting Started

1. Navigate to **Dashboards** → **New Dashboard**
2. Click **Add Panel** to create your first visualization
3. Select a data source and configure your query
4. Choose a visualization type that best represents your data
5. Save your dashboard with a meaningful name

## Best Practices

- Keep dashboards focused on specific use cases
- Use consistent time ranges across panels
- Add descriptions to panels for better understanding
- Organize related panels into rows
- Use variables for flexible filtering
      `,
      tags: ['dashboard', 'beginner', 'visualization'],
      relatedTopics: ['creating-dashboards', 'panel-types'],
      examples: [
        {
          title: 'Simple Time Series Dashboard',
          description: 'Create a basic dashboard showing metrics over time',
          code: `{
  "panels": [{
    "type": "timeseries",
    "title": "CPU Usage",
    "datasource": "prometheus",
    "targets": [{
      "expr": "avg(cpu_usage)"
    }]
  }]
}`
        }
      ],
      lastUpdated: new Date('2024-01-15')
    },
    {
      id: 'creating-alerts',
      title: 'Creating Alert Rules',
      category: helpCategories[2],
      content: `
# Creating Alert Rules

Alert rules help you proactively monitor your systems and get notified when something requires attention.

## Understanding Alert Rules

Alert rules continuously evaluate queries against your data sources and trigger notifications when certain conditions are met.

## Creating Your First Alert

1. Go to **Alerting** → **Alert Rules**
2. Click **New Alert Rule**
3. Configure the rule:
   - **Name**: Give your alert a descriptive name
   - **Query**: Define what data to monitor
   - **Conditions**: Set thresholds and evaluation criteria
   - **Labels**: Add metadata for routing and filtering

## Alert States

- **Normal**: Everything is within expected parameters
- **Pending**: Condition is met but waiting for duration threshold
- **Alerting**: Alert is actively firing
- **NoData**: No data received from the query
- **Error**: Problem evaluating the alert rule

## Notification Channels

Configure where alerts should be sent:
- Email
- Slack
- PagerDuty
- Webhooks
- Custom integrations
      `,
      tags: ['alerts', 'monitoring', 'notifications'],
      relatedTopics: ['notification-channels', 'alert-routing'],
      lastUpdated: new Date('2024-01-10')
    }
  ], [helpCategories]);

  // Sample FAQs
  const faqs: FAQ[] = useMemo(() => [
    {
      id: 'faq-1',
      question: 'How do I create my first dashboard?',
      answer: 'Navigate to Dashboards → New Dashboard, then click Add Panel to start building your visualization.',
      category: 'dashboards',
      tags: ['beginner', 'dashboard'],
      helpful: 45,
      notHelpful: 2
    },
    {
      id: 'faq-2',
      question: 'What data sources are supported?',
      answer: 'We support Prometheus, PostgreSQL, MySQL, InfluxDB, Elasticsearch, and many more through our plugin system.',
      category: 'data-sources',
      tags: ['data', 'integration'],
      helpful: 38,
      notHelpful: 5
    },
    {
      id: 'faq-3',
      question: 'How do I set up email notifications for alerts?',
      answer: 'Go to Alerting → Contact Points, create a new email contact point with your SMTP settings, then use it in your alert rules.',
      category: 'alerts',
      tags: ['alerts', 'email', 'notifications'],
      helpful: 52,
      notHelpful: 3
    }
  ], []);

  // Search functionality
  useEffect(() => {
    if (!debouncedSearchQuery) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    
    // Simulate search
    const results: HelpSearchResult[] = [];
    const query = debouncedSearchQuery.toLowerCase();

    // Search topics
    helpTopics.forEach(topic => {
      let score = 0;
      const highlights: string[] = [];

      if (topic.title.toLowerCase().includes(query)) {
        score += 10;
        highlights.push(topic.title);
      }

      if (topic.content.toLowerCase().includes(query)) {
        score += 5;
        // Extract relevant snippet
        const index = topic.content.toLowerCase().indexOf(query);
        const start = Math.max(0, index - 50);
        const end = Math.min(topic.content.length, index + 100);
        highlights.push('...' + topic.content.substring(start, end) + '...');
      }

      topic.tags.forEach(tag => {
        if (tag.toLowerCase().includes(query)) {
          score += 3;
        }
      });

      if (score > 0) {
        results.push({ topic, score, highlights });
      }
    });

    // Sort by score
    results.sort((a, b) => b.score - a.score);
    setSearchResults(results.slice(0, 10));
    setIsSearching(false);
  }, [debouncedSearchQuery, helpTopics]);

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (error) {
      console.error('Failed to copy code:', error);
    }
  };

  const renderIcon = (iconName: string) => {
    const icons: { [key: string]: any } = {
      Home, AlertCircle, BarChart3, Settings, Users, Database,
      Code, FileQuestion, MessageCircle, KeyboardIcon
    };
    const Icon = icons[iconName] || FileQuestion;
    return <Icon className="h-5 w-5" />;
  };

  const renderCategory = (category: HelpCategory, level = 0) => {
    const hasSubcategories = category.subcategories && category.subcategories.length > 0;
    const isExpanded = expandedCategories.has(category.id);

    return (
      <div key={category.id} className="mb-1">
        <button
          onClick={() => {
            if (hasSubcategories) {
              toggleCategory(category.id);
            } else {
              setSelectedCategory(category.id);
              setSelectedTopic(null);
            }
          }}
          className={`
            w-full flex items-center px-3 py-2 text-sm rounded-md transition-colors
            ${selectedCategory === category.id
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
              : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
            }
          `}
          style={{ paddingLeft: `${12 + level * 16}px` }}
        >
          {hasSubcategories && (
            <div className="mr-1">
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </div>
          )}
          {renderIcon(category.icon)}
          <span className="ml-2 flex-1 text-left">{category.name}</span>
        </button>
        
        {hasSubcategories && isExpanded && (
          <div className="ml-2">
            {category.subcategories!.map(sub => renderCategory(sub, level + 1))}
          </div>
        )}
      </div>
    );
  };

  const renderContent = () => {
    if (selectedTopic) {
      return (
        <div className="p-6">
          <button
            onClick={() => setSelectedTopic(null)}
            className="flex items-center text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to topics
          </button>
          
          <article className="prose prose-sm dark:prose-invert max-w-none">
            <h1 className="text-2xl font-bold mb-4">{selectedTopic.title}</h1>
            
            <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-6">
              <span className="flex items-center">
                <Clock className="h-4 w-4 mr-1" />
                Updated {selectedTopic.lastUpdated.toLocaleDateString()}
              </span>
              {selectedTopic.version && (
                <span>Version {selectedTopic.version}</span>
              )}
            </div>

            <div 
              className="markdown-content"
              dangerouslySetInnerHTML={{ 
                __html: selectedTopic.content.replace(/\n/g, '<br />') 
              }} 
            />

            {selectedTopic.examples && selectedTopic.examples.length > 0 && (
              <div className="mt-8">
                <h2 className="text-lg font-semibold mb-4">Examples</h2>
                {selectedTopic.examples.map((example, index) => (
                  <div key={index} className="mb-6 bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                    <h3 className="font-medium mb-2">{example.title}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                      {example.description}
                    </p>
                    {example.code && (
                      <div className="relative">
                        <pre className="bg-gray-900 text-gray-100 p-4 rounded-md overflow-x-auto">
                          <code>{example.code}</code>
                        </pre>
                        <button
                          onClick={() => copyCode(example.code!)}
                          className="absolute top-2 right-2 p-2 bg-gray-800 hover:bg-gray-700 rounded-md transition-colors"
                        >
                          {copiedCode === example.code ? (
                            <Check className="h-4 w-4 text-green-400" />
                          ) : (
                            <Copy className="h-4 w-4 text-gray-400" />
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {selectedTopic.relatedTopics && selectedTopic.relatedTopics.length > 0 && (
              <div className="mt-8 border-t pt-6">
                <h2 className="text-lg font-semibold mb-4">Related Topics</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {selectedTopic.relatedTopics.map(topicId => {
                    const topic = helpTopics.find(t => t.id === topicId);
                    if (!topic) return null;
                    return (
                      <button
                        key={topicId}
                        onClick={() => setSelectedTopic(topic)}
                        className="flex items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
                      >
                        <ExternalLink className="h-4 w-4 mr-2 text-gray-400" />
                        <span className="text-sm font-medium">{topic.title}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </article>
        </div>
      );
    }

    if (searchQuery && searchResults.length > 0) {
      return (
        <div className="p-6">
          <h2 className="text-lg font-semibold mb-4">
            Search Results ({searchResults.length})
          </h2>
          <div className="space-y-4">
            {searchResults.map(result => (
              <button
                key={result.topic.id}
                onClick={() => {
                  setSelectedTopic(result.topic);
                  setSearchQuery('');
                }}
                className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
              >
                <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-1">
                  {result.topic.title}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                  {result.highlights[0]}
                </p>
                <div className="flex gap-2 mt-2">
                  {result.topic.tags.slice(0, 3).map(tag => (
                    <span
                      key={tag}
                      className="px-2 py-1 bg-gray-200 dark:bg-gray-700 text-xs rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </button>
            ))}
          </div>
        </div>
      );
    }

    if (selectedCategory) {
      const categoryTopics = helpTopics.filter(
        topic => topic.category.id === selectedCategory
      );

      return (
        <div className="p-6">
          <h2 className="text-lg font-semibold mb-4">
            {helpCategories.find(c => c.id === selectedCategory)?.name}
          </h2>
          <div className="space-y-3">
            {categoryTopics.map(topic => (
              <button
                key={topic.id}
                onClick={() => setSelectedTopic(topic)}
                className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
              >
                <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-1">
                  {topic.title}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {topic.content.substring(0, 150)}...
                </p>
              </button>
            ))}
          </div>
        </div>
      );
    }

    // Default view - Quick Start and FAQs
    return (
      <div className="p-6">
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4">Quick Start</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => {
                const topic = helpTopics.find(t => t.id === 'intro-to-dashboards');
                if (topic) setSelectedTopic(topic);
              }}
              className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors text-left"
            >
              <BarChart3 className="h-8 w-8 text-blue-600 dark:text-blue-400 mb-2" />
              <h3 className="font-medium mb-1">Create Your First Dashboard</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Learn how to build powerful visualizations
              </p>
            </button>

            <button
              onClick={() => {
                const topic = helpTopics.find(t => t.id === 'creating-alerts');
                if (topic) setSelectedTopic(topic);
              }}
              className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors text-left"
            >
              <AlertCircle className="h-8 w-8 text-green-600 dark:text-green-400 mb-2" />
              <h3 className="font-medium mb-1">Set Up Alerts</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Get notified when something needs attention
              </p>
            </button>
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-4">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {faqs.slice(0, 5).map(faq => (
              <div
                key={faq.id}
                className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
              >
                <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
                  {faq.question}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {faq.answer}
                </p>
                <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                  <button className="flex items-center hover:text-gray-700 dark:hover:text-gray-300">
                    <Star className="h-3 w-3 mr-1" />
                    Helpful ({faq.helpful})
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  if (!isOpen) return null;

  const content = (
    <div className={`
      ${position === 'modal' 
        ? 'fixed inset-0 z-50 overflow-hidden' 
        : 'fixed right-0 top-0 h-full w-96 z-50'
      }
    `}>
      {position === 'modal' && (
        <div 
          className="absolute inset-0 bg-gray-500 bg-opacity-75 transition-opacity" 
          onClick={onClose} 
        />
      )}
      
      <div className={`
        ${position === 'modal'
          ? 'absolute inset-4 md:inset-8 lg:inset-12 bg-white dark:bg-gray-900 rounded-lg shadow-xl flex flex-col max-w-6xl mx-auto'
          : 'h-full bg-white dark:bg-gray-900 shadow-xl flex flex-col'
        }
      `}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Help Center
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Find answers and learn how to use the platform
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for help..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100"
            />
            {isSearching && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900 dark:border-gray-100"></div>
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar */}
          <div className="w-64 border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
            <nav className="p-4">
              <div className="space-y-1">
                {helpCategories.map(category => renderCategory(category))}
              </div>
              
              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <button className="w-full flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 rounded-md">
                  <KeyboardIcon className="h-5 w-5 mr-2" />
                  Keyboard Shortcuts
                </button>
                <button className="w-full flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 rounded-md">
                  <Video className="h-5 w-5 mr-2" />
                  Video Tutorials
                </button>
                <button className="w-full flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 rounded-md">
                  <MessageCircle className="h-5 w-5 mr-2" />
                  Community Support
                </button>
              </div>
            </nav>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto">
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );

  return content;
}