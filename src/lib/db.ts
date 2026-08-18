import { Pool } from "pg";

// Vector store: Postgres + pgvector (the same engine Supabase runs under the
// hood). We connect with a plain `pg` pool via DATABASE_URL rather than the
// Supabase client SDK, since this project runs against a self-hosted
// pgvector/pgvector Postgres instance (see docker-compose.yml) instead of a
// hosted Supabase project.
const globalForPg = globalThis as unknown as { pgPool?: Pool };

export const EMBEDDING_DIMENSIONS = 1536;

export function getPool(): Pool {
  if (!globalForPg.pgPool) {
    globalForPg.pgPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 10,
    });
  }
  return globalForPg.pgPool;
}

let schemaReady: Promise<void> | null = null;

export function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = initSchema().catch((err) => {
      schemaReady = null;
      throw err;
    });
  }
  return schemaReady;
}

async function initSchema(): Promise<void> {
  const pool = getPool();
  await pool.query("CREATE EXTENSION IF NOT EXISTS vector");

  await pool.query(`
    CREATE TABLE IF NOT EXISTS documents (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      filename TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'processing',
      error TEXT,
      page_count INTEGER,
      char_count INTEGER,
      chunk_count INTEGER,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS chunks (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
      chunk_index INTEGER NOT NULL,
      page_number INTEGER,
      content TEXT NOT NULL,
      token_count INTEGER NOT NULL,
      embedding VECTOR(${EMBEDDING_DIMENSIONS}) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  await pool.query(
    `CREATE INDEX IF NOT EXISTS chunks_embedding_idx ON chunks
     USING hnsw (embedding vector_cosine_ops)`
  );

  await pool.query(
    `CREATE INDEX IF NOT EXISTS chunks_document_id_idx ON chunks (document_id)`
  );

  await pool.query(`
    CREATE TABLE IF NOT EXISTS audits (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
      model_mode TEXT NOT NULL,
      overall_score INTEGER NOT NULL,
      summary TEXT NOT NULL,
      findings JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  await pool.query(
    `CREATE INDEX IF NOT EXISTS audits_document_id_idx ON audits (document_id)`
  );
}

export function toVectorLiteral(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}
