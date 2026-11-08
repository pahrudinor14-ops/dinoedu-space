-- Give each AI feature its own reservation and ledger label. The shared
-- TypeScript policy lives in supabase/functions/_shared/dinoAiCreditPolicy.ts;
-- the database reservation remains authoritative for actual charging.
-- Resolve the plan from both the paid Supporter entitlement and approved
-- NUMEA membership. This lets a community member keep 15 daily credits after
-- a Supporter period ends, and revokes that quota when membership is revoked.
CREATE OR REPLACE FUNCTION public.get_dino_ai_effective_plan(p_user_id uuid)
RETURNS TABLE(plan text, daily_credits integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_plan text;
  v_daily_credits integer;
BEGIN
  SELECT up.plan, ap.daily_credits
  INTO v_plan, v_daily_credits
  FROM public.dino_user_plans AS up
  JOIN public.dino_ai_plans AS ap ON ap.plan = up.plan
  WHERE up.user_id = p_user_id
    AND up.starts_at <= now()
    AND (up.expires_at IS NULL OR up.expires_at > now())
  ORDER BY CASE WHEN up.plan = 'paid' THEN 0 ELSE 1 END
  LIMIT 1;

  IF v_plan = 'paid' THEN
    RETURN QUERY SELECT v_plan, v_daily_credits;
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.numea_memberships AS membership
    WHERE membership.user_id = p_user_id
      AND membership.status = 'approved'
  ) THEN
    SELECT ap.daily_credits
    INTO v_daily_credits
    FROM public.dino_ai_plans AS ap
    WHERE ap.plan = 'community';

    RETURN QUERY SELECT
      'community'::text,
      coalesce(v_daily_credits, 15);
    RETURN;
  END IF;

  SELECT ap.daily_credits
  INTO v_daily_credits
  FROM public.dino_ai_plans AS ap
  WHERE ap.plan = 'free';

  RETURN QUERY SELECT 'free'::text, coalesce(v_daily_credits, 5);
END;
$function$;

