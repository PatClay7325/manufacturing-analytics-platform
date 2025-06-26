/**
 * Lightweight Self-Critique Service
 * Evaluates and improves agent responses using ontology validation
 */

import { ManufacturingOntology, OntologyService } from '@/lib/ontology/manufacturing-ontology';
import { ConversationalResponse } from './types';

export interface CritiqueResult {
  score: number; // 0-10
  critiques: Critique[];
  suggestions: string[];
  improvedResponse?: ConversationalResponse;
}

export interface Critique {
  type: 'completeness' | 'accuracy' | 'relevance' | 'clarity' | 'ontology' | 'confidence';
  severity: 'low' | 'medium' | 'high';
  issue: string;
  suggestion: string;
  impact: number; // 0-3 points deduction
}

export class SelfCritiqueService {
  private readonly maxIterations = 3;
  
  /**
   * Main critique loop - evaluates and improves response until satisfactory
   */
  async critiqueUntilSatisfactory(
    query: string,
    response: ConversationalResponse,
    generateImprovedResponse: (query: string, critiques: Critique[]) => Promise<ConversationalResponse>
  ): Promise<CritiqueResult> {
    let currentResponse = response;
    let iteration = 0;
    let bestResult: CritiqueResult | null = null;
    
    while (iteration < this.maxIterations) {
      const result = await this.evaluateResponse(query, currentResponse);
      
      // Keep track of best result
      if (!bestResult || result.score > bestResult.score) {
        bestResult = result;
      }
      
      // If score is 10/10 or high enough, we're done
      if (result.score >= 9.5) {
        console.log(`✅ Achieved score ${result.score}/10 after ${iteration + 1} iterations`);
        return result;
      }
      
      // If we have high-severity critiques, try to improve
      const highSeverityCritiques = result.critiques.filter(c => c.severity === 'high');
      if (highSeverityCritiques.length > 0 && iteration < this.maxIterations - 1) {
        console.log(`🔄 Iteration ${iteration + 1}: Score ${result.score}/10, improving...`);
        currentResponse = await generateImprovedResponse(query, result.critiques);
        iteration++;
      } else {
        // No high severity issues or max iterations reached
        break;
      }
    }
    
    return bestResult!;
  }
  
  /**
   * Comprehensive response evaluation
   */
  async evaluateResponse(query: string, response: ConversationalResponse): Promise<CritiqueResult> {
    const critiques: Critique[] = [];
    
    // Run all evaluation checks
    const [
      completeness,
      ontologyValidation,
      confidence,
      relevance,
      clarity
    ] = await Promise.all([
      this.checkCompleteness(query, response),
      this.validateAgainstOntology(query, response),
      this.assessConfidence(response),
      this.checkRelevance(query, response),
      this.assessClarity(response)
    ]);
    
    critiques.push(...completeness, ...ontologyValidation, ...confidence, ...relevance, ...clarity);
    
    // Calculate score (start at 10, deduct for issues)
    let score = 10;
    for (const critique of critiques) {
      score -= critique.impact;
    }
    score = Math.max(0, score);
    
    // Generate improvement suggestions
    const suggestions = this.generateSuggestions(critiques);
    
    return {
      score,
      critiques,
      suggestions
    };
  }
  
  /**
   * Check if response completely addresses the query
   */
  private async checkCompleteness(query: string, response: ConversationalResponse): Promise<Critique[]> {
    const critiques: Critique[] = [];
    const queryLower = query.toLowerCase();
    
    // Extract expected elements from query
    const expectedElements = {
      timeframe: this.extractTimeframe(queryLower),
      metrics: this.extractMetrics(queryLower),
      entities: OntologyService.extractEntitiesFromText(query)
    };
    
    // Check if response addresses all expected elements
    if (expectedElements.timeframe && !this.responseContainsTimeframe(response)) {
      critiques.push({
        type: 'completeness',
        severity: 'medium',
        issue: 'Response does not specify the requested time period',
        suggestion: 'Include specific timeframe mentioned in the query',
        impact: 1
      });
    }
    
    if (expectedElements.metrics.length > 0) {
      const missingMetrics = expectedElements.metrics.filter(
        metric => !this.responseContainsMetric(response, metric)
      );
      
      if (missingMetrics.length > 0) {
        critiques.push({
          type: 'completeness',
          severity: 'high',
          issue: `Missing requested metrics: ${missingMetrics.join(', ')}`,
          suggestion: 'Include all requested metrics in the response',
          impact: 2
        });
      }
    }
    
    // Check for data availability issues
    if (response.content.toLowerCase().includes('no data available') || 
        response.content.toLowerCase().includes('no production data')) {
      critiques.push({
        type: 'completeness',
        severity: 'high',
        issue: 'Response indicates missing data without attempting alternatives',
        suggestion: 'Provide available related data or explain data collection requirements',
        impact: 2
      });
    }
    
    return critiques;
  }
  
