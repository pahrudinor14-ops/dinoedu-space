-- NUMEA in-app notifications: role-scoped recipients, private read receipts,
-- and database-generated events. Browser clients cannot create notifications.

create table if not exists public.numea_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  audience text not null default 'user',
  title text not null,
  message text not null,
  type text not null default 'general',
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.numea_notifications
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists audience text not null default 'user',
  add column if not exists title text not null default 'Notifikasi NUMEA',
  add column if not exists message text not null default '',
  add column if not exists type text not null default 'general',
  add column if not exists link text,
  add column if not exists read_at timestamptz,
  add column if not exists created_at timestamptz not null default now();

alter table public.numea_notifications alter column user_id drop not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.numea_notifications'::regclass
      and conname = 'numea_notifications_audience_check'
  ) then
    alter table public.numea_notifications
      add constraint numea_notifications_audience_check
      check (
        (audience = 'user' and user_id is not null)
        or (audience = 'admin' and user_id is null)
      ) not valid;
  end if;
end;
$$;

alter table public.numea_notifications enable row level security;

do $$
declare policy_row record;
begin
  for policy_row in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'numea_notifications'
  loop
    execute format('drop policy if exists %I on public.numea_notifications', policy_row.policyname);
  end loop;
end;
$$;

create policy numea_notifications_scoped_read
  on public.numea_notifications
  for select to authenticated
  using (
    (audience = 'user' and user_id = (select auth.uid()))
    or (audience = 'admin' and public.is_numea_admin())
  );

revoke all on public.numea_notifications from anon, authenticated;
grant select on public.numea_notifications to authenticated;

