ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS card_meta jsonb,
  ADD COLUMN IF NOT EXISTS provider text NOT NULL DEFAULT 'mock_ziraat',
  ADD COLUMN IF NOT EXISTS provider_txn_id text,
  ADD COLUMN IF NOT EXISTS failure_reason text;