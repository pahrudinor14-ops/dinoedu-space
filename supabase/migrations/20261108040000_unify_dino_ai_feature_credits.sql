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

-- Use the same effective plan resolver as display and charging.
DO $migration$
DECLARE
  v_function_definition text;
  v_old_plan_block text := $old$
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
$old$;
  v_new_plan_block text := $new$
  perform 1
  from public.dino_user_plans up
  where up.user_id = p_user_id
  for update;
  select effective.plan, effective.daily_credits
  into v_plan, v_daily_limit
  from public.get_dino_ai_effective_plan(p_user_id) as effective;
$new$;
  v_match_count integer;
BEGIN
  SELECT pg_get_functiondef(
    'public.reserve_dino_ai_credit(uuid,text,text)'::regprocedure
  )
  INTO v_function_definition;

  v_match_count := (
    length(v_function_definition)
      - length(replace(v_function_definition, v_old_plan_block, ''))
  ) / length(v_old_plan_block);

  IF v_match_count <> 1 THEN
    RAISE EXCEPTION
      'Expected exactly one plan block in reserve_dino_ai_credit; found %',
      v_match_count;
  END IF;

  v_function_definition := replace(
    v_function_definition,
    v_old_plan_block,
    v_new_plan_block
  );
  EXECUTE v_function_definition;
END;
$migration$;

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

DO $migration$
DECLARE
  v_function_definition text;
  v_old_cost text := 'when ''ai-pembuat-soal'' then 2';
  v_new_cost text := v_old_cost || E'\n'
    || '    when ''ai-lkpd'' then 2' || E'\n'
    || '    when ''ai-rubrik'' then 2' || E'\n'
    || '    when ''ai-evaluasi'' then 2';
BEGIN
  SELECT pg_get_functiondef(
    'public.reserve_dino_ai_credit(uuid,text,text)'::regprocedure
  )
  INTO v_function_definition;

  IF length(v_function_definition)
      - length(replace(v_function_definition, v_old_cost, ''))
      <> length(v_old_cost) THEN
    RAISE EXCEPTION
      'Expected exactly one AI Pembuat Soal cost in reserve_dino_ai_credit';
  END IF;

  EXECUTE replace(v_function_definition, v_old_cost, v_new_cost);
END;
$migration$;

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
