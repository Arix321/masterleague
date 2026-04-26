
ALTER TABLE public.transfer_offers
  ADD COLUMN IF NOT EXISTS deal_type text NOT NULL DEFAULT 'buy',
  ADD COLUMN IF NOT EXISTS loan_months integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS loan_buy_option_eur bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS loan_obligation boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS wage_share_pct integer NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS negotiation_round integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS rounds_used integer NOT NULL DEFAULT 1;

ALTER TABLE public.squad_players
  ADD COLUMN IF NOT EXISTS on_loan boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS loan_to_club text,
  ADD COLUMN IF NOT EXISTS loan_returns_at_matchday integer,
  ADD COLUMN IF NOT EXISTS original_wage_eur bigint NOT NULL DEFAULT 0;
