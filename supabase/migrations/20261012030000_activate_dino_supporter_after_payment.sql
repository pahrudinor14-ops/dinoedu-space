-- Atomically record a verified Midtrans settlement and activate one month of Supporter.
-- Only service_role may invoke this RPC; call it only after the Edge Function verifies
-- the Midtrans signature AND independently confirms the transaction via Status API.

create or replace function public.activate_dino_supporter_payment(
  p_order_id text,
  p_transaction_id text default null
)
returns table (
  payment_status text,
  user_plan text,
  plan_expires_at timestamptz,
  already_processed boolean
)
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_order public.dino_supporter_payment_orders%rowtype;
  v_plan public.dino_user_plans%rowtype;
  v_now timestamptz := now();
  v_starts_at timestamptz;
  v_expires_at timestamptz;
begin
  if p_order_id is null or length(trim(p_order_id)) = 0 then
    raise exception 'ID pesanan wajib diisi';
  end if;

  select o.*
  into v_order
  from public.dino_supporter_payment_orders o
  where o.order_id = p_order_id
  for update;

  if not found then
    raise exception 'Pesanan pembayaran tidak ditemukan';
  end if;

  if v_order.provider <> 'midtrans'
     or v_order.amount_idr <> 29000
     or v_order.currency <> 'IDR' then
    raise exception 'Pesanan tidak memenuhi aturan aktivasi Supporter';
  end if;

  -- The payment row and entitlement are committed together. A paid row therefore
  -- always means the corresponding activation transaction completed as well.
  if v_order.status = 'paid' then
    select up.* into v_plan
    from public.dino_user_plans up
    where up.user_id = v_order.user_id;

    return query select
      'paid'::text,
      coalesce(v_plan.plan, 'free')::text,
      v_plan.expires_at,
      true;
    return;
  end if;

  select up.*
  into v_plan
  from public.dino_user_plans up
  where up.user_id = v_order.user_id
  for update;

  if found and v_plan.plan = 'paid'
     and v_plan.expires_at is not null
     and v_plan.expires_at > v_now then
    -- Extend an active Supporter period by one month, without losing remaining time.
    v_starts_at := v_plan.starts_at;
    v_expires_at := v_plan.expires_at + interval '1 month';
  else
    -- New or expired entitlement starts from the verified payment time.
    v_starts_at := v_now;
    v_expires_at := v_now + interval '1 month';
  end if;

  insert into public.dino_user_plans (
    user_id, plan, starts_at, expires_at, updated_at
  ) values (
    v_order.user_id, 'paid', v_starts_at, v_expires_at, v_now
  )
  on conflict (user_id) do update set
    plan = excluded.plan,
    starts_at = excluded.starts_at,
    expires_at = excluded.expires_at,
    updated_at = excluded.updated_at;

  update public.dino_supporter_payment_orders
  set status = 'paid',
      payment_type = 'qris',
      transaction_id = coalesce(p_transaction_id, transaction_id),
      paid_at = v_now,
      updated_at = v_now
  where id = v_order.id;

  return query select 'paid'::text, 'paid'::text, v_expires_at, false;
end;
$function$;

revoke all on function public.activate_dino_supporter_payment(text, text)
  from public, anon, authenticated;
grant execute on function public.activate_dino_supporter_payment(text, text)
  to service_role;
