-- A sandbox lifetime row has an end date (snapshot + 7 days), so expires_at alone cannot tell it from a subscription.
-- null means the row came from the six-argument writer, and account_plan_effective falls back to expires_at is null.
alter table public.store_entitlements add column if not exists lifetime boolean;

create or replace function public.store_entitlement_put(
  p_user uuid,
  p_active boolean,
  p_product text,
  p_expires timestamptz,
  p_sandbox boolean,
  p_snapshot timestamptz,
  p_lifetime boolean
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  written boolean;
begin
  insert into public.store_entitlements as s (user_id, active, product_id, expires_at, sandbox, lifetime, snapshot_at)
  values (p_user, p_active, p_product, p_expires, p_sandbox, p_lifetime, p_snapshot)
  on conflict (user_id) do update
  set active = excluded.active,
      product_id = excluded.product_id,
      expires_at = excluded.expires_at,
      sandbox = excluded.sandbox,
      lifetime = excluded.lifetime,
      snapshot_at = excluded.snapshot_at
  where s.snapshot_at < excluded.snapshot_at
  returning true into written;
  return coalesce(written, false);
exception
  when foreign_key_violation then
    return false;
end;
$$;

revoke execute on function public.store_entitlement_put(uuid, boolean, text, timestamptz, boolean, timestamptz, boolean)
  from public, anon, authenticated;
grant execute on function public.store_entitlement_put(uuid, boolean, text, timestamptz, boolean, timestamptz, boolean)
  to service_role;

-- The API deployed before this migration still sends six arguments. p_lifetime has no default above,
-- so PostgREST and Postgres never find two versions that fit one call.
create or replace function public.store_entitlement_put(
  p_user uuid,
  p_active boolean,
  p_product text,
  p_expires timestamptz,
  p_sandbox boolean,
  p_snapshot timestamptz
)
returns boolean
language sql
security definer
set search_path = ''
as $$
  select public.store_entitlement_put(p_user, p_active, p_product, p_expires, p_sandbox, p_snapshot, null::boolean);
$$;

revoke execute on function public.store_entitlement_put(uuid, boolean, text, timestamptz, boolean, timestamptz)
  from public, anon, authenticated;
grant execute on function public.store_entitlement_put(uuid, boolean, text, timestamptz, boolean, timestamptz)
  to service_role;

create or replace function public.account_plan_effective(p_user uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with store as (
    select s.active, s.expires_at, coalesce(s.lifetime, s.expires_at is null) as is_lifetime
    from public.store_entitlements s
    where s.user_id = p_user
  ),
  facts as (
    select
      exists (select 1 from public.account_plans p where p.user_id = p_user and p.plan = 'plus') as code,
      exists (
        select 1 from store
        where store.active and store.is_lifetime and (store.expires_at is null or store.expires_at > now())
      ) as lifetime,
      exists (
        select 1 from store where store.active and not store.is_lifetime and store.expires_at > now()
      ) as subscription
  )
  select jsonb_build_object(
    'plan', case when code or lifetime or subscription then 'plus' else 'free' end,
    'grant', case when code then 'code' when lifetime then 'lifetime' when subscription then 'subscription' end,
    'canManageSubscription', subscription
  )
  from facts;
$$;

revoke execute on function public.account_plan_effective(uuid) from public, anon, authenticated;
grant execute on function public.account_plan_effective(uuid) to service_role;
