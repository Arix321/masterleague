-- squad_players: idade, potencial, atributos
ALTER TABLE public.squad_players
  ADD COLUMN IF NOT EXISTS age integer NOT NULL DEFAULT 25,
  ADD COLUMN IF NOT EXISTS potential integer NOT NULL DEFAULT 80,
  ADD COLUMN IF NOT EXISTS attack integer NOT NULL DEFAULT 70,
  ADD COLUMN IF NOT EXISTS defense integer NOT NULL DEFAULT 70,
  ADD COLUMN IF NOT EXISTS physical integer NOT NULL DEFAULT 70,
  ADD COLUMN IF NOT EXISTS technique integer NOT NULL DEFAULT 70;

-- market_players: idade e potencial
ALTER TABLE public.market_players
  ADD COLUMN IF NOT EXISTS age integer NOT NULL DEFAULT 25,
  ADD COLUMN IF NOT EXISTS potential integer NOT NULL DEFAULT 80;

-- careers: janela de transferências
ALTER TABLE public.careers
  ADD COLUMN IF NOT EXISTS transfer_window_open boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS transfer_window_closes_at integer NOT NULL DEFAULT 8;

-- Nova tabela: propostas recebidas (outros clubes pelos meus jogadores)
CREATE TABLE IF NOT EXISTS public.incoming_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  career_id uuid NOT NULL,
  user_id uuid NOT NULL,
  player_id uuid NOT NULL,
  player_name text NOT NULL,
  from_club text NOT NULL,
  fee_eur bigint NOT NULL DEFAULT 0,
  bonus_eur bigint NOT NULL DEFAULT 0,
  wage_offered_eur bigint NOT NULL DEFAULT 0,
  offer_type text NOT NULL DEFAULT 'buy',
  player_interest integer NOT NULL DEFAULT 50,
  status text NOT NULL DEFAULT 'pending',
  matchday integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.incoming_offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owners select incoming" ON public.incoming_offers
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "owners insert incoming" ON public.incoming_offers
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "owners update incoming" ON public.incoming_offers
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "owners delete incoming" ON public.incoming_offers
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_incoming_offers_career ON public.incoming_offers(career_id);
CREATE INDEX IF NOT EXISTS idx_squad_players_career ON public.squad_players(career_id);
CREATE INDEX IF NOT EXISTS idx_market_players_career ON public.market_players(career_id);