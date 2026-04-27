alter table public.face_reports
  add column if not exists attempt_count integer not null default 0,
  add column if not exists model_used text,
  add column if not exists last_error text,
  add column if not exists retry_after timestamptz,
  add column if not exists locked_until timestamptz,
  add column if not exists processing_started_at timestamptz,
  add column if not exists heartbeat_at timestamptz,
  add column if not exists completed_at timestamptz;

alter table public.face_reports
  drop constraint if exists face_reports_status_check;

update public.face_reports
set
  status = 'retrying',
  retry_after = coalesce(retry_after, now()),
  last_error = coalesce(last_error, 'migrated from legacy analyzing status')
where status = 'analyzing';

alter table public.face_reports
  alter column status set default 'queued',
  add constraint face_reports_status_check
    check (status in ('queued', 'processing', 'retrying', 'complete', 'failed'));

create index if not exists face_reports_job_ready_idx
  on public.face_reports (status, retry_after, created_at)
  where status in ('queued', 'retrying');

create index if not exists face_reports_processing_lock_idx
  on public.face_reports (status, locked_until)
  where status = 'processing';

create or replace function public.claim_face_report_job(
  target_id uuid default null,
  max_running integer default 2,
  lock_seconds integer default 270
)
returns setof public.face_reports
language plpgsql
security definer
set search_path = public
as $$
declare
  running_count integer;
begin
  perform pg_advisory_xact_lock(hashtext('face_report_jobs'));

  update public.face_reports
  set
    status = 'retrying',
    retry_after = now(),
    locked_until = null,
    last_error = coalesce(last_error, 'worker lock expired')
  where status = 'processing'
    and locked_until is not null
    and locked_until < now();

  select count(*)
  into running_count
  from public.face_reports
  where status = 'processing'
    and locked_until is not null
    and locked_until > now();

  if running_count >= greatest(max_running, 1) then
    return;
  end if;

  return query
  with next_job as (
    select id
    from public.face_reports
    where expires_at > now()
      and face_image_path is not null
      and status in ('queued', 'retrying')
      and (retry_after is null or retry_after <= now())
      and (target_id is null or id = target_id)
    order by
      case when target_id is not null and id = target_id then 0 else 1 end,
      created_at asc
    limit 1
    for update skip locked
  )
  update public.face_reports as report
  set
    status = 'processing',
    attempt_count = report.attempt_count + 1,
    locked_until = now() + make_interval(secs => greatest(lock_seconds, 30)),
    processing_started_at = coalesce(report.processing_started_at, now()),
    heartbeat_at = now(),
    retry_after = null,
    last_error = null
  from next_job
  where report.id = next_job.id
  returning report.*;
end;
$$;

grant execute on function public.claim_face_report_job(uuid, integer, integer) to service_role;
