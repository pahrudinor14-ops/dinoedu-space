-- DinoAI Chat messages cost one credit. Other AI feature costs remain unchanged.
DO $migration$
DECLARE
  v_function_definition text;
  v_old_cost text := 'when ''dinoai-chat'' then 2';
  v_new_cost text := 'when ''dinoai-chat'' then 1';
BEGIN
  SELECT pg_get_functiondef(
    'public.reserve_dino_ai_credit(uuid,text,text)'::regprocedure
  )
  INTO v_function_definition;

  IF length(v_function_definition)
      - length(replace(v_function_definition, v_old_cost, ''))
      <> length(v_old_cost) THEN
    RAISE EXCEPTION
      'Expected exactly one current DinoAI Chat credit cost in reserve_dino_ai_credit';
  END IF;

  EXECUTE replace(v_function_definition, v_old_cost, v_new_cost);
END;
$migration$;
