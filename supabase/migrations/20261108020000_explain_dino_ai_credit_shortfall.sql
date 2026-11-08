-- Make server-side credit denial explain the exact balances used by reservation.
-- This does not change the credit cost or allow a reservation with insufficient funds.
DO $migration$
DECLARE
  v_function_definition text;
  v_failure_pattern text :=
    'return[[:space:]]+query[[:space:]]+select[[:space:]]+false,[[:space:]]*0,[[:space:]]*v_wallet_available,[[:space:]]*''Kuota harian dan saldo wallet tidak mencukupi''::text;';
  v_replacement text :=
    'return query select false, 0, v_daily_available + v_wallet_available,
      format(
        ''Kredit tidak cukup (kuota harian tersisa %s, kredit pembelian tersisa %s, perlu %s)'',
        v_daily_available,
        v_wallet_available,
        v_cost
      )::text;';
  v_match_count integer;
BEGIN
  SELECT pg_get_functiondef(
    'public.reserve_dino_ai_credit(uuid,text,text)'::regprocedure
  )
  INTO v_function_definition;

  SELECT count(*)::integer
  INTO v_match_count
  FROM regexp_matches(v_function_definition, v_failure_pattern, 'gi');

  IF v_match_count <> 1 THEN
    RAISE EXCEPTION
      'Expected exactly one insufficient-credit response in reserve_dino_ai_credit; found %',
      v_match_count;
  END IF;

  v_function_definition := regexp_replace(
    v_function_definition,
    v_failure_pattern,
    v_replacement,
    'i'
  );

  EXECUTE v_function_definition;
END;
$migration$;
