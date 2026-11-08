import { drizzle } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import { Pool } from 'pg';
import { logger } from './telemetry/logger';
import { reciprocalRankFusion } from './search/rrf';
import { embed, toPgVector, tokenize } from './search/embed';
import type { Filters } from './search/engine';

let pool: Pool | null | undefined;

export function getPool(): Pool | null {
  if (pool !== undefined) return pool;
  const url = process.env.DATABASE_URL;
  if (!url) return (pool = null);
  pool = new Pool({
    connectionString: url,
    max: 10,
    connectionTimeoutMillis: 700,
    idleTimeoutMillis: 30_000,
    statement_timeout: 700,
    query_timeout: 800,
  });
  pool.on('error', (e) => logger.warn({ err: e.message }, 'pg pool error'));
  return pool;
}

export const dbConfigured = () => Boolean(process.env.DATABASE_URL);

interface Row extends Record<string, unknown> {
  id: string;
  score: number;
}

/** Hybrid retrieval: Postgres full-text (ts_rank_cd) + pgvector cosine, fused with RRF. Returns ids in fused order. */
export async function hybridSearchIds(q: string, f: Filters, signal?: AbortSignal): Promise<string[]> {
  const p = getPool();
  if (!p) throw new Error('database not configured');
  const db = drizzle(p);
  const vec = toPgVector(embed(q));
  // OR-of-terms tsquery (tokens are [a-z0-9] only, so this is injection-safe); ts_rank_cd then favours docs matching more terms
  const tsq =
    [...new Set(tokenize(q))]
      .slice(0, 10)
      .map((t) => `${t}:*`)
      .join(' | ') || 'zzzz';
  const where = sql`(${f.domain ?? null}::text IS NULL OR domain = ${f.domain ?? null})
    AND (${f.latency ?? null}::text IS NULL OR latency_sla = ${f.latency ?? null})
    AND (${f.difficulty ?? null}::text IS NULL OR difficulty = ${f.difficulty ?? null})
    AND (${f.paradigm ?? null}::text IS NULL OR ${f.paradigm ?? null} = ANY(paradigms))`;
  if (signal?.aborted) throw new Error('aborted');
  const [lex, sem] = await Promise.all([
    db.execute<Row>(sql`SELECT id, ts_rank_cd(tsv, to_tsquery('english', ${tsq})) AS score FROM use_cases
      WHERE tsv @@ to_tsquery('english', ${tsq}) AND ${where} ORDER BY score DESC LIMIT 100`),
    db.execute<Row>(sql`SELECT id, 1 - (embedding <=> ${vec}::vector) AS score FROM use_cases
      WHERE ${where} ORDER BY embedding <=> ${vec}::vector LIMIT 100`),
  ]);
  const fused = reciprocalRankFusion([
    lex.rows.map((r) => ({ id: r.id })),
    sem.rows.filter((r) => Number(r.score) > 0.12).map((r) => ({ id: r.id })),
  ]);
  return fused.map((r) => r.id);
}

export async function pingDb(timeoutMs = 2000): Promise<void> {
  const p = getPool();
  if (!p) throw new Error('not configured');
  await Promise.race([
    p.query('SELECT 1'),
    new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), timeoutMs)),
  ]);
}
