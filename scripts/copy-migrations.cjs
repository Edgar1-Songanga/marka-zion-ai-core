const { cpSync, existsSync, mkdirSync, readdirSync } = require('node:fs');
const { join } = require('node:path');

const source = join(process.cwd(), 'src', 'infrastructure', 'postgres', 'migrations');
const destination = join(process.cwd(), 'dist', 'infrastructure', 'postgres', 'migrations');

if (!existsSync(source)) {
  throw new Error('Source SQL migrations directory is missing: ' + source);
}

mkdirSync(destination, { recursive: true });
cpSync(source, destination, { recursive: true, force: true });

const migrations = readdirSync(destination).filter((name) => /^\\d+_[a-z0-9_-]+\\.sql$/.test(name));
if (migrations.length !== 9) {
  throw new Error('Expected 9 SQL migrations in production output; found ' + migrations.length);
}

console.log('Copied and verified ' + migrations.length + ' SQL migrations.');
