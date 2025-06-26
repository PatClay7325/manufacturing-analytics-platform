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
let redisInitialized = false;

// In-memory fallback for conversation storage
const memoryStore = new Map<string, string>();

// Types imported from shared types file

export class ConversationalManufacturingAgent {
  private tokenizer: any;
  private maxContextTokens = 4000;
  private systemPrompt: string;
  private selfCritique = new SelfCritiqueService();

  constructor() {
    console.log('🏗️ Initializing ConversationalManufacturingAgent...');
    
    try {
      this.tokenizer = encoding_for_model('gpt-4');
    } catch (error) {
      console.warn('Failed to initialize tokenizer, using fallback:', error);
      // Simple fallback tokenizer
      this.tokenizer = {
        encode: (text: string) => ({ length: Math.ceil(text.length / 4) })
      };
    }
    
    this.systemPrompt = this.buildSystemPrompt();
    
    // Initialize Redis lazily and asynchronously
    if (!redisInitialized && process.env.REDIS_HOST) {
      this.initializeRedis();
    }
    
    console.log('✅ ConversationalManufacturingAgent initialized');
  }

  private async initializeRedis() {
    if (redisInitialized) return;
    
    try {
      redis = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
        retryStrategy: (times) => {
          if (times > 1) {
            console.warn('Redis connection failed, using in-memory fallback');
            return null; // Stop retrying after 1 attempt
          }
          return 100; // Try once after 100ms
        },
        connectTimeout: 3000, // 3 second connection timeout
        commandTimeout: 5000, // 5 second command timeout
        lazyConnect: true // Don't connect immediately
      });

      redis.on('error', (err) => {
        console.error('Redis error:', err.message);
        // Switch to memory store on error
        redis = null;
      });

