drop policy if exists "Admins can view all campaigns" on public.campaigns;
drop policy if exists "Admins can insert campaigns" on public.campaigns;
drop policy if exists "Admins can update campaigns" on public.campaigns;
drop policy if exists "Admins can delete campaigns" on public.campaigns;
drop policy if exists "Admins can view donations" on public.donations;
drop policy if exists "Admins can update donations" on public.donations;
drop policy if exists "Admins can delete donations" on public.donations;
drop policy if exists "Admins can view all roles" on public.user_roles;
drop policy if exists "Admins can insert roles" on public.user_roles;
drop policy if exists "Admins can update roles" on public.user_roles;
drop policy if exists "Admins can delete roles" on public.user_roles;

drop function if exists public.has_role(uuid, public.user_role);

create or replace function public.has_role(_role public.user_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and role = _role
  )
$$;

revoke execute on function public.has_role(public.user_role) from public, anon, authenticated;

create policy "Admins can view all campaigns" on public.campaigns for select to authenticated using (public.has_role('admin'));
create policy "Admins can insert campaigns" on public.campaigns for insert to authenticated with check (public.has_role('admin'));
create policy "Admins can update campaigns" on public.campaigns for update to authenticated using (public.has_role('admin'));
create policy "Admins can delete campaigns" on public.campaigns for delete to authenticated using (public.has_role('admin'));

create policy "Admins can view donations" on public.donations for select to authenticated using (public.has_role('admin'));
create policy "Admins can update donations" on public.donations for update to authenticated using (public.has_role('admin'));
create policy "Admins can delete donations" on public.donations for delete to authenticated using (public.has_role('admin'));

create policy "Admins can view all roles" on public.user_roles for select to authenticated using (public.has_role('admin'));
create policy "Admins can insert roles" on public.user_roles for insert to authenticated with check (public.has_role('admin'));
create policy "Admins can update roles" on public.user_roles for update to authenticated using (public.has_role('admin'));
create policy "Admins can delete roles" on public.user_roles for delete to authenticated using (public.has_role('admin'));