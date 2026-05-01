
ALTER TABLE public.squad_players ADD COLUMN IF NOT EXISTS face_url TEXT;
ALTER TABLE public.squad_players ADD COLUMN IF NOT EXISTS is_captain BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS idx_squad_one_captain
  ON public.squad_players(career_id, club_slug)
  WHERE is_captain = true;

INSERT INTO storage.buckets (id, name, public)
VALUES ('player-faces', 'player-faces', true)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Faces are publicly accessible') THEN
    CREATE POLICY "Faces are publicly accessible"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'player-faces');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service can upload faces') THEN
    CREATE POLICY "Service can upload faces"
      ON storage.objects FOR INSERT
      WITH CHECK (bucket_id = 'player-faces');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service can update faces') THEN
    CREATE POLICY "Service can update faces"
      ON storage.objects FOR UPDATE
      USING (bucket_id = 'player-faces');
  END IF;
END $$;
