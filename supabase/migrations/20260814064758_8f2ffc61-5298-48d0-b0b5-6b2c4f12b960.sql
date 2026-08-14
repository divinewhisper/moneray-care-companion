create type public.app_role as enum ('patient', 'doctor', 'admin');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  )
$$;

create policy "read own roles" on public.user_roles
  for select to authenticated using (auth.uid() = user_id);
create policy "admins read all roles" on public.user_roles
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

create table public.doctor_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  first_name text not null default '',
  last_name text not null default '',
  email text not null default '',
  phone text not null default '',
  license_number text not null default '',
  specialty text not null default '',
  hospital text not null default '',
  license_file_path text not null default '',
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, update on public.doctor_profiles to authenticated;
grant all on public.doctor_profiles to service_role;
alter table public.doctor_profiles enable row level security;

create policy "doctors read own profile" on public.doctor_profiles
  for select to authenticated using (auth.uid() = user_id);
create policy "doctors insert own profile" on public.doctor_profiles
  for insert to authenticated with check (auth.uid() = user_id and status = 'pending');
create policy "doctors update own profile" on public.doctor_profiles
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id and status = 'pending');

create policy "admins read doctor profiles" on public.doctor_profiles
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "admins update doctor profiles" on public.doctor_profiles
  for update to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

create trigger doctor_profiles_touch_updated_at
  before update on public.doctor_profiles
  for each row execute function public.moneray_touch_updated_at();

create policy "doctors upload own license" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'doctor-licenses' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "doctors read own license" on storage.objects
  for select to authenticated
  using (bucket_id = 'doctor-licenses' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "doctors update own license" on storage.objects
  for update to authenticated
  using (bucket_id = 'doctor-licenses' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'doctor-licenses' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "admins read licenses" on storage.objects
  for select to authenticated
  using (bucket_id = 'doctor-licenses' and public.has_role(auth.uid(), 'admin'));
