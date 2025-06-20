/**
 * Terminology Manager Implementation
 * 
 * This class implements the TerminologyManager interface and provides
 * functionality for managing standardized manufacturing terms.
 */

import { AbstractBaseService } from './architecture/BaseService';
import { TerminologyManager } from './interfaces';
import { ManufacturingTerm } from './types';

/**
 * Terminology manager implementation
 */
export class TerminologyManagerImpl extends AbstractBaseService implements TerminologyManager {
  /**
   * Map of terms by ID
   */
  private terms: Map<string, ManufacturingTerm> = new Map();
  
  /**
   * Map of terms by name
   */
  private termsByName: Map<string, string> = new Map();
  
  /**
   * Map of terms by alias
   */
  private termsByAlias: Map<string, string> = new Map();
  
  /**
   * Create a new terminology manager
   */
  constructor() {
    super('TerminologyManager', '1.0.0');
  }
  
  /**
   * Initialize the manager
   */
  protected async doInitialize(): Promise<void> {
    // Clear maps
    this.terms.clear();
    this.termsByName.clear();
    this.termsByAlias.clear();
    
    console.log('Terminology manager initialized');
  }
  
  /**
   * Start the manager
   */
  protected async doStart(): Promise<void> {
    console.log('Terminology manager started');
  }
  
  /**
   * Stop the manager
   */
  protected async doStop(): Promise<void> {
    console.log('Terminology manager stopped');
  }
  
  /**
   * Register a term
   * @param term Term to register
   */
  public async registerTerm(term: ManufacturingTerm): Promise<void> {
    // Check if term already exists
    if (this.terms.has(term.id)) {
      throw new Error(`Term with ID ${term.id} already exists`);
    }
    
    // Check if name is already used
    const normalizedName = this.normalizeTerm(term.name);
    if (this.termsByName.has(normalizedName)) {
      throw new Error(`Term with name ${term.name} already exists`);
    }
    
    // Store term
    this.terms.set(term.id, { ...term });
    this.termsByName.set(normalizedName, term.id);
    
    // Register aliases
    if (term.aliases) {
      for (const alias of term.aliases) {
        const normalizedAlias = this.normalizeTerm(alias);
        this.termsByAlias.set(normalizedAlias, term.id);
      }
    }
    
    console.log(`Term registered: ${term.name} (${term.id})`);
  }
  
  /**
   * Get a term by ID
   * @param termId Term ID
   */
  public async getTerm(termId: string): Promise<ManufacturingTerm | null> {
    const term = this.terms.get(termId);
    return term ? { ...term } : null;
  }
  
  /**
   * Get a term by name
   * @param name Term name
   */
  public async getTermByName(name: string): Promise<ManufacturingTerm | null> {
    const normalizedName = this.normalizeTerm(name);
    
    // Check for exact name match
    const termId = this.termsByName.get(normalizedName);
    
    if (termId) {
      const term = this.terms.get(termId);
      return term ? { ...term } : null;
    }
    
    // Check for alias match
    const aliasTerm = this.termsByAlias.get(normalizedName);
    
    if (aliasTerm) {
      const term = this.terms.get(aliasTerm);
      return term ? { ...term } : null;
    }
    
    return null;
  }
  
  /**
   * Search terms
   * @param query Search query
   */
  public async searchTerms(query: string): Promise<ManufacturingTerm[]> {
    const normalizedQuery = this.normalizeTerm(query);
    
    // If exact match, return that term
    const exactMatch = await this.getTermByName(query);
    if (exactMatch) {
      return [exactMatch];
    }
    
    // Otherwise, search for partial matches
    const results: ManufacturingTerm[] = [];
    
    for (const term of this.terms.values()) {
      // Check name
      if (this.normalizeTerm(term.name).includes(normalizedQuery)) {
        results.push({ ...term });
        continue;
      }
      
      // Check aliases
      if (term.aliases && term.aliases.some(alias => 
        this.normalizeTerm(alias).includes(normalizedQuery)
      )) {
        results.push({ ...term });
        continue;
      }
      
      // Check definition
      if (this.normalizeTerm(term.definition).includes(normalizedQuery)) {
        results.push({ ...term });
        continue;
      }
    }
    
    return results;
  }
  
  /**
   * Get related terms
   * @param termId Term ID
   */
  public async getRelatedTerms(termId: string): Promise<ManufacturingTerm[]> {
    const term = this.terms.get(termId);
    
    if (!term) {
      throw new Error(`Term ${termId} not found`);
    }
    
    if (!term.relatedTerms || term.relatedTerms.length === 0) {
      return [];
    }
    
    const relatedTerms: ManufacturingTerm[] = [];
    
    for (const relatedTermId of term.relatedTerms) {
      const relatedTerm = this.terms.get(relatedTermId);
      
      if (relatedTerm) {
        relatedTerms.push({ ...relatedTerm });
      }
    }
    
    return relatedTerms;
  }
  
  /**
   * Normalize a term for comparison and indexing
   * @param term Term to normalize
   */
  private normalizeTerm(term: string): string {
    return term.toLowerCase().trim();
  }
}