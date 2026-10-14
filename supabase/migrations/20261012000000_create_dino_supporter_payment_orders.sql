-- DinoEdu Space: Midtrans QRIS payment orders (sandbox-first)
-- Payment verification only. This migration intentionally does NOT activate
-- dino_user_plans or grant Supporter credits.

create table if not exists public.dino_supporter_payment_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null default 'midtrans'
    check (provider = 'midtrans'),
  order_id text not null unique,
  idempotency_key text not null,
  amount_idr integer not null check (amount_idr > 0),
  currency text not null default 'IDR' check (currency = 'IDR'),
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'failed', 'expired')),
  payment_type text,
  transaction_id text,
  qr_url text,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, idempotency_key)
);

create index if not exists dino_supporter_payment_orders_user_created_idx
  on public.dino_supporter_payment_orders (user_id, created_at desc);

create index if not exists dino_supporter_payment_orders_status_created_idx
  on public.dino_supporter_payment_orders (status, created_at);

alter table public.dino_supporter_payment_orders enable row level security;

-- All payment-order reads and writes go through trusted Edge Functions.
revoke all on table public.dino_supporter_payment_orders
  from public, anon, authenticated;

grant select, insert, update
  on table public.dino_supporter_payment_orders to service_role;
