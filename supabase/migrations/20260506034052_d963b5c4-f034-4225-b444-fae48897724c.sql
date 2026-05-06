
ALTER TABLE public.orders DISABLE TRIGGER orders_protect_financial;

UPDATE public.products SET base_price = base_price / 100;
UPDATE public.product_price_matrix SET price = price / 100;
UPDATE public.orders SET unit_price = unit_price / 100, total_amount = total_amount / 100;

ALTER TABLE public.orders ENABLE TRIGGER orders_protect_financial;

DROP POLICY IF EXISTS "Anonymous can create pending orders only" ON public.orders;
CREATE POLICY "Anonymous can create pending orders only"
ON public.orders FOR INSERT TO anon, authenticated
WITH CHECK (
  status = 'pending'
  AND total_amount > 0
  AND total_amount < 100000
  AND quantity > 0 AND quantity <= 100
  AND char_length(donor_name) >= 2 AND char_length(donor_name) <= 80
  AND char_length(donor_email) <= 255
  AND donor_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  AND (donor_phone IS NULL OR char_length(donor_phone) <= 40)
  AND provider_txn_id IS NULL
  AND card_meta IS NULL
  AND failure_reason IS NULL
);
