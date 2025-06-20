import { Pool, PoolClient, QueryResult as PgQueryResult } from 'pg';
import { 
  DataSourceConnector, 
  DataSourceConfig, 
  DataQuery, 
  QueryResult, 
  TestResult, 
  SchemaInfo,
  DataFrame,
  DataField,
  FieldType
} from '../DataSourceManager';

export class PostgreSQLConnector implements DataSourceConnector {
  private pool: Pool | null = null;
  private config: DataSourceConfig | null = null;
  private connectionCount = 0;

  async connect(config: DataSourceConfig): Promise<void> {
    if (this.pool) {
      return; // Already connected
    }

    this.config = config;
    
    try {
      const connectionString = this.buildConnectionString(config);
      
      this.pool = new Pool({
        connectionString,
        max: config.maxConnections || 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: config.timeout || 10000,
        ssl: config.ssl ? { rejectUnauthorized: false } : false,
      });

      // Test the connection
      const client = await this.pool.connect();
      await client.query('SELECT NOW()');
      client.release();
      
      this.pool.on('error', (err) => {
        console.error('PostgreSQL pool error:', err);
      });

      this.pool.on('connect', () => {
        this.connectionCount++;
        console.log(`PostgreSQL connection established (${this.connectionCount} total)`);
      });

      console.log('PostgreSQL pool created successfully');
    } catch (error) {
      if (this.pool) {
        await this.pool.end();
        this.pool = null;
      }
      throw new Error(`Failed to connect to PostgreSQL: ${error instanceof Error ? error.message : error}`);
    }
  }

  async disconnect(): Promise<void> {
    if (this.pool) {
      console.log('Closing PostgreSQL connection pool');
      await this.pool.end();
      this.pool = null;
      this.config = null;
      this.connectionCount = 0;
    }
  }

