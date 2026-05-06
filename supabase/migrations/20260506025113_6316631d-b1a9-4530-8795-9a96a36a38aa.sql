-- 1. Tighten INSERT policy on orders
DROP POLICY IF EXISTS "Anyone can create order" ON public.orders;

CREATE POLICY "Anonymous can create pending orders only"
ON public.orders FOR INSERT TO anon, authenticated
WITH CHECK (
  status = 'pending'
  AND total_amount > 0 AND total_amount < 1000000
  AND quantity > 0 AND quantity <= 100
  AND char_length(donor_name) BETWEEN 2 AND 80
  AND char_length(donor_email) <= 255
  AND donor_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  AND (donor_phone IS NULL OR char_length(donor_phone) <= 40)
  AND provider_txn_id IS NULL
  AND card_meta IS NULL
  AND failure_reason IS NULL
);

-- 2. Trigger to protect financial fields from being changed after creation
CREATE OR REPLACE FUNCTION public.protect_order_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.total_amount <> OLD.total_amount
     OR NEW.currency <> OLD.currency
     OR NEW.unit_price <> OLD.unit_price
     OR NEW.quantity <> OLD.quantity
     OR NEW.product_id <> OLD.product_id THEN
    RAISE EXCEPTION 'Financial fields are immutable after order creation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS orders_protect_financial ON public.orders;
CREATE TRIGGER orders_protect_financial
BEFORE UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.protect_order_fields();