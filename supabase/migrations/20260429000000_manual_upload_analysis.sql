alter table public.face_reports
  add column if not exists analysis_source text not null default 'live_webcam',
  add column if not exists analysis_tone text not null default 'roast',
  add column if not exists admin_note text,
  add column if not exists manual_detected_face_count integer;

alter table public.face_reports
  drop constraint if exists face_reports_analysis_source_check,
  add constraint face_reports_analysis_source_check
    check (analysis_source in ('live_webcam', 'manual_upload'));

alter table public.face_reports
  drop constraint if exists face_reports_analysis_tone_check,
  add constraint face_reports_analysis_tone_check
    check (analysis_tone in ('roast', 'balanced'));

create index if not exists face_reports_analysis_source_created_at_idx
  on public.face_reports (analysis_source, created_at desc);
