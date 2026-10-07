import { readFile } from 'node:fs/promises';
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
        : { rejectUnauthorized: false },
  });

  await client.connect();

  try {
    const migration = await readFile(
      join(__dirname, 'migrations', '001_ai_core.sql'),
      'utf8',
    );

    await client.query(migration);
  } finally {
    await client.end();
  }
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
