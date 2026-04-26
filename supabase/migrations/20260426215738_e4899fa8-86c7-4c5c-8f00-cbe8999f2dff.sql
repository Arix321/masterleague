ALTER TABLE public.squad_players
ADD COLUMN IF NOT EXISTS yellow_cards_season integer NOT NULL DEFAULT 0;