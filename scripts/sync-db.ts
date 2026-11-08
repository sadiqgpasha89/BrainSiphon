/**
 * Projects the Git-backed content into PostgreSQL (metadata, generated tsvector, pgvector embeddings).
 * Idempotent: safe to run on every deploy. The database is a rebuildable index, never the source of truth.
 */
import { readFileSync } from 'node:fs';
import { drizzle } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import { Pool } from 'pg';
import { slugHistory, useCases } from '../src/db/schema';
import { loadAllUseCases, toIndexEntry } from '../src/content/load';
import { embed } from '../src/lib/search/embed';

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is required');
  const pool = new Pool({ connectionString: url });
  const db = drizzle(pool);

  await pool.query(readFileSync('db/init.sql', 'utf8'));

  const all = loadAllUseCases();
  const rows = all.map((u) => {
    const idx = toIndexEntry(u);
    const body = [
      u.problemFormulation.businessObjective,
      ...u.signalVsNoiseMatrix.flatMap((r) => [r.concept, r.trueSignal, r.commonNoise]),
      ...u.dataAndFeatures.highSignalFeatures.flatMap((f) => [f.name, f.formulaOrLogic]),
      u.architectureBlueprint.baselineModel,
      u.architectureBlueprint.productionModel,
      ...u.systemDesign.hld.components.map((c) => `${c.name} ${c.tech}`),
      ...u.productionEdgeCases.map((e) => e.scenario),
    ].join('. ');
    return {
      id: u.id,
      slug: u.slug,
      title: u.title,
      domain: u.domain,
      latencySla: u.latencySLA,
      difficulty: u.difficulty,
      paradigms: u.mlParadigms,
      summary: u.summary,
      body,
      signalCount: idx.signalCount,
      noiseCount: idx.noiseCount,
      meta: { keywords: idx.keywords },
      lastVerifiedAt: u.lastVerifiedAt,
      embedding: embed(`${u.title}. ${u.summary}. ${body}`),
    };
  });

  for (let i = 0; i < rows.length; i += 50) {
    await db
      .insert(useCases)
      .values(rows.slice(i, i + 50))
      .onConflictDoUpdate({
        target: useCases.id,
        set: {
          slug: sql`excluded.slug`,
          title: sql`excluded.title`,
          domain: sql`excluded.domain`,
          latencySla: sql`excluded.latency_sla`,
          difficulty: sql`excluded.difficulty`,
          paradigms: sql`excluded.paradigms`,
          summary: sql`excluded.summary`,
          body: sql`excluded.body`,
          signalCount: sql`excluded.signal_count`,
          noiseCount: sql`excluded.noise_count`,
          meta: sql`excluded.meta`,
          lastVerifiedAt: sql`excluded.last_verified_at`,
          embedding: sql`excluded.embedding`,
        },
      });
  }
  // remove rows for use cases that no longer exist in Git
  await db.execute(
    sql`DELETE FROM use_cases WHERE id NOT IN (${sql.join(
      all.map((u) => sql`${u.id}::uuid`),
      sql`, `,
    )})`,
  );

  const history = JSON.parse(readFileSync('content/slug-history.json', 'utf8')) as Record<string, string>;
  await db.delete(slugHistory);
  const hist = Object.entries(history).map(([oldSlug, newSlug]) => ({ oldSlug, newSlug }));
  if (hist.length) await db.insert(slugHistory).values(hist);

  const n = await pool.query('SELECT count(*)::int AS n FROM use_cases');
  console.log(`db:sync ✔ ${n.rows[0].n} use cases, ${hist.length} slug redirects`);
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
