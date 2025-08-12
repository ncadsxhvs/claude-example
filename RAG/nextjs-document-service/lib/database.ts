import { Pool, PoolClient } from 'pg';
import { databaseConfig } from './config';

// Database configuration from centralized config
const pool = new Pool({
  user: databaseConfig.user,
  host: databaseConfig.host,
  database: databaseConfig.name,
  password: databaseConfig.password,
  port: databaseConfig.port,
  // Connection pool settings
  max: 20, // Maximum number of clients in pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return error after 2 seconds if connection could not be established
});

// Database connection singleton
class Database {
  private static instance: Database;
  private pool: Pool;

  private constructor() {
    this.pool = pool;
    
    // Handle connection errors
    this.pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
      process.exit(-1);
    });
  }

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  // Get a client from the pool
  public async getClient(): Promise<PoolClient> {
    return this.pool.connect();
  }

  // Execute a query with automatic client management
  public async query(text: string, params?: any[]): Promise<any> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(text, params);
      return result;
    } finally {
      client.release();
    }
  }

  // Test database connection
  public async testConnection(): Promise<boolean> {
    try {
      const result = await this.query('SELECT NOW()');
      console.log('Database connected successfully at:', result.rows[0].now);
      return true;
    } catch (error) {
      console.error('Database connection failed:', error);
      return false;
    }
  }

  // Close all connections (for graceful shutdown)
  public async close(): Promise<void> {
    await this.pool.end();
  }
}

// Export singleton instance
export const db = Database.getInstance();