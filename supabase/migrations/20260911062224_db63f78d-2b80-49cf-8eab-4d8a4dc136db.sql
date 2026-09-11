INSERT INTO public.user_roles (user_id, role)
VALUES
  ('baef4926-5503-4f79-a668-cd3784bf3e5c', 'admin'),
  ('9f691e38-4465-407c-8ff5-86ff90fa50b2', 'admin'),
  ('e797d545-5314-42f1-8415-b62577f79b72', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;
