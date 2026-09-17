ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS patient_last_read_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS doctor_last_read_at TIMESTAMPTZ;