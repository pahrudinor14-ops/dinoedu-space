-- Recalculate the daily/wallet split immediately before the shortfall check.
-- A request is denied only when the combined available balance cannot cover it.
DO $migration$
DECLARE
  v_function_definition text;
  v_check_pattern text :=
    'if[[:space:]]+v_wallet_available[[:space:]]*<[[:space:]]*v_wallet_take[[:space:]]+then';
  v_replacement text :=
    'v_daily_take := least(v_cost, greatest(v_daily_available, 0));
  v_wallet_take := greatest(v_cost - v_daily_take, 0);
  if v_daily_available + v_wallet_available < v_cost then';
  v_match_count integer;
BEGIN
  SELECT pg_get_functiondef(
    'public.reserve_dino_ai_credit(uuid,text,text)'::regprocedure
  )
  INTO v_function_definition;

  SELECT count(*)::integer
  INTO v_match_count
  FROM regexp_matches(v_function_definition, v_check_pattern, 'gi');

  IF v_match_count <> 1 THEN
    RAISE EXCEPTION
      'Expected exactly one credit allocation check in reserve_dino_ai_credit; found %',
      v_match_count;
  END IF;

  v_function_definition := regexp_replace(
    v_function_definition,
    v_check_pattern,
    v_replacement,
    'i'
  );

  EXECUTE v_function_definition;
END;
$migration$;
