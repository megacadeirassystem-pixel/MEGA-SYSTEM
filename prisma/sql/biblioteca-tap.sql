BEGIN;

CREATE TABLE public.usinagem_taps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid(),
  file_name text NOT NULL CHECK (length(file_name) BETWEEN 5 AND 160),
  name_key text GENERATED ALWAYS AS (lower(normalize(btrim(file_name), NFC))) STORED UNIQUE,
  content text NOT NULL CHECK (octet_length(content) BETWEEN 1 AND 4000000),
  pieces integer NOT NULL CHECK (pieces > 0),
  seconds double precision NOT NULL CHECK (seconds >= 0 AND seconds <= 31536000),
  sheet_number integer NOT NULL CHECK (sheet_number > 0),
  sku text CHECK (sku ~ '^USI-(ASS|ENC)-(BEL|GOL|JER|PLU)$'),
  revision uuid NOT NULL DEFAULT gen_random_uuid(),
  saved_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX usinagem_taps_saved_at_idx ON public.usinagem_taps (saved_at DESC, id);

ALTER TABLE public.usinagem_taps ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.usinagem_taps FROM anon, authenticated;
GRANT SELECT, DELETE ON public.usinagem_taps TO authenticated;
GRANT INSERT (file_name, content, pieces, seconds, sheet_number, sku) ON public.usinagem_taps TO authenticated;
GRANT UPDATE (file_name, content, pieces, seconds, sheet_number, sku, revision, saved_at)
  ON public.usinagem_taps TO authenticated;

CREATE POLICY acesso_equipe_tap ON public.usinagem_taps AS RESTRICTIVE TO authenticated
  USING ((SELECT auth.jwt()) -> 'app_metadata' ->> 'mega_tap_access' = 'true')
  WITH CHECK ((SELECT auth.jwt()) -> 'app_metadata' ->> 'mega_tap_access' = 'true');
CREATE POLICY ler_taps ON public.usinagem_taps FOR SELECT TO authenticated USING (true);
CREATE POLICY criar_taps ON public.usinagem_taps FOR INSERT TO authenticated WITH CHECK (owner_id = (SELECT auth.uid()));
CREATE POLICY substituir_taps ON public.usinagem_taps FOR UPDATE TO authenticated
  USING (owner_id = (SELECT auth.uid())) WITH CHECK (owner_id = (SELECT auth.uid()));
CREATE POLICY excluir_taps ON public.usinagem_taps FOR DELETE TO authenticated USING (owner_id = (SELECT auth.uid()));

COMMIT;
