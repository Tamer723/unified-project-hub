
-- Helper to check any role from list
CREATE OR REPLACE FUNCTION public.has_any_role(_roles user_role[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = ANY(_roles)
  );
$$;

-- Orders: allow admin/moderator/viewer to view; only admin to update
DROP POLICY IF EXISTS "Admins can view orders" ON public.orders;
CREATE POLICY "Staff can view orders" ON public.orders
  FOR SELECT TO authenticated
  USING (public.has_any_role(ARRAY['admin','moderator','viewer']::user_role[]));

-- Products manage: admin or moderator
DROP POLICY IF EXISTS "Admins can manage products" ON public.products;
CREATE POLICY "Staff can manage products" ON public.products
  FOR ALL TO authenticated
  USING (public.has_any_role(ARRAY['admin','moderator']::user_role[]))
  WITH CHECK (public.has_any_role(ARRAY['admin','moderator']::user_role[]));

-- Pricing matrix manage: admin or moderator
DROP POLICY IF EXISTS "Admins can manage matrix" ON public.product_price_matrix;
CREATE POLICY "Staff can manage matrix" ON public.product_price_matrix
  FOR ALL TO authenticated
  USING (public.has_any_role(ARRAY['admin','moderator']::user_role[]))
  WITH CHECK (public.has_any_role(ARRAY['admin','moderator']::user_role[]));
