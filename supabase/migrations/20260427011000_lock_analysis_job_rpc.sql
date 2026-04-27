revoke all on function public.claim_face_report_job(uuid, integer, integer) from public;
revoke all on function public.claim_face_report_job(uuid, integer, integer) from anon;
revoke all on function public.claim_face_report_job(uuid, integer, integer) from authenticated;

grant execute on function public.claim_face_report_job(uuid, integer, integer) to service_role;
