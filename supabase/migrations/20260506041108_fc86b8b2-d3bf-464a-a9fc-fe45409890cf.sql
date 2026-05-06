DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;

CREATE OR REPLACE FUNCTION public.has_role(_role user_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role = _role
  );
$$;

REVOKE ALL ON FUNCTION public.has_role(user_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(user_role) TO authenticated;