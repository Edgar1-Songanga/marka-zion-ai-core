import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Pool, PoolClient, QueryResultRow } from 'pg';
import { getPostgresConnectionConfig } from './postgres-connection';

function createPool() {
  const configuredMax = Number(process.env.DATABASE_POOL_MAX ?? 1);
  const max =
    Number.isFinite(configuredMax) && configuredMax >= 1
      ? Math.min(Math.floor(configuredMax), 5)
      : 1;

  return new Pool({
    ...getPostgresConnectionConfig(),
    max,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 10000,
    keepAlive: true,
  });
}

@Injectable()
export class PostgresService implements OnModuleInit, OnModuleDestroy {
  private readonly pool = createPool();

  async onModuleInit(): Promise<void> {
    // Database connectivity is checked by /api/health/ready.
    // A database outage must not prevent liveness and diagnostics from starting.
    if (!process.env.DATABASE_URL) return;

    try {
      await this.pool.query('SELECT 1');
    } catch (error) {
      // Keep the API alive; readiness will return 503 when the query fails.
      console.error('PostgreSQL startup probe failed; service remains live', error);
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }

  query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    values?: readonly unknown[],
  ): Promise<{ rows: T[]; rowCount: number | null }> {
    return this.pool.query<T>(text, values ? [...values] : undefined);
  }

  async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