REVOKE ALL ON FUNCTION public.get_dino_ai_effective_plan(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_dino_ai_effective_plan(uuid)
  TO service_role;

-- Replace the reservation function from the verified remote definition,
-- routing its plan lookup through the shared effective-plan resolver.
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
  v_usage_date date := (now() at time zone 'Asia/Makassar')::date;
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
    when 'dinoai-chat-media' then 2
    when 'ai-scribble-analysis' then 2
    when 'ai-cv-maker' then 2
    when 'ai-surat-lamaran' then 2
    when 'ai-pembuat-soal' then 2
    when 'ai-modul-ajar' then 2
    when 'ai-lkpd' then 2
    when 'ai-rubrik' then 2
    when 'ai-evaluasi' then 2
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
  if v_request.feature <> trim(p_feature) then
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
  if v_request.requested_credits <> v_cost then
    raise exception 'Kunci idempotensi digunakan untuk permintaan berbeda';
  end if;
  perform 1
  from public.dino_user_plans up
  where up.user_id = p_user_id
  for update;
  select effective.plan, effective.daily_credits
  into v_plan, v_daily_limit
  from public.get_dino_ai_effective_plan(p_user_id) as effective;
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
  v_daily_take := least(v_cost, greatest(v_daily_available, 0));
  v_wallet_take := greatest(v_cost - v_daily_take, 0);
  if v_daily_available + v_wallet_available < v_cost then
    update public.dino_ai_credit_requests
    set status = 'failed',
        credits_consumed = 0,
        result_reason = 'Kuota harian dan saldo wallet tidak mencukupi',
        updated_at = v_now
    where user_id = p_user_id
      and idempotency_key = p_idempotency_key;
    return query select false, 0, v_daily_available + v_wallet_available,
      format(
        'Kredit tidak cukup (kuota harian tersisa %s, kredit pembelian tersisa %s, perlu %s)',
        v_daily_available,
        v_wallet_available,
        v_cost
      )::text;
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
REVOKE ALL ON FUNCTION public.reserve_dino_ai_credit(uuid, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_dino_ai_credit(uuid, text, text)
  TO service_role;

CREATE OR REPLACE FUNCTION public.get_dino_ai_quota()
RETURNS TABLE(
  plan text,
  daily_limit integer,
  credits_used integer,
  credits_remaining integer,
  requests_today integer,
  global_requests_today integer,
  global_requests_remaining integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_plan text;
  v_daily_limit integer;
  v_usage_date date := (now() at time zone 'Asia/Makassar')::date;
  v_credits_used integer := 0;
  v_requests_today integer := 0;
  v_global_requests_today integer := 0;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT 'free'::text, 5, 0, 0, 0, 0, 50;
    RETURN;
  END IF;

  SELECT effective.plan, effective.daily_credits
  INTO v_plan, v_daily_limit
  FROM public.get_dino_ai_effective_plan(v_user_id) AS effective;

  SELECT usage.credits_used, usage.requests_count
  INTO v_credits_used, v_requests_today
  FROM public.dino_ai_usage AS usage
  WHERE usage.user_id = v_user_id
    AND usage.usage_date = v_usage_date;

  SELECT global_usage.requests_count
  INTO v_global_requests_today
  FROM public.dino_ai_global_usage AS global_usage
  WHERE global_usage.usage_date = v_usage_date;

  RETURN QUERY SELECT
    coalesce(v_plan, 'free'),
    coalesce(v_daily_limit, 5),
    coalesce(v_credits_used, 0),
    greatest(coalesce(v_daily_limit, 5) - coalesce(v_credits_used, 0), 0),
    coalesce(v_requests_today, 0),
    coalesce(v_global_requests_today, 0),
    greatest(50 - coalesce(v_global_requests_today, 0), 0);
END;
$function$;

REVOKE ALL ON FUNCTION public.get_dino_ai_quota() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_dino_ai_quota() TO authenticated;

-- Return the daily allowance and purchase wallet in one RPC, so DinoAI Chat
-- and DinoLab use the same balance shape and refresh path.
CREATE OR REPLACE FUNCTION public.get_dino_ai_credit_balance()
RETURNS TABLE(
  plan text,
  daily_limit integer,
  credits_used integer,
  credits_remaining integer,
  requests_today integer,
  global_requests_today integer,
  global_requests_remaining integer,
  purchased_credits_remaining integer,
  total_credits_remaining integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_quota record;
  v_purchased_credits integer := 0;
BEGIN
  SELECT *
  INTO v_quota
  FROM public.get_dino_ai_quota();

  v_purchased_credits := public.get_dino_ai_wallet_balance();

  RETURN QUERY SELECT
    coalesce(v_quota.plan, 'free'),
    coalesce(v_quota.daily_limit, 5),
    coalesce(v_quota.credits_used, 0),
    coalesce(v_quota.credits_remaining, 0),
    coalesce(v_quota.requests_today, 0),
    coalesce(v_quota.global_requests_today, 0),
    coalesce(v_quota.global_requests_remaining, 50),
    coalesce(v_purchased_credits, 0),
    coalesce(v_quota.credits_remaining, 0) + coalesce(v_purchased_credits, 0);
END;
$function$;

REVOKE ALL ON FUNCTION public.get_dino_ai_credit_balance()
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_dino_ai_credit_balance()
  TO authenticated;

-- Include all dedicated features in the terminal state transition. DinoLab
-- scribble analysis was already priced in the reservation policy, but its old
-- chat-based call path could not be completed under that ledger feature.
CREATE OR REPLACE FUNCTION public.complete_dino_ai_credit_request(
  p_user_id uuid,
  p_idempotency_key text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  IF p_user_id IS NULL
     OR p_idempotency_key IS NULL
     OR length(trim(p_idempotency_key)) = 0 THEN
    RAISE EXCEPTION 'Parameter penyelesaian kredit tidak valid';
  END IF;

  UPDATE public.dino_ai_credit_requests
  SET status = 'succeeded',
      result_reason = 'Hasil AI berhasil dibuat',
      updated_at = now()
  WHERE user_id = p_user_id
    AND idempotency_key = p_idempotency_key
    AND feature IN (
      'ai-cv-maker',
      'dinoai-chat',
      'dinoai-chat-media',
      'ai-scribble-analysis',
      'ai-surat-lamaran',
      'ai-pembuat-soal',
      'ai-modul-ajar',
      'ai-lkpd',
      'ai-rubrik',
      'ai-evaluasi'
    )
    AND status = 'reserved';

  RETURN FOUND;
END;
$function$;

REVOKE ALL ON FUNCTION public.complete_dino_ai_credit_request(uuid, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_dino_ai_credit_request(uuid, text)
  TO service_role;