  /**
   * Validate response against manufacturing ontology
   */
  private async validateAgainstOntology(query: string, response: ConversationalResponse): Promise<Critique[]> {
    const critiques: Critique[] = [];
    
    // Extract entities and relationships from response
    const responseEntities = OntologyService.extractEntitiesFromText(response.content);
    const entities = responseEntities.map(e => e.entity);
    
    // Validate entity relationships
    if (response.context?.entities) {
      const relationships = this.extractRelationships(response.content);
      const validation = OntologyService.validateRelationships(entities, relationships);
      
      if (!validation.valid) {
        validation.errors.forEach(error => {
          critiques.push({
            type: 'ontology',
            severity: 'medium',
            issue: error,
            suggestion: 'Ensure relationships follow manufacturing domain logic',
            impact: 1
          });
        });
      }
    }
    
    // Check for proper terminology usage
    const informalTerms = this.findInformalTerms(response.content);
    if (informalTerms.length > 0) {
      critiques.push({
        type: 'ontology',
        severity: 'low',
        issue: `Informal terminology used: ${informalTerms.join(', ')}`,
        suggestion: 'Use standard manufacturing terminology from ontology',
        impact: 0.5
      });
    }
    
    return critiques;
  }
  
  /**
   * Assess confidence level of response
   */
  private async assessConfidence(response: ConversationalResponse): Promise<Critique[]> {
    const critiques: Critique[] = [];
    const confidence = response.context?.confidence || 0;
    
    // Check if confidence matches content certainty
    const uncertainPhrases = [
      'might be', 'possibly', 'could be', 'may be', 'perhaps',
      'it seems', 'appears to be', 'roughly', 'approximately'
    ];
    
    const hasUncertainty = uncertainPhrases.some(phrase => 
      response.content.toLowerCase().includes(phrase)
    );
    
    if (confidence > 0.8 && hasUncertainty) {
      critiques.push({
        type: 'confidence',
        severity: 'low',
        issue: 'High confidence score but uncertain language in response',
        suggestion: 'Align confidence score with response certainty',
        impact: 0.5
      });
    }
    
    if (confidence < 0.5) {
      critiques.push({
        type: 'confidence',
        severity: 'medium',
        issue: 'Low confidence in response',
        suggestion: 'Gather more data or provide caveats about data limitations',
        impact: 1
      });
    }
    
    return critiques;
  }
  
  /**
   * Check relevance to query
   */
  private async checkRelevance(query: string, response: ConversationalResponse): Promise<Critique[]> {
    const critiques: Critique[] = [];
    
    // Check if response intent matches query intent
    const queryIntent = OntologyService.inferIntent(query);
    const responseIntent = response.context?.intent || 'general_query';
    
    if (queryIntent.intent !== responseIntent && queryIntent.confidence > 0.7) {
      critiques.push({
        type: 'relevance',
        severity: 'high',
        issue: `Response type (${responseIntent}) doesn't match query intent (${queryIntent.intent})`,
        suggestion: `Provide ${queryIntent.intent} analysis as requested`,
        impact: 2
      });
    }
    
    // Check for off-topic content
    const queryEntities = OntologyService.extractEntitiesFromText(query);
    const responseEntities = OntologyService.extractEntitiesFromText(response.content);
    
    const relevantEntities = responseEntities.filter(re => 
      queryEntities.some(qe => qe.entity === re.entity)
    );
    
    const relevanceRatio = relevantEntities.length / (responseEntities.length || 1);
    if (relevanceRatio < 0.5 && responseEntities.length > 3) {
      critiques.push({
        type: 'relevance',
        severity: 'medium',
        issue: 'Response contains too much unrelated information',
        suggestion: 'Focus on entities and metrics directly asked about',
        impact: 1
      });
    }
    
    return critiques;
  }
  
  /**
   * Assess clarity and structure
   */
  private async assessClarity(response: ConversationalResponse): Promise<Critique[]> {
    const critiques: Critique[] = [];
    
    // Check response length
    const wordCount = response.content.split(/\s+/).length;
    if (wordCount > 500) {
      critiques.push({
        type: 'clarity',
        severity: 'medium',
        issue: 'Response is too long and may lose user attention',
        suggestion: 'Summarize key points and offer details on request',
        impact: 1
      });
    }
    
    // Check for structure in complex responses
    if (wordCount > 100 && !this.hasStructure(response.content)) {
      critiques.push({
        type: 'clarity',
        severity: 'low',
        issue: 'Long response lacks clear structure',
        suggestion: 'Use bullet points, numbered lists, or clear sections',
        impact: 0.5
      });
    }
    
    // Check for jargon without explanation
    const technicalTerms = this.findTechnicalTerms(response.content);
    const unexplainedTerms = technicalTerms.filter(term => 
      !this.isTermExplained(term, response.content)
    );
    
    if (unexplainedTerms.length > 2) {
      critiques.push({
        type: 'clarity',
        severity: 'low',
        issue: `Technical terms used without explanation: ${unexplainedTerms.slice(0, 3).join(', ')}`,
        suggestion: 'Briefly explain technical terms or provide simpler alternatives',
        impact: 0.5
      });
    }
    
    return critiques;
  }
  
