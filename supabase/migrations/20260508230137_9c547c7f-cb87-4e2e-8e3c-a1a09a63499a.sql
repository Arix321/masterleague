ALTER TABLE public.news_feed ADD COLUMN IF NOT EXISTS image_url text;

INSERT INTO storage.buckets (id, name, public)
VALUES ('crowd-images', 'crowd-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Crowd images publicly readable"
ON storage.objects FOR SELECT
USING (bucket_id = 'crowd-images');

CREATE POLICY "Authenticated users upload crowd images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'crowd-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Authenticated users update own crowd images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'crowd-images' AND auth.uid()::text = (storage.foldername(name))[1]);