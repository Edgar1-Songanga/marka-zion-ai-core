import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Client } from 'pg';

async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL is required');
  }

  const client = new Client({
    connectionString,
    ssl:
      process.env.DATABASE_SSL === 'false'
        ? false
        : {
            rejectUnauthorized:
              process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== 'false',
          },
  });

  await client.connect();

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS ai_schema_migrations (
        version TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const directory = join(
      process.cwd(),
      'src',
      'infrastructure',
      'postgres',
      'migrations',
    );

    const files = (await readdir(directory))
      .filter((file) => file.endsWith('.sql'))
      .sort();

    for (const file of files) {
      const applied = await client.query(
        'SELECT 1 FROM ai_schema_migrations WHERE version = $1',
        [file],
      );

      if (applied.rowCount) {
        continue;
      }

      const migration = await readFile(join(directory, file), 'utf8');

      await client.query('BEGIN');

      try {
        await client.query(migration);
        await client.query(
          'INSERT INTO ai_schema_migrations (version) VALUES ($1)',
          [file],
        );
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    }
  } finally {
    await client.end();
  }
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
