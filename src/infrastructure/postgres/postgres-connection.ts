import { SUPABASE_ROOT_2021_CA } from './supabase-root-ca';

export function getPostgresConnectionConfig() {
  const rawConnectionString = process.env.DATABASE_URL;
  const sslEnabled =
    process.env.NODE_ENV === 'production' ||
    process.env.DATABASE_SSL !== 'false';

  let connectionString = rawConnectionString;
  if (rawConnectionString && sslEnabled) {
    const url = new URL(rawConnectionString);

    // Serverless workloads should use Supavisor transaction mode.
    if (
      url.hostname.endsWith('.pooler.supabase.com') &&
      (!url.port || url.port === '5432')
    ) {
      url.port = '6543';
    }

    // Prevent node-postgres query parameters from overriding verified TLS.
    for (const key of [...url.searchParams.keys()]) {
      if (key.toLowerCase().startsWith('ssl')) {
        url.searchParams.delete(key);
      }
    }
    connectionString = url.toString();
  }

  return {
    connectionString,
    ssl: sslEnabled
      ? {
          ca: SUPABASE_ROOT_2021_CA,
          rejectUnauthorized: true,
        }
      : false,
  };
}
