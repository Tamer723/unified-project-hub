REVOKE EXECUTE ON FUNCTION public.has_role(user_role) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.has_any_role(user_role[]) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.has_role(user_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_any_role(user_role[]) TO authenticated;