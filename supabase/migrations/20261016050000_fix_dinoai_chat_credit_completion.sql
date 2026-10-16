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
    and feature in (
      'ai-cv-maker',
      'dinoai-chat',
      'ai-surat-lamaran',
      'ai-pembuat-soal',
      'ai-modul-ajar'
    )
    and status = 'reserved';

  return found;
end;
$function$;

revoke all on function public.complete_dino_ai_credit_request(uuid, text)
  from public, anon, authenticated;
grant execute on function public.complete_dino_ai_credit_request(uuid, text)
  to service_role;
