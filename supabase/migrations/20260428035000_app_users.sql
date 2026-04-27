create table if not exists public.app_users (
  id uuid primary key default gen_random_uuid(),
  user_key text not null unique,
  identification_method text not null check (identification_method in ('device_id', 'ip_hash')),
  device_id text,
  ip_hash text,
  last_user_agent text,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (identification_method = 'device_id' and device_id is not null)
    or (identification_method = 'ip_hash' and ip_hash is not null)
  )
);

create index if not exists app_users_device_id_idx
  on public.app_users (device_id)
  where device_id is not null;

create index if not exists app_users_ip_hash_idx
  on public.app_users (ip_hash)
  where ip_hash is not null;

create index if not exists app_users_last_seen_at_idx
  on public.app_users (last_seen_at desc);

alter table public.app_users enable row level security;

alter table public.face_reports
  add column if not exists app_user_id uuid references public.app_users(id) on delete set null;

create index if not exists face_reports_app_user_created_at_idx
  on public.face_reports (app_user_id, created_at desc)
  where app_user_id is not null;

with report_identities as (
  select distinct on (fr.id)
    fr.id as report_id,
    fr.created_at,
    fr.ip_hash,
    nullif(fr.user_agent, '') as user_agent,
    nullif(btrim(aq.device_id), '') as device_id,
    case
      when nullif(btrim(aq.device_id), '') is not null then 'device:' || nullif(btrim(aq.device_id), '')
      else 'ip:' || fr.ip_hash
    end as user_key,
    case
      when nullif(btrim(aq.device_id), '') is not null then 'device_id'
      else 'ip_hash'
    end as identification_method
  from public.face_reports as fr
  left join public.analyze_quota as aq on aq.report_id = fr.id
  where nullif(btrim(aq.device_id), '') is not null or fr.ip_hash is not null
  order by fr.id, (nullif(btrim(aq.device_id), '') is not null) desc, aq.created_at desc, aq.id desc
),
app_user_groups as (
  select
    user_key,
    identification_method,
    max(device_id) filter (where device_id is not null) as device_id,
    (array_agg(ip_hash order by created_at desc) filter (where ip_hash is not null))[1] as ip_hash,
    (array_agg(user_agent order by created_at desc) filter (where user_agent is not null))[1] as last_user_agent,
    min(created_at) as first_seen_at,
    max(created_at) as last_seen_at
  from report_identities
  group by user_key, identification_method
)
insert into public.app_users (
  user_key,
  identification_method,
  device_id,
  ip_hash,
  last_user_agent,
  first_seen_at,
  last_seen_at
)
select
  user_key,
  identification_method,
  device_id,
  ip_hash,
  last_user_agent,
  first_seen_at,
  last_seen_at
from app_user_groups
on conflict (user_key) do update set
  device_id = coalesce(excluded.device_id, public.app_users.device_id),
  ip_hash = coalesce(excluded.ip_hash, public.app_users.ip_hash),
  last_user_agent = coalesce(excluded.last_user_agent, public.app_users.last_user_agent),
  first_seen_at = least(public.app_users.first_seen_at, excluded.first_seen_at),
  last_seen_at = greatest(public.app_users.last_seen_at, excluded.last_seen_at),
  updated_at = now();

with report_identities as (
  select distinct on (fr.id)
    fr.id as report_id,
    case
      when nullif(btrim(aq.device_id), '') is not null then 'device:' || nullif(btrim(aq.device_id), '')
      else 'ip:' || fr.ip_hash
    end as user_key
  from public.face_reports as fr
  left join public.analyze_quota as aq on aq.report_id = fr.id
  where nullif(btrim(aq.device_id), '') is not null or fr.ip_hash is not null
  order by fr.id, (nullif(btrim(aq.device_id), '') is not null) desc, aq.created_at desc, aq.id desc
)
update public.face_reports as fr
set app_user_id = au.id
from report_identities as ri
join public.app_users as au on au.user_key = ri.user_key
where fr.id = ri.report_id
  and fr.app_user_id is distinct from au.id;

create or replace function public.upsert_app_user_for_report(p_report_id uuid, p_device_id text default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_report record;
  v_device_id text;
  v_user_key text;
  v_identification_method text;
  v_app_user_id uuid;
begin
  select
    fr.id,
    fr.created_at,
    fr.ip_hash,
    nullif(fr.user_agent, '') as user_agent
  into v_report
  from public.face_reports as fr
  where fr.id = p_report_id;

  if v_report.id is null then
    return null;
  end if;

  v_device_id := nullif(btrim(p_device_id), '');

  if v_device_id is null then
    select nullif(btrim(aq.device_id), '')
    into v_device_id
    from public.analyze_quota as aq
    where aq.report_id = p_report_id
      and nullif(btrim(aq.device_id), '') is not null
    order by aq.created_at desc, aq.id desc
    limit 1;
  end if;

  if v_device_id is not null then
    v_user_key := 'device:' || v_device_id;
    v_identification_method := 'device_id';
  elsif v_report.ip_hash is not null and btrim(v_report.ip_hash) <> '' then
    v_user_key := 'ip:' || v_report.ip_hash;
    v_identification_method := 'ip_hash';
  else
    return null;
  end if;

  insert into public.app_users (
    user_key,
    identification_method,
    device_id,
    ip_hash,
    last_user_agent,
    first_seen_at,
    last_seen_at
  )
  values (
    v_user_key,
    v_identification_method,
    case when v_identification_method = 'device_id' then v_device_id else null end,
    v_report.ip_hash,
    v_report.user_agent,
    v_report.created_at,
    v_report.created_at
  )
  on conflict (user_key) do update set
    device_id = coalesce(excluded.device_id, public.app_users.device_id),
    ip_hash = coalesce(excluded.ip_hash, public.app_users.ip_hash),
    last_user_agent = case
      when excluded.last_seen_at >= public.app_users.last_seen_at then excluded.last_user_agent
      else public.app_users.last_user_agent
    end,
    first_seen_at = least(public.app_users.first_seen_at, excluded.first_seen_at),
    last_seen_at = greatest(public.app_users.last_seen_at, excluded.last_seen_at),
    updated_at = now()
  returning id into v_app_user_id;

  update public.face_reports
  set app_user_id = v_app_user_id
  where id = p_report_id
    and app_user_id is distinct from v_app_user_id;

  return v_app_user_id;
end;
$$;

create or replace function public.sync_app_user_from_analyze_quota()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.report_id is not null then
    perform public.upsert_app_user_for_report(new.report_id, new.device_id);
  end if;

  return new;
end;
$$;

drop trigger if exists analyze_quota_sync_app_user on public.analyze_quota;
create trigger analyze_quota_sync_app_user
after insert or update of report_id, device_id
on public.analyze_quota
for each row
execute function public.sync_app_user_from_analyze_quota();
