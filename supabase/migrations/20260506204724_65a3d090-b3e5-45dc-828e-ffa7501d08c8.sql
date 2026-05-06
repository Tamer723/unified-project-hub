create table public.payment_settings (
  id uuid primary key default '00000000-0000-0000-0000-000000000001'::uuid,
  active_provider text not null default 'mock'
    check (active_provider in ('mock','nestpay_3d','nestpay_hosting')),
  test_mode boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by uuid
);

create unique index payment_settings_singleton on public.payment_settings ((true));

alter table public.payment_settings enable row level security;

create policy "staff read payment settings" on public.payment_settings
  for select to authenticated
  using (public.has_any_role(array['admin','moderator','viewer']::user_role[]));

create policy "admin update payment settings" on public.payment_settings
  for update to authenticated
  using (public.has_role('admin'::user_role))
  with check (public.has_role('admin'::user_role));

insert into public.payment_settings (id) values (default);

create or replace function public.get_active_payment_provider()
returns table(active_provider text, test_mode boolean)
language sql
stable
security definer
set search_path = public
as $$
  select active_provider, test_mode from public.payment_settings limit 1;
$$;

grant execute on function public.get_active_payment_provider() to anon, authenticated;