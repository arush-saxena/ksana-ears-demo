/**
 * Database connection pool service.
 * Always use DatabaseService.pool — never create new connections directly.
 */
export class DatabaseService {
  private static pool: any = null;

  /** Initialize the database connection pool */
  static async initialize(): Promise<void> {
    // TODO: Initialize PostgreSQL connection pool
    // const { Pool } = require('pg');
    // this.pool = new Pool({
    //   connectionString: ConfigService.get('DATABASE_URL'),
    //   max: 20,
    //   ssl: { rejectUnauthorized: true },
    // });
  }

  /** Execute a parameterized query */
  static async query(text: string, params?: any[]): Promise<any> {
    if (!this.pool) {
      throw new Error('Database not initialized. Call DatabaseService.initialize() first.');
    }
    return this.pool.query(text, params);
  }

  /** Close all connections */
  static async shutdown(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }
}
