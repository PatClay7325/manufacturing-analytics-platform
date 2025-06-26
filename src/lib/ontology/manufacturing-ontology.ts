/**
 * Manufacturing Domain Ontology
 * Defines the semantic model for manufacturing concepts, relationships, and properties
 */

export interface OntologyEntity {
  aliases: string[];
  properties: string[];
  relationships: string[];
  validValues?: Record<string, string[]>;
}

export interface OntologyRelationship {
  subject: string;
  predicate: string;
  object: string;
  constraints?: {
    cardinality?: 'one-to-one' | 'one-to-many' | 'many-to-many';
    required?: boolean;
  };
}

export const ManufacturingOntology = {
  // Core manufacturing entities
  entities: {
    Equipment: {
      aliases: ['machine', 'device', 'asset', 'equipment', 'line', 'cell', 'station', 'system'],
      properties: ['oee', 'availability', 'performance', 'quality', 'status', 'location', 'capacity', 'utilization'],
      relationships: ['produces', 'requires_maintenance', 'has_downtime', 'operated_by', 'part_of'],
      validValues: {
        status: ['running', 'idle', 'maintenance', 'breakdown', 'offline'],
        type: ['CNC', 'robot', 'conveyor', 'assembly', 'inspection', 'packaging']
      }
    },
    
    Product: {
      aliases: ['item', 'widget', 'part', 'component', 'sku', 'material', 'goods', 'output'],
      properties: ['quality_rate', 'defect_count', 'cost', 'cycle_time', 'yield', 'specifications'],
      relationships: ['produced_by', 'has_defects', 'requires_material', 'part_of_assembly'],
      validValues: {
        quality_grade: ['A', 'B', 'C', 'reject'],
        status: ['in_production', 'completed', 'scrapped', 'rework']
      }
    },
    
    Defect: {
      aliases: ['failure', 'issue', 'problem', 'defect', 'scrap', 'reject', 'nonconformance', 'fault'],
      properties: ['severity', 'frequency', 'cost_impact', 'type', 'location', 'detection_method'],
      relationships: ['caused_by', 'affects_product', 'requires_action', 'detected_by'],
      validValues: {
        severity: ['critical', 'major', 'minor', 'cosmetic'],
        type: ['dimensional', 'surface', 'material', 'functional', 'assembly']
      }
    },
    
    Downtime: {
      aliases: ['stoppage', 'breakdown', 'outage', 'interruption', 'pause', 'halt'],
      properties: ['duration', 'reason', 'impact', 'frequency', 'cost'],
      relationships: ['affects_equipment', 'caused_by', 'resolved_by', 'prevents_production'],
      validValues: {
        category: ['planned', 'unplanned', 'maintenance', 'changeover', 'breakdown'],
        reason: ['mechanical', 'electrical', 'material_shortage', 'operator_absence', 'quality_issue']
      }
    },
    
    Operator: {
      aliases: ['worker', 'technician', 'employee', 'staff', 'personnel', 'user'],
      properties: ['skill_level', 'certification', 'shift', 'productivity', 'experience'],
      relationships: ['operates', 'maintains', 'inspects', 'reports_to'],
      validValues: {
        skill_level: ['beginner', 'intermediate', 'advanced', 'expert'],
        shift: ['first', 'second', 'third', 'day', 'night']
      }
    },
    
    Maintenance: {
      aliases: ['service', 'repair', 'upkeep', 'servicing', 'pm', 'preventive'],
      properties: ['type', 'frequency', 'duration', 'cost', 'effectiveness'],
      relationships: ['performed_on', 'performed_by', 'prevents', 'scheduled_for'],
      validValues: {
        type: ['preventive', 'corrective', 'predictive', 'condition_based'],
        priority: ['emergency', 'high', 'medium', 'low', 'scheduled']
      }
    },
    
    Production: {
      aliases: ['manufacturing', 'output', 'run', 'batch', 'lot', 'order'],
      properties: ['quantity', 'duration', 'efficiency', 'start_time', 'end_time', 'target'],
      relationships: ['uses_equipment', 'produces_product', 'requires_operator', 'follows_schedule'],
      validValues: {
        status: ['scheduled', 'in_progress', 'completed', 'cancelled', 'delayed']
      }
    },
    
    Quality: {
      aliases: ['qc', 'inspection', 'conformance', 'specification', 'standard'],
      properties: ['metric', 'target', 'actual', 'tolerance', 'method'],
      relationships: ['measures', 'validates', 'requires_action', 'affects_production'],
      validValues: {
        result: ['pass', 'fail', 'conditional', 'rework'],
        method: ['visual', 'dimensional', 'functional', 'destructive', 'statistical']
      }
    }
  },
  
  // Relationships between entities
  relationships: {
    causal: {
      patterns: ['causes', 'caused_by', 'results_in', 'leads_to', 'triggers', 'induces'],
      examples: [
        { subject: 'Defect', predicate: 'caused_by', object: 'Equipment' },
        { subject: 'Downtime', predicate: 'causes', object: 'Production_Loss' }
      ]
    },
    
    temporal: {
      patterns: ['before', 'after', 'during', 'while', 'followed_by', 'preceded_by'],
      examples: [
        { subject: 'Maintenance', predicate: 'before', object: 'Production' },
        { subject: 'Inspection', predicate: 'after', object: 'Production' }
      ]
    },
    
    hierarchical: {
      patterns: ['part_of', 'contains', 'belongs_to', 'comprises', 'includes'],
      examples: [
        { subject: 'Equipment', predicate: 'part_of', object: 'Production_Line' },
        { subject: 'Component', predicate: 'part_of', object: 'Assembly' }
      ]
    },
    
    operational: {
      patterns: ['operates', 'produces', 'consumes', 'requires', 'outputs'],
      examples: [
        { subject: 'Equipment', predicate: 'produces', object: 'Product' },
        { subject: 'Production', predicate: 'requires', object: 'Material' }
      ]
    }
  },
  
  // Semantic patterns for query understanding
  queryPatterns: {
    performance: {
      keywords: ['oee', 'efficiency', 'performance', 'productivity', 'utilization'],
      intentMapping: 'oee_analysis'
    },
    
    quality: {
      keywords: ['defect', 'quality', 'reject', 'scrap', 'failure', 'issue'],
      intentMapping: 'quality_analysis'
    },
    
    availability: {
      keywords: ['downtime', 'breakdown', 'stoppage', 'availability', 'uptime'],
      intentMapping: 'downtime_analysis'
    },
    
    maintenance: {
      keywords: ['maintenance', 'service', 'repair', 'pm', 'preventive'],
      intentMapping: 'maintenance_analysis'
    },
    
    root_cause: {
      keywords: ['why', 'cause', 'reason', 'root', 'analysis', 'investigate'],
      intentMapping: 'root_cause_analysis'
    },
    
    comparison: {
      keywords: ['compare', 'versus', 'difference', 'better', 'worse', 'benchmark'],
      intentMapping: 'comparison'
    },
    
    trend: {
      keywords: ['trend', 'pattern', 'history', 'over time', 'change', 'forecast'],
      intentMapping: 'performance_trending'
    }
  },
  
  // Validation rules
  validationRules: {
    // OEE must be between 0 and 1 (or 0% and 100%)
    oee: { min: 0, max: 1, unit: 'percentage' },
    
    // Availability, Performance, Quality must be between 0 and 1
    availability: { min: 0, max: 1, unit: 'percentage' },
    performance: { min: 0, max: 1, unit: 'percentage' },
    quality: { min: 0, max: 1, unit: 'percentage' },
    
    // Relationships that are mutually exclusive
    mutuallyExclusive: [
      ['running', 'breakdown'],
      ['planned_downtime', 'unplanned_downtime']
    ],
    
    // Required relationships
    requiredRelationships: [
      { entity: 'Production', requires: ['Equipment', 'Product'] },
      { entity: 'Defect', requires: ['Product'] },
      { entity: 'Downtime', requires: ['Equipment'] }
    ]
  }
};

