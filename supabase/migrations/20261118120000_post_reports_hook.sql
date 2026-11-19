create extension if not exists pg_net with schema extensions;

-- The Authorization header lives in Vault as report_webhook_auth, so the repo holds no secret.
create function public.post_reports_notify()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  auth text;
begin
  select decrypted_secret into auth from vault.decrypted_secrets where name = 'report_webhook_auth' limit 1;
  if auth is null then
    raise warning 'post_reports_notify: Vault secret report_webhook_auth is missing, no report email sent';
    return new;
  end if;
  perform net.http_post(
    url := 'https://lifts.paulbebear.com/api/moderation/report',
    body := jsonb_build_object(
      'type', 'INSERT',
      'table', 'post_reports',
      'schema', 'public',
      'record', to_jsonb(new),
      'old_record', null
    ),
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', auth),
    timeout_milliseconds := 8000
  );
  return new;
end;
$$;

revoke all on function public.post_reports_notify() from public, anon, authenticated;

create trigger post_reports_notify
  after insert on public.post_reports
  for each row execute function public.post_reports_notify();
