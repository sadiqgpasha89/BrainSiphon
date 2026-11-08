-- Executed once by the pgvector container on first start (docker-entrypoint-initdb.d).
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS use_cases (
  id               uuid PRIMARY KEY,
  slug             text NOT NULL UNIQUE,
  title            text NOT NULL,
  domain           text NOT NULL,
  latency_sla      text NOT NULL,
  difficulty       text NOT NULL,
  paradigms        text[] NOT NULL,
  summary          text NOT NULL,
  body             text NOT NULL,
  signal_count     integer NOT NULL,
  noise_count      integer NOT NULL,
  meta             jsonb NOT NULL,
  last_verified_at timestamp NOT NULL,
  embedding        vector(384) NOT NULL,
  tsv              tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('english', title), 'A') ||
    setweight(to_tsvector('english', summary), 'B') ||
    setweight(to_tsvector('english', body), 'C')
  ) STORED
);

CREATE INDEX IF NOT EXISTS use_cases_tsv_gin ON use_cases USING gin (tsv);
CREATE INDEX IF NOT EXISTS use_cases_embedding_hnsw ON use_cases USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS use_cases_domain_idx ON use_cases (domain);

CREATE TABLE IF NOT EXISTS slug_history (
  old_slug text PRIMARY KEY,
  new_slug text NOT NULL
);