  async query(query: DataQuery): Promise<QueryResult> {
    if (!this.pool) {
      throw new Error('Not connected to PostgreSQL');
    }

    const startTime = Date.now();
    let client: PoolClient | null = null;

    try {
      // Get a client from the pool
      client = await this.pool.connect();
      
      const sql = this.buildSQL(query);
      const values = this.extractParameters(query);
      
      console.log(`Executing SQL: ${sql}`, values.length > 0 ? `with parameters: ${JSON.stringify(values)}` : '');
      
      // Execute the query with parameterized values for security
      const result: PgQueryResult = await client.query(sql, values);
      
      const executionTime = Date.now() - startTime;
      
      // Convert PostgreSQL result to our DataFrame format
      const dataFrame = this.convertToDataFrame(result, query);
      
      return {
        data: [dataFrame],
        meta: {
          executionTime,
          rowCount: result.rowCount || 0,
          sql
        }
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      console.error('PostgreSQL query error:', error);
      
      return {
        data: [],
        error: `Query execution failed: ${error instanceof Error ? error.message : error}`,
        meta: {
          executionTime,
          rowCount: 0,
          sql: query.rawQuery || 'N/A'
        }
      };
    } finally {
      if (client) {
        client.release();
      }
    }
  }

  async testConnection(config: DataSourceConfig): Promise<TestResult> {
    const startTime = Date.now();
    let testPool: Pool | null = null;
    
    try {
      // Validate required fields
      if (!config.url && (!config.database || !config.username)) {
        return {
          status: 'error',
          message: 'Database URL or database connection details are required',
          latency: Date.now() - startTime
        };
      }

      const connectionString = this.buildConnectionString(config);
      
      // Create a temporary pool for testing
      testPool = new Pool({
        connectionString,
        max: 1,
        connectionTimeoutMillis: config.timeout || 5000,
        ssl: config.ssl ? { rejectUnauthorized: false } : false,
      });

      // Test the connection
      const client = await testPool.connect();
      
      try {
        // Test basic connectivity and get database info
        const versionResult = await client.query('SELECT version() as version');
        const dbResult = await client.query('SELECT current_database() as database');
        const userResult = await client.query('SELECT current_user as username');
        
        const latency = Date.now() - startTime;
        
        return {
          status: 'success',
          message: 'Connection successful',
          latency,
          details: {
            database: dbResult.rows[0]?.database,
            username: userResult.rows[0]?.username,
            version: versionResult.rows[0]?.version?.split(' ').slice(0, 2).join(' '),
            ssl: config.ssl || false,
            host: this.extractHostFromConfig(config)
          }
        };
      } finally {
        client.release();
      }
    } catch (error) {
      const latency = Date.now() - startTime;
      console.error('PostgreSQL connection test failed:', error);
      
      return {
        status: 'error',
        message: `Connection failed: ${error instanceof Error ? error.message : error}`,
        latency
      };
    } finally {
      if (testPool) {
        await testPool.end();
      }
    }
  }

  async getSchema(): Promise<SchemaInfo> {
    if (!this.pool) {
      throw new Error('Not connected to PostgreSQL');
    }

    const client = await this.pool.connect();
    
    try {
      // Get all tables and views
      const tablesQuery = `
        SELECT 
          t.table_name,
          t.table_type,
          obj_description(c.oid) as table_comment
        FROM information_schema.tables t
        LEFT JOIN pg_class c ON c.relname = t.table_name
        WHERE t.table_schema = 'public'
        ORDER BY t.table_name;
      `;
      
      const tablesResult = await client.query(tablesQuery);
      const tables: any[] = [];
      
      // Get columns for each table
      for (const table of tablesResult.rows) {
        const columnsQuery = `
          SELECT 
            c.column_name,
            c.data_type,
            c.is_nullable,
            c.column_default,
            tc.constraint_type,
            col_description(pgc.oid, c.ordinal_position) as column_comment
          FROM information_schema.columns c
          LEFT JOIN information_schema.key_column_usage kcu 
            ON c.table_name = kcu.table_name AND c.column_name = kcu.column_name
          LEFT JOIN information_schema.table_constraints tc 
            ON kcu.constraint_name = tc.constraint_name AND tc.constraint_type = 'PRIMARY KEY'
          LEFT JOIN pg_class pgc ON pgc.relname = c.table_name
          WHERE c.table_schema = 'public' AND c.table_name = $1
          ORDER BY c.ordinal_position;
        `;
        
        const columnsResult = await client.query(columnsQuery, [table.table_name]);
        
        const columns = columnsResult.rows.map(col => ({
          name: col.column_name,
          type: col.data_type,
          nullable: col.is_nullable === 'YES',
          primaryKey: col.constraint_type === 'PRIMARY KEY',
          description: col.column_comment
        }));
        
        tables.push({
          name: table.table_name,
          type: table.table_type === 'VIEW' ? 'view' : 'table',
          columns
        });
      }
      
      // Get functions
      const functionsQuery = `
        SELECT 
          p.proname as function_name,
          pg_get_function_result(p.oid) as return_type,
          obj_description(p.oid) as description,
          pg_get_function_arguments(p.oid) as arguments
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' AND p.prokind = 'f'
        ORDER BY p.proname;
      `;
      
      const functionsResult = await client.query(functionsQuery);
      
      const functions = functionsResult.rows.map(func => ({
        name: func.function_name,
        description: func.description,
        returnType: func.return_type,
        parameters: this.parseFunctionArguments(func.arguments)
      }));

      return {
        tables,
        functions
      };
    } finally {
      client.release();
    }
  }

  private parseFunctionArguments(argsString: string): any[] {
    if (!argsString) return [];
    
    // Simple parsing of function arguments
    return argsString.split(',').map(arg => {
      const parts = arg.trim().split(' ');
      return {
        name: parts[0] || 'param',
        type: parts[1] || 'unknown',
        required: true,
        description: ''
      };
    });
  }

  private extractParameters(query: DataQuery): any[] {
    // Extract parameterized values for secure queries
    const params: any[] = [];
    
    if (query.where) {
      query.where.forEach(condition => {
        if (!['IS NULL', 'IS NOT NULL'].includes(condition.operator)) {
          params.push(condition.value);
        }
      });
    }
    
    return params;
  }

  private convertToDataFrame(result: PgQueryResult, query: DataQuery): DataFrame {
    if (!result.rows || result.rows.length === 0) {
      return {
        name: query.table || 'query_result',
        fields: [],
        length: 0,
        meta: {
          executedQueryString: this.buildSQL(query)
        }
      };
    }

    // Get field information from the first row and result metadata
    const firstRow = result.rows[0];
    const fields: DataField[] = Object.keys(firstRow).map(fieldName => {
      const values = result.rows.map(row => row[fieldName]);
      const fieldType = this.inferFieldType(values[0]);
      
      return {
        name: fieldName,
        type: fieldType,
        values,
        config: {
          displayName: fieldName.charAt(0).toUpperCase() + fieldName.slice(1)
        }
      };
    });

    return {
      name: query.table || 'query_result',
      fields,
      length: result.rows.length,
      meta: {
        executedQueryString: this.buildSQL(query)
      }
    };
  }

  private inferFieldType(value: any): FieldType {
    if (value === null || value === undefined) {
      return FieldType.Other;
    }
    
    if (value instanceof Date || (typeof value === 'string' && !isNaN(Date.parse(value)))) {
      return FieldType.Time;
    }
    
    if (typeof value === 'number' || !isNaN(parseFloat(value))) {
      return FieldType.Number;
    }
    
    if (typeof value === 'boolean') {
      return FieldType.Boolean;
    }
    
    return FieldType.String;
  }

  private extractHostFromConfig(config: DataSourceConfig): string {
    if (config.url) {
      try {
        const url = new URL(config.url);
        return url.hostname;
      } catch {
        return 'unknown';
      }
    }
    return config.database || 'localhost';
  }

  private buildSQL(query: DataQuery): string {
    // Use raw query if provided
    if (query.rawQuery) {
      return query.rawQuery;
    }

    let sql = 'SELECT ';
    let paramIndex = 1;
    
    // Fields
    if (query.fields && query.fields.length > 0) {
      sql += query.fields.map(field => `"${field}"`).join(', ');
    } else {
      sql += '*';
    }
    
    // From
    sql += ` FROM "${query.table || 'metrics'}"`;
    
    // Where conditions with parameterized queries for security
    if (query.where && query.where.length > 0) {
      const conditions: string[] = [];
      
      query.where.forEach(condition => {
        let conditionSql = `"${condition.field}" ${condition.operator}`;
        
        if (!['IS NULL', 'IS NOT NULL'].includes(condition.operator)) {
          conditionSql += ` $${paramIndex}`;
          paramIndex++;
        }
        
        conditions.push(conditionSql);
      });
      
      if (conditions.length > 0) {
        sql += ` WHERE ${conditions.join(' AND ')}`;
      }
    }
    
    // Time range
    if (query.timeRange && query.timeField) {
      const timeCondition = `"${query.timeField}" >= $${paramIndex} AND "${query.timeField}" <= $${paramIndex + 1}`;
      sql += query.where?.length ? ` AND ${timeCondition}` : ` WHERE ${timeCondition}`;
      paramIndex += 2;
    }
    
    // Group by
    if (query.groupBy && query.groupBy.length > 0) {
      sql += ` GROUP BY ${query.groupBy.map(field => `"${field}"`).join(', ')}`;
    }
    
    // Order by
    if (query.orderBy && query.orderBy.length > 0) {
      const orderClauses = query.orderBy.map(sort => `"${sort.field}" ${sort.direction.toUpperCase()}`);
      sql += ` ORDER BY ${orderClauses.join(', ')}`;
    }
    
    // Limit
    if (query.limit) {
      sql += ` LIMIT ${query.limit}`;
    }
    
    return sql;
  }

  private buildConnectionString(config: DataSourceConfig): string {
    if (config.url) {
      return config.url;
    }

    // Build connection string from individual components
    let connectionString = 'postgresql://';
    
    if (config.username) {
      connectionString += encodeURIComponent(config.username);
      if (config.password) {
        connectionString += ':' + encodeURIComponent(config.password);
      }
      connectionString += '@';
    }
    
    // Add host and port
    const host = config.database?.includes(':') ? config.database : `${config.database || 'localhost'}:5432`;
    connectionString += host;
    
    // Add database name if not included in host
    if (config.customSettings?.database) {
      connectionString += '/' + config.customSettings.database;
    }
    
    // Add SSL and other parameters
    const params: string[] = [];
    if (config.ssl) {
      params.push('sslmode=require');
    }
    if (config.timeout) {
      params.push(`connect_timeout=${Math.floor(config.timeout / 1000)}`);
    }
    
    if (params.length > 0) {
      connectionString += '?' + params.join('&');
    }
    
    return connectionString;
  }
}