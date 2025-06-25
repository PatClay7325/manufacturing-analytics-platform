// Help and Documentation System Types

export interface HelpTopic {
  id: string;
  title: string;
  category: HelpCategory;
  content: string;
  tags: string[];
  relatedTopics?: string[];
  examples?: HelpExample[];
  videoUrl?: string;
  lastUpdated: Date;
  version?: string;
}

export interface HelpCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  order: number;
  subcategories?: HelpCategory[];
  parentId?: string;
}

export interface HelpExample {
  title: string;
  description: string;
  code?: string;
  screenshot?: string;
  interactive?: boolean;
}

export interface HelpSearchResult {
  topic: HelpTopic;
  score: number;
  highlights: string[];
}

export interface Tutorial {
  id: string;
  title: string;
  description: string;
  steps: TutorialStep[];
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime: number; // in minutes
  prerequisites?: string[];
  completionCriteria?: CompletionCriteria[];
}

export interface TutorialStep {
  id: string;
  title: string;
  description: string;
  targetElement?: string; // CSS selector or element ID
  position?: TooltipPosition;
  action?: TutorialAction;
  validation?: StepValidation;
  hints?: string[];
  skipAllowed?: boolean;
}

export interface TutorialAction {
  type: 'click' | 'input' | 'select' | 'navigate' | 'custom';
  target?: string;
  value?: any;
  customHandler?: () => void;
}

export interface StepValidation {
  type: 'element-exists' | 'value-matches' | 'custom';
  target?: string;
  expectedValue?: any;
  customValidator?: () => boolean;
}

export interface CompletionCriteria {
  id: string;
  description: string;
  required: boolean;
  validator: () => boolean;
}

export interface TooltipPosition {
  placement: 'top' | 'right' | 'bottom' | 'left' | 'auto';
  offset?: { x: number; y: number };
}

export interface UserProgress {
  userId: string;
  tutorialsCompleted: string[];
  tutorialsInProgress: { [tutorialId: string]: number }; // step index
  achievements: Achievement[];
  lastAccessed: Date;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlockedAt: Date;
}

export interface ContextualHelp {
  componentId: string;
  title: string;
  content: string;
  learnMoreUrl?: string;
  relatedTopics?: string[];
  examples?: HelpExample[];
}

export interface HelpConfig {
  enableTooltips: boolean;
  enableTutorials: boolean;
  enableKeyboardShortcuts: boolean;
  defaultHelpPosition: TooltipPosition;
  searchDebounceMs: number;
  maxSearchResults: number;
}

export interface KeyboardShortcut {
  id: string;
  key: string;
  modifiers?: ('ctrl' | 'alt' | 'shift' | 'meta')[];
  description: string;
  category: string;
  action: () => void;
  enabled?: boolean;
}

export interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
  tags: string[];
  helpful: number;
  notHelpful: number;
  relatedFAQs?: string[];
}

export interface DocumentationPage {
  id: string;
  title: string;
  slug: string;
  content: string;
  category: string;
  tags: string[];
  toc: TableOfContentsItem[];
  lastUpdated: Date;
  version?: string;
  contributors?: string[];
}

export interface TableOfContentsItem {
  id: string;
  title: string;
  level: number;
  children?: TableOfContentsItem[];
}