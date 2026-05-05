
revoke execute on function public.has_role(uuid, public.user_role) from public, anon, authenticated;
revoke execute on function public.increment_raised(uuid, integer) from public, anon, authenticated;