// Helper functions for ontology operations
export class OntologyService {
  /**
   * Find canonical term for an alias
   */
  static findCanonicalTerm(alias: string): string | null {
    const aliasLower = alias.toLowerCase();
    
    for (const [entity, config] of Object.entries(ManufacturingOntology.entities)) {
      if (config.aliases.includes(aliasLower)) {
        return entity;
      }
    }
    
    return null;
  }
  
  /**
   * Get all aliases for an entity
   */
  static getAliases(entity: string): string[] {
    const config = ManufacturingOntology.entities[entity];
    return config ? config.aliases : [];
  }
  
  /**
   * Check if a relationship is valid
   */
  static isValidRelationship(subject: string, predicate: string, object: string): boolean {
    // Check if entities exist
    const subjectEntity = this.findCanonicalTerm(subject) || subject;
    const objectEntity = this.findCanonicalTerm(object) || object;
    
    // Check if relationship pattern exists
    for (const [type, config] of Object.entries(ManufacturingOntology.relationships)) {
      if (config.patterns.includes(predicate)) {
        // Check examples for validity
        return config.examples.some(ex => 
          ex.subject === subjectEntity && 
          ex.object === objectEntity
        );
      }
    }
    
    return false;
  }
  
  /**
   * Extract entities from text using ontology
   */
  static extractEntitiesFromText(text: string): Array<{entity: string, alias: string, position: number}> {
    const entities: Array<{entity: string, alias: string, position: number}> = [];
    const textLower = text.toLowerCase();
    
    for (const [entity, config] of Object.entries(ManufacturingOntology.entities)) {
      for (const alias of config.aliases) {
        const regex = new RegExp(`\\b${alias}\\b`, 'gi');
        let match;
        
        while ((match = regex.exec(text)) !== null) {
          entities.push({
            entity,
            alias: match[0],
            position: match.index
          });
        }
      }
    }
    
    return entities.sort((a, b) => a.position - b.position);
  }
  
  /**
   * Infer intent from query using ontology patterns
   */
  static inferIntent(query: string): { intent: string, confidence: number } {
    const queryLower = query.toLowerCase();
    let bestMatch = { intent: 'general_query', confidence: 0 };
    
    for (const [pattern, config] of Object.entries(ManufacturingOntology.queryPatterns)) {
      const matchCount = config.keywords.filter(keyword => 
        queryLower.includes(keyword)
      ).length;
      
      const confidence = matchCount / config.keywords.length;
      
      if (confidence > bestMatch.confidence) {
        bestMatch = {
          intent: config.intentMapping,
          confidence
        };
      }
    }
    
    return bestMatch;
  }
  
  /**
   * Validate entity relationships in a response
   */
  static validateRelationships(entities: string[], relationships: Array<[string, string, string]>): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    
    for (const [subject, predicate, object] of relationships) {
      if (!this.isValidRelationship(subject, predicate, object)) {
        errors.push(`Invalid relationship: ${subject} ${predicate} ${object}`);
      }
    }
    
    // Check required relationships
    for (const rule of ManufacturingOntology.validationRules.requiredRelationships) {
      if (entities.includes(rule.entity)) {
        const hasRequired = rule.requires.every(req => entities.includes(req));
        if (!hasRequired) {
          errors.push(`${rule.entity} requires ${rule.requires.join(', ')}`);
        }
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
}