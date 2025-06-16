/**
 * Database types
 */

/**
 * Query options
 */
export interface QueryOptions {
  /**
   * Whether to use a transaction
   */
  useTransaction?: boolean;
  
  /**
   * Transaction to use
   */
  transaction?: {
    id: string;
    commit: () => Promise<void>;
    rollback: () => Promise<void>;
  };
  
  /**
   * Query timeout in milliseconds
   */
  timeout?: number;
  
  /**
   * Whether to return field metadata
   */
  returnMetadata?: boolean;
  
  /**
   * Whether to prepare the statement
   */
  prepare?: boolean;
}

/**
 * Query result
 */
export interface QueryResult<T> {
  /**
   * Result rows
   */
  rows: T[];
  
  /**
   * Row count
   */
  rowCount: number;
  
  /**
   * Field metadata
   */
  fields: FieldMetadata[];
}

/**
 * Field metadata
 */
export interface FieldMetadata {
  /**
   * Field name
   */
  name: string;
  
  /**
   * Field data type
   */
  dataType: string;
  
  /**
   * Whether the field can be null
   */
  nullable: boolean;
  
  /**
   * Field length (for variable-length types)
   */
  length?: number;
}