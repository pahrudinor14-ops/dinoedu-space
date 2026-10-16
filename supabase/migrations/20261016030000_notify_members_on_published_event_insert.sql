-- A newly created event may already be published, so it does not pass through
-- the status-change branch in the general NUMEA notification trigger.
create or replace function public.numea_notify_published_event_insert()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  participant record;
  row_data jsonb := to_jsonb(new);
  actor_id uuid;
  item_title text;
begin
  if row_data->>'status' = 'published' then
    actor_id := nullif(row_data->>'created_by', '')::uuid;
    item_title := coalesce(nullif(row_data->>'title', ''), 'acara NUMEA');

    for participant in
      select distinct m.user_id
      from public.numea_memberships as m
      where m.status = 'approved'
        and m.user_id is distinct from actor_id
    loop
      perform public.numea_emit_notification(
        participant.user_id,
        'user',
        'Acara NUMEA baru',
        'Acara "' || left(item_title, 120) || '" telah diterbitkan.',
        'event',
        '/numea#events'
      );
    end loop;
  end if;

  return new;
end;
$function$;

revoke all on function public.numea_notify_published_event_insert()
  from public, anon, authenticated;

do $block$
begin
  if to_regclass('public.numea_events') is not null then
    execute 'drop trigger if exists numea_events_published_insert_notify on public.numea_events';
    execute 'create trigger numea_events_published_insert_notify
      after insert on public.numea_events
      for each row execute function public.numea_notify_published_event_insert()';
  end if;
end;
$block$;
