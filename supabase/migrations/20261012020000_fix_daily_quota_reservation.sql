-- Align DinoEdu daily quota behavior with finalized product rules.
-- Free: 5/day; NUMEA EDU community: 15/day; active Supporter: 30/day.
-- Purchased token lots remain separate; legacy supporter_monthly lots are not used as daily quota.
-- This migration does not activate any subscriptions or grant credits.

update public.dino_ai_plans
set daily_credits = case plan
  when 'free' then 5
  when 'community' then 15
  when 'paid' then 30
  else daily_credits
end
where plan in ('free', 'community', 'paid');

CREATE OR REPLACE FUNCTION public.get_dino_ai_quota()
 RETURNS TABLE(plan text, daily_limit integer, credits_used integer, credits_remaining integer, requests_today integer, global_requests_today integer, global_requests_remaining integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_user_id uuid;

  v_plan text;
  v_daily_limit integer;
  v_expires_at timestamptz;

  v_usage_date date := current_date;

  v_credits_used integer := 0;
  v_requests_today integer := 0;

  v_global_requests_today integer := 0;
begin

  /* =====================================================
     AUTHENTICATION
  ===================================================== */

  v_user_id := auth.uid();

  if v_user_id is null then
    return query
    select
      'free'::text,
      5,
      0,
      0,
      0,
      0,
      50;

    return;
  end if;


  /* =====================================================
     DEFAULT USER PLAN
  ===================================================== */

  insert into public.dino_user_plans (
    user_id,
    plan
  )
  values (
    v_user_id,
    'free'
  )
  on conflict (user_id)
  do nothing;


  /* =====================================================
     GET USER PLAN
  ===================================================== */

  select
    up.plan,
    ap.daily_credits,
    up.expires_at
  into
    v_plan,
    v_daily_limit,
    v_expires_at
  from public.dino_user_plans as up
  inner join public.dino_ai_plans as ap
    on ap.plan = up.plan
  where up.user_id = v_user_id
    and (up.plan = 'free' or up.starts_at <= now());


  /* =====================================================
     FALLBACK
  ===================================================== */

  if v_plan is null then
    v_plan := 'free';
    v_daily_limit := 5;
  end if;


  /* =====================================================
     EXPIRED PAID PLAN
  ===================================================== */

  if (
    v_plan = 'paid'
    and v_expires_at is not null
    and v_expires_at <= now()
  ) then

    update public.dino_user_plans
    set
      plan = 'free',
      expires_at = null,
      updated_at = now()
    where user_id = v_user_id;

    v_plan := 'free';
    v_daily_limit := 5;

  end if;


  /* =====================================================
     GET USER DAILY USAGE
  ===================================================== */

  select
    u.credits_used,
    u.requests_count
  into
    v_credits_used,
    v_requests_today
  from public.dino_ai_usage as u
  where
    u.user_id = v_user_id
    and u.usage_date = v_usage_date;


  /* =====================================================
     DEFAULT USAGE
  ===================================================== */

  if v_credits_used is null then
    v_credits_used := 0;
  end if;

  if v_requests_today is null then
    v_requests_today := 0;
  end if;


  /* =====================================================
     GET GLOBAL DAILY USAGE
  ===================================================== */

  select
    g.requests_count
  into
    v_global_requests_today
  from public.dino_ai_global_usage as g
  where g.usage_date = v_usage_date;


  if v_global_requests_today is null then
    v_global_requests_today := 0;
  end if;


  /* =====================================================
     RETURN QUOTA
  ===================================================== */

  return query
  select
    v_plan,
    v_daily_limit,
    v_credits_used,
    greatest(
      v_daily_limit - v_credits_used,
      0
    ),
    v_requests_today,
    v_global_requests_today,
    greatest(
      50 - v_global_requests_today,
      0
    );

end;
$function$;

CREATE OR REPLACE FUNCTION public.reserve_dino_ai_credit(p_user_id uuid, p_feature text, p_idempotency_key text)
 RETURNS TABLE(allowed boolean, credits_consumed integer, credits_remaining integer, reason text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_cost integer;
  v_plan text;
  v_daily_limit integer := 5;
  v_daily_used integer := 0;
  v_daily_available integer := 0;
  v_daily_take integer := 0;
  v_wallet_take integer := 0;
  v_wallet_available integer := 0;
  v_remaining integer := 0;
  v_global_requests integer := 0;
  v_minute_started_at timestamptz;
  v_minute_requests integer := 0;
  v_now timestamptz := now();
  v_usage_date date := current_date;
  v_request public.dino_ai_credit_requests%rowtype;
  v_lot record;
  v_take integer;
begin
  if p_user_id is null
     or p_feature is null
     or p_idempotency_key is null
     or length(trim(p_idempotency_key)) = 0
     or length(p_idempotency_key) > 200 then
    raise exception 'Parameter reservasi tidak valid';
  end if;

  v_cost := case trim(p_feature)
    when 'dinoai-chat' then 1
    when 'ai-cv-maker' then 2
    when 'ai-surat-lamaran' then 1
    when 'ai-pembuat-soal' then 2
    when 'ai-modul-ajar' then 3
    else null
  end;

  if v_cost is null then
    raise exception 'Fitur AI tidak dikenal';
  end if;

  if not exists (
    select 1 from auth.users u where u.id = p_user_id
  ) then
    raise exception 'Pengguna tidak ditemukan';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(p_user_id::text, 0)
  );

  insert into public.dino_user_plans (user_id, plan)
  values (p_user_id, 'free')
  on conflict (user_id) do nothing;

  insert into public.dino_ai_credit_requests (
    user_id, idempotency_key, feature, requested_credits, status
  )
  values (
    p_user_id, p_idempotency_key, trim(p_feature), v_cost, 'processing'
  )
  on conflict (user_id, idempotency_key) do nothing;

  select r.*
  into v_request
  from public.dino_ai_credit_requests r
  where r.user_id = p_user_id
    and r.idempotency_key = p_idempotency_key
  for update;

  if v_request.feature <> trim(p_feature)
     or v_request.requested_credits <> v_cost then
    raise exception 'Kunci idempotensi digunakan untuk permintaan berbeda';
  end if;

  if v_request.status in ('reserved', 'succeeded') then
    select coalesce(sum(l.remaining_credits), 0)::integer
    into v_remaining
    from public.dino_ai_credit_lots l
    where l.user_id = p_user_id
      and l.remaining_credits > 0
      and (l.expires_at is null or l.expires_at > v_now);

    return query select false, 0, v_remaining,
      'Permintaan ini sudah diproses; jangan panggil Gemini kembali'::text;
    return;
  end if;

  if v_request.status = 'failed' then
    return query select false, 0, 0,
      coalesce(v_request.result_reason, 'Permintaan sebelumnya gagal');
    return;
  end if;

  select up.plan, ap.daily_credits
  into v_plan, v_daily_limit
  from public.dino_user_plans up
  join public.dino_ai_plans ap on ap.plan = up.plan
  where up.user_id = p_user_id
    and up.starts_at <= v_now
    and (up.expires_at is null or up.expires_at > v_now)
  for update of up;

  if v_plan is null then
    v_plan := 'free';
    v_daily_limit := 5;
  end if;

  insert into public.dino_ai_usage (
    user_id, usage_date, credits_used, requests_count
  )
  values (p_user_id, v_usage_date, 0, 0)
  on conflict (user_id, usage_date) do nothing;

  select u.credits_used
  into v_daily_used
  from public.dino_ai_usage u
  where u.user_id = p_user_id
    and u.usage_date = v_usage_date
  for update;

  v_daily_available := greatest(v_daily_limit - v_daily_used, 0);
  v_daily_take := least(v_cost, v_daily_available);
  v_wallet_take := v_cost - v_daily_take;

  select coalesce(sum(l.remaining_credits), 0)::integer
  into v_wallet_available
  from public.dino_ai_credit_lots l
  where l.user_id = p_user_id
    and l.remaining_credits > 0
    and (l.expires_at is null or l.expires_at > v_now)
    and l.source = 'purchase';

  if v_wallet_available < v_wallet_take then
    update public.dino_ai_credit_requests
    set status = 'failed',
        credits_consumed = 0,
        result_reason = 'Kuota harian dan saldo wallet tidak mencukupi',
        updated_at = v_now
    where user_id = p_user_id
      and idempotency_key = p_idempotency_key;

    return query select false, 0, v_wallet_available,
      'Kuota harian dan saldo wallet tidak mencukupi'::text;
    return;
  end if;

  insert into public.dino_ai_global_usage (
    usage_date, requests_count, minute_started_at, minute_requests
  )
  values (v_usage_date, 0, null, 0)
  on conflict (usage_date) do nothing;

  select g.requests_count, g.minute_started_at, g.minute_requests
  into v_global_requests, v_minute_started_at, v_minute_requests
  from public.dino_ai_global_usage g
  where g.usage_date = v_usage_date
  for update;

  if v_global_requests >= 50 then
    update public.dino_ai_credit_requests
    set status = 'failed',
        result_reason = 'Batas global harian tercapai',
        updated_at = v_now
    where user_id = p_user_id
      and idempotency_key = p_idempotency_key;

    return query select false, 0, v_wallet_available,
      'Batas penggunaan AI DinoEdu hari ini sudah tercapai'::text;
    return;
  end if;

  if v_minute_started_at is not null
     and v_minute_started_at > v_now - interval '1 minute'
     and v_minute_requests >= 2 then
    update public.dino_ai_credit_requests
    set status = 'failed',
        result_reason = 'Batas global per menit tercapai',
        updated_at = v_now
    where user_id = p_user_id
      and idempotency_key = p_idempotency_key;

    return query select false, 0, v_wallet_available,
      'DinoAI sedang menerima banyak permintaan. Coba lagi sebentar'::text;
    return;
  end if;

  if v_daily_take > 0 then
    update public.dino_ai_usage
    set credits_used = credits_used + v_daily_take,
        requests_count = requests_count + 1,
        updated_at = v_now
    where user_id = p_user_id
      and usage_date = v_usage_date;
  else
    update public.dino_ai_usage
    set requests_count = requests_count + 1,
        updated_at = v_now
    where user_id = p_user_id
      and usage_date = v_usage_date;
  end if;

  if v_wallet_take > 0 then
    for v_lot in
      select l.id, l.source, l.remaining_credits
      from public.dino_ai_credit_lots l
      where l.user_id = p_user_id
        and l.remaining_credits > 0
        and (l.expires_at is null or l.expires_at > v_now)
        and l.source = 'purchase'
      order by
        l.expires_at asc nulls last,
        l.created_at asc,
        l.id
      for update
    loop
      exit when v_wallet_take <= 0;
      v_take := least(v_lot.remaining_credits, v_wallet_take);

      update public.dino_ai_credit_lots
      set remaining_credits = remaining_credits - v_take
      where id = v_lot.id;

      insert into public.dino_ai_credit_ledger (
        user_id, lot_id, event_type, credits_delta,
        feature, reference_id, idempotency_key
      )
      values (
        p_user_id, v_lot.id, 'consume', -v_take,
        trim(p_feature), p_idempotency_key,
        p_user_id::text || ':' || p_idempotency_key || ':' || v_lot.id::text
      );

      v_wallet_take := v_wallet_take - v_take;
    end loop;
  end if;

  if v_minute_started_at is null
     or v_minute_started_at <= v_now - interval '1 minute' then
    v_minute_started_at := v_now;
    v_minute_requests := 1;
  else
    v_minute_requests := v_minute_requests + 1;
  end if;

  update public.dino_ai_global_usage
  set requests_count = requests_count + 1,
      minute_started_at = v_minute_started_at,
      minute_requests = v_minute_requests,
      updated_at = v_now
  where usage_date = v_usage_date;

  update public.dino_ai_credit_requests
  set status = 'reserved',
      credits_consumed = v_cost,
      daily_credits_reserved = v_daily_take,
      wallet_credits_reserved = v_cost - v_daily_take,
      usage_date_reserved = v_usage_date,
      result_reason = 'Kredit dicadangkan; menunggu hasil AI',
      updated_at = v_now
  where user_id = p_user_id
    and idempotency_key = p_idempotency_key;

  select coalesce(sum(l.remaining_credits), 0)::integer
  into v_remaining
  from public.dino_ai_credit_lots l
  where l.user_id = p_user_id
    and l.remaining_credits > 0
    and l.source = 'purchase'
    and (l.expires_at is null or l.expires_at > v_now);

  return query select true, v_cost, v_remaining, 'reserved'::text;
end;
$function$;
