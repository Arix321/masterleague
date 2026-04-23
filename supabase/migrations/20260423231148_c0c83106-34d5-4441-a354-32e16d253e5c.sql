-- Carreiras (saves do usuário)
CREATE TABLE public.careers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  manager_name TEXT NOT NULL,
  club_name TEXT NOT NULL,
  club_slug TEXT NOT NULL,
  season INTEGER NOT NULL DEFAULT 1,
  matchday INTEGER NOT NULL DEFAULT 1,
  cash_eur BIGINT NOT NULL DEFAULT 50000000,
  weekly_wages_eur BIGINT NOT NULL DEFAULT 0,
  league_position INTEGER NOT NULL DEFAULT 10,
  points INTEGER NOT NULL DEFAULT 0,
  played INTEGER NOT NULL DEFAULT 0,
  wins INTEGER NOT NULL DEFAULT 0,
  draws INTEGER NOT NULL DEFAULT 0,
  losses INTEGER NOT NULL DEFAULT 0,
  goals_for INTEGER NOT NULL DEFAULT 0,
  goals_against INTEGER NOT NULL DEFAULT 0,
  intro_done BOOLEAN NOT NULL DEFAULT false,
  next_opponent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_careers_user ON public.careers(user_id);

ALTER TABLE public.careers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owners select careers" ON public.careers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "owners insert careers" ON public.careers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "owners update careers" ON public.careers FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "owners delete careers" ON public.careers FOR DELETE USING (auth.uid() = user_id);

-- Jogadores do elenco (de qualquer clube da carreira)
CREATE TABLE public.squad_players (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  career_id UUID NOT NULL REFERENCES public.careers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  club_slug TEXT NOT NULL,
  name TEXT NOT NULL,
  position TEXT NOT NULL DEFAULT 'MEI',
  overall INTEGER NOT NULL DEFAULT 80,
  weekly_wage_eur BIGINT NOT NULL DEFAULT 100000,
  market_value_eur BIGINT NOT NULL DEFAULT 20000000,
  morale INTEGER NOT NULL DEFAULT 70,
  injured BOOLEAN NOT NULL DEFAULT false,
  goals INTEGER NOT NULL DEFAULT 0,
  assists INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_squad_career ON public.squad_players(career_id);
CREATE INDEX idx_squad_club ON public.squad_players(career_id, club_slug);

ALTER TABLE public.squad_players ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owners select squad" ON public.squad_players FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "owners insert squad" ON public.squad_players FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "owners update squad" ON public.squad_players FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "owners delete squad" ON public.squad_players FOR DELETE USING (auth.uid() = user_id);

-- Jogadores do mercado (apenas livres)
CREATE TABLE public.market_players (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  career_id UUID NOT NULL REFERENCES public.careers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  position TEXT NOT NULL DEFAULT 'MEI',
  overall INTEGER NOT NULL DEFAULT 80,
  market_value_eur BIGINT NOT NULL,
  expected_wage_eur BIGINT NOT NULL DEFAULT 200000,
  region TEXT NOT NULL DEFAULT 'Europa',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_market_career ON public.market_players(career_id);

ALTER TABLE public.market_players ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owners select market" ON public.market_players FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "owners insert market" ON public.market_players FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "owners update market" ON public.market_players FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "owners delete market" ON public.market_players FOR DELETE USING (auth.uid() = user_id);

-- Partidas
CREATE TABLE public.matches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  career_id UUID NOT NULL REFERENCES public.careers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  matchday INTEGER NOT NULL,
  opponent TEXT NOT NULL,
  home BOOLEAN NOT NULL DEFAULT true,
  goals_for INTEGER NOT NULL DEFAULT 0,
  goals_against INTEGER NOT NULL DEFAULT 0,
  scorers TEXT,
  assists TEXT,
  league_position_after INTEGER,
  result TEXT NOT NULL DEFAULT 'V', -- V/E/D
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_matches_career ON public.matches(career_id);

ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owners select matches" ON public.matches FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "owners insert matches" ON public.matches FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "owners update matches" ON public.matches FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "owners delete matches" ON public.matches FOR DELETE USING (auth.uid() = user_id);

-- Propostas de transferência (entrada e saída)
CREATE TABLE public.transfer_offers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  career_id UUID NOT NULL REFERENCES public.careers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  direction TEXT NOT NULL, -- 'in' (eu compro) ou 'out' (vendem o meu)
  player_name TEXT NOT NULL,
  player_id UUID, -- referência opcional
  other_club TEXT NOT NULL,
  fee_eur BIGINT NOT NULL DEFAULT 0,
  wage_eur BIGINT NOT NULL DEFAULT 0,
  contract_years INTEGER NOT NULL DEFAULT 3,
  bonus_eur BIGINT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending', -- pending/accepted/rejected/countered
  club_response TEXT,
  player_response TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_offers_career ON public.transfer_offers(career_id);

ALTER TABLE public.transfer_offers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owners select offers" ON public.transfer_offers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "owners insert offers" ON public.transfer_offers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "owners update offers" ON public.transfer_offers FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "owners delete offers" ON public.transfer_offers FOR DELETE USING (auth.uid() = user_id);

-- Notícias / feed
CREATE TABLE public.news_feed (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  career_id UUID NOT NULL REFERENCES public.careers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL DEFAULT 'news', -- news/headline/press/board
  title TEXT NOT NULL,
  body TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_news_career ON public.news_feed(career_id, created_at DESC);

ALTER TABLE public.news_feed ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owners select news" ON public.news_feed FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "owners insert news" ON public.news_feed FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "owners update news" ON public.news_feed FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "owners delete news" ON public.news_feed FOR DELETE USING (auth.uid() = user_id);