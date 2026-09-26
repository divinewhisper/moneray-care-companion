ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS sender_name TEXT NOT NULL DEFAULT '';

-- Messages table already has RLS and grants; ensure column is usable by both sides
GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;