create table if not exists public.numea_notification_reads (
  notification_id uuid not null references public.numea_notifications(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (notification_id, user_id)
);

alter table public.numea_notification_reads enable row level security;
revoke all on public.numea_notification_reads from anon, authenticated;

create or replace function public.numea_emit_notification(
  p_user_id uuid,
  p_audience text,
  p_title text,
  p_message text,
  p_type text,
  p_link text
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if p_audience = 'admin' then
    insert into public.numea_notifications (user_id, audience, title, message, type, link)
    values (null, 'admin', left(p_title, 160), left(p_message, 1200), left(p_type, 40), p_link);
  elsif p_audience = 'user' and p_user_id is not null then
    insert into public.numea_notifications (user_id, audience, title, message, type, link)
    values (p_user_id, 'user', left(p_title, 160), left(p_message, 1200), left(p_type, 40), p_link);
  end if;
end;
$$;

revoke all on function public.numea_emit_notification(uuid, text, text, text, text, text)
  from public, anon, authenticated;

create or replace function public.numea_get_notifications(p_limit integer default 30)
returns table (
  id uuid,
  title text,
  message text,
  type text,
  link text,
  read_at timestamptz,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = pg_catalog, public, auth
as $$
  select n.id, n.title, n.message, n.type, n.link,
    case
      when n.audience = 'admin' then admin_read.read_at
      else n.read_at
    end as read_at,
    n.created_at
  from public.numea_notifications as n
  left join public.numea_notification_reads as admin_read
    on admin_read.notification_id = n.id
   and admin_read.user_id = auth.uid()
  where auth.uid() is not null
    and (
      (n.audience = 'user' and n.user_id = auth.uid())
      or (n.audience = 'admin' and public.is_numea_admin())
    )
  order by n.created_at desc
  limit greatest(1, least(coalesce(p_limit, 30), 100));
$$;

create or replace function public.numea_mark_notification_read(p_notification_id uuid)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $$
declare
  notification_row public.numea_notifications%rowtype;
begin
  if auth.uid() is null then
    return false;
  end if;

  select * into notification_row
  from public.numea_notifications
  where id = p_notification_id;

  if not found then
    return false;
  end if;

  if notification_row.audience = 'user' and notification_row.user_id = auth.uid() then
    update public.numea_notifications
      set read_at = coalesce(read_at, now())
      where id = p_notification_id;
    return true;
  end if;

  if notification_row.audience = 'admin' and public.is_numea_admin() then
    insert into public.numea_notification_reads (notification_id, user_id)
    values (p_notification_id, auth.uid())
    on conflict (notification_id, user_id) do nothing;
    return true;
  end if;

  return false;
end;
$$;

create or replace function public.numea_mark_all_notifications_read()
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $$
declare
  changed_count integer := 0;
  admin_count integer := 0;
begin
  if auth.uid() is null then
    return 0;
  end if;

  update public.numea_notifications
    set read_at = coalesce(read_at, now())
    where audience = 'user'
      and user_id = auth.uid()
      and read_at is null;
  get diagnostics changed_count = row_count;

  if public.is_numea_admin() then
    insert into public.numea_notification_reads (notification_id, user_id)
    select n.id, auth.uid()
    from public.numea_notifications as n
    where n.audience = 'admin'
    on conflict (notification_id, user_id) do nothing;
    get diagnostics admin_count = row_count;
  end if;

  return changed_count + admin_count;
end;
$$;

revoke all on function public.numea_get_notifications(integer) from public, anon;
revoke all on function public.numea_mark_notification_read(uuid) from public, anon;
revoke all on function public.numea_mark_all_notifications_read() from public, anon;
grant execute on function public.numea_get_notifications(integer) to authenticated;
grant execute on function public.numea_mark_notification_read(uuid) to authenticated;
grant execute on function public.numea_mark_all_notifications_read() to authenticated;

create or replace function public.numea_notification_status_label(p_status text)
returns text
language sql
immutable
set search_path = pg_catalog
as $$
  select case p_status
    when 'approved' then 'disetujui'
    when 'published' then 'diterbitkan'
    when 'rejected' then 'perlu diperbaiki'
    when 'pending_review' then 'menunggu tinjauan admin'
    when 'suspended' then 'ditangguhkan'
    when 'cancelled' then 'dibatalkan'
    when 'attended' then 'ditandai hadir'
    when 'no_show' then 'ditandai tidak hadir'
    when 'closed' then 'ditutup'
    else coalesce(nullif(p_status, ''), 'diperbarui')
  end;
$$;

create or replace function public.numea_notification_after_change()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $$
declare
  row_data jsonb;
  old_data jsonb;
  target_id uuid;
  actor_id uuid;
  related_id uuid;
  target_status text;
  old_status text;
  item_title text;
  item_name text;
  related_name text;
  message_target uuid;
  requester uuid;
  consultant uuid;
  creator uuid;
  participant record;
begin
  row_data := to_jsonb(new);
  if tg_op = 'UPDATE' then
    old_data := to_jsonb(old);
  else
    old_data := '{}'::jsonb;
  end if;

  target_id := nullif(row_data->>'user_id', '')::uuid;
  actor_id := nullif(row_data->>'created_by', '')::uuid;
  if actor_id is null then actor_id := nullif(row_data->>'author_id', '')::uuid; end if;
  if actor_id is null then actor_id := nullif(row_data->>'sender_id', '')::uuid; end if;
  if actor_id is null then actor_id := nullif(row_data->>'requester_id', '')::uuid; end if;
  related_id := nullif(row_data->>'id', '')::uuid;
  target_status := row_data->>'status';
  old_status := old_data->>'status';
  item_title := coalesce(nullif(row_data->>'title', ''), 'materi NUMEA');

  case tg_table_name
    when 'numea_memberships' then
      if tg_op = 'INSERT' and target_status in ('pending', 'pending_review') then
        perform public.numea_emit_notification(null, 'admin', 'Pengajuan keanggotaan baru',
          'Ada pengajuan keanggotaan NUMEA yang menunggu tinjauan.', 'membership', '/numea#admin');
      elsif tg_op = 'INSERT' and target_status = 'approved' and target_id is not null then
        perform public.numea_emit_notification(target_id, 'user', 'Keanggotaan NUMEA disetujui',
          'Keanggotaanmu sudah aktif. Kamu akan menerima pembaruan untuk anggota NUMEA.',
          'membership', '/numea#beranda');
      elsif tg_op = 'UPDATE' and target_status is distinct from old_status and target_id is not null then
        perform public.numea_emit_notification(target_id, 'user', 'Status keanggotaan diperbarui',
          case when target_status = 'approved'
            then 'Keanggotaanmu disetujui. Kamu akan menerima pembaruan untuk anggota NUMEA.'
            else 'Status keanggotaan NUMEA-mu ' || public.numea_notification_status_label(target_status) || '.' end,
          'membership', '/numea#beranda');
      end if;

    when 'numea_consultants' then
      if tg_op = 'INSERT' or (tg_op = 'UPDATE' and row_data->>'is_active' is distinct from old_data->>'is_active') then
        if target_id is not null then
          perform public.numea_emit_notification(target_id, 'user', 'Status mentor/konsultan diperbarui',
            case when coalesce((row_data->>'is_active')::boolean, false)
              then 'Akunmu kini terdaftar sebagai mentor/konsultan NUMEA dan dapat menerima permintaan.'
              else 'Status mentor/konsultan NUMEA pada akunmu telah dinonaktifkan.' end,
            'consultant', '/numea#konsultasi');
        end if;
      end if;

    when 'numea_consultations' then
      item_title := coalesce(nullif(row_data->>'subject', ''), 'konsultasi NUMEA');
      if tg_op = 'INSERT' then
        consultant := nullif(row_data->>'consultant_id', '')::uuid;
        if consultant is not null then
          perform public.numea_emit_notification(consultant, 'user', 'Permintaan konsultasi baru',
            'Ada permintaan konsultasi baru "' || left(item_title, 120) || '" yang menunggu keputusan.',
            'consultation', '/numea#konsultasi');
        end if;
      elsif tg_op = 'UPDATE' and target_status is distinct from old_status then
        target_id := nullif(row_data->>'requester_id', '')::uuid;
        if target_id is not null then
          perform public.numea_emit_notification(target_id, 'user', 'Status konsultasimu diperbarui',
            'Permintaan "' || left(item_title, 120) || '" ' || public.numea_notification_status_label(target_status) ||
            case when nullif(row_data->>'decision_note', '') is null then '.'
              else '. Catatan konsultan: ' || left(row_data->>'decision_note', 400) end,
            'consultation', '/numea#konsultasi');
        end if;
      end if;

    when 'numea_consultation_messages' then
      related_id := nullif(row_data->>'consultation_id', '')::uuid;
      select c.requester_id, c.consultant_id, c.subject, c.status
        into requester, consultant, related_name, target_status
        from public.numea_consultations as c where c.id = related_id;
      message_target := nullif(row_data->>'sender_id', '')::uuid;
      if found and target_status = 'approved' then
        if message_target = requester then
          target_id := consultant;
        else
          target_id := requester;
        end if;
        if target_id is not null and target_id is distinct from message_target then
          perform public.numea_emit_notification(target_id, 'user', 'Pesan konsultasi baru',
            'Ada pesan baru dalam konsultasi "' || left(coalesce(related_name, 'NUMEA'), 120) || '".',
            'consultation', '/numea#konsultasi');
        end if;
      end if;

    when 'numea_learning_resources' then
      if tg_op = 'INSERT' and target_status = 'pending_review' then
        perform public.numea_emit_notification(null, 'admin', 'Materi Learn menunggu tinjauan',
          'Materi "' || left(item_title, 120) || '" dikirim untuk ditinjau.', 'learning', '/numea#learn');
      elsif tg_op = 'INSERT' and target_status = 'published' then
        actor_id := nullif(row_data->>'created_by', '')::uuid;
        for participant in
          select distinct m.user_id from public.numea_memberships as m
          where m.status = 'approved' and m.user_id is distinct from actor_id
        loop
          perform public.numea_emit_notification(participant.user_id, 'user', 'Materi Learn baru',
            'Materi "' || left(item_title, 120) || '" sudah diterbitkan.', 'learning', '/numea#learn');
        end loop;
      elsif tg_op = 'UPDATE' and target_status is distinct from old_status then
        if old_status = 'pending_review' then
          target_id := nullif(row_data->>'created_by', '')::uuid;
          if target_id is not null then
            perform public.numea_emit_notification(target_id, 'user', 'Hasil tinjauan materi Learn',
              'Materi "' || left(item_title, 120) || '" ' || public.numea_notification_status_label(target_status) ||
              case when nullif(row_data->>'review_note', '') is null then '.'
                else '. Catatan admin: ' || left(row_data->>'review_note', 400) end,
              'learning', '/numea#learn');
          end if;
        end if;
        if target_status = 'published' and old_status is distinct from 'published' then
          actor_id := nullif(row_data->>'created_by', '')::uuid;
          for participant in
            select distinct m.user_id from public.numea_memberships as m
            where m.status = 'approved' and m.user_id is distinct from actor_id
          loop
            perform public.numea_emit_notification(participant.user_id, 'user', 'Materi Learn baru',
              'Materi "' || left(item_title, 120) || '" sudah diterbitkan.', 'learning', '/numea#learn');
          end loop;
        end if;
      end if;

    when 'numea_community_posts' then
      item_title := coalesce(nullif(row_data->>'title', ''), 'postingan komunitas');
      if tg_op = 'INSERT' and target_status = 'pending_review' then
        perform public.numea_emit_notification(null, 'admin', 'Postingan menunggu moderasi',
          'Postingan "' || left(item_title, 120) || '" dikirim untuk ditinjau.', 'community', '/numea#community');
      elsif tg_op = 'INSERT' and target_status = 'published' then
        actor_id := nullif(row_data->>'author_id', '')::uuid;
        for participant in
          select distinct m.user_id from public.numea_memberships as m
          where m.status = 'approved' and m.user_id is distinct from actor_id
        loop
          perform public.numea_emit_notification(participant.user_id, 'user', 'Postingan komunitas baru',
            'Postingan baru: "' || left(item_title, 120) || '".', 'community', '/numea#community');
        end loop;
      elsif tg_op = 'UPDATE' and target_status is distinct from old_status then
        if old_status = 'pending_review' then
          target_id := nullif(row_data->>'author_id', '')::uuid;
          if target_id is not null then
            perform public.numea_emit_notification(target_id, 'user', 'Hasil moderasi postingan',
              'Postingan "' || left(item_title, 120) || '" ' || public.numea_notification_status_label(target_status) ||
              case when nullif(row_data->>'review_note', '') is null then '.'
                else '. Catatan admin: ' || left(row_data->>'review_note', 400) end,
              'community', '/numea#community');
          end if;
        end if;
        if target_status = 'published' and old_status is distinct from 'published' then
          actor_id := nullif(row_data->>'author_id', '')::uuid;
          for participant in
            select distinct m.user_id from public.numea_memberships as m
            where m.status = 'approved' and m.user_id is distinct from actor_id
          loop
            perform public.numea_emit_notification(participant.user_id, 'user', 'Postingan komunitas baru',
              'Postingan baru: "' || left(item_title, 120) || '".', 'community', '/numea#community');
          end loop;
        end if;
      end if;

    when 'numea_community_post_comments' then
      related_id := nullif(row_data->>'post_id', '')::uuid;
      select p.author_id, p.title into target_id, related_name
        from public.numea_community_posts as p where p.id = related_id;
      message_target := nullif(row_data->>'author_id', '')::uuid;
      if found and target_id is not null and target_id is distinct from message_target then
        perform public.numea_emit_notification(target_id, 'user', 'Komentar baru pada postinganmu',
          'Ada komentar baru pada postingan "' || left(coalesce(related_name, 'komunitas'), 120) || '".',
          'community', '/numea#community');
      end if;

    when 'numea_community_post_reports' then
      if tg_op = 'INSERT' then
        perform public.numea_emit_notification(null, 'admin', 'Laporan postingan baru',
          'Ada laporan baru pada feed komunitas yang menunggu tinjauan.', 'moderation', '/numea#community');
      elsif tg_op = 'UPDATE' and target_status is distinct from old_status then
        target_id := nullif(row_data->>'reporter_id', '')::uuid;
        if target_id is not null then
          perform public.numea_emit_notification(target_id, 'user', 'Laporan komunitas diperbarui',
            'Laporan yang kamu kirim telah ' || public.numea_notification_status_label(target_status) || '.',
            'moderation', '/numea#community');
        end if;
      end if;

    when 'numea_community_reports' then
      if tg_op = 'INSERT' then
        perform public.numea_emit_notification(null, 'admin', 'Laporan ruang diskusi baru',
          'Ada laporan pesan ruang diskusi yang menunggu tinjauan.', 'moderation', '/numea#community');
      elsif tg_op = 'UPDATE' and target_status is distinct from old_status then
        target_id := nullif(row_data->>'reporter_id', '')::uuid;
        if target_id is not null then
          perform public.numea_emit_notification(target_id, 'user', 'Laporan komunitas diperbarui',
            'Laporan yang kamu kirim telah ' || public.numea_notification_status_label(target_status) || '.',
            'moderation', '/numea#community');
        end if;
      end if;

    when 'numea_events' then
      item_title := coalesce(nullif(row_data->>'title', ''), 'acara NUMEA');
      if tg_op = 'UPDATE' and target_status is distinct from old_status then
        related_id := nullif(row_data->>'id', '')::uuid;
        if target_status = 'published' and old_status is distinct from 'published' then
          for participant in
            select m.user_id from public.numea_memberships as m
            where m.status = 'approved'
              and m.user_id is distinct from nullif(row_data->>'created_by', '')::uuid
          loop
            perform public.numea_emit_notification(participant.user_id, 'user', 'Acara NUMEA baru',
              'Acara "' || left(item_title, 120) || '" telah diterbitkan.', 'event', '/numea#events');
          end loop;
        elsif target_status = 'cancelled' then
          for participant in
            select r.user_id from public.numea_event_registrations as r
            where r.event_id = related_id and r.status = 'registered'
          loop
            perform public.numea_emit_notification(participant.user_id, 'user', 'Acara NUMEA dibatalkan',
              'Acara "' || left(item_title, 120) || '" dibatalkan oleh penyelenggara.', 'event', '/numea#events');
          end loop;
        end if;
      end if;

    when 'numea_event_registrations' then
      related_id := nullif(row_data->>'event_id', '')::uuid;
      target_id := nullif(row_data->>'user_id', '')::uuid;
      select e.title, e.created_by into related_name, creator
        from public.numea_events as e where e.id = related_id;
      item_name := coalesce(related_name, 'acara NUMEA');
      if tg_op = 'INSERT' and target_status = 'registered' then
        if target_id is not null then
          perform public.numea_emit_notification(target_id, 'user', 'Pendaftaran acara berhasil',
            'Kamu terdaftar pada acara "' || left(item_name, 120) || '".', 'event', '/numea#events');
        end if;
        perform public.numea_emit_notification(null, 'admin', 'Pendaftar acara baru',
          'Ada pendaftar baru untuk acara "' || left(item_name, 120) || '".', 'event', '/numea#events');
        if creator is not null then
          perform public.numea_emit_notification(creator, 'user', 'Pendaftar acara baru',
            'Ada pendaftar baru untuk acara "' || left(item_name, 120) || '".', 'event', '/numea#events');
        end if;
      elsif tg_op = 'UPDATE' and target_status is distinct from old_status and target_id is not null then
        perform public.numea_emit_notification(target_id, 'user', 'Status pendaftaran acara diperbarui',
          'Pendaftaranmu pada acara "' || left(item_name, 120) || '" ' ||
          public.numea_notification_status_label(target_status) || '.', 'event', '/numea#events');
      end if;

    when 'numea_certificates' then
      target_id := nullif(row_data->>'recipient_user_id', '')::uuid;
      item_title := coalesce(nullif(row_data->>'title', ''), 'sertifikat NUMEA');
      if tg_op = 'INSERT' and target_id is not null then
        perform public.numea_emit_notification(target_id, 'user', 'Sertifikat baru diterbitkan',
          'Sertifikat "' || left(item_title, 120) || '" sudah tersedia pada koleksimu.',
          'certificate', '/numea#sertifikat');
      elsif tg_op = 'UPDATE' and target_status is distinct from old_status and target_id is not null then
        perform public.numea_emit_notification(target_id, 'user', 'Status sertifikat diperbarui',
          'Sertifikat "' || left(item_title, 120) || '" ' || public.numea_notification_status_label(target_status) || '.',
          'certificate', '/numea#sertifikat');
      end if;
  end case;

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

revoke all on function public.numea_notification_after_change() from public, anon, authenticated;
revoke all on function public.numea_notification_status_label(text) from public, anon, authenticated;
grant execute on function public.numea_notification_status_label(text) to authenticated;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'numea_memberships',
    'numea_consultants',
    'numea_consultations',
    'numea_consultation_messages',
    'numea_learning_resources',
    'numea_community_posts',
    'numea_community_post_comments',
    'numea_community_post_reports',
    'numea_community_reports',
    'numea_events',
    'numea_event_registrations',
    'numea_certificates'
  ] loop
    if to_regclass('public.' || table_name) is not null then
      execute format('drop trigger if exists %I on public.%I', table_name || '_notify', table_name);
      execute format(
        'create trigger %I after insert or update on public.%I for each row execute function public.numea_notification_after_change()',
        table_name || '_notify', table_name
      );
    end if;
  end loop;
end;
$$;

do $$
begin
  if exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'numea_notifications'
  ) is false then
    alter publication supabase_realtime add table public.numea_notifications;
  end if;
end;
$$;
