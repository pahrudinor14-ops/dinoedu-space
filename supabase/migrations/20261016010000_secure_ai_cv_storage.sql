-- Store AI documents per authenticated account. CV, application letters,
-- question sets, and teaching modules share this table in the web client.
create table if not exists public.ai_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  document_type text not null,
  title text not null,
  content jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ai_documents_content_is_object
    check (jsonb_typeof(content) = 'object')
);

create index if not exists ai_documents_user_type_updated_idx
  on public.ai_documents (user_id, document_type, updated_at desc);

alter table public.ai_documents enable row level security;

revoke all on table public.ai_documents from public, anon;
grant select, insert, update on table public.ai_documents to authenticated;

-- Replace legacy policies, if any, so no permissive policy can expose another
-- user's stored CV or other generated documents.
do $block$
declare
  existing_policy record;
begin
  for existing_policy in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'ai_documents'
  loop
    execute format(
      'drop policy %I on public.ai_documents',
      existing_policy.policyname
    );
  end loop;
end;
$block$;

drop policy if exists ai_documents_select_own on public.ai_documents;
create policy ai_documents_select_own
  on public.ai_documents for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists ai_documents_insert_own on public.ai_documents;
create policy ai_documents_insert_own
  on public.ai_documents for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists ai_documents_update_own on public.ai_documents;
create policy ai_documents_update_own
  on public.ai_documents for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create or replace function public.set_ai_documents_updated_at()
returns trigger
language plpgsql
set search_path to ''
as $function$
begin
  new.updated_at := now();
  return new;
end;
$function$;

revoke all on function public.set_ai_documents_updated_at()
  from public, anon, authenticated;

drop trigger if exists ai_documents_set_updated_at on public.ai_documents;
create trigger ai_documents_set_updated_at
  before update on public.ai_documents
  for each row execute function public.set_ai_documents_updated_at();

-- Credit reservations are created by trusted Edge Functions, never by browsers.
revoke all on function public.reserve_dino_ai_credit(uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.reserve_dino_ai_credit(uuid, text, text)
  to service_role;

create or replace function public.complete_dino_ai_credit_request(
  p_user_id uuid,
  p_idempotency_key text
)
returns boolean
language plpgsql
security definer
set search_path to ''
as $function$
begin
  if p_user_id is null
     or p_idempotency_key is null
     or length(trim(p_idempotency_key)) = 0 then
    raise exception 'Parameter penyelesaian kredit tidak valid';
  end if;

  update public.dino_ai_credit_requests
  set status = 'succeeded',
      result_reason = 'Hasil AI berhasil dibuat',
      updated_at = now()
  where user_id = p_user_id
    and idempotency_key = p_idempotency_key
    and feature = 'ai-cv-maker'
    and status = 'reserved';

  return found;
end;
$function$;

revoke all on function public.complete_dino_ai_credit_request(uuid, text)
  from public, anon, authenticated;
grant execute on function public.complete_dino_ai_credit_request(uuid, text)
  to service_role;

create or replace function public.fail_dino_ai_credit_request(
  p_user_id uuid,
  p_idempotency_key text,
  p_failure_reason text
)
returns boolean
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_request public.dino_ai_credit_requests%rowtype;
  v_entry record;
  v_wallet_refunded integer := 0;
  v_rows_updated integer := 0;
begin
  if p_user_id is null
     or p_idempotency_key is null
     or length(trim(p_idempotency_key)) = 0 then
    raise exception 'Parameter pengembalian kredit tidak valid';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));

  select r.*
  into v_request
  from public.dino_ai_credit_requests r
  where r.user_id = p_user_id
    and r.idempotency_key = p_idempotency_key
  for update;

  if not found or v_request.status <> 'reserved' then
    return false;
  end if;

  if coalesce(v_request.daily_credits_reserved, 0) > 0
     and v_request.usage_date_reserved is not null then
    update public.dino_ai_usage
    set credits_used = greatest(
          credits_used - v_request.daily_credits_reserved,
          0
        ),
        updated_at = now()
    where user_id = p_user_id
      and usage_date = v_request.usage_date_reserved;
    get diagnostics v_rows_updated = row_count;
    if v_rows_updated <> 1 then
      raise exception 'Kuota harian tidak ditemukan saat pengembalian';
    end if;
  end if;

  for v_entry in
    select l.lot_id, (-l.credits_delta)::integer as credits_to_restore
    from public.dino_ai_credit_ledger l
    where l.user_id = p_user_id
      and l.feature = v_request.feature
      and l.reference_id = p_idempotency_key
      and l.event_type = 'consume'
      and l.credits_delta < 0
    for update
  loop
    update public.dino_ai_credit_lots
    set remaining_credits = remaining_credits + v_entry.credits_to_restore
    where id = v_entry.lot_id
      and user_id = p_user_id;

    if not found then
      raise exception 'Lot kredit pembelian tidak ditemukan saat pengembalian';
    end if;
    v_wallet_refunded := v_wallet_refunded + v_entry.credits_to_restore;

    insert into public.dino_ai_credit_ledger (
      user_id, lot_id, event_type, credits_delta,
      feature, reference_id, idempotency_key
    )
    values (
      p_user_id,
      v_entry.lot_id,
      'refund',
      v_entry.credits_to_restore,
      v_request.feature,
      p_idempotency_key,
      p_user_id::text || ':' || p_idempotency_key || ':' ||
        v_entry.lot_id::text || ':refund'
    );
  end loop;

  if v_wallet_refunded <> coalesce(v_request.wallet_credits_reserved, 0) then
    raise exception 'Jumlah kredit wallet yang dikembalikan tidak sesuai';
  end if;

  update public.dino_ai_credit_requests
  set status = 'failed',
      credits_consumed = 0,
      daily_credits_reserved = 0,
      wallet_credits_reserved = 0,
      result_reason = left(coalesce(p_failure_reason, 'Layanan AI gagal'), 200),
      updated_at = now()
  where user_id = p_user_id
    and idempotency_key = p_idempotency_key
    and status = 'reserved';

  return found;
end;
$function$;

revoke all on function public.fail_dino_ai_credit_request(uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.fail_dino_ai_credit_request(uuid, text, text)
  to service_role;
