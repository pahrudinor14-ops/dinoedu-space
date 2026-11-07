-- Multimodal DinoAI Chat uses two credits per image, document, or audio request.
DO $migration$
DECLARE
  v_function_definition text;
  v_old_cost text := 'when ''dinoai-chat'' then 1';
  v_new_cost text := 'when ''dinoai-chat'' then 1' || E'\n    when ''dinoai-chat-media'' then 2';
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
