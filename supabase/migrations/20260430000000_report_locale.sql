alter table public.face_reports
  add column if not exists locale text not null default 'ko';

alter table public.face_reports
  drop constraint if exists face_reports_locale_check,
  add constraint face_reports_locale_check
    check (locale in ('ko', 'en', 'ja'));

create index if not exists face_reports_locale_created_at_idx
  on public.face_reports (locale, created_at desc);
