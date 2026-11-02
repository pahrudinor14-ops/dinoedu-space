-- DinoLab scribble analysis costs two credits; DinoAI Chat remains one credit.
DO $migration$
DECLARE
  v_function_definition text;
  v_old_cost text := 'when ''ai-scribble-analysis'' then 1';
  v_new_cost text := 'when ''ai-scribble-analysis'' then 2';
BEGIN
  SELECT pg_get_functiondef(
    'public.reserve_dino_ai_credit(uuid,text,text)'::regprocedure
  )
  INTO v_function_definition;

  IF length(v_function_definition)
      - length(replace(v_function_definition, v_old_cost, ''))
      <> length(v_old_cost) THEN
    RAISE EXCEPTION
      'Expected exactly one current scribble analysis credit cost in reserve_dino_ai_credit';
  END IF;

  EXECUTE replace(v_function_definition, v_old_cost, v_new_cost);
END;
$migration$;
