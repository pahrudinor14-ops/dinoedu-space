-- Keep server-side daily quota dates aligned with the WITA reset shown in the UI.
-- Also use the same plan start/expiry rules for quota display and reservation.
DO $migration$
DECLARE
  v_quota_definition text;
  v_reserve_definition text;
  v_old_usage_date text := 'v_usage_date date := current_date;';
  v_new_usage_date text :=
    'v_usage_date date := (now() at time zone ''Asia/Makassar'')::date;';
  v_old_plan_filter_pattern text :=
    'and[[:space:]]*\([[:space:]]*up\.plan[[:space:]]*=[[:space:]]*''free''[[:space:]]+or[[:space:]]+up\.starts_at[[:space:]]*<=[[:space:]]*now\(\)[[:space:]]*\);';
  v_new_plan_filter text :=
    'and (up.plan = ''free'' or up.starts_at <= now())
    and (up.expires_at is null or up.expires_at > now() or up.plan = ''paid'');';
  v_plan_filter_matches integer;
BEGIN
  SELECT pg_get_functiondef('public.get_dino_ai_quota()'::regprocedure)
  INTO v_quota_definition;

  SELECT pg_get_functiondef(
    'public.reserve_dino_ai_credit(uuid,text,text)'::regprocedure
  )
  INTO v_reserve_definition;

  IF length(v_quota_definition)
      - length(replace(v_quota_definition, v_old_usage_date, ''))
      <> length(v_old_usage_date) THEN
    RAISE EXCEPTION
      'Expected exactly one daily usage date in get_dino_ai_quota';
  END IF;

  IF length(v_reserve_definition)
      - length(replace(v_reserve_definition, v_old_usage_date, ''))
      <> length(v_old_usage_date) THEN
    RAISE EXCEPTION
      'Expected exactly one daily usage date in reserve_dino_ai_credit';
  END IF;

  SELECT count(*)::integer
  INTO v_plan_filter_matches
  FROM regexp_matches(v_quota_definition, v_old_plan_filter_pattern, 'gi');

  IF v_plan_filter_matches <> 1 THEN
    RAISE EXCEPTION
      'Expected exactly one plan validity filter in get_dino_ai_quota; found %',
      v_plan_filter_matches;
  END IF;

  v_quota_definition := replace(
    v_quota_definition,
    v_old_usage_date,
    v_new_usage_date
  );
  v_quota_definition := regexp_replace(
    v_quota_definition,
    v_old_plan_filter_pattern,
    v_new_plan_filter,
    'i'
  );
  v_reserve_definition := replace(
    v_reserve_definition,
    v_old_usage_date,
    v_new_usage_date
  );

  EXECUTE v_quota_definition;
  EXECUTE v_reserve_definition;
END;
$migration$;
