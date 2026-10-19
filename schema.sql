CREATE TABLE IF NOT EXISTS kind_orders (
 id text PRIMARY KEY, idempotency_key text UNIQUE NOT NULL,
 fingerprint text NOT NULL, token_hash text NOT NULL,
 payload jsonb NOT NULL, amount integer NOT NULL CHECK(amount>=500),
 transaction_id text UNIQUE, status text NOT NULL DEFAULT 'PENDING',
 pix jsonb, created_at timestamptz NOT NULL DEFAULT now(),
 last_sync timestamptz, updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS kind_events(id text PRIMARY KEY,created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS kind_limits(bucket text PRIMARY KEY,hits integer NOT NULL,expires_at timestamptz NOT NULL);
-- Execute somente no banco privado. Não habilitar acesso público a estas tabelas.
