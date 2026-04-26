create extension if not exists "pgcrypto";

create table if not exists public.face_reports (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '24 hours',
  gender text not null check (gender in ('male', 'female')),
  status text not null default 'analyzing' check (status in ('analyzing', 'complete', 'failed')),
  face_image_path text,
  landmarks_json jsonb,
  metrics_json jsonb,
  report_sections_json jsonb,
  main_copy text,
  live_feed_json jsonb not null default '[]'::jsonb,
  user_agent text,
  ip_hash text
);

create index if not exists face_reports_created_at_idx on public.face_reports (created_at);
create index if not exists face_reports_expires_at_idx on public.face_reports (expires_at);

alter table public.face_reports enable row level security;

drop policy if exists "anon can insert" on public.face_reports;
create policy "anon can insert" on public.face_reports
  for insert to anon
  with check (true);

drop policy if exists "anon can select non-expired" on public.face_reports;
create policy "anon can select non-expired" on public.face_reports
  for select to anon
  using (expires_at > now());

insert into storage.buckets (id, name, public)
values ('face-images', 'face-images', false)
on conflict (id) do nothing;
