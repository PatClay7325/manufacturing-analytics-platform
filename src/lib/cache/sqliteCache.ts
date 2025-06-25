import Database from 'better-sqlite3';
import { createHash } from 'crypto';
import path from 'path';
import fs from 'fs';

export interface CacheEntry {
  id: number;
  query_hash: string;
  query_text: string;
  response: string;
  embedding?: string;
  model_used: string;
  tokens_used: number;
  response_time_ms: number;
  created_at: number;
  accessed_at: number;
  access_count: number;
}

export interface CacheMetadata {
  model: string;
  tokens: number;
  responseTime: number;
}

export interface CacheStats {
  totalEntries: number;
  cacheSize: number;
  hitRate: number;
  avgResponseTime: number;
  popularQueries: Array<{
    query: string;
    count: number;
    lastAccessed: Date;
  }>;
}

export class SQLiteSemanticCache {
  private db: Database.Database;
  private readonly maxCacheSize: number;
  private readonly similarityThreshold: number;
  private hits: number = 0;
  private misses: number = 0;
  
  constructor(
    dbPath: string = './cache/chat.db',
    maxCacheSize: number = 1000,
    similarityThreshold: number = 0.85
  ) {
    // Ensure cache directory exists
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    this.db = new Database(dbPath);
    this.maxCacheSize = maxCacheSize;
    this.similarityThreshold = similarityThreshold;
    
    this.init();
    this.setupCleanupSchedule();
  }
  
  private init() {
    // Enable WAL mode for better concurrency
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('synchronous = NORMAL');
    
    // Create tables
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS cache_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        query_hash TEXT UNIQUE NOT NULL,
        query_text TEXT NOT NULL,
        response TEXT NOT NULL,
        embedding TEXT,
        model_used TEXT NOT NULL,
        tokens_used INTEGER NOT NULL,
        response_time_ms INTEGER NOT NULL,
        created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
        accessed_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
        access_count INTEGER DEFAULT 1
      );
      
      CREATE INDEX IF NOT EXISTS idx_query_hash ON cache_entries(query_hash);
      CREATE INDEX IF NOT EXISTS idx_accessed_at ON cache_entries(accessed_at);
      CREATE INDEX IF NOT EXISTS idx_access_count ON cache_entries(access_count);
      
      -- Full-text search table
      CREATE VIRTUAL TABLE IF NOT EXISTS cache_fts USING fts5(
        query_text,
        response,
        content=cache_entries,
        content_rowid=id
      );
      
      -- Triggers to keep FTS in sync
      CREATE TRIGGER IF NOT EXISTS cache_entries_ai AFTER INSERT ON cache_entries BEGIN
        INSERT INTO cache_fts(rowid, query_text, response)
        VALUES (new.id, new.query_text, new.response);
      END;
      
      CREATE TRIGGER IF NOT EXISTS cache_entries_ad AFTER DELETE ON cache_entries BEGIN
        DELETE FROM cache_fts WHERE rowid = old.id;
      END;
      
