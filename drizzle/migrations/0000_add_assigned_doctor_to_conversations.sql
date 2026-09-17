ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS assigned_doctor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS conversations_assigned_doctor_id_idx
  ON public.conversations (assigned_doctor_id);