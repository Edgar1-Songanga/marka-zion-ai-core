-- Production hardening: AI Core tables are server-side only.
-- The NestJS service uses a direct PostgreSQL connection (pg Pool), not
-- Supabase client-side PostgREST. Enable RLS and remove Data API grants from
-- browser-facing roles so a missing policy cannot expose internal records.
DO $$
DECLARE
  t RECORD;
BEGIN
  FOR t IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename LIKE 'ai\_%' ESCAPE '\'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.tablename);
    EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public.%I FROM anon, authenticated', t.tablename);
  END LOOP;
END
$$;

-- Protect any sequences owned by these internal tables from direct Data API access.
DO $$
DECLARE
  s RECORD;
BEGIN
  FOR s IN
    SELECT sequence_schema, sequence_name
    FROM information_schema.sequences
    WHERE sequence_schema = 'public'
      AND sequence_name LIKE 'ai\_%' ESCAPE '\'
  LOOP
    EXECUTE format('REVOKE ALL PRIVILEGES ON SEQUENCE %I.%I FROM anon, authenticated',
      s.sequence_schema, s.sequence_name);
  END LOOP;
END
$$;