      CREATE TRIGGER IF NOT EXISTS cache_entries_au AFTER UPDATE ON cache_entries BEGIN
        UPDATE cache_fts 
        SET query_text = new.query_text, response = new.response
        WHERE rowid = new.id;
      END;
    `);
  }
  
  async get(query: string): Promise<CacheEntry | null> {
    const hash = this.hashQuery(query);
    
    // Try exact match first
    let entry = this.db.prepare(`
      SELECT * FROM cache_entries 
      WHERE query_hash = ?
    `).get(hash) as CacheEntry | undefined;
    
    if (entry) {
      this.hits++;
      this.updateAccessStats(entry.id);
      return entry;
    }
    
    // Try similar queries
    entry = await this.findSimilar(query);
    
    if (entry) {
      this.hits++;
      this.updateAccessStats(entry.id);
      return entry;
    }
    
    this.misses++;
    return null;
  }
  
  async set(
    query: string, 
    response: string, 
    metadata: CacheMetadata
  ): Promise<void> {
    const hash = this.hashQuery(query);
    
    try {
      this.db.prepare(`
        INSERT OR REPLACE INTO cache_entries 
        (query_hash, query_text, response, model_used, tokens_used, response_time_ms)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        hash,
        query,
        response,
        metadata.model,
        metadata.tokens,
        metadata.responseTime
      );
      
      // Enforce cache size limit
      this.enforceMaxSize();
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }
  
  private hashQuery(query: string): string {
    // Normalize query for better matching
    const normalized = query
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s]/g, '');
    
    return createHash('sha256')
      .update(normalized)
      .digest('hex')
      .substring(0, 16); // Use first 16 chars for shorter hash
  }
  
  private async findSimilar(query: string): Promise<CacheEntry | null> {
    // Use FTS5 for similarity search
    const searchQuery = query
      .toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 2)
      .map(word => `"${word}"*`)
      .join(' OR ');
    
    if (!searchQuery) return null;
    
    try {
      // Search with FTS5 and rank by relevance
      const results = this.db.prepare(`
        SELECT 
          ce.*,
          bm25(cache_fts) as rank
        FROM cache_fts
        JOIN cache_entries ce ON cache_fts.rowid = ce.id
        WHERE cache_fts MATCH ?
        ORDER BY 
          rank,
          ce.access_count DESC,
          ce.accessed_at DESC
        LIMIT 5
      `).all(searchQuery) as Array<CacheEntry & { rank: number }>;
      
      if (results.length === 0) return null;
      
      // Calculate similarity for top results
      for (const result of results) {
        const similarity = this.calculateSimilarity(query, result.query_text);
        if (similarity >= this.similarityThreshold) {
          return result;
        }
      }
      
      // If no high similarity, try keyword matching
      return this.findByKeywords(query);
    } catch (error) {
      console.error('Similar search error:', error);
      return null;
    }
  }
  
  private findByKeywords(query: string): CacheEntry | null {
    // Extract important keywords
    const keywords = this.extractKeywords(query);
    if (keywords.length === 0) return null;
    
    // Build query with keyword matching
    const placeholders = keywords.map(() => 'query_text LIKE ?').join(' AND ');
    const values = keywords.map(k => `%${k}%`);
    
    const entry = this.db.prepare(`
      SELECT * FROM cache_entries 
      WHERE ${placeholders}
      ORDER BY access_count DESC, accessed_at DESC
      LIMIT 1
    `).get(...values) as CacheEntry | undefined;
    
    return entry || null;
  }
  
  private extractKeywords(query: string): string[] {
    // Common words to ignore
    const stopWords = new Set([
      'what', 'is', 'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 
      'at', 'to', 'for', 'of', 'with', 'by', 'from', 'up', 'about',
      'into', 'through', 'during', 'how', 'when', 'where', 'why', 'can',
      'could', 'should', 'would', 'will', 'do', 'does', 'did', 'have',
      'has', 'had', 'get', 'got', 'show', 'tell', 'give', 'me', 'my'
    ]);
    
    // Manufacturing-specific important terms
    const importantTerms = new Set([
      'oee', 'efficiency', 'production', 'quality', 'availability',
      'performance', 'downtime', 'maintenance', 'alert', 'metric',
      'sensor', 'equipment', 'line', 'shift', 'operator', 'defect',
      'scrap', 'yield', 'throughput', 'cycle', 'takt', 'bottleneck'
    ]);
    
    return query
      .toLowerCase()
      .split(/\s+/)
      .filter(word => {
        word = word.replace(/[^\w]/g, '');
        return word.length > 2 && 
               (!stopWords.has(word) || importantTerms.has(word));
      })
      .slice(0, 5); // Limit to 5 keywords
  }
  
  private calculateSimilarity(query1: string, query2: string): number {
    // Simple Jaccard similarity
    const words1 = new Set(query1.toLowerCase().split(/\s+/));
    const words2 = new Set(query2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }
  
  private updateAccessStats(id: number): void {
    this.db.prepare(`
      UPDATE cache_entries 
      SET 
        accessed_at = strftime('%s', 'now') * 1000,
        access_count = access_count + 1
      WHERE id = ?
    `).run(id);
  }
  
  private enforceMaxSize(): void {
    const count = this.db.prepare(
      'SELECT COUNT(*) as count FROM cache_entries'
    ).get() as { count: number };
    
    if (count.count > this.maxCacheSize) {
      // Remove least recently used entries
      const toRemove = count.count - this.maxCacheSize + Math.floor(this.maxCacheSize * 0.1);
      
      this.db.prepare(`
        DELETE FROM cache_entries 
        WHERE id IN (
          SELECT id FROM cache_entries
          ORDER BY 
            access_count ASC,
            accessed_at ASC
          LIMIT ?
        )
      `).run(toRemove);
    }
  }
  
  getStats(): CacheStats {
    const stats = this.db.prepare(`
      SELECT 
        COUNT(*) as total,
        AVG(response_time_ms) as avg_response_time,
        SUM(LENGTH(query_text) + LENGTH(response)) as cache_size
      FROM cache_entries
    `).get() as any;
    
    const popular = this.db.prepare(`
      SELECT 
        query_text,
        access_count,
        accessed_at
      FROM cache_entries
      ORDER BY access_count DESC
      LIMIT 10
    `).all() as any[];
    
    const hitRate = this.hits + this.misses > 0 
      ? this.hits / (this.hits + this.misses) 
      : 0;
    
    return {
      totalEntries: stats.total || 0,
      cacheSize: stats.cache_size || 0,
      hitRate,
      avgResponseTime: stats.avg_response_time || 0,
      popularQueries: popular.map(q => ({
        query: q.query_text,
        count: q.access_count,
        lastAccessed: new Date(q.accessed_at)
      }))
    };
  }
  
  cleanup(maxAgeMs: number = 7 * 24 * 60 * 60 * 1000): number {
    const cutoff = Date.now() - maxAgeMs;
    
    const result = this.db.prepare(`
      DELETE FROM cache_entries 
      WHERE accessed_at < ? AND access_count < 5
    `).run(cutoff);
    
    return result.changes;
  }
  
  private setupCleanupSchedule(): void {
    // Run cleanup daily
    setInterval(() => {
      const removed = this.cleanup();
      if (removed > 0) {
        console.log(`Cache cleanup: removed ${removed} old entries`);
      }
    }, 24 * 60 * 60 * 1000);
  }
  
  clear(): void {
    this.db.prepare('DELETE FROM cache_entries').run();
    this.hits = 0;
    this.misses = 0;
  }
  
  close(): void {
    this.db.close();
  }
}

// Singleton instance
let cacheInstance: SQLiteSemanticCache | null = null;

export function getChatCache(): SQLiteSemanticCache {
  if (!cacheInstance) {
    cacheInstance = new SQLiteSemanticCache();
  }
  return cacheInstance;
}