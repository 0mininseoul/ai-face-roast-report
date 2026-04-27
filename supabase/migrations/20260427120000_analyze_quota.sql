create table if not exists public.analyze_quota (
  id bigserial primary key,
  ip_hash text not null,
  device_id text,
  report_id uuid references public.face_reports(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists analyze_quota_ip_created_idx
  on public.analyze_quota (ip_hash, created_at desc);

create index if not exists analyze_quota_device_created_idx
  on public.analyze_quota (device_id, created_at desc)
  where device_id is not null;

alter table public.analyze_quota enable row level security;
