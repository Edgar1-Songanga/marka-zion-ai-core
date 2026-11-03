import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Pool, PoolClient, QueryResultRow } from 'pg';
import { SUPABASE_ROOT_2021_CA } from './supabase-root-ca';

function createPool() {
  const rawConnectionString = process.env.DATABASE_URL;
  const sslEnabled =
    process.env.NODE_ENV === 'production' ||
    process.env.DATABASE_SSL !== 'false';

  let connectionString = rawConnectionString;
  if (rawConnectionString && sslEnabled) {
    const url = new URL(rawConnectionString);
    // node-postgres lets ssl query parameters override the explicit ssl object.
    // Remove them so the Supabase CA below is always used for verification.
    for (const key of [...url.searchParams.keys()]) {
      if (key.toLowerCase().startsWith('ssl')) {
        url.searchParams.delete(key);
      }
    }
    connectionString = url.toString();
  }

  const configuredMax = Number(process.env.DATABASE_POOL_MAX ?? 1);
  const max =
    Number.isFinite(configuredMax) && configuredMax >= 1
      ? Math.min(Math.floor(configuredMax), 5)
      : 1;

  return new Pool({
    connectionString,
    max,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 10000,
    keepAlive: true,
    ssl: sslEnabled
      ? {
          ca: SUPABASE_ROOT_2021_CA,
          rejectUnauthorized: true,
        }
      : false,
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
