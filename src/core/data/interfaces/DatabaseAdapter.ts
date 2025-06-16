/**
 * Database Adapter Interface
 * 
 * This interface defines the contract for all database adapters in the system.
 */

import { QueryOptions, QueryResult } from '../types';

/**
 * Database adapter interface
 */
export interface DatabaseAdapter {
  /**
   * Initialize the adapter
   */
  initialize(): Promise<void>;
  
  /**
   * Execute a query
   * @param query SQL query
   * @param params Query parameters
   * @param options Query options
   */
  query<T>(query: string, params?: any[], options?: QueryOptions): Promise<QueryResult<T>>;
  
  /**
   * Begin a transaction
   * @param options Transaction options
   */
  beginTransaction(options?: any): Promise<any>;
  
  /**
   * Commit a transaction
   * @param transaction Transaction to commit
   */
  commitTransaction(transaction: any): Promise<void>;
  
  /**
   * Rollback a transaction
   * @param transaction Transaction to rollback
   */
  rollbackTransaction(transaction: any): Promise<void>;
  
  /**
   * Close all connections
   */
  close(): Promise<void>;
}