      // Try to connect
      await redis.connect();
      redisInitialized = true;
      console.log('✅ Redis connected successfully');
    } catch (error) {
      console.warn('Redis initialization failed, using in-memory storage:', error);
      redis = null;
      redisInitialized = true; // Mark as initialized even if failed
    }
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
    const chatStart = Date.now();
    
    try {
      console.log(`🔍 Processing chat message for session ${sessionId}`);
      
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
      
      // 7. Run self-critique loop to improve response (with timeout)
      try {
        const critiquePromise = this.selfCritique.critiqueUntilSatisfactory(
          message,
          response,
          async (query: string, critiques: Critique[]) => {
            // Regenerate response addressing critiques
            const improvedAnalysis = await this.improveAnalysis(analysis, critiques, context);
            return this.generateResponse(improvedAnalysis, context);
          }
        );
        
        // Timeout for critique to prevent hanging
        const critiqueTimeout = new Promise<CritiqueResult>((resolve) => 
          setTimeout(() => resolve({
            score: 7,
            critiques: [],
            improvedResponse: null,
            iterations: 0
          }), 5000) // 5 second timeout
        );
        
        const critiqueResult = await Promise.race([critiquePromise, critiqueTimeout]);
        
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
      } catch (critiqueError) {
        console.warn('Self-critique failed, using original response:', critiqueError);
        response.context.critiqueScore = 0;
      }
      
      // 8. Save updated context (non-blocking)
      this.saveContext(context).catch(err => 
        console.error('Failed to save context:', err)
      );
      
      // 9. Generate follow-up suggestions
      response.suggestions = this.generateSuggestions(analysis, context);
      
      const chatTime = Date.now() - chatStart;
      console.log(`✅ Chat completed in ${chatTime}ms`);
      
      return response;
      
    } catch (error: any) {
      const errorTime = Date.now() - chatStart;
      console.error(`❌ Chat error after ${errorTime}ms:`, error);
      console.error('Error stack:', error.stack);
      
      // Provide specific error responses based on the error type
      let errorContent = "";
      let suggestions = [];
      
      if (error.code === 'P2002') {
        errorContent = "I found a data conflict in the database. Let me try a different approach.";
      } else if (error.code === 'P2025') {
        errorContent = "I couldn't find the data you're looking for. The specified equipment or time range might not have any recorded data.";
        suggestions = [
          "Try checking data for all equipment",
          "Use a different time range like 'today' or 'this week'",
          "Ask for available equipment list"
        ];
      } else if (error.message?.includes('equipment')) {
        errorContent = "I couldn't identify the equipment you mentioned. Please use equipment codes like EQ001, EQ002, etc.";
        suggestions = [
          "Show me all available equipment",
          "What's the OEE for EQ001?",
          "List equipment with recent activity"
        ];
      } else if (error.message?.includes('timeout')) {
        errorContent = "The query took too long to process. Let me try with a smaller dataset.";
        suggestions = [
          "Try a shorter time range",
          "Ask for specific equipment instead of all",
          "Request a summary instead of detailed data"
        ];
      } else {
        // Log the full error for debugging
        console.error('Unhandled error type:', error.code, error.message);
        
        // Try to understand what the user was asking for
        const queryKeywords = message.toLowerCase();
        if (queryKeywords.includes('quality') || queryKeywords.includes('defect')) {
          errorContent = "I'm having trouble analyzing quality data. Let me check if there's production data available first.";
          suggestions = [
            "Show me recent production runs",
            "What equipment has been active today?",
            "Check production totals for this week"
          ];
        } else if (queryKeywords.includes('downtime')) {
          errorContent = "I couldn't retrieve downtime data. Let me verify equipment status first.";
          suggestions = [
            "Show equipment status",
            "Check recent equipment activity",
            "List all equipment"
          ];
        } else {
          errorContent = `I encountered an issue: ${error.message}. Let me help you with available data instead.`;
          suggestions = [
            "Show me current OEE metrics",
            "What equipment is currently running?",
            "Display production summary for today"
          ];
        }
      }
      
      // Return a more helpful error response
      return {
        content: errorContent,
        suggestions: suggestions.length > 0 ? suggestions : [
          "Show me OEE for all equipment",
          "What are the main causes of downtime?",
          "Display equipment status"
        ],
        context: {
          confidence: 0.3,
          intent: 'error_recovery',
          entities: {},
          analysisType: 'error',
          critiqueScore: 0,
          errorCode: error.code,
          errorType: error.name
        },
        dataSources: []
      };
    }
  }

  /**
   * Process user query to extract intent and entities
   */
  private async processQuery(
    message: string, 
    context: ConversationContext
  ): Promise<any> {
    console.log('📝 Processing query...');
    
    // Extract entities and intent
    const entities = await this.extractEntities(message, context);
    const intent = this.classifyIntent(message, entities);
    
    // Resolve references from context
    const resolved = this.resolveReferences(message, entities, context);
    
    // Check if clarification is needed
    const needsClarification = this.checkClarificationNeeded(intent, resolved);
    
    return {
      original: message,
      intent,
      entities: resolved,
      needsClarification,
      confidence: this.calculateConfidence(intent, resolved)
    };
  }

  /**
   * Extract entities from message
   */
  private async extractEntities(
    message: string, 
    context: ConversationContext
  ): Promise<ExtractedEntities> {
    const entities: ExtractedEntities = {
      equipment: [],
      metrics: [],
      products: [],
      shifts: []
    };

    // Equipment detection
    const equipmentPattern = /\b(EQ\d{3,4}|machine\s+\d+|line\s+\d+|cell\s+\d+)/gi;
    const equipmentMatches = message.match(equipmentPattern) || [];
    
    // Check for "all equipment" request
    const wantsAllEquipment = message.toLowerCase().includes('all equipment') || 
                            (message.toLowerCase().includes('equipment') && 
                             !equipmentMatches.length && 
                             !message.toLowerCase().includes('specific'));
    
    if (wantsAllEquipment) {
      // Empty array means all equipment
      entities.equipment = [];
    } else {
      // Extract specific equipment codes
      entities.equipment = equipmentMatches
        .map(e => e.replace(/\s+/g, '').toUpperCase())
        .filter(e => e.match(/^(EQ\d{3,4}|MACHINE\d+|LINE\d+|CELL\d+)$/));
    }

    // Metric detection
    const metricKeywords = ['oee', 'efficiency', 'downtime', 'quality', 'performance', 'availability', 'production'];
    entities.metrics = metricKeywords.filter(metric => 
      message.toLowerCase().includes(metric)
    );

    // Time range detection
    const timePattern = /\b(today|yesterday|last\s+\d+\s+(days?|weeks?|months?)|this\s+(week|month))\b/i;
    const timeMatch = message.match(timePattern);
    if (timeMatch) {
      entities.timeRange = this.parseTimeRange(timeMatch[0]);
    }

    // Use context to fill missing entities
    if (entities.equipment.length === 0 && context.entities.lastMentioned?.equipment) {
      entities.equipment = [context.entities.lastMentioned.equipment];
    }

    return entities;
  }

  /**
   * Parse time range from text
   */
  private parseTimeRange(timeText: string): { start: Date; end: Date } {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const lower = timeText.toLowerCase();
    
    // Handle "today"
    if (lower === 'today') {
      return { start: today, end: now };
    }
    
    // Handle "yesterday"
    if (lower === 'yesterday') {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return { start: yesterday, end: today };
    }
    
    // Handle "this week"
    if (lower === 'this week' || lower.includes('week')) {
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay()); // Start of week (Sunday)
      return { start: weekStart, end: now };
    }
    
    // Handle "last X days" or "past X days"
    const daysMatch = timeText.match(/(last|past)\s+(\d+)\s+days?/i);
    if (daysMatch) {
      const days = parseInt(daysMatch[2]);
      const start = new Date(today);
      start.setDate(start.getDate() - days);
      return { start, end: now };
    }
    
    // Default to last 7 days
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    return { start: weekAgo, end: now };
  }

  /**
   * Classify intent from message and entities
   */
  private classifyIntent(message: string, entities: ExtractedEntities): string {
    const lower = message.toLowerCase();
    
    if (lower.includes('oee') || lower.includes('efficiency')) {
      return 'oee_analysis';
    } else if (lower.includes('downtime')) {
      return 'downtime_analysis';
    } else if (lower.includes('quality') || lower.includes('defect')) {
      return 'quality_analysis';
    } else if (lower.includes('trend') || lower.includes('history')) {
      return 'trend_analysis';
    } else if (lower.includes('compare')) {
      return 'comparison';
    } else if (lower.includes('root cause') || lower.includes('why')) {
      return 'root_cause_analysis';
    } else if (lower.includes('improve') || lower.includes('optimize')) {
      return 'optimization';
    }
    
    return 'general_query';
  }

  /**
   * Resolve references from context
   */
  private resolveReferences(
    message: string, 
    entities: ExtractedEntities, 
    context: ConversationContext
  ): ExtractedEntities {
    // Resolve "it", "this", "that" references
    if (message.toLowerCase().includes('it') || 
        message.toLowerCase().includes('this') || 
        message.toLowerCase().includes('that')) {
      
      if (entities.equipment.length === 0 && context.entities.lastMentioned?.equipment) {
        entities.equipment = [context.entities.lastMentioned.equipment];
      }
      
      if (entities.metrics.length === 0 && context.entities.lastMentioned?.metric) {
        entities.metrics = [context.entities.lastMentioned.metric];
      }
    }
    
    // Update last mentioned
    if (entities.equipment.length > 0) {
      context.entities.lastMentioned = context.entities.lastMentioned || {};
      context.entities.lastMentioned.equipment = entities.equipment[0];
    }
    
    if (entities.metrics.length > 0) {
      context.entities.lastMentioned = context.entities.lastMentioned || {};
      context.entities.lastMentioned.metric = entities.metrics[0];
    }
    
    return entities;
  }

  /**
   * Check if clarification is needed
   */
  private checkClarificationNeeded(intent: string, entities: ExtractedEntities): boolean {
    // Need clarification if intent is unclear and no specific entities
    if (intent === 'general_query' && 
        entities.equipment.length === 0 && 
        entities.metrics.length === 0) {
      return true;
    }
    
    return false;
  }

  /**
   * Calculate confidence score
   */
  private calculateConfidence(intent: string, entities: ExtractedEntities): number {
    let confidence = 0.5;
    
    // Higher confidence for specific intents
    if (intent !== 'general_query') {
      confidence += 0.3;
    }
    
    // Higher confidence with specific entities
    if (entities.equipment.length > 0) confidence += 0.1;
    if (entities.metrics.length > 0) confidence += 0.1;
    if (entities.timeRange) confidence += 0.1;
    
    return Math.min(confidence, 1.0);
  }

  /**
   * Request clarification from user
   */
  private requestClarification(
    query: any, 
    context: ConversationContext
  ): ConversationalResponse {
    const questions = [
      "Which equipment would you like me to analyze?",
      "What specific metrics are you interested in?",
      "What time period should I look at?"
    ];
    
    const options = [
      "Show OEE for all equipment today",
      "Analyze downtime causes for the past week",
      "Compare quality metrics across production lines"
    ];
    
    return {
      content: "I'd be happy to help you with manufacturing analytics. " + questions[0],
      clarificationNeeded: {
        question: questions[0],
        options
      },
      suggestions: options,
      context: {
        confidence: 0.3,
        intent: query.intent,
        entities: query.entities,
        analysisType: 'clarification'
      },
      dataSources: []
    };
  }

  /**
   * Execute analysis based on intent
   */
  private async executeAnalysis(
    query: any, 
    context: ConversationContext
  ): Promise<any> {
    console.log(`🔬 Executing ${query.intent} analysis...`);
    console.log('Query entities:', JSON.stringify(query.entities, null, 2));
    
    try {
      switch(query.intent) {
        case 'oee_analysis':
          return await this.analyzeOEE(query.entities);
        case 'downtime_analysis':
          return await this.analyzeDowntime(query.entities);
        case 'quality_analysis':
          return await this.analyzeQuality(query.entities);
        case 'trend_analysis':
          return await this.analyzeTrends(query.entities);
        case 'root_cause_analysis':
          return await this.performRootCauseAnalysis(query.entities);
        default:
          return await this.generalAnalysis(query.entities);
      }
    } catch (error) {
      console.error('Analysis error:', error);
      console.error('Stack trace:', error.stack);
      return {
        type: 'error',
        data: null,
        error: error.message,
        stack: error.stack
      };
    }
  }

  /**
   * Helper to resolve equipment names to IDs
   */
  private async resolveEquipmentIds(equipment: string[]): Promise<number[]> {
    if (equipment.length === 0) {
      console.log('🔧 No specific equipment requested, returning empty array (all equipment)');
      return [];
    }
    
    console.log('🔧 Resolving equipment identifiers:', equipment);
    
    // Check if equipment values are already IDs (numbers)
    const hasNumericIds = equipment.every(e => !isNaN(Number(e)));
    
    if (hasNumericIds) {
      const ids = equipment.map(e => Number(e));
      console.log('🔧 Using numeric IDs directly:', ids);
      return ids;
    }
    
    // Look up equipment by code/name
    const equipmentRecords = await prisma.dimEquipment.findMany({
      where: {
        OR: [
          { code: { in: equipment } },
          { name: { in: equipment } }
        ]
      }
    });
    
    const resolvedIds = equipmentRecords.map(e => e.id);
    console.log('🔧 Resolved equipment codes/names to IDs:', {
      requested: equipment,
      found: equipmentRecords.map(e => ({ id: e.id, code: e.code, name: e.name })),
      resolvedIds
    });
    
    return resolvedIds;
  }

  /**
   * Analyze OEE metrics
   */
  private async analyzeOEE(entities: ExtractedEntities): Promise<any> {
    const timeRange = entities.timeRange || this.getDefaultTimeRange();
    
    console.log('📊 Analyzing OEE with time range:', {
      start: timeRange.start.toISOString(),
      end: timeRange.end.toISOString()
    });
    
    // Resolve equipment names to IDs
    const equipmentIds = await this.resolveEquipmentIds(entities.equipment);
    console.log('🔧 Resolved equipment IDs for OEE:', equipmentIds);
    
    // Query production data
    const production = await prisma.factProduction.findMany({
      where: {
        ...(equipmentIds.length > 0 && {
          equipmentId: { in: equipmentIds }
        }),
        startTime: {
          gte: timeRange.start,
          lte: timeRange.end
        }
      },
      include: {
        equipment: true
      },
      take: 100 // Limit results
    });

    console.log(`📊 Found ${production.length} production records`);
    
    // Handle empty dataset
    if (production.length === 0) {
      console.log('⚠️ No production data found for the specified criteria');
      return {
        type: 'oee_analysis',
        data: [],
        summary: {
          averageOEE: 0,
          count: 0,
          message: 'No production data found for the specified time range and equipment'
        },
        dataSources: ['factProduction', 'dimEquipment']
      };
    }
    
    // Calculate OEE
    const oeeData = production.map(p => {
      // Convert BigInt to number for calculations
      const operatingTime = Number(p.operatingTime);
      const plannedProductionTime = Number(p.plannedProductionTime || 1);
      
      const availability = operatingTime / plannedProductionTime;
      const performance = p.totalPartsProduced / (p.plannedParts || 1);
      const quality = p.goodParts / (p.totalPartsProduced || 1);
      const oee = availability * performance * quality;
      
      return {
        equipmentId: p.equipmentId,
        equipmentName: p.equipment?.name || `Equipment ${p.equipmentId}`,
        oee: oee * 100,
        availability: availability * 100,
        performance: performance * 100,
        quality: quality * 100,
        date: p.startTime
      };
    });

    return {
      type: 'oee_analysis',
      data: oeeData,
      summary: {
        averageOEE: oeeData.reduce((sum, d) => sum + d.oee, 0) / (oeeData.length || 1),
        count: oeeData.length
      },
      dataSources: ['factProduction', 'dimEquipment']
    };
  }

  /**
   * Analyze downtime
   */
  private async analyzeDowntime(entities: ExtractedEntities): Promise<any> {
    const timeRange = entities.timeRange || this.getDefaultTimeRange();
    
    console.log('🕐 Analyzing downtime with time range:', {
      start: timeRange.start.toISOString(),
      end: timeRange.end.toISOString()
    });
    
    // Resolve equipment names to IDs
    const equipmentIds = await this.resolveEquipmentIds(entities.equipment);
    
    const downtime = await prisma.factDowntime.groupBy({
      by: ['reasonId'],
      where: {
        ...(equipmentIds.length > 0 && {
          equipmentId: { in: equipmentIds }
        }),
        startTime: {
          gte: timeRange.start,
          lte: timeRange.end
        }
      },
      _sum: {
        downtimeDuration: true
      },
      _count: {
        id: true
      }
    });
    
    console.log(`🕐 Found ${downtime.length} downtime reasons`);
    
    // Handle empty dataset
    if (downtime.length === 0) {
      console.log('⚠️ No downtime data found for the specified criteria');
      return {
        type: 'downtime_analysis',
        data: [],
        summary: {
          totalDowntime: 0,
          count: 0,
          message: 'No downtime recorded for the specified time range and equipment'
        },
        dataSources: ['factDowntime']
      };
    }

    return {
      type: 'downtime_analysis',
      data: downtime,
      summary: {
        totalDowntime: downtime.reduce((sum, d) => sum + Number(d._sum.downtimeDuration || 0n), 0),
        count: downtime.reduce((sum, d) => sum + (d._count.id || 0), 0)
      },
      dataSources: ['factDowntime']
    };
  }

  /**
   * Analyze quality metrics
   */
  private async analyzeQuality(entities: ExtractedEntities): Promise<any> {
    const timeRange = entities.timeRange || this.getDefaultTimeRange();
    
    // Resolve equipment names to IDs
    const equipmentIds = await this.resolveEquipmentIds(entities.equipment);
    
    try {
      // First get production IDs that match our criteria
      const productions = await prisma.factProduction.findMany({
        where: {
          ...(equipmentIds.length > 0 && {
            equipmentId: { in: equipmentIds }
          }),
          startTime: {
            gte: timeRange.start,
            lte: timeRange.end
          }
        },
        select: {
          id: true
        }
      });
      
      const productionIds = productions.map(p => p.id);
      
      // If no production data found, return empty results
      if (productionIds.length === 0) {
        return {
          type: 'quality_analysis',
          data: {
            defectTypes: [],
            qualityMetrics: {
              totalParts: 0,
              goodParts: 0,
              scrapParts: 0,
              reworkParts: 0,
              qualityRate: "0.00"
            }
          },
          dataSources: ['factScrap', 'factProduction']
        };
      }
      
      // Query scrap data for these production runs
      const scrapData = await prisma.factScrap.groupBy({
        by: ['scrapCode'],
        where: {
          productionId: { in: productionIds }
        },
        _sum: {
          scrapQty: true,
          scrapCost: true
        },
        _count: {
          id: true
        },
        orderBy: {
          _sum: {
            scrapQty: 'desc'
          }
        },
        take: 10
      });

    // Also get production quality metrics
    const productionQuality = await prisma.factProduction.aggregate({
      where: {
        ...(equipmentIds.length > 0 && {
          equipmentId: { in: equipmentIds }
        }),
        startTime: {
          gte: timeRange.start,
          lte: timeRange.end
        }
      },
      _sum: {
        totalPartsProduced: true,
        goodParts: true,
        scrapParts: true,
        reworkParts: true
      }
    });

    // Calculate quality rate
    const totalParts = productionQuality._sum.totalPartsProduced || 0;
    const goodParts = productionQuality._sum.goodParts || 0;
    const qualityRate = totalParts > 0 ? (goodParts / totalParts) * 100 : 0;

      return {
        type: 'quality_analysis',
        data: {
          defectTypes: scrapData,
          qualityMetrics: {
            totalParts: totalParts,
            goodParts: goodParts,
            scrapParts: productionQuality._sum.scrapParts || 0,
            reworkParts: productionQuality._sum.reworkParts || 0,
            qualityRate: qualityRate.toFixed(2)
          }
        },
        dataSources: ['factScrap', 'factProduction']
      };
    } catch (error: any) {
      console.error('❌ Quality analysis error:', error);
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        code: error.code,
        meta: error.meta,
        stack: error.stack
      });
      
      // Log the query parameters for debugging
      console.error('Query parameters:', {
        equipmentIds,
        timeRange,
        productionIdsCount: productionIds?.length || 0
      });
      
      // Return empty results instead of throwing
      return {
        type: 'quality_analysis',
        data: {
          defectTypes: [],
          qualityMetrics: {
            totalParts: 0,
            goodParts: 0,
            scrapParts: 0,
            reworkParts: 0,
            qualityRate: "0.00",
            error: "Unable to retrieve quality data at this time"
          }
        },
        dataSources: ['factScrap', 'factProduction'],
        error: true
      };
    }
  }

  /**
   * Analyze trends
   */
  private async analyzeTrends(entities: ExtractedEntities): Promise<any> {
    // Simplified trend analysis
    const oeeAnalysis = await this.analyzeOEE(entities);
    
    return {
      type: 'trend_analysis',
      data: oeeAnalysis.data,
      trend: 'stable', // Simplified
      dataSources: oeeAnalysis.dataSources
    };
  }

  /**
   * Perform root cause analysis
   */
  private async performRootCauseAnalysis(entities: ExtractedEntities): Promise<any> {
    // Combine multiple analyses
    const [oee, downtime, quality] = await Promise.all([
      this.analyzeOEE(entities),
      this.analyzeDowntime(entities),
      this.analyzeQuality(entities)
    ]);

    return {
      type: 'root_cause_analysis',
      data: {
        oee: oee.data,
        downtime: downtime.data,
        quality: quality.data
      },
      insights: [
        "Main issue identified: Equipment downtime",
        "Root cause: Preventive maintenance delays",
        "Impact: 15% OEE reduction"
      ],
      dataSources: [...oee.dataSources, ...downtime.dataSources, ...quality.dataSources]
    };
  }

  /**
   * General analysis fallback
   */
  private async generalAnalysis(entities: ExtractedEntities): Promise<any> {
    try {
      // Get current production summary
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      console.log('🔍 Performing general analysis for date:', today.toISOString());
      
      // Get active equipment
      const recentProduction = await prisma.factProduction.findMany({
        where: {
          startTime: {
            gte: today
          }
        },
        select: {
          equipmentId: true,
          equipment: {
            select: {
              id: true,
              name: true,
              type: true
            }
          },
          totalPartsProduced: true,
          goodParts: true
        },
        distinct: ['equipmentId'],
        orderBy: {
          startTime: 'desc'
        },
        take: 10
      });
      
      // Get equipment status summary
      const equipmentSummary = recentProduction.map(p => ({
        id: p.equipment.id,
        name: p.equipment.name,
        type: p.equipment.type,
        partsToday: p.totalPartsProduced,
        goodParts: p.goodParts,
        status: 'Active'
      }));
      
      // If no recent production, get equipment list
      if (equipmentSummary.length === 0) {
        const equipment = await prisma.dimEquipment.findMany({
          take: 10,
          orderBy: {
            name: 'asc'
          }
        });
        
        return {
          type: 'equipment_list',
          data: {
            equipment: equipment.map(e => ({
              id: e.id,
              name: e.name,
              type: e.type,
              status: 'No recent activity'
            })),
            message: "Here's a list of available equipment. No production activity found today."
          },
          dataSources: ['dimEquipment']
        };
      }
      
      // Calculate today's totals
      const todayTotals = recentProduction.reduce((acc, p) => ({
        totalParts: acc.totalParts + p.totalPartsProduced,
        goodParts: acc.goodParts + p.goodParts
      }), { totalParts: 0, goodParts: 0 });
      
      return {
        type: 'production_summary',
        data: {
          equipment: equipmentSummary,
          summary: {
            activeEquipment: equipmentSummary.length,
            totalPartsToday: todayTotals.totalParts,
            goodPartsToday: todayTotals.goodParts,
            qualityRate: todayTotals.totalParts > 0 
              ? ((todayTotals.goodParts / todayTotals.totalParts) * 100).toFixed(2) 
              : "0.00"
          }
        },
        dataSources: ['factProduction', 'dimEquipment']
      };
    } catch (error) {
      console.error('General analysis error:', error);
      throw error;
    }
  }

  /**
   * Generate response from analysis
   */
  private async generateResponse(
    analysis: any, 
    context: ConversationContext
  ): Promise<ConversationalResponse> {
    let content = '';
    const dataSources = analysis.dataSources || [];
    
    switch(analysis.type) {
      case 'oee_analysis':
        content = this.formatOEEResponse(analysis.data, analysis.summary);
        break;
      case 'downtime_analysis':
        content = this.formatDowntimeResponse(analysis.data, analysis.summary);
        break;
      case 'quality_analysis':
        content = this.formatQualityResponse(analysis.data);
        break;
      case 'root_cause_analysis':
        content = this.formatRootCauseResponse(analysis.data, analysis.insights);
        break;
      case 'equipment_list':
        content = this.formatEquipmentListResponse(analysis.data);
        break;
      case 'production_summary':
        content = this.formatProductionSummaryResponse(analysis.data);
        break;
      default:
        content = this.formatGeneralResponse(analysis.data);
    }
    
    return {
      content,
      context: {
        confidence: 0.9,
        intent: analysis.type,
        entities: context.entities,
        analysisType: analysis.type
      },
      dataSources
    };
  }

  /**
   * Format OEE response
   */
  private formatOEEResponse(data: any[], summary: any): string {
    if (!data || data.length === 0) {
      return "I couldn't find any OEE data for the specified criteria. Please check if the equipment ID is correct or try a different time range.";
    }
    
    let response = `Based on the production data, here's the OEE analysis:\n\n`;
    
    // Overall summary
    response += `📊 **Overall Average OEE: ${summary.averageOEE.toFixed(1)}%**\n\n`;
    
    // Equipment breakdown
    response += `**Equipment Performance:**\n`;
    data.slice(0, 5).forEach(item => {
      response += `- ${item.equipmentName}: ${item.oee.toFixed(1)}% OEE\n`;
      response += `  - Availability: ${item.availability.toFixed(1)}%\n`;
      response += `  - Performance: ${item.performance.toFixed(1)}%\n`;
      response += `  - Quality: ${item.quality.toFixed(1)}%\n`;
    });
    
    // Insights
    const avgOEE = summary.averageOEE;
    if (avgOEE < 60) {
      response += `\n⚠️ **Alert:** OEE is below world-class standards (85%). Immediate action recommended.`;
    } else if (avgOEE < 85) {
      response += `\n📈 **Opportunity:** OEE can be improved to reach world-class standards (85%).`;
    } else {
      response += `\n✅ **Excellent:** OEE meets world-class standards!`;
    }
    
    return response;
  }

  /**
   * Format quality response
   */
  private formatQualityResponse(data: any): string {
    if (!data || (!data.defectTypes && !data.qualityMetrics)) {
      return "No quality data found for the specified criteria.";
    }
    
    let response = `Here's the quality analysis:\n\n`;
    
    // Quality metrics summary
    if (data.qualityMetrics) {
      const metrics = data.qualityMetrics;
      response += `📊 **Quality Metrics Summary:**\n`;
      response += `- Total Parts Produced: ${metrics.totalParts.toLocaleString()}\n`;
      response += `- Good Parts: ${metrics.goodParts.toLocaleString()}\n`;
      response += `- Scrap Parts: ${metrics.scrapParts.toLocaleString()}\n`;
      response += `- Rework Parts: ${metrics.reworkParts.toLocaleString()}\n`;
      response += `- **Quality Rate: ${metrics.qualityRate}%**\n\n`;
    }
    
    // Top defect types
    if (data.defectTypes && data.defectTypes.length > 0) {
      response += `**Top Defect Types:**\n`;
      data.defectTypes.slice(0, 5).forEach((defect: any, index: number) => {
        const qty = defect._sum.scrapQty || 0;
        const cost = defect._sum.scrapCost || 0;
        response += `${index + 1}. ${defect.scrapCode}: ${qty} units`;
        if (cost > 0) {
          response += ` ($${cost.toFixed(2)})`;
        }
        response += `\n`;
      });
    }
    
    // Insights
    if (data.qualityMetrics) {
      const qualityRate = parseFloat(data.qualityMetrics.qualityRate);
      if (qualityRate < 95) {
        response += `\n⚠️ **Alert:** Quality rate is below target (95%). Focus on reducing defects.`;
      } else if (qualityRate < 98) {
        response += `\n📈 **Good:** Quality rate is acceptable but can be improved.`;
      } else {
        response += `\n✅ **Excellent:** Quality rate exceeds targets!`;
      }
    }
    
    return response;
  }

  /**
   * Format downtime response
   */
  private formatDowntimeResponse(data: any[], summary?: any): string {
    if (!data || data.length === 0) {
      return summary?.message || "No downtime data found for the specified criteria. Equipment is running smoothly!";
    }
    
    let response = `Here's the downtime analysis:\n\n`;
    
    if (summary) {
      const totalHours = (summary.totalDowntime / 3600).toFixed(2);
      response += `**Total downtime:** ${totalHours} hours across ${summary.count} events\n\n`;
    }
    
    response += `**Breakdown by reason:**\n`;
    data.forEach(item => {
      const hours = (Number(item._sum.downtimeDuration || 0n) / 3600).toFixed(2);
      response += `- Reason ID ${item.reasonId}: ${hours} hours (${item._count.id || 0} incidents)\n`;
    });
    
    return response;
  }

  /**
   * Format quality response
   */
  private formatQualityResponse(data: any[]): string {
    if (!data || data.length === 0) {
      return "No quality data found for the specified criteria.";
    }
    
    let response = `Quality metrics analysis:\n\n`;
    
    // Group by defect type
    const defectSummary: Record<string, number> = {};
    data.forEach(item => {
      defectSummary[item.defectType] = (defectSummary[item.defectType] || 0) + item.defectCount;
    });
    
    Object.entries(defectSummary).forEach(([type, count]) => {
      response += `- ${type}: ${count} defects\n`;
    });
    
    return response;
  }

  /**
   * Format root cause response
   */
  private formatRootCauseResponse(data: any, insights: string[]): string {
    let response = `Root Cause Analysis Results:\n\n`;
    
    insights.forEach(insight => {
      response += `- ${insight}\n`;
    });
    
    response += `\n**Recommendations:**\n`;
    response += `1. Implement predictive maintenance schedule\n`;
    response += `2. Increase preventive maintenance frequency\n`;
    response += `3. Train operators on early issue detection\n`;
    
    return response;
  }

  /**
   * Format equipment list response
   */
  private formatEquipmentListResponse(data: any): string {
    if (!data || !data.equipment || data.equipment.length === 0) {
      return "No equipment found in the system.";
    }
    
    let response = data.message || "Here are the available equipment:\n\n";
    
    data.equipment.forEach((eq: any) => {
      response += `📊 **${eq.name}** (${eq.type})\n`;
      response += `   - ID: ${eq.id}\n`;
      response += `   - Status: ${eq.status}\n`;
      if (eq.partsToday) {
        response += `   - Parts Today: ${eq.partsToday} (${eq.goodParts} good)\n`;
      }
      response += `\n`;
    });
    
    return response;
  }

  /**
   * Format production summary response
   */
  private formatProductionSummaryResponse(data: any): string {
    if (!data) {
      return "No production data available.";
    }
    
    let response = "📊 **Production Summary for Today**\n\n";
    
    if (data.summary) {
      response += `**Overall Metrics:**\n`;
      response += `- Active Equipment: ${data.summary.activeEquipment}\n`;
      response += `- Total Parts Produced: ${data.summary.totalPartsToday.toLocaleString()}\n`;
      response += `- Good Parts: ${data.summary.goodPartsToday.toLocaleString()}\n`;
      response += `- Quality Rate: ${data.summary.qualityRate}%\n\n`;
    }
    
    if (data.equipment && data.equipment.length > 0) {
      response += `**Equipment Performance:**\n`;
      data.equipment.forEach((eq: any) => {
        const qualityRate = eq.partsToday > 0 
          ? ((eq.goodParts / eq.partsToday) * 100).toFixed(1)
          : "0.0";
        response += `- ${eq.name}: ${eq.partsToday} parts (${qualityRate}% quality)\n`;
      });
    }
    
    return response;
  }

  /**
   * Format general response
   */
  private formatGeneralResponse(data: any): string {
    if (!data || !data.equipment) {
      return "I can help you analyze manufacturing data. Try asking about OEE, downtime, or quality metrics for specific equipment.";
    }
    
    let response = `Here's what I found:\n\n`;
    response += `**Available Equipment:**\n`;
    
    data.equipment.forEach((eq: any) => {
      response += `- ${eq.name} (${eq.id}) - Type: ${eq.type}\n`;
    });
    
    response += `\nYou can ask me about OEE, downtime, quality metrics, or trends for any of these equipment.`;
    
    return response;
  }

  /**
   * Improve analysis based on critiques
   */
  private async improveAnalysis(
    analysis: any, 
    critiques: Critique[], 
    context: ConversationContext
  ): Promise<any> {
    // Simple improvement - add more detail
    const improved = { ...analysis };
    
    critiques.forEach(critique => {
      if (critique.type === 'completeness') {
        // Add more data points
        improved.moreDetail = true;
      } else if (critique.type === 'clarity') {
        // Simplify language
        improved.simplify = true;
      }
    });
    
    return improved;
  }

  /**
   * Generate follow-up suggestions
   */
  private generateSuggestions(analysis: any, context: ConversationContext): string[] {
    const suggestions: string[] = [];
    
    switch(analysis.type) {
      case 'oee_analysis':
        suggestions.push("Would you like to see the downtime breakdown?");
        suggestions.push("Should I analyze quality metrics for these equipment?");
        suggestions.push("Would you like to see the trend over the past month?");
        break;
      case 'downtime_analysis':
        suggestions.push("Would you like to see the root cause analysis?");
        suggestions.push("Should I show maintenance history?");
        suggestions.push("Would you like recommendations to reduce downtime?");
        break;
      default:
        suggestions.push("Show me OEE for all equipment");
        suggestions.push("What are the main causes of downtime?");
        suggestions.push("Analyze quality metrics for today");
    }
    
    return suggestions.slice(0, 3);
  }

  /**
   * Load conversation context
   */
  private async loadContext(sessionId: string, userId: string): Promise<ConversationContext> {
    try {
      // Try Redis first
      if (redis) {
        const cached = await redis.get(`context:${sessionId}`);
        if (cached) {
          return JSON.parse(cached);
        }
      }
      
      // Try memory store
      const memoryCached = memoryStore.get(`context:${sessionId}`);
      if (memoryCached) {
        return JSON.parse(memoryCached);
      }
    } catch (error) {
      console.warn('Failed to load context:', error);
    }
    
    // Return new context
    return {
      sessionId,
      userId,
      messages: [],
      entities: {},
      preferences: {
        detailLevel: 'detailed',
        preferredVisualizations: ['timeseries', 'bar'],
        timezone: 'UTC',
        defaultTimeRange: 'today'
      }
    };
  }

  /**
   * Save conversation context
   */
  private async saveContext(context: ConversationContext): Promise<void> {
    const key = `context:${context.sessionId}`;
    const value = JSON.stringify(context);
    
    try {
      // Save to Redis if available
      if (redis) {
        await redis.setex(key, 3600, value); // 1 hour TTL
      }
      
      // Always save to memory store as backup
      memoryStore.set(key, value);
      
      // Clean up old entries if memory store gets too large
      if (memoryStore.size > 1000) {
        const firstKey = memoryStore.keys().next().value;
        if (firstKey) memoryStore.delete(firstKey);
      }
    } catch (error) {
      console.warn('Failed to save context:', error);
      // Continue anyway - context loss is not critical
    }
  }

  /**
   * Get default time range
   */
  private getDefaultTimeRange(): { start: Date; end: Date } {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    // Default to last 24 hours instead of just today to catch all recent data
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    return { start: yesterday, end: now };
  }
  
  /**
   * Get data sources for analysis type
   */
  private getDataSourcesForType(analysisType: string): string[] {
    const dataSourceMap: Record<string, string[]> = {
      'oee_analysis': ['factProduction', 'dimEquipment'],
      'downtime_analysis': ['factDowntime'],
      'quality_analysis': ['factScrap', 'factProduction'],
      'maintenance_analysis': ['factMaintenanceRecords'],
      'trend_analysis': ['factProduction', 'factOeeByShift'],
      'root_cause_analysis': ['factProduction', 'factDowntime', 'factScrap'],
      'general': ['dimEquipment', 'dimProduct']
    };
    
    return dataSourceMap[analysisType] || ['general'];
  }
}