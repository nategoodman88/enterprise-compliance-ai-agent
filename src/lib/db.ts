import { Pool } from "pg";

// Vector store: Postgres + pgvector (the same engine Supabase runs under the
// hood). We connect with a plain `pg` pool via DATABASE_URL rather than the
// Supabase client SDK, since queries go straight to Postgres - the schema
// itself (see supabase/migrations) is meant to be applied to a real
// Supabase project with `supabase db push`.
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

export function toVectorLiteral(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}
