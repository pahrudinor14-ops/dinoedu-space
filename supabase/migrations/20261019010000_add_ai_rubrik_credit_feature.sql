-- Rubrik uses the same two-credit cost as AI Pembuat Soal and gets a distinct
-- feature name in the request and credit ledger for reporting/refund handling.
create or replace function public.reserve_dino_ai_rubric_credit(
  p_user_id uuid,
  p_idempotency_key text
)
returns table(allowed boolean, credits_consumed integer, credits_remaining integer, reason text)
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_request public.dino_ai_credit_requests%rowtype;
  v_reservation record;
  v_remaining integer := 0;
begin
  if p_user_id is null
     or p_idempotency_key is null
     or length(trim(p_idempotency_key)) = 0
     or length(p_idempotency_key) > 200 then
    raise exception 'Parameter reservasi kredit Rubrik tidak valid';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));

  select r.*
  into v_request
  from public.dino_ai_credit_requests r
  where r.user_id = p_user_id
    and r.idempotency_key = p_idempotency_key
  for update;

  if found then
    if v_request.feature <> 'ai-rubrik' then
      raise exception 'Kunci idempotensi digunakan untuk permintaan berbeda';
    end if;

    if v_request.status in ('reserved', 'succeeded') then
      select coalesce(sum(l.remaining_credits), 0)::integer
      into v_remaining
      from public.dino_ai_credit_lots l
      where l.user_id = p_user_id
        and l.remaining_credits > 0
        and (l.expires_at is null or l.expires_at > now());
      return query select false, 0, v_remaining,
        'Permintaan ini sudah diproses; jangan panggil Gemini kembali'::text;
      return;
    end if;

    if v_request.status = 'failed' then
      return query select false, 0, 0,
        coalesce(v_request.result_reason, 'Permintaan sebelumnya gagal');
      return;
    end if;

    return query select false, 0, 0,
      'Permintaan Rubrik masih diproses. Silakan coba lagi nanti'::text;
    return;
  end if;

  -- Reuse the established two-credit reservation path, then label the request
  -- and ledger entries as Rubrik in this same database transaction.
  select *
  into v_reservation
  from public.reserve_dino_ai_credit(
    p_user_id,
    'ai-pembuat-soal',
    p_idempotency_key
  );

  update public.dino_ai_credit_requests
  set feature = 'ai-rubrik',
      updated_at = now()
  where user_id = p_user_id
    and idempotency_key = p_idempotency_key
    and feature = 'ai-pembuat-soal';

  update public.dino_ai_credit_ledger
  set feature = 'ai-rubrik'
  where user_id = p_user_id
    and reference_id = p_idempotency_key
    and feature = 'ai-pembuat-soal'
    and event_type = 'consume';

  return query select
    v_reservation.allowed,
    v_reservation.credits_consumed,
    v_reservation.credits_remaining,
    v_reservation.reason;
end;
$function$;

revoke all on function public.reserve_dino_ai_rubric_credit(uuid, text)
  from public, anon, authenticated;
grant execute on function public.reserve_dino_ai_rubric_credit(uuid, text)
  to service_role;

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
      'ai-modul-ajar',
      'ai-lkpd',
      'ai-rubrik'
    )
    and status = 'reserved';

  return found;
end;
$function$;

revoke all on function public.complete_dino_ai_credit_request(uuid, text)
  from public, anon, authenticated;
grant execute on function public.complete_dino_ai_credit_request(uuid, text)
  to service_role;