  /**
   * Generate improvement suggestions based on critiques
   */
  private generateSuggestions(critiques: Critique[]): string[] {
    const suggestions: string[] = [];
    
    // Group critiques by type
    const critiquesByType = critiques.reduce((acc, critique) => {
      if (!acc[critique.type]) acc[critique.type] = [];
      acc[critique.type].push(critique);
      return acc;
    }, {} as Record<string, Critique[]>);
    
    // Generate targeted suggestions
    if (critiquesByType.completeness) {
      suggestions.push('📊 Include all requested metrics and timeframes');
    }
    
    if (critiquesByType.ontology) {
      suggestions.push('🏭 Use standard manufacturing terminology consistently');
    }
    
    if (critiquesByType.confidence && critiquesByType.confidence.some(c => c.severity === 'medium')) {
      suggestions.push('💡 Gather more data or acknowledge data limitations');
    }
    
    if (critiquesByType.clarity) {
      suggestions.push('📝 Structure response with clear sections or bullet points');
    }
    
    if (critiquesByType.relevance) {
      suggestions.push('🎯 Focus on directly answering the user\'s question');
    }
    
    return suggestions;
  }
  
  // Helper methods
  private extractTimeframe(query: string): string | null {
    const timePatterns = [
      /today/i, /yesterday/i, /this week/i, /last week/i,
      /past \d+ (hours?|days?|weeks?|months?)/i,
      /last \d+ (hours?|days?|weeks?|months?)/i,
      /\d{4}-\d{2}-\d{2}/
    ];
    
    for (const pattern of timePatterns) {
      const match = query.match(pattern);
      if (match) return match[0];
    }
    
    return null;
  }
  
  private extractMetrics(query: string): string[] {
    const metrics = [];
    const metricKeywords = ['oee', 'availability', 'performance', 'quality', 'downtime', 
                          'defects', 'production', 'efficiency', 'scrap', 'yield'];
    
    for (const keyword of metricKeywords) {
      if (query.toLowerCase().includes(keyword)) {
        metrics.push(keyword);
      }
    }
    
    return metrics;
  }
  
  private responseContainsTimeframe(response: ConversationalResponse): boolean {
    const timeIndicators = [
      /\d{4}-\d{2}-\d{2}/, /today/i, /yesterday/i,
      /past \d+ (hours?|days?|weeks?)/i,
      /between .* and .*/i, /from .* to .*/i
    ];
    
    return timeIndicators.some(pattern => pattern.test(response.content));
  }
  
  private responseContainsMetric(response: ConversationalResponse, metric: string): boolean {
    const content = response.content.toLowerCase();
    return content.includes(metric) || 
           (response.visualizations && response.visualizations.some(v => 
             JSON.stringify(v).toLowerCase().includes(metric)
           ));
  }
  
  private extractRelationships(text: string): Array<[string, string, string]> {
    // Simple relationship extraction - in production, use NLP
    const relationships: Array<[string, string, string]> = [];
    
    const patterns = [
      /(\w+) causes (\w+)/gi,
      /(\w+) produces (\w+)/gi,
      /(\w+) affects (\w+)/gi,
      /(\w+) requires (\w+)/gi
    ];
    
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        relationships.push([match[1], match[0].split(' ')[1], match[2]]);
      }
    }
    
    return relationships;
  }
  
  private findInformalTerms(text: string): string[] {
    const informal = ['stuff', 'thing', 'broken', 'messed up', 'wonky'];
    return informal.filter(term => text.toLowerCase().includes(term));
  }
  
  private hasStructure(text: string): boolean {
    // Check for bullets, numbering, or clear sections
    return /^[-•*]\s/m.test(text) || 
           /^\d+\.\s/m.test(text) ||
           /^#+\s/m.test(text) ||
           text.includes('\n\n');
  }
  
  private findTechnicalTerms(text: string): string[] {
    const technical = ['OEE', 'MTBF', 'MTTR', 'SPC', 'Cpk', 'DPMO', 'TPM', 'RCA'];
    return technical.filter(term => text.includes(term));
  }
  
  private isTermExplained(term: string, text: string): boolean {
    // Check if term is followed by explanation in parentheses or "is"
    const patterns = [
      new RegExp(`${term}\\s*\\([^)]+\\)`, 'i'),
      new RegExp(`${term}\\s*(is|means|refers to)`, 'i')
    ];
    
    return patterns.some(pattern => pattern.test(text));
  }
}