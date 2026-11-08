import { sql } from 'drizzle-orm';
import { index, integer, jsonb, pgTable, text, timestamp, uuid, vector } from 'drizzle-orm/pg-core';

/**
 * Index table for hybrid search. The canonical content lives in Git (.uc files); this table is a
 * rebuildable projection: metadata, a generated tsvector for full-text, and a 384-d embedding.
 */
export const useCases = pgTable(
  'use_cases',
  {
    id: uuid('id').primaryKey(),
    slug: text('slug').notNull().unique(),
    title: text('title').notNull(),
    domain: text('domain').notNull(),
    latencySla: text('latency_sla').notNull(),
    difficulty: text('difficulty').notNull(),
    paradigms: text('paradigms').array().notNull(),
    summary: text('summary').notNull(),
    body: text('body').notNull(),
    signalCount: integer('signal_count').notNull(),
    noiseCount: integer('noise_count').notNull(),
    meta: jsonb('meta').notNull(),
    lastVerifiedAt: timestamp('last_verified_at', { mode: 'string' }).notNull(),
    embedding: vector('embedding', { dimensions: 384 }).notNull(),
    tsv: text('tsv').generatedAlwaysAs(
      sql`setweight(to_tsvector('english', title), 'A') || setweight(to_tsvector('english', summary), 'B') || setweight(to_tsvector('english', body), 'C')`,
    ),
  },
  (t) => [
    index('use_cases_embedding_hnsw').using('hnsw', t.embedding.op('vector_cosine_ops')),
    index('use_cases_domain_idx').on(t.domain),
  ],
);

export const slugHistory = pgTable('slug_history', {
  oldSlug: text('old_slug').primaryKey(),
  newSlug: text('new_slug').notNull(),
});
