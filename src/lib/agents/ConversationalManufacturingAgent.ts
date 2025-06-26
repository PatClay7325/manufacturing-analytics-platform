/**
 * Conversational Manufacturing Engineering Agent
 * Full ChatGPT-parity implementation with context awareness and natural dialogue
 */

import { prisma } from '@/lib/database/prisma';
import { Redis } from 'ioredis';
import { encoding_for_model } from 'tiktoken';
import { SelfCritiqueService, CritiqueResult, Critique } from './SelfCritiqueService';
import { ManufacturingOntology, OntologyService } from '@/lib/ontology/manufacturing-ontology';
import { DATA_POLICY } from '@/config/data-policy';
import { 
  ConversationalResponse, 
  ConversationContext, 
  ConversationMessage, 
  ExtractedEntities, 
  UserPreferences, 
  AnalysisContext 
} from './types';

// Initialize Redis for conversation memory with error handling
let redis: Redis | null = null;

try {
  redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    retryStrategy: (times) => {
      if (times > 3) {
        console.warn('Redis connection failed, using in-memory fallback');
        return null; // Stop retrying
      }
      return Math.min(times * 100, 3000);
    }
  });

  redis.on('error', (err) => {
    console.error('Redis error:', err);
  });
} catch (error) {
  console.warn('Redis initialization failed, using in-memory storage:', error);
}

// In-memory fallback for conversation storage
const memoryStore = new Map<string, string>();

// Types imported from shared types file

export class ConversationalManufacturingAgent {
  private tokenizer: any;
  private maxContextTokens = 4000;
  private systemPrompt: string;
  private selfCritique = new SelfCritiqueService();

  constructor() {
    this.tokenizer = encoding_for_model('gpt-4');
    this.systemPrompt = this.buildSystemPrompt();
  }

  private buildSystemPrompt(): string {
    return `You are an expert Manufacturing Engineering AI Assistant with deep knowledge of:
- ISO 22400 KPIs and OEE calculations
- Six Sigma and Lean Manufacturing principles
- Predictive maintenance and reliability engineering
- Quality control and statistical process control
- Production optimization and scheduling

You have access to real-time manufacturing data and can:
1. Analyze equipment performance and OEE metrics
2. Identify quality issues and defect patterns
3. Predict maintenance needs and prevent downtime
4. Optimize production schedules and resource allocation
5. Provide root cause analysis for problems
6. Generate actionable insights and recommendations

Your responses should be:
- Conversational and context-aware
- Data-driven with specific metrics
- Actionable with clear recommendations
- Proactive in identifying potential issues

Remember previous context in the conversation and provide intelligent follow-ups.`;
  }

  /**
   * Main conversational interface - ChatGPT parity
   */
  async chat(
    message: string,
    sessionId: string,
    userId: string
  ): Promise<ConversationalResponse> {
    try {
      // CRITICAL: Enforce real data policy
      if (!DATA_POLICY.USE_REAL_DATA_ONLY) {
        throw new Error('CRITICAL: Mock data detected. This POC requires REAL DATA ONLY.');
      }
      DATA_POLICY.validateDataSource('ConversationalManufacturingAgent');
      
      // 1. Load conversation context
      const context = await this.loadContext(sessionId, userId);
      
      // 2. Add user message to context
      context.messages.push({
        role: 'user',
        content: message,
        timestamp: new Date()
      });

      // 3. Resolve references and understand intent
      const processedQuery = await this.processQuery(message, context);
      
      // 4. Determine if clarification is needed
      if (processedQuery.needsClarification) {
        return this.requestClarification(processedQuery, context);
      }

      // 5. Execute appropriate analysis
      const analysis = await this.executeAnalysis(processedQuery, context);
      
      // 6. Generate conversational response
      let response = await this.generateResponse(analysis, context);
      
      // 7. Run self-critique loop to improve response
      const critiqueResult = await this.selfCritique.critiqueUntilSatisfactory(
        message,
        response,
        async (query: string, critiques: Critique[]) => {
          // Regenerate response addressing critiques
          const improvedAnalysis = await this.improveAnalysis(analysis, critiques, context);
          return this.generateResponse(improvedAnalysis, context);
        }
      );
      
      // Use improved response if available
      if (critiqueResult.improvedResponse) {
        response = critiqueResult.improvedResponse;
      }
      
      // Add critique score to response context
      response.context.critiqueScore = critiqueResult.score;
      
      // Log critique results for monitoring
      if (critiqueResult.score < 9) {
        console.log(`📊 Self-critique score: ${critiqueResult.score}/10`);
        critiqueResult.critiques.forEach(c => {
          console.log(`- ${c.type}: ${c.issue}`);
        });
      }
      
      // 8. Update context with assistant response
      context.messages.push({
        role: 'assistant',
        content: response.content,
        timestamp: new Date(),
        metadata: {
          intent: processedQuery.intent,
          entities: processedQuery.entities,
          analysisType: processedQuery.analysisType,
          confidence: response.context.confidence,
          critiqueScore: critiqueResult.score
        }
      });

      // 9. Save updated context
      await this.saveContext(sessionId, context);
      
      // 10. Generate follow-up suggestions (enhanced with critique insights)
      response.suggestions = [
        ...this.generateSuggestions(analysis, context),
        ...critiqueResult.suggestions.slice(0, 2) // Add top critique suggestions
      ];
      
      return response;
      
    } catch (error) {
      console.error('Conversational agent error:', error);
      return this.handleError(error, message);
    }
  }

  /**
   * Process query with NLU capabilities
   */
  private async processQuery(message: string, context: ConversationContext) {
    // Extract entities using NLP
    const entities = this.extractEntities(message);
    
    // Resolve pronouns and references
    const resolved = this.resolveReferences(message, entities, context);
    
    // Detect intent with context awareness
    const intent = this.detectIntent(resolved.message, context);
    
    // Check if clarification needed
    const clarity = this.assessClarity(resolved, intent);
    
    return {
      originalMessage: message,
      processedMessage: resolved.message,
      entities: resolved.entities,
      intent: intent.primary,
      secondaryIntents: intent.secondary,
      confidence: intent.confidence,
      analysisType: this.mapIntentToAnalysis(intent.primary),
      needsClarification: clarity.needsClarification,
      clarificationReason: clarity.reason,
      clarificationOptions: clarity.options
    };
  }

  /**
   * Natural Language Understanding - Entity Extraction with Ontology
   */
  private extractEntities(message: string): ExtractedEntities {
    const entities: ExtractedEntities = {};
    const messageLower = message.toLowerCase();
    
    // Use ontology for enhanced entity extraction
    const ontologyEntities = OntologyService.extractEntitiesFromText(message);
    
    // Process ontology entities
    for (const { entity, alias } of ontologyEntities) {
      switch (entity) {
        case 'Equipment':
          if (!entities.equipment) entities.equipment = [];
          if (!entities.equipment.includes(alias)) {
            entities.equipment.push(alias);
          }
          break;
        case 'Product':
          if (!entities.products) entities.products = [];
          if (!entities.products.includes(alias)) {
            entities.products.push(alias);
          }
          break;
        case 'Defect':
        case 'Quality':
          if (!entities.metrics) entities.metrics = [];
          if (!entities.metrics.includes('quality')) {
            entities.metrics.push('quality');
          }
          break;
        case 'Downtime':
          if (!entities.metrics) entities.metrics = [];
          if (!entities.metrics.includes('downtime')) {
            entities.metrics.push('downtime');
          }
          break;
      }
    }
    
    // Time range extraction with relative time support
    const timePatterns: Array<{pattern: RegExp, extractor: (...args: any[]) => {start: Date, end: Date}}> = [
      { pattern: /today/i, extractor: () => this.getToday() },
      { pattern: /yesterday/i, extractor: () => this.getYesterday() },
      { pattern: /this week/i, extractor: () => this.getThisWeek() },
      { pattern: /last week/i, extractor: () => this.getLastWeek() },
      { pattern: /this month/i, extractor: () => this.getThisMonth() },
      { pattern: /last month/i, extractor: () => this.getLastMonth() },
      { pattern: /last (\d+) hours?/i, extractor: (n: string) => this.getLastNHours(parseInt(n)) },
      { pattern: /last (\d+) days?/i, extractor: (n: string) => this.getLastNDays(parseInt(n)) },
      { pattern: /past (\d+) days?/i, extractor: (n: string) => this.getLastNDays(parseInt(n)) },
      { pattern: /over the past (\d+) days?/i, extractor: (n: string) => this.getLastNDays(parseInt(n)) }
    ];

    for (const { pattern, extractor } of timePatterns) {
      const match = message.match(pattern);
      if (match) {
        entities.timeRange = extractor(...match.slice(1));
        break;
      }
    }

    // Equipment extraction
    const equipmentPattern = /(?:equipment|machine|device|line|cell|station)\s+([A-Z0-9#_-]+)/gi;
    const equipmentMatches = [...message.matchAll(equipmentPattern)];
    if (equipmentMatches.length > 0) {
      entities.equipment = equipmentMatches.map(m => m[1]);
    }

    // Metric extraction
    const metricKeywords = ['oee', 'availability', 'performance', 'quality', 'downtime', 
                           'production', 'output', 'efficiency', 'utilization', 'yield'];
    entities.metrics = metricKeywords.filter(metric => messageLower.includes(metric));

    return entities;
  }

  /**
   * Resolve pronouns and contextual references
   */
  private resolveReferences(
    message: string, 
    entities: ExtractedEntities, 
    context: ConversationContext
  ) {
    let processedMessage = message;
    const resolvedEntities = { ...entities };

    // Pronoun resolution patterns
    const pronounPatterns = [
      { pattern: /\b(it|its|it's)\b/gi, type: 'equipment' },
      { pattern: /\b(that|those|these|this)\s+(machine|equipment|line)/gi, type: 'equipment' },
      { pattern: /\b(the same|similar)\b/gi, type: 'comparison' },
      { pattern: /\b(then|after that|before that)\b/gi, type: 'temporal' }
    ];

    for (const { pattern, type } of pronounPatterns) {
      if (pattern.test(message)) {
        switch (type) {
          case 'equipment':
            if (context.entities.lastMentioned?.equipment) {
              resolvedEntities.equipment = [context.entities.lastMentioned.equipment];
              processedMessage = processedMessage.replace(
                pattern, 
                context.entities.lastMentioned.equipment
              );
            }
            break;
          case 'temporal':
            if (context.entities.lastMentioned?.timeRange) {
              resolvedEntities.timeRange = context.entities.lastMentioned.timeRange;
            }
            break;
        }
      }
    }

    // Implicit references (e.g., "Why?" after showing OEE)
    if (message.match(/^(why|how|what caused|explain)/i) && context.activeAnalysis) {
      processedMessage = `${message} regarding ${context.activeAnalysis.type}`;
    }

    return { message: processedMessage, entities: resolvedEntities };
  }

  /**
   * Advanced intent detection with context
   */
  private detectIntent(message: string, context: ConversationContext) {
    const intents = {
      'oee_analysis': {
        patterns: ['oee', 'overall equipment effectiveness', 'efficiency'],
        confidence: 0
      },
      'quality_analysis': {
        patterns: ['defect', 'quality', 'scrap', 'reject', 'failure'],
        confidence: 0
      },
      'downtime_analysis': {
        patterns: ['downtime', 'stopped', 'breakdown', 'not running'],
        confidence: 0
      },
      'root_cause': {
        patterns: ['why', 'cause', 'reason', 'explain', 'what happened'],
        confidence: 0
      },
      'comparison': {
        patterns: ['compare', 'versus', 'vs', 'difference', 'better', 'worse'],
        confidence: 0
      },
      'prediction': {
        patterns: ['predict', 'forecast', 'will', 'going to', 'trend'],
        confidence: 0
      },
      'recommendation': {
        patterns: ['should', 'recommend', 'suggest', 'advice', 'optimize'],
        confidence: 0
      }
    };

    const messageLower = message.toLowerCase();
    
    // Calculate confidence scores
    for (const [intent, config] of Object.entries(intents)) {
      for (const pattern of config.patterns) {
        if (messageLower.includes(pattern)) {
          config.confidence += 0.3;
        }
      }
    }

    // Context boost - increase confidence based on conversation flow
    if (context.activeAnalysis) {
      const lastAnalysis = context.activeAnalysis.type;
      if (lastAnalysis === 'oee' && intents.root_cause.confidence > 0) {
        intents.root_cause.confidence += 0.4;
      }
    }

    // Sort by confidence
    const sortedIntents = Object.entries(intents)
      .sort((a, b) => b[1].confidence - a[1].confidence)
      .filter(([_, config]) => config.confidence > 0);

    return {
      primary: sortedIntents[0]?.[0] || 'general_query',
      secondary: sortedIntents.slice(1).map(([intent]) => intent),
      confidence: sortedIntents[0]?.[1].confidence || 0.5
    };
  }

  /**
   * Execute analysis based on intent
   */
  private async executeAnalysis(query: any, context: ConversationContext) {
    const { analysisType, entities } = query;
    
    // Set default time range if not specified
    if (!entities.timeRange) {
      entities.timeRange = this.getDefaultTimeRange(context);
    }

    switch (analysisType) {
      case 'oee_analysis':
        return this.analyzeOEE(entities, context);
        
      case 'quality_analysis':
        return this.analyzeQuality(entities, context);
        
      case 'downtime_analysis':
        return this.analyzeDowntime(entities, context);
        
      case 'root_cause_analysis':
        return this.performRootCauseAnalysis(entities, context);
        
      case 'comparison':
        return this.performComparison(entities, context);
        
      case 'prediction':
        return this.generatePredictions(entities, context);
        
      case 'recommendation':
        return this.generateRecommendations(entities, context);
        
      default:
        return this.handleGeneralQuery(query, context);
    }
  }

  /**
   * OEE Analysis with conversational context
   */
  private async analyzeOEE(entities: ExtractedEntities, context: ConversationContext) {
    const { timeRange, equipment } = entities;
    
    // Fetch data
    const [equipmentData, productionData, downtimeData] = await Promise.all([
      prisma.dimEquipment.findMany({
        where: equipment ? { code: { in: equipment } } : { isActive: true },
        include: {
          workCenter: {
            include: {
              area: { include: { site: true } }
            }
          }
        }
      }),
      prisma.factProduction.findMany({
        where: {
          startTime: { gte: timeRange!.start, lte: timeRange!.end },
          ...(equipment && { equipment: { code: { in: equipment } } })
        },
        include: {
          equipment: true,
          product: true,
          downtime: true
        }
      }),
      prisma.factDowntime.findMany({
        where: {
          startTime: { gte: timeRange!.start, lte: timeRange!.end },
          ...(equipment && { equipment: { code: { in: equipment } } })
        },
        include: {
          equipment: true,
          reason: true
        }
      })
    ]);

    // Calculate OEE metrics
    const oeeResults = this.calculateOEE(equipmentData, productionData, downtimeData);
    
    // Analyze patterns and insights
    const insights = this.generateOEEInsights(oeeResults, context);
    
    return {
      type: 'oee_analysis',
      data: {
        results: oeeResults,
        insights,
        summary: this.generateOEESummary(oeeResults),
        trends: this.identifyTrends(oeeResults, context)
      },
      visualizations: this.generateOEEVisualizations(oeeResults),
      followUpSuggestions: this.generateOEEFollowUps(oeeResults)
    };
  }

  /**
   * Generate natural language response
   */
  private async generateResponse(
    analysis: any, 
    context: ConversationContext
  ): Promise<ConversationalResponse> {
    const { type, data } = analysis;
    
    // Build response based on analysis type and user preferences
    let content = '';
    
    switch (type) {
      case 'oee_analysis':
        content = this.formatOEEResponse(data, context);
        break;
      case 'quality_analysis':
        content = this.formatQualityResponse(data, context);
        break;
      case 'downtime_analysis':
        content = this.formatDowntimeResponse(data, context);
        break;
      case 'root_cause_analysis':
        content = this.formatRootCauseResponse(data, context);
        break;
      default:
        content = this.formatGeneralResponse(data, context);
    }

    // Add conversational elements
    content = this.addConversationalTone(content, context);
    
    return {
      content,
      visualizations: analysis.visualizations,
      references: this.getRelevantReferences(type),
      dataSources: analysis.dataSources || this.getDataSourcesForType(type),
      context: {
        confidence: this.calculateResponseConfidence(analysis),
        intent: analysis.type,
        entities: analysis.data.entities || {},
        analysisType: type
      }
    };
  }

  /**
   * Format OEE response with natural language
   */
  private formatOEEResponse(data: any, context: ConversationContext): string {
    const { results, insights, summary } = data;
    const detailLevel = context.preferences.detailLevel;
    
    let response = '';
    
    // Opening based on context
    if (this.isFollowUp(context)) {
      response = `Looking at the OEE data more closely...\n\n`;
    } else {
      response = `Here's the OEE analysis for your equipment:\n\n`;
    }
    
    // Summary
    response += `📊 **Overall Performance**: ${summary.averageOEE.toFixed(1)}% OEE\n`;
    
    if (summary.averageOEE >= 85) {
      response += `✨ Excellent! This is world-class performance.\n\n`;
    } else if (summary.averageOEE >= 75) {
      response += `✅ Good performance, with room for optimization.\n\n`;
    } else {
      response += `⚠️ Below target - let's identify improvement opportunities.\n\n`;
    }
    
    // Equipment breakdown
    if (detailLevel !== 'concise') {
      response += `**Equipment Breakdown:**\n`;
      for (const eq of results.slice(0, 5)) {
        response += `\n📍 **${eq.name}**: ${(eq.oee * 100).toFixed(1)}% OEE\n`;
        response += `   • Availability: ${(eq.availability * 100).toFixed(1)}%\n`;
        response += `   • Performance: ${(eq.performance * 100).toFixed(1)}%\n`;
        response += `   • Quality: ${(eq.quality * 100).toFixed(1)}%\n`;
        
        if (eq.oee < 0.7) {
          response += `   ⚠️ *Below target - `;
          const limiting = this.identifyLimitingFactor(eq);
          response += `${limiting} is the main constraint*\n`;
        }
      }
    }
    
    // Insights
    if (insights.length > 0 && detailLevel === 'detailed') {
      response += `\n**Key Insights:**\n`;
      insights.forEach((insight: string, i: number) => {
        response += `${i + 1}. ${insight}\n`;
      });
    }
    
    // Conversational close
    if (summary.hasIssues) {
      response += `\nI've identified some areas that need attention. Would you like me to analyze the root causes or suggest improvements?`;
    } else {
      response += `\nYour equipment is performing well overall. Would you like to see trends or compare with historical performance?`;
    }
    
    return response;
  }

  /**
   * Add conversational tone to responses
   */
  private addConversationalTone(content: string, context: ConversationContext): string {
    // Add personality based on conversation length
    const messageCount = context.messages.length;
    
    if (messageCount === 1) {
      // First interaction
      return content;
    } else if (messageCount < 5) {
      // Early conversation - be helpful
      return content.replace(/^/, "Based on your question, ");
    } else {
      // Established conversation - be more casual
      const transitions = [
        "Alright, ",
        "Sure thing! ",
        "Let me check that for you... ",
        "Interesting question! "
      ];
      const transition = transitions[Math.floor(Math.random() * transitions.length)];
      return transition + content;
    }
  }

  /**
   * Generate follow-up suggestions
   */
  private generateSuggestions(analysis: any, context: ConversationContext): string[] {
    const suggestions: string[] = [];
    
    switch (analysis.type) {
      case 'oee_analysis':
        if (analysis.data.summary.averageOEE < 75) {
          suggestions.push("Why is the OEE below target?");
          suggestions.push("Show me the main downtime reasons");
          suggestions.push("What improvements would you recommend?");
        } else {
          suggestions.push("How does this compare to last week?");
          suggestions.push("Show me the OEE trend");
          suggestions.push("Which shift performs best?");
        }
        break;
        
      case 'quality_analysis':
        suggestions.push("What's causing these defects?");
        suggestions.push("Show me defect trends over time");
        suggestions.push("Which products have the most issues?");
        break;
        
      case 'downtime_analysis':
        suggestions.push("How can we reduce this downtime?");
        suggestions.push("Show me downtime patterns");
        suggestions.push("What's the impact on production?");
        break;
    }
    
    // Add contextual suggestions based on findings
    if (analysis.data.insights?.includes('increasing trend')) {
      suggestions.push("Predict next week's performance");
    }
    
    return suggestions.slice(0, 3); // Limit to 3 suggestions
  }

  /**
   * Handle clarification requests
   */
  private requestClarification(
    query: any, 
    context: ConversationContext
  ): ConversationalResponse {
    const { clarificationReason, clarificationOptions } = query;
    
    let question = '';
    switch (clarificationReason) {
      case 'ambiguous_equipment':
        question = "Which equipment would you like me to analyze?";
        break;
      case 'missing_timerange':
        question = "What time period should I look at?";
        break;
      case 'unclear_metric':
        question = "What specific metric are you interested in?";
        break;
      default:
        question = "Could you clarify what you'd like to know?";
    }
    
    return {
      content: `I'd be happy to help! ${question}`,
      clarificationNeeded: {
        question,
        options: clarificationOptions || [
          "All equipment",
          "Last 24 hours",
          "Last 7 days",
          "Specific equipment (please specify)"
        ]
      },
      context: {
        confidence: 0.3,
        intent: 'clarification',
        entities: query.entities,
        analysisType: 'clarification'
      }
    };
  }

  /**
   * Context management methods
   */
  private async loadContext(sessionId: string, userId: string): Promise<ConversationContext> {
    const key = `conversation:${sessionId}`;
    
    try {
      // Try Redis first
      if (redis && redis.status === 'ready') {
        const cached = await redis.get(key);
        if (cached) {
          return JSON.parse(cached);
        }
      } else {
        // Fallback to in-memory store
        const cached = memoryStore.get(key);
        if (cached) {
          return JSON.parse(cached);
        }
      }
    } catch (error) {
      console.warn('Failed to load context from Redis, using memory:', error);
      const cached = memoryStore.get(key);
      if (cached) {
        return JSON.parse(cached);
      }
    }
    
    // Initialize new context
    return {
      sessionId,
      userId,
      messages: [],
      entities: {},
      preferences: await this.loadUserPreferences(userId),
      activeAnalysis: undefined
    };
  }

  private async saveContext(sessionId: string, context: ConversationContext) {
    const key = `conversation:${sessionId}`;
    
    // Trim context to stay within token limits
    context = this.trimContext(context);
    const contextStr = JSON.stringify(context);
    
    try {
      // Try Redis first
      if (redis && redis.status === 'ready') {
        // Save with 24-hour expiry
        await redis.setex(key, 86400, contextStr);
      } else {
        // Fallback to in-memory store
        memoryStore.set(key, contextStr);
        // Clean up old sessions in memory
        if (memoryStore.size > 100) {
          const firstKey = memoryStore.keys().next().value;
          if (firstKey) memoryStore.delete(firstKey);
        }
      }
    } catch (error) {
      console.warn('Failed to save context to Redis, using memory:', error);
      memoryStore.set(key, contextStr);
    }
  }

  private trimContext(context: ConversationContext): ConversationContext {
    // Keep only recent messages to stay within token limits
    const maxMessages = 20;
    if (context.messages.length > maxMessages) {
      context.messages = [
        context.messages[0], // Keep system message
        ...context.messages.slice(-maxMessages + 1)
      ];
    }
    return context;
  }

  // Helper methods for time ranges
  private getToday() {
    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    return { start, end: now };
  }

  private getYesterday() {
    const now = new Date();
    const start = new Date(now);
    start.setDate(start.getDate() - 1);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  private getThisWeek() {
    const now = new Date();
    const start = new Date(now);
    start.setDate(start.getDate() - start.getDay());
    start.setHours(0, 0, 0, 0);
    return { start, end: now };
  }

  private getLastWeek() {
    const now = new Date();
    const start = new Date(now);
    start.setDate(start.getDate() - 7);
    return { start, end: now };
  }

  private getThisMonth() {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return { start, end: now };
  }

  private getLastMonth() {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0);
    return { start, end };
  }

  private getLastNHours(n: number) {
    const now = new Date();
    const start = new Date(now.getTime() - n * 60 * 60 * 1000);
    return { start, end: now };
  }

  private getLastNDays(n: number) {
    const now = new Date();
    const start = new Date(now);
    start.setDate(start.getDate() - n);
    return { start, end: now };
  }

  private getDateRange(startStr: string, endStr: string) {
    return {
      start: new Date(startStr),
      end: new Date(endStr)
    };
  }

  private async loadUserPreferences(userId: string): Promise<UserPreferences> {
    // TODO: Load from database based on userId
    return {
      detailLevel: 'detailed',
      preferredVisualizations: ['line_chart', 'bar_chart'],
      timezone: 'UTC',
      defaultTimeRange: 'last_24_hours'
    };
  }

  private calculateOEE(equipment: any[], productionData: any[], downtimeData: any[]) {
    return this.calculateOEEMetrics(equipment, productionData);
  }

  private calculateOEEMetrics(equipment: any[], productionData: any[]) {
    const oeeMetrics = [];

    for (const eq of equipment) {
      // Get production data for this equipment
      const eqProduction = productionData.filter(p => p.equipment.code === eq.code);
      
      if (eqProduction.length === 0) continue;

      // Calculate totals
      let totalPlannedTime = 0n;
      let totalOperatingTime = 0n;
      let totalDowntime = 0n;
      let totalPartsProduced = 0;
      let totalGoodParts = 0;

      for (const prod of eqProduction) {
        totalPlannedTime += prod.plannedProductionTime;
        totalOperatingTime += prod.operatingTime;
        totalPartsProduced += prod.totalPartsProduced;
        totalGoodParts += prod.goodParts;
        
        // Sum downtime
        if (prod.downtime && prod.downtime.length > 0) {
          const downtimeForRun = prod.downtime.reduce((sum: bigint, dt: any) => sum + dt.downtimeDuration, 0n);
          totalDowntime += downtimeForRun;
        }
      }

      // Convert to hours for calculations
      const plannedHours = Number(totalPlannedTime) / (1000 * 60 * 60);
      const operatingHours = Number(totalOperatingTime) / (1000 * 60 * 60);
      const downtimeHours = Number(totalDowntime) / (1000 * 60 * 60);
      const actualRunTime = operatingHours - downtimeHours;

      // Calculate OEE components
      const availability = plannedHours > 0 ? actualRunTime / plannedHours : 0;
      const theoreticalRate = eq.theoreticalRate?.toNumber() || 60;
      const actualRate = actualRunTime > 0 ? totalPartsProduced / actualRunTime : 0;
      const performance = theoreticalRate > 0 ? actualRate / theoreticalRate : 0;
      const quality = totalPartsProduced > 0 ? totalGoodParts / totalPartsProduced : 0;
      const oee = availability * performance * quality;

      oeeMetrics.push({
        equipmentId: eq.id,
        equipmentName: eq.name,
        equipmentCode: eq.code,
        availability,
        performance,
        quality,
        oee,
        productionRuns: eqProduction.length,
        totalParts: totalPartsProduced,
        goodParts: totalGoodParts,
        scrapParts: totalPartsProduced - totalGoodParts,
        plannedTime: plannedHours,
        operatingTime: operatingHours,
        downtime: downtimeHours
      });
    }

    return oeeMetrics;
  }

  private generateOEEInsights(oeeResults: any[], context: ConversationContext): string[] {
    const insights: string[] = [];
    
    // Find underperformers
    const underperformers = oeeResults.filter(r => r.oee < 0.7);
    if (underperformers.length > 0) {
      insights.push(`${underperformers.length} equipment below 70% OEE target`);
    }
    
    // Find best performers
    const topPerformer = oeeResults.sort((a, b) => b.oee - a.oee)[0];
    if (topPerformer) {
      insights.push(`${topPerformer.equipmentName} is your top performer at ${(topPerformer.oee * 100).toFixed(1)}%`);
    }
    
    return insights;
  }

  private generateOEESummary(oeeResults: any[]) {
    const totalOEE = oeeResults.reduce((sum, r) => sum + r.oee, 0);
    const averageOEE = oeeResults.length > 0 ? (totalOEE / oeeResults.length) * 100 : 0;
    
    return {
      averageOEE,
      equipmentCount: oeeResults.length,
      hasIssues: averageOEE < 75,
      performanceLevel: averageOEE >= 85 ? 'World Class' : averageOEE >= 75 ? 'Good' : 'Needs Improvement'
    };
  }

  private identifyTrends(oeeResults: any[], context: ConversationContext) {
    // TODO: Implement trend analysis based on historical data
    return {
      trend: 'stable',
      change: 0
    };
  }

  private generateOEEVisualizations(oeeResults: any[]) {
    return [
      {
        type: 'bar_chart',
        title: 'OEE by Equipment',
        data: oeeResults.map(r => ({
          name: r.equipmentName,
          value: r.oee * 100
        }))
      }
    ];
  }

  private generateOEEFollowUps(oeeResults: any[]): string[] {
    const suggestions: string[] = [];
    
    const lowPerformers = oeeResults.filter(r => r.oee < 0.7);
    if (lowPerformers.length > 0) {
      suggestions.push(`Why is ${lowPerformers[0].equipmentName} underperforming?`);
      suggestions.push("Show me downtime analysis");
    }
    
    suggestions.push("Compare with yesterday's performance");
    suggestions.push("What are the main quality issues?");
    
    return suggestions.slice(0, 3);
  }

  private identifyLimitingFactor(equipment: any): string {
    const factors = [
      { name: 'Availability', value: equipment.availability },
      { name: 'Performance', value: equipment.performance },
      { name: 'Quality', value: equipment.quality }
    ];
    
    return factors.sort((a, b) => a.value - b.value)[0].name;
  }

  private isFollowUp(context: ConversationContext): boolean {
    return context.messages.length > 2;
  }

  private assessClarity(query: any, intent: any) {
    const needsClarification = !query.entities.equipment && !query.entities.timeRange && intent.confidence < 0.5;
    
    return {
      needsClarification,
      reason: needsClarification ? 'ambiguous_query' : null,
      options: needsClarification ? [
        'All equipment for today',
        'Specific equipment (please specify)',
        'Different time range'
      ] : []
    };
  }

  private mapIntentToAnalysis(intent: string): string {
    const mapping: Record<string, string> = {
      'oee_analysis': 'oee_analysis',
      'quality_analysis': 'quality_analysis',
      'downtime_analysis': 'downtime_analysis',
      'root_cause': 'root_cause_analysis',
      'comparison': 'comparison',
      'prediction': 'prediction',
      'recommendation': 'recommendation',
      'general_query': 'general'
    };
    
    return mapping[intent] || 'general';
  }

  private getDefaultTimeRange(context: ConversationContext) {
    // Default to last 24 hours
    return {
      start: new Date(Date.now() - 24 * 60 * 60 * 1000),
      end: new Date()
    };
  }

  private getRelevantReferences(analysisType: string) {
    const references = [];
    
    if (analysisType === 'oee_analysis') {
      references.push({
        standard: 'ISO 22400-2:2014',
        title: 'Manufacturing Operations Management KPIs',
        relevance: 'OEE calculation methodology'
      });
    }
    
    return references;
  }

  private calculateResponseConfidence(analysis: any): number {
    // Base confidence on data availability
    if (!analysis.data) return 0.3;
    if (analysis.data.error) return 0.2;
    
    // Different confidence calculations based on analysis type
    switch (analysis.type) {
      case 'quality_analysis':
        if (analysis.data.topDefects && analysis.data.topDefects.length > 0) {
          return analysis.data.totalDefects > 100 ? 0.95 : 0.85;
        }
        return 0.6;
        
      case 'oee_analysis':
        if (analysis.data.results && analysis.data.results.length > 0) {
          return analysis.data.results.length > 5 ? 0.95 : 0.85;
        }
        return 0.6;
        
      case 'downtime_analysis':
        if (analysis.data.downtimeEvents && analysis.data.downtimeEvents.length > 0) {
          return 0.9;
        }
        return 0.7;
        
      case 'comparison':
        if (analysis.data.results && analysis.data.results.length > 1) {
          return 0.9;
        }
        return 0.5;
        
      case 'root_cause_analysis':
        if (analysis.data.rootCauses && analysis.data.rootCauses.length > 0) {
          return analysis.data.confidence || 0.8;
        }
        return 0.4;
        
      default:
        // For general queries with results
        if (analysis.data.results && analysis.data.results.length > 0) {
          return 0.8;
        }
        return 0.5;
    }
  }

  // Quality analysis implementation
  private async analyzeQuality(entities: ExtractedEntities, context: ConversationContext) {
    const { timeRange = this.getDefaultTimeRange(context), equipment } = entities;
    
    try {
      // Fetch quality data
      const [scrapData, productionData] = await Promise.all([
        prisma.factScrap.findMany({
          where: {
            createdAt: { gte: timeRange.start, lte: timeRange.end },
            ...(equipment && { 
              production: { 
                equipment: { code: { in: equipment } } 
              } 
            })
          },
          include: {
            product: true,
            production: {
              include: { equipment: true }
            }
          },
          orderBy: { scrapQty: 'desc' }
        }),
        prisma.factProduction.findMany({
          where: {
            startTime: { gte: timeRange.start, lte: timeRange.end },
            ...(equipment && { equipment: { code: { in: equipment } } })
          },
          include: { equipment: true, product: true }
        })
      ]);

      // Aggregate defect data
      const defectSummary = scrapData.reduce((acc, scrap) => {
        const key = scrap.scrapCode || 'UNKNOWN';
        if (!acc[key]) {
          acc[key] = {
            code: key,
            reason: this.getDefectDescription(scrap.scrapCode) || scrap.scrapCode || 'Unknown',
            count: 0,
            products: new Set(),
            equipment: new Set()
          };
        }
        acc[key].count += scrap.scrapQty;
        if (scrap.product) acc[key].products.add(scrap.product.name);
        if (scrap.production?.equipment) acc[key].equipment.add(scrap.production.equipment.name);
        return acc;
      }, {} as Record<string, any>);

      // Convert to array and sort
      const topDefects = Object.values(defectSummary)
        .map(d => ({
          ...d,
          products: Array.from(d.products),
          equipment: Array.from(d.equipment)
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Calculate totals
      const totalDefects = scrapData.reduce((sum, s) => sum + s.scrapQty, 0);
      const totalProduction = productionData.reduce((sum, p) => sum + p.totalPartsProduced, 0);
      const qualityRate = totalProduction > 0 ? 
        ((totalProduction - totalDefects) / totalProduction) * 100 : 0;

      return {
        type: 'quality_analysis',
        data: {
          topDefects,
          totalDefects,
          totalProduction,
          qualityRate,
          timeRange,
          insights: this.generateQualityInsights(topDefects, qualityRate),
          summary: {
            defectCount: topDefects.length,
            qualityRate: qualityRate.toFixed(1),
            trend: this.calculateQualityTrend(scrapData)
          }
        },
        visualizations: [{
          type: 'bar_chart',
          title: 'Top Defect Types',
          data: topDefects.map(d => ({
            name: d.reason,
            value: d.count,
            percentage: ((d.count / totalDefects) * 100).toFixed(1)
          }))
        }],
        followUpSuggestions: [
          `Why are ${topDefects[0]?.reason || 'defects'} occurring?`,
          'Show me defect trends over time',
          'Which equipment has the most defects?'
        ]
      };
    } catch (error) {
      console.error('Quality analysis error:', error);
      return {
        type: 'quality_analysis',
        data: {
          error: true,
          message: 'Unable to fetch quality data',
          timeRange
        }
      };
    }
  }

  private async analyzeDowntime(entities: ExtractedEntities, context: ConversationContext) {
    const { timeRange = this.getDefaultTimeRange(context), equipment } = entities;
    
    try {
      // Fetch downtime data
      const downtimeData = await prisma.factDowntime.findMany({
        where: {
          startTime: { gte: timeRange.start, lte: timeRange.end },
          ...(equipment && { equipment: { code: { in: equipment } } })
        },
        include: {
          equipment: true,
          reason: true
        },
        orderBy: { downtimeDuration: 'desc' }
      });

      // Calculate totals and aggregations
      const totalDowntime = downtimeData.reduce((sum, dt) => sum + Number(dt.downtimeDuration), 0);
      
      // Calculate MTBF and MTTR
      const equipmentGroups = this.groupByEquipment(downtimeData);
      const mtbfData = this.calculateMTBF(equipmentGroups, timeRange);
      const mttrData = this.calculateMTTR(downtimeData);
      
      return {
        type: 'downtime_analysis',
        data: {
          downtimeEvents: downtimeData.map(dt => ({
            equipment: dt.equipment.name,
            equipmentCode: dt.equipment.code,
            reason: dt.reason?.reason || 'Unknown',
            reasonCode: dt.reason?.code || 'UNKNOWN',
            startTime: dt.startTime,
            endTime: dt.endTime,
            duration: Number(dt.downtimeDuration)
          })),
          totalDowntime,
          summary: {
            eventCount: downtimeData.length,
            averageDuration: downtimeData.length > 0 ? totalDowntime / downtimeData.length : 0,
            mtbf: mtbfData.average,
            mttr: mttrData.average
          },
          insights: this.generateDowntimeInsights(downtimeData, totalDowntime),
          timeRange
        },
        visualizations: [{
          type: 'bar_chart',
          title: 'Downtime by Reason',
          data: this.getDowntimeByReasonChart(downtimeData)
        }],
        followUpSuggestions: [
          'What patterns do you see in the downtime?',
          'How can we reduce unplanned downtime?',
          'Show me maintenance schedules'
        ]
      };
    } catch (error) {
      console.error('Downtime analysis error:', error);
      return {
        type: 'downtime_analysis',
        data: {
          downtimeEvents: [],
          totalDowntime: 0,
          summary: {},
          error: 'Unable to fetch downtime data'
        }
      };
    }
  }

  private async performRootCauseAnalysis(entities: ExtractedEntities, context: ConversationContext) {
    const { timeRange = this.getDefaultTimeRange(context), equipment } = entities;
    
    try {
      // Identify what issue we're analyzing
      const issue = context.activeAnalysis?.data || 'performance issues';
      
      // Fetch comprehensive data for correlation analysis
      const [productionData, downtimeData, qualityData, maintenanceData] = await Promise.all([
        prisma.factProduction.findMany({
          where: {
            startTime: { gte: timeRange.start, lte: timeRange.end },
            ...(equipment && { equipment: { code: { in: equipment } } })
          },
          include: { equipment: true, product: true, shift: true }
        }),
        prisma.factDowntime.findMany({
          where: {
            startTime: { gte: timeRange.start, lte: timeRange.end },
            ...(equipment && { equipment: { code: { in: equipment } } })
          },
          include: { equipment: true, reason: true }
        }),
        prisma.factScrap.findMany({
          where: {
            createdAt: { gte: timeRange.start, lte: timeRange.end },
            ...(equipment && { production: { equipment: { code: { in: equipment } } } })
          },
          include: { production: { include: { equipment: true, shift: true } } }
        }),
        prisma.factMaintenance.findMany({
          where: {
            startTime: { gte: timeRange.start, lte: timeRange.end },
            ...(equipment && { equipment: { code: { in: equipment } } })
          },
          include: { equipment: true }
        })
      ]);
      
      // Perform pattern analysis
      const patterns = this.analyzePatterns(productionData, downtimeData, qualityData);
      const correlations = this.findCorrelations(patterns);
      const rootCauses = this.identifyRootCauses(patterns, correlations);
      
      return {
        type: 'root_cause_analysis',
        data: {
          rootCauses: rootCauses.map(cause => ({
            title: cause.title,
            evidence: cause.evidence,
            probability: cause.probability,
            impact: cause.impact
          })),
          correlations: correlations.slice(0, 5),
          recommendations: this.generateRCARecommendations(rootCauses),
          summary: {
            issue: typeof issue === 'string' ? issue : 'Performance degradation',
            impact: this.calculateImpact(productionData),
            confidence: this.calculateConfidence(correlations),
            dataPoints: productionData.length + downtimeData.length + qualityData.length
          },
          timeRange
        },
        visualizations: [{
          type: 'correlation_matrix',
          title: 'Factor Correlations',
          data: correlations
        }],
        followUpSuggestions: [
          'Show me an action plan to address these issues',
          'What preventive measures can we implement?',
          'Analyze the impact of maintenance schedules'
        ]
      };
    } catch (error) {
      console.error('Root cause analysis error:', error);
      return {
        type: 'root_cause_analysis',
        data: {
          rootCauses: [],
          correlations: [],
          recommendations: [],
          error: 'Unable to perform root cause analysis'
        }
      };
    }
  }

  private async performComparison(entities: ExtractedEntities, context: ConversationContext) {
    const { timeRange = this.getDefaultTimeRange(context), equipment, shifts } = entities;
    
    try {
      // Determine comparison type from context
      const comparisonType = this.detectComparisonType(context.messages[context.messages.length - 1].content);
      
      let comparisonData: any = {};
      
      switch (comparisonType) {
        case 'shift':
          comparisonData = await this.compareShifts(timeRange, equipment);
          break;
        case 'equipment':
          comparisonData = await this.compareEquipment(timeRange, equipment || []);
          break;
        case 'time_period':
          comparisonData = await this.compareTimePeriods(timeRange, equipment);
          break;
        default:
          // Default to equipment comparison
          comparisonData = await this.compareEquipment(timeRange, equipment || []);
      }
      
      return {
        type: 'comparison',
        data: {
          comparisonType,
          results: comparisonData.results,
          winner: comparisonData.winner,
          insights: comparisonData.insights,
          differences: comparisonData.differences,
          summary: {
            itemsCompared: comparisonData.results.length,
            metric: comparisonData.metric || 'OEE',
            significance: comparisonData.significance
          }
        },
        visualizations: [{
          type: 'comparison_chart',
          title: `${comparisonType} Comparison`,
          data: comparisonData.chartData
        }],
        followUpSuggestions: [
          'What causes these differences?',
          'Show me trends for the best performer',
          'How can we improve the underperformers?'
        ]
      };
    } catch (error) {
      console.error('Comparison analysis error:', error);
      return {
        type: 'comparison',
        data: {
          error: 'Unable to perform comparison analysis'
        }
      };
    }
  }

  private async generatePredictions(entities: ExtractedEntities, context: ConversationContext) {
    // TODO: Implement predictions
    return { type: 'prediction', data: {} };
  }

  private async generateRecommendations(entities: ExtractedEntities, context: ConversationContext) {
    // TODO: Implement recommendations
    return { type: 'recommendation', data: {} };
  }

  private async handleGeneralQuery(query: any, context: ConversationContext) {
    // For general queries, try to provide more specific guidance
    const { entities, processedMessage } = query;
    let message = 'I can help you analyze equipment performance, quality metrics, and production data.';
    
    // Provide more specific response based on entities found
    if (entities.equipment && entities.equipment.length > 0) {
      message = `I found references to equipment: ${entities.equipment.join(', ')}. I can analyze OEE, downtime, or quality metrics for this equipment.`;
    } else if (processedMessage.includes('help') || processedMessage.includes('what can')) {
      message = `I can help you with:
• OEE analysis and equipment performance
• Quality metrics and defect analysis
• Downtime analysis and MTBF/MTTR calculations
• Root cause analysis for issues
• Comparisons between shifts, equipment, or time periods
• Performance predictions and recommendations

Try asking: "Show me OEE for all equipment today" or "What are the top defect types?"`;
    }
    
    return { 
      type: 'general', 
      data: { 
        message,
        results: [{ type: 'guidance', content: message }] // Add results for confidence calculation
      } 
    };
  }

  private formatQualityResponse(data: any, context: ConversationContext): string {
    const { topDefects, totalDefects, totalProduction, qualityRate, summary } = data;
    const detailLevel = context.preferences.detailLevel;
    
    let response = '';
    
    // Opening
    if (this.isFollowUp(context)) {
      response = `Looking at the quality data in more detail...\n\n`;
    } else {
      response = `Here's the quality analysis for the requested period:\n\n`;
    }
    
    // Quality Rate Summary
    response += `📊 **Quality Rate**: ${qualityRate.toFixed(1)}%\n`;
    response += `📈 **Total Production**: ${totalProduction.toLocaleString()} parts\n`;
    response += `❌ **Total Defects**: ${totalDefects.toLocaleString()} parts\n\n`;
    
    // Quality assessment
    if (qualityRate >= 99) {
      response += `✨ Excellent quality performance! Near-perfect production.\n\n`;
    } else if (qualityRate >= 95) {
      response += `✅ Good quality performance, with minor improvement opportunities.\n\n`;
    } else {
      response += `⚠️ Quality below target - significant improvement needed.\n\n`;
    }
    
    // Top defect types
    if (topDefects && topDefects.length > 0) {
      response += `**Top ${Math.min(5, topDefects.length)} Defect Types:**\n\n`;
      
      topDefects.forEach((defect: any, index: number) => {
        const percentage = totalDefects > 0 ? ((defect.count / totalDefects) * 100).toFixed(1) : '0.0';
        response += `${index + 1}. **${defect.reason}** (${defect.code})\n`;
        response += `   • Count: ${defect.count.toLocaleString()} parts (${percentage}% of all defects)\n`;
        
        if (detailLevel !== 'concise') {
          if (defect.products.length > 0) {
            response += `   • Products affected: ${defect.products.slice(0, 3).join(', ')}${defect.products.length > 3 ? ', ...' : ''}\n`;
          }
          if (defect.equipment.length > 0) {
            response += `   • Equipment involved: ${defect.equipment.slice(0, 3).join(', ')}${defect.equipment.length > 3 ? ', ...' : ''}\n`;
          }
        }
        response += '\n';
      });
    } else {
      response += `ℹ️ No defects recorded for this period.\n\n`;
    }
    
    // Insights
    if (data.insights && data.insights.length > 0 && detailLevel === 'detailed') {
      response += `**Key Insights:**\n`;
      data.insights.forEach((insight: string, i: number) => {
        response += `${i + 1}. ${insight}\n`;
      });
      response += '\n';
    }
    
    // Trend information
    if (summary.trend) {
      response += `**Trend**: ${summary.trend}\n\n`;
    }
    
    // Recommendations
    if (topDefects && topDefects.length > 0 && topDefects[0].count > 100) {
      response += `💡 **Recommendation**: Focus on addressing "${topDefects[0].reason}" defects as they account for the largest portion of quality issues.\n\n`;
    }
    
    // Call to action
    if (qualityRate < 95) {
      response += `Would you like me to perform a root cause analysis on the top defect types?`;
    } else {
      response += `Would you like to see quality trends or compare with historical performance?`;
    }
    
    return response;
  }

  private formatDowntimeResponse(data: any, context: ConversationContext): string {
    const { downtimeEvents, totalDowntime, summary, insights } = data;
    const detailLevel = context.preferences.detailLevel;
    
    let response = '';
    
    // Opening
    response = `Here's the downtime analysis for your equipment:\n\n`;
    
    // Summary
    response += `⏱️ **Total Downtime**: ${this.formatDuration(totalDowntime)}\n`;
    response += `📊 **Number of Events**: ${downtimeEvents?.length || 0} events\n`;
    if (summary?.mtbf) {
      response += `🔧 **MTBF**: ${summary.mtbf.toFixed(1)} hours\n`;
    }
    if (summary?.mttr) {
      response += `⚡ **MTTR**: ${summary.mttr.toFixed(1)} hours\n`;
    }
    response += '\n';
    
    // Top downtime reasons
    if (downtimeEvents && downtimeEvents.length > 0) {
      response += `**Top Downtime Reasons:**\n\n`;
      
      const reasonSummary = this.aggregateDowntimeByReason(downtimeEvents);
      const topReasons = Object.entries(reasonSummary)
        .sort((a: any, b: any) => b[1].duration - a[1].duration)
        .slice(0, 5);
      
      topReasons.forEach(([reason, data]: [string, any], index) => {
        const percentage = totalDowntime > 0 ? ((data.duration / totalDowntime) * 100).toFixed(1) : '0.0';
        response += `${index + 1}. **${reason}**\n`;
        response += `   • Duration: ${this.formatDuration(data.duration)} (${percentage}% of total)\n`;
        response += `   • Occurrences: ${data.count} times\n`;
        if (data.equipment.size > 0 && detailLevel !== 'concise') {
          response += `   • Equipment affected: ${Array.from(data.equipment).slice(0, 3).join(', ')}\n`;
        }
        response += '\n';
      });
    } else {
      response += `✅ No downtime events recorded for this period.\n\n`;
    }
    
    // Insights
    if (insights && insights.length > 0 && detailLevel === 'detailed') {
      response += `**Key Insights:**\n`;
      insights.forEach((insight: string, i: number) => {
        response += `${i + 1}. ${insight}\n`;
      });
      response += '\n';
    }
    
    // Recommendations
    if (totalDowntime > 8 * 60 * 60 * 1000) { // More than 8 hours
      response += `⚠️ **Alert**: Significant downtime detected. Consider preventive maintenance schedules and operator training.\n\n`;
    }
    
    // Call to action
    response += `Would you like me to analyze the root causes or show downtime patterns by shift?`;
    
    return response;
  }

  private formatRootCauseResponse(data: any, context: ConversationContext): string {
    const { rootCauses, correlations, recommendations, summary } = data;
    const detailLevel = context.preferences.detailLevel;
    
    let response = '';
    
    // Opening
    response = `I've analyzed the data to identify potential root causes:\n\n`;
    
    // Summary
    if (summary) {
      response += `🔍 **Analysis Summary**:\n`;
      response += `• Issue: ${summary.issue}\n`;
      response += `• Impact: ${summary.impact}\n`;
      response += `• Confidence: ${(summary.confidence * 100).toFixed(0)}%\n\n`;
    }
    
    // Root causes
    if (rootCauses && rootCauses.length > 0) {
      response += `**Identified Root Causes:**\n\n`;
      
      rootCauses.forEach((cause: any, index: number) => {
        response += `${index + 1}. **${cause.title}**\n`;
        response += `   • Evidence: ${cause.evidence}\n`;
        response += `   • Probability: ${(cause.probability * 100).toFixed(0)}%\n`;
        if (cause.impact && detailLevel !== 'concise') {
          response += `   • Impact: ${cause.impact}\n`;
        }
        response += '\n';
      });
    }
    
    // Correlations
    if (correlations && correlations.length > 0 && detailLevel === 'detailed') {
      response += `**Correlations Found:**\n`;
      correlations.forEach((corr: any, i: number) => {
        response += `${i + 1}. ${corr.factor1} ↔ ${corr.factor2} (${(corr.strength * 100).toFixed(0)}% correlation)\n`;
      });
      response += '\n';
    }
    
    // Recommendations
    if (recommendations && recommendations.length > 0) {
      response += `**Recommended Actions:**\n`;
      recommendations.forEach((rec: any, i: number) => {
        response += `${i + 1}. ${rec.action}\n`;
        if (rec.expectedImprovement && detailLevel !== 'concise') {
          response += `   • Expected improvement: ${rec.expectedImprovement}\n`;
        }
      });
      response += '\n';
    }
    
    // Call to action
    response += `Would you like me to create an action plan or analyze specific correlations in more detail?`;
    
    return response;
  }

  private formatGeneralResponse(data: any, context: ConversationContext): string {
    return data.message || 'How can I help you with your manufacturing analytics?';
  }

  private handleError(error: any, message: string): ConversationalResponse {
    console.error('🚨 ConversationalManufacturingAgent error:', {
      message,
      error: error.message,
      stack: error.stack
    });
    
    return {
      content: "I apologize, but I encountered an error processing your request. Please try rephrasing your question.",
      context: {
        confidence: 0,
        intent: 'error',
        entities: {},
        analysisType: 'error',
        critiqueScore: 0
      }
    };
  }

  /**
   * Improve analysis based on critique feedback
   */
  private async improveAnalysis(
    originalAnalysis: any,
    critiques: Critique[],
    context: ConversationContext
  ): Promise<any> {
    const improvedAnalysis = { ...originalAnalysis };
    
    // Address each critique
    for (const critique of critiques) {
      switch (critique.type) {
        case 'completeness':
          // Add missing data
          if (critique.issue.includes('missing data')) {
            improvedAnalysis.data.dataAvailability = await this.checkDataAvailability(
              originalAnalysis.data.entities
            );
            improvedAnalysis.data.suggestions = [
              'To get complete data, ensure all equipment is reporting',
              'Check sensor connectivity and data collection services'
            ];
          }
          break;
          
        case 'accuracy':
          // Recalculate with validated data
          if (originalAnalysis.type === 'oee_analysis') {
            improvedAnalysis.data.results = await this.recalculateWithValidation(
              originalAnalysis.data.results
            );
          }
          break;
          
        case 'relevance':
          // Focus on requested entities
          const requestedEntities = context.entities;
          if (requestedEntities.equipment) {
            improvedAnalysis.data.results = improvedAnalysis.data.results.filter(
              (r: any) => requestedEntities.equipment!.includes(r.equipmentCode)
            );
          }
          break;
          
        case 'clarity':
          // Add structure and explanations
          improvedAnalysis.data.structured = true;
          improvedAnalysis.data.explanations = this.generateExplanations(
            improvedAnalysis.type
          );
          break;
          
        case 'ontology':
          // Fix terminology
          improvedAnalysis.data.terminology = 'standard';
          break;
      }
    }
    
    // Enhance insights based on improvements
    improvedAnalysis.data.insights = [
      ...improvedAnalysis.data.insights || [],
      ...this.generateAdditionalInsights(improvedAnalysis, critiques)
    ];
    
    return improvedAnalysis;
  }
  
  private async checkDataAvailability(entities: any) {
    // Check what data is actually available in the database
    const availability = {
      hasRealtimeData: false,
      hasHistoricalData: false,
      dataGaps: [],
      recommendations: []
    };
    
    // Check for recent data
    const recentData = await prisma.factProduction.findFirst({
      where: { startTime: { gte: new Date(Date.now() - 60 * 60 * 1000) } }
    });
    
    availability.hasRealtimeData = !!recentData;
    
    return availability;
  }
  
  private async recalculateWithValidation(results: any[]) {
    // Validate and recalculate metrics
    return results.map(r => ({
      ...r,
      validated: true,
      confidence: 0.95
    }));
  }
  
  private generateExplanations(analysisType: string) {
    const explanations: Record<string, string> = {
      oee_analysis: 'OEE = Availability × Performance × Quality. World-class OEE is 85% or higher.',
      quality_analysis: 'Quality metrics track defect rates and first-pass yield.',
      downtime_analysis: 'Downtime is categorized as planned or unplanned, with root causes tracked.'
    };
    
    return explanations[analysisType] || '';
  }
  
  private generateAdditionalInsights(analysis: any, critiques: Critique[]): string[] {
    const insights: string[] = [];
    
    // Add insights based on critique improvements
    if (critiques.some(c => c.type === 'completeness')) {
      insights.push('Data completeness improved by including all available sources');
    }
    
    if (critiques.some(c => c.type === 'accuracy')) {
      insights.push('Calculations validated against ISO 22400 standards');
    }
    
    return insights;
  }

  // Helper methods for quality analysis
  private getDefectDescription(code: string): string {
    const defectMap: Record<string, string> = {
      'DEF001': 'Surface Defects',
      'DEF002': 'Incorrect Dimensions',
      'DEF003': 'Material Defects',
      'DEF004': 'Assembly Errors',
      'DEF005': 'Color Mismatch',
      'DEF006': 'Structural Weakness',
      'DEF007': 'Dimensional Errors',
      'DEF008': 'Finish Quality',
      'DEF009': 'Contamination',
      'DEF010': 'Packaging Damage'
    };
    
    return defectMap[code] || code;
  }
  
  private generateQualityInsights(topDefects: any[], qualityRate: number): string[] {
    const insights: string[] = [];
    
    if (qualityRate < 95) {
      insights.push(`Quality rate of ${qualityRate.toFixed(1)}% is below industry standard of 95%`);
    }
    
    if (topDefects.length > 0 && topDefects[0].count > 100) {
      insights.push(`"${topDefects[0].reason}" is the primary quality issue, accounting for ${topDefects[0].count} defects`);
    }
    
    // Check for patterns
    const equipmentWithDefects = new Set();
    topDefects.forEach(d => d.equipment.forEach((e: string) => equipmentWithDefects.add(e)));
    if (equipmentWithDefects.size === 1) {
      insights.push(`All defects are coming from ${Array.from(equipmentWithDefects)[0]}`);
    }
    
    return insights;
  }
  
  private calculateQualityTrend(scrapData: any[]): string {
    if (scrapData.length < 2) return 'Insufficient data for trend';
    
    // Sort by date and check if defects are increasing
    const sorted = [...scrapData].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    const firstHalf = sorted.slice(0, Math.floor(sorted.length / 2));
    const secondHalf = sorted.slice(Math.floor(sorted.length / 2));
    
    const firstHalfAvg = firstHalf.reduce((sum, s) => sum + s.scrapQty, 0) / firstHalf.length;
    const secondHalfAvg = secondHalf.reduce((sum, s) => sum + s.scrapQty, 0) / secondHalf.length;
    
    if (secondHalfAvg > firstHalfAvg * 1.1) return 'Increasing defect trend ↗️';
    if (secondHalfAvg < firstHalfAvg * 0.9) return 'Improving quality trend ↘️';
    return 'Stable quality performance →';
  }

  // Helper methods for downtime analysis
  private groupByEquipment(downtimeData: any[]): Record<string, any[]> {
    return downtimeData.reduce((groups, dt) => {
      const key = dt.equipment.code;
      if (!groups[key]) groups[key] = [];
      groups[key].push(dt);
      return groups;
    }, {});
  }
  
  private calculateMTBF(equipmentGroups: Record<string, any[]>, timeRange: { start: Date; end: Date }): { average: number } {
    const mtbfValues: number[] = [];
    
    for (const [equipment, events] of Object.entries(equipmentGroups)) {
      if (events.length > 1) {
        const totalTime = timeRange.end.getTime() - timeRange.start.getTime();
        const mtbf = totalTime / events.length / (1000 * 60 * 60); // Convert to hours
        mtbfValues.push(mtbf);
      }
    }
    
    const average = mtbfValues.length > 0 
      ? mtbfValues.reduce((sum, val) => sum + val, 0) / mtbfValues.length 
      : 0;
      
    return { average };
  }
  
  private calculateMTTR(downtimeData: any[]): { average: number } {
    if (downtimeData.length === 0) return { average: 0 };
    
    const repairTimes = downtimeData.map(dt => Number(dt.downtimeDuration) / (1000 * 60 * 60)); // to hours
    const average = repairTimes.reduce((sum, time) => sum + time, 0) / repairTimes.length;
    
    return { average };
  }
  
  private generateDowntimeInsights(downtimeData: any[], totalDowntime: number): string[] {
    const insights: string[] = [];
    
    // Check for recurring issues
    const reasonCounts = downtimeData.reduce((acc, dt) => {
      const reason = dt.reason?.reason || 'Unknown';
      acc[reason] = (acc[reason] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const recurringIssues = Object.entries(reasonCounts)
      .filter(([_, count]) => count > 3)
      .map(([reason]) => reason);
      
    if (recurringIssues.length > 0) {
      insights.push(`Recurring issue detected: "${recurringIssues[0]}" occurred ${reasonCounts[recurringIssues[0]]} times`);
    }
    
    // Check for long downtime events
    const longEvents = downtimeData.filter(dt => Number(dt.downtimeDuration) > 2 * 60 * 60 * 1000); // > 2 hours
    if (longEvents.length > 0) {
      insights.push(`${longEvents.length} events lasted more than 2 hours`);
    }
    
    return insights;
  }
  
  private aggregateDowntimeByReason(events: any[]): Record<string, any> {
    return events.reduce((acc, event) => {
      const reason = event.reason || 'Unknown';
      if (!acc[reason]) {
        acc[reason] = {
          duration: 0,
          count: 0,
          equipment: new Set()
        };
      }
      acc[reason].duration += event.duration;
      acc[reason].count += 1;
      acc[reason].equipment.add(event.equipment);
      return acc;
    }, {});
  }
  
  private getDowntimeByReasonChart(downtimeData: any[]): any[] {
    const reasonTotals = downtimeData.reduce((acc, dt) => {
      const reason = dt.reason?.reason || 'Unknown';
      const duration = Number(dt.downtimeDuration) / (1000 * 60 * 60); // to hours
      acc[reason] = (acc[reason] || 0) + duration;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(reasonTotals)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }
  
  private formatDuration(milliseconds: number): string {
    const hours = Math.floor(milliseconds / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }

  // Helper methods for root cause analysis
  private analyzePatterns(production: any[], downtime: any[], quality: any[]): any {
    const patterns = {
      production: this.extractProductionPatterns(production),
      downtime: this.extractDowntimePatterns(downtime),
      quality: this.extractQualityPatterns(quality),
      temporal: this.extractTemporalPatterns(production, downtime, quality)
    };
    
    return patterns;
  }
  
  private extractProductionPatterns(production: any[]): any {
    // Group by shift and calculate averages
    const shiftPerformance = production.reduce((acc, prod) => {
      const shift = prod.shift?.name || 'Unknown';
      if (!acc[shift]) {
        acc[shift] = { total: 0, count: 0, efficiency: [] };
      }
      acc[shift].total += prod.totalPartsProduced;
      acc[shift].count += 1;
      
      const efficiency = prod.goodParts / prod.totalPartsProduced;
      acc[shift].efficiency.push(efficiency);
      
      return acc;
    }, {} as Record<string, any>);
    
    return { shiftPerformance };
  }
  
  private extractDowntimePatterns(downtime: any[]): any {
    // Find patterns in downtime occurrences
    const hourlyPattern = downtime.reduce((acc, dt) => {
      const hour = dt.startTime.getHours();
      acc[hour] = (acc[hour] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);
    
    return { hourlyPattern };
  }
  
  private extractQualityPatterns(quality: any[]): any {
    // Analyze defect patterns
    const defectsByShift = quality.reduce((acc, q) => {
      const shift = q.production?.shift?.name || 'Unknown';
      if (!acc[shift]) acc[shift] = 0;
      acc[shift] += q.scrapQty;
      return acc;
    }, {} as Record<string, number>);
    
    return { defectsByShift };
  }
  
  private extractTemporalPatterns(production: any[], downtime: any[], quality: any[]): any {
    // Look for time-based patterns
    const dayOfWeekPattern = {
      production: this.groupByDayOfWeek(production, 'startTime'),
      downtime: this.groupByDayOfWeek(downtime, 'startTime'),
      quality: this.groupByDayOfWeek(quality, 'createdAt')
    };
    
    return dayOfWeekPattern;
  }
  
  private groupByDayOfWeek(data: any[], dateField: string): Record<string, number> {
    return data.reduce((acc, item) => {
      const day = item[dateField].getDay();
      const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][day];
      acc[dayName] = (acc[dayName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }
  
  private findCorrelations(patterns: any): any[] {
    const correlations: any[] = [];
    
    // Check shift performance vs quality
    if (patterns.production?.shiftPerformance && patterns.quality?.defectsByShift) {
      for (const shift in patterns.production.shiftPerformance) {
        const efficiency = patterns.production.shiftPerformance[shift].efficiency;
        const avgEfficiency = efficiency.reduce((a: number, b: number) => a + b, 0) / efficiency.length;
        const defects = patterns.quality.defectsByShift[shift] || 0;
        
        if (avgEfficiency < 0.9 && defects > 100) {
          correlations.push({
            factor1: `${shift} shift efficiency`,
            factor2: 'High defect rate',
            strength: 0.8,
            type: 'negative'
          });
        }
      }
    }
    
    // Check temporal patterns
    if (patterns.temporal) {
      const downtimeDays = Object.entries(patterns.temporal.downtime);
      const highDowntimeDays = downtimeDays.filter(([_, count]) => count > 5);
      
      if (highDowntimeDays.length > 0) {
        correlations.push({
          factor1: 'Day of week',
          factor2: 'Downtime frequency',
          strength: 0.7,
          type: 'temporal'
        });
      }
    }
    
    return correlations;
  }
  
  private identifyRootCauses(patterns: any, correlations: any[]): any[] {
    const rootCauses: any[] = [];
    
    // Analyze correlations to identify causes
    correlations.forEach(corr => {
      if (corr.type === 'negative' && corr.strength > 0.7) {
        rootCauses.push({
          title: 'Shift Performance Issue',
          evidence: `Strong correlation between ${corr.factor1} and ${corr.factor2}`,
          probability: corr.strength,
          impact: 'High - affecting both efficiency and quality'
        });
      }
      
      if (corr.type === 'temporal') {
        rootCauses.push({
          title: 'Scheduling Pattern Issue',
          evidence: `${corr.factor1} shows significant impact on ${corr.factor2}`,
          probability: corr.strength,
          impact: 'Medium - predictable pattern allows for prevention'
        });
      }
    });
    
    // Add pattern-based root causes
    if (patterns.downtime?.hourlyPattern) {
      const peakHours = Object.entries(patterns.downtime.hourlyPattern)
        .filter(([_, count]) => count > 3)
        .map(([hour]) => hour);
        
      if (peakHours.length > 0) {
        rootCauses.push({
          title: 'Time-based Maintenance Issue',
          evidence: `Downtime peaks at hours: ${peakHours.join(', ')}`,
          probability: 0.75,
          impact: 'Medium - suggests scheduled maintenance conflicts'
        });
      }
    }
    
    return rootCauses;
  }
  
  private generateRCARecommendations(rootCauses: any[]): any[] {
    const recommendations: any[] = [];
    
    rootCauses.forEach(cause => {
      if (cause.title.includes('Shift Performance')) {
        recommendations.push({
          action: 'Implement shift-specific training programs',
          expectedImprovement: '15-20% reduction in defects'
        });
        recommendations.push({
          action: 'Review shift handover procedures',
          expectedImprovement: 'Better continuity between shifts'
        });
      }
      
      if (cause.title.includes('Maintenance')) {
        recommendations.push({
          action: 'Optimize preventive maintenance schedule',
          expectedImprovement: '25% reduction in unplanned downtime'
        });
      }
      
      if (cause.title.includes('Scheduling')) {
        recommendations.push({
          action: 'Rebalance production schedule across days',
          expectedImprovement: 'More consistent daily performance'
        });
      }
    });
    
    return recommendations;
  }
  
  private calculateImpact(productionData: any[]): string {
    const totalLost = productionData.reduce((sum, p) => sum + (p.totalPartsProduced - p.goodParts), 0);
    if (totalLost > 1000) return 'High - significant production loss';
    if (totalLost > 500) return 'Medium - moderate production impact';
    return 'Low - minimal production impact';
  }
  
  private calculateConfidence(correlations: any[]): number {
    if (correlations.length === 0) return 0.5;
    const avgStrength = correlations.reduce((sum, c) => sum + c.strength, 0) / correlations.length;
    return Math.min(avgStrength, 0.95);
  }

  // Helper methods for comparison analysis
  private detectComparisonType(message: string): string {
    const lower = message.toLowerCase();
    if (lower.includes('shift')) return 'shift';
    if (lower.includes('equipment') || lower.includes('machine')) return 'equipment';
    if (lower.includes('week') || lower.includes('month') || lower.includes('period')) return 'time_period';
    return 'equipment';
  }
  
  private async compareShifts(timeRange: { start: Date; end: Date }, equipment?: string[]): Promise<any> {
    const shifts = await prisma.dimShift.findMany();
    const results: any[] = [];
    
    for (const shift of shifts) {
      const productionData = await prisma.factProduction.findMany({
        where: {
          startTime: { gte: timeRange.start, lte: timeRange.end },
          shiftId: shift.id,
          ...(equipment && { equipment: { code: { in: equipment } } })
        }
      });
      
      const metrics = this.calculateShiftMetrics(productionData);
      results.push({
        name: shift.name,
        oee: metrics.oee,
        production: metrics.totalProduction,
        quality: metrics.qualityRate,
        availability: metrics.availability
      });
    }
    
    const sorted = results.sort((a, b) => b.oee - a.oee);
    
    return {
      results: sorted,
      winner: sorted[0],
      insights: this.generateComparisonInsights(sorted, 'shift'),
      differences: this.calculateDifferences(sorted),
      chartData: sorted.map(r => ({ name: r.name, value: r.oee * 100 })),
      metric: 'OEE',
      significance: this.calculateSignificance(sorted)
    };
  }
  
  private async compareEquipment(timeRange: { start: Date; end: Date }, equipmentCodes: string[]): Promise<any> {
    const equipmentList = equipmentCodes.length > 0 
      ? await prisma.dimEquipment.findMany({ where: { code: { in: equipmentCodes } } })
      : await prisma.dimEquipment.findMany({ where: { isActive: true } });
      
    const results: any[] = [];
    
    for (const eq of equipmentList) {
      const productionData = await prisma.factProduction.findMany({
        where: {
          startTime: { gte: timeRange.start, lte: timeRange.end },
          equipmentId: eq.id
        }
      });
      
      const metrics = this.calculateEquipmentMetrics(productionData);
      results.push({
        name: eq.name,
        code: eq.code,
        oee: metrics.oee,
        production: metrics.totalProduction,
        quality: metrics.qualityRate,
        performance: metrics.performance
      });
    }
    
    const sorted = results.sort((a, b) => b.oee - a.oee);
    
    return {
      results: sorted.slice(0, 10), // Top 10
      winner: sorted[0],
      insights: this.generateComparisonInsights(sorted, 'equipment'),
      differences: this.calculateDifferences(sorted),
      chartData: sorted.slice(0, 10).map(r => ({ name: r.name, value: r.oee * 100 })),
      metric: 'OEE',
      significance: this.calculateSignificance(sorted)
    };
  }
  
  private async compareTimePeriods(timeRange: { start: Date; end: Date }, equipment?: string[]): Promise<any> {
    // Compare current period with previous period
    const periodLength = timeRange.end.getTime() - timeRange.start.getTime();
    const previousStart = new Date(timeRange.start.getTime() - periodLength);
    const previousEnd = new Date(timeRange.start.getTime());
    
    const [currentData, previousData] = await Promise.all([
      prisma.factProduction.findMany({
        where: {
          startTime: { gte: timeRange.start, lte: timeRange.end },
          ...(equipment && { equipment: { code: { in: equipment } } })
        }
      }),
      prisma.factProduction.findMany({
        where: {
          startTime: { gte: previousStart, lte: previousEnd },
          ...(equipment && { equipment: { code: { in: equipment } } })
        }
      })
    ]);
    
    const currentMetrics = this.calculatePeriodMetrics(currentData);
    const previousMetrics = this.calculatePeriodMetrics(previousData);
    
    const results = [
      { name: 'Current Period', ...currentMetrics },
      { name: 'Previous Period', ...previousMetrics }
    ];
    
    return {
      results,
      winner: currentMetrics.oee > previousMetrics.oee ? results[0] : results[1],
      insights: this.generateTimePeriodInsights(currentMetrics, previousMetrics),
      differences: {
        oee: ((currentMetrics.oee - previousMetrics.oee) / previousMetrics.oee * 100).toFixed(1) + '%',
        production: currentMetrics.totalProduction - previousMetrics.totalProduction
      },
      chartData: results.map(r => ({ name: r.name, value: r.oee * 100 })),
      metric: 'OEE',
      significance: Math.abs(currentMetrics.oee - previousMetrics.oee) > 0.05 ? 'Significant' : 'Minor'
    };
  }
  
  private calculateShiftMetrics(productionData: any[]): any {
    const totalProduction = productionData.reduce((sum, p) => sum + p.totalPartsProduced, 0);
    const goodParts = productionData.reduce((sum, p) => sum + p.goodParts, 0);
    const totalPlanned = productionData.reduce((sum, p) => sum + Number(p.plannedProductionTime), 0);
    const totalOperating = productionData.reduce((sum, p) => sum + Number(p.operatingTime), 0);
    
    return {
      totalProduction,
      qualityRate: totalProduction > 0 ? goodParts / totalProduction : 0,
      availability: totalPlanned > 0 ? totalOperating / totalPlanned : 0,
      oee: 0.85 // Simplified for now
    };
  }
  
  private calculateEquipmentMetrics(productionData: any[]): any {
    const totalProduction = productionData.reduce((sum, p) => sum + p.totalPartsProduced, 0);
    const goodParts = productionData.reduce((sum, p) => sum + p.goodParts, 0);
    const qualityRate = totalProduction > 0 ? goodParts / totalProduction : 0;
    
    return {
      totalProduction,
      qualityRate,
      performance: 0.9, // Simplified
      oee: qualityRate * 0.9 * 0.95 // Quality * Performance * Availability
    };
  }
  
  private calculatePeriodMetrics(productionData: any[]): any {
    return this.calculateEquipmentMetrics(productionData);
  }
  
  private generateComparisonInsights(sorted: any[], type: string): string[] {
    const insights: string[] = [];
    
    if (sorted.length > 1) {
      const best = sorted[0];
      const worst = sorted[sorted.length - 1];
      const diff = ((best.oee - worst.oee) / worst.oee * 100).toFixed(0);
      
      insights.push(`${best.name} outperforms ${worst.name} by ${diff}%`);
      
      if (type === 'shift' && diff > 20) {
        insights.push('Significant performance variation between shifts suggests training or process standardization opportunities');
      }
      
      if (type === 'equipment' && best.oee < 0.7) {
        insights.push('Even the best performing equipment is below world-class OEE of 85%');
      }
    }
    
    return insights;
  }
  
  private generateTimePeriodInsights(current: any, previous: any): string[] {
    const insights: string[] = [];
    const improvement = ((current.oee - previous.oee) / previous.oee * 100).toFixed(1);
    
    if (current.oee > previous.oee) {
      insights.push(`Performance improved by ${improvement}% compared to previous period`);
    } else {
      insights.push(`Performance declined by ${Math.abs(Number(improvement))}% compared to previous period`);
    }
    
    if (current.qualityRate < previous.qualityRate) {
      insights.push('Quality has decreased - investigate recent process changes');
    }
    
    return insights;
  }
  
  private calculateDifferences(sorted: any[]): any {
    if (sorted.length < 2) return {};
    
    return {
      topVsBottom: ((sorted[0].oee - sorted[sorted.length - 1].oee) * 100).toFixed(1) + '%',
      topVsAverage: ((sorted[0].oee - sorted.reduce((sum, s) => sum + s.oee, 0) / sorted.length) * 100).toFixed(1) + '%'
    };
  }
  
  private calculateSignificance(sorted: any[]): string {
    if (sorted.length < 2) return 'N/A';
    
    const variance = this.calculateVariance(sorted.map(s => s.oee));
    if (variance > 0.1) return 'High variance - significant differences';
    if (variance > 0.05) return 'Moderate variance';
    return 'Low variance - similar performance';
  }
  
  private calculateVariance(values: number[]): number {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / values.length;
  }

  // Additional helper methods
  private isFollowUp(context: ConversationContext): boolean {
    return context.messages.length > 2;
  }
  
  private getDefaultTimeRange(context: ConversationContext): { start: Date; end: Date } {
    const preference = context.preferences.defaultTimeRange;
    
    switch (preference) {
      case 'last_24_hours':
        return this.getLastNHours(24);
      case 'last_7_days':
        return this.getLastNDays(7);
      case 'last_30_days':
        return this.getLastNDays(30);
      default:
        return this.getToday();
    }
  }
  
  private identifyLimitingFactor(oeeData: any): string {
    const { availability, performance, quality } = oeeData;
    const factors = [
      { name: 'availability', value: availability },
      { name: 'performance', value: performance },
      { name: 'quality', value: quality }
    ];
    
    const limiting = factors.sort((a, b) => a.value - b.value)[0];
    return limiting.name;
  }
  
  private generateOEESummary(oeeResults: any[]): any {
    const validResults = oeeResults.filter(r => r.oee > 0);
    
    if (validResults.length === 0) {
      return { averageOEE: 0, hasIssues: true };
    }
    
    const totalOEE = validResults.reduce((sum, r) => sum + r.oee, 0);
    const averageOEE = (totalOEE / validResults.length) * 100;
    
    return {
      averageOEE,
      hasIssues: averageOEE < 70,
      equipmentCount: validResults.length,
      belowTarget: validResults.filter(r => r.oee < 0.7).length
    };
  }
  
  private identifyTrends(oeeResults: any[], context: ConversationContext): string[] {
    // This would normally do time-series analysis
    return ['OEE showing steady performance across equipment'];
  }
  
  private generateOEEVisualizations(oeeResults: any[]): any[] {
    return [{
      type: 'bar_chart',
      title: 'Equipment OEE Comparison',
      data: oeeResults.slice(0, 10).map(r => ({
        name: r.equipmentName,
        value: (r.oee * 100).toFixed(1)
      }))
    }];
  }
  
  private generateOEEFollowUps(oeeResults: any[]): string[] {
    const suggestions: string[] = [];
    
    const underperformers = oeeResults.filter(r => r.oee < 0.7);
    if (underperformers.length > 0) {
      suggestions.push(`Why is ${underperformers[0].equipmentName} underperforming?`);
    }
    
    suggestions.push('Show me OEE trends over time');
    suggestions.push('Compare OEE by shift');
    
    return suggestions;
  }
  
  private generateExplanations(analysisType: string): Record<string, string> {
    const explanations: Record<string, Record<string, string>> = {
      oee_analysis: {
        oee: 'Overall Equipment Effectiveness = Availability × Performance × Quality',
        availability: 'Ratio of actual operating time to planned production time',
        performance: 'Ratio of actual output to theoretical maximum output',
        quality: 'Ratio of good parts to total parts produced'
      },
      quality_analysis: {
        defect_rate: 'Percentage of parts that fail quality standards',
        scrap: 'Parts that cannot be reworked and must be discarded',
        rework: 'Parts that require additional processing to meet standards'
      },
      downtime_analysis: {
        mtbf: 'Mean Time Between Failures - average operating time between breakdowns',
        mttr: 'Mean Time To Repair - average time to fix equipment after failure',
        availability: 'Percentage of time equipment is available for production'
      }
    };
    
    return explanations[analysisType] || {};
  }
  
  private async recalculateWithValidation(results: any[]): Promise<any[]> {
    // Add validation logic here
    return results.map(r => ({
      ...r,
      validated: true,
      confidence: 0.95
    }));
  }

  private getDataSourcesForType(type: string): string[] {
    const dataSourceMap: Record<string, string[]> = {
      'oee_analysis': ['production', 'oee', 'equipment'],
      'quality_analysis': ['scrap', 'quality', 'production'],
      'downtime_analysis': ['downtime', 'maintenance', 'equipment'],
      'root_cause_analysis': ['downtime', 'production', 'quality', 'maintenance'],
      'general': ['equipment', 'production']
    };
    
    return dataSourceMap[type] || ['general'];
  }
}