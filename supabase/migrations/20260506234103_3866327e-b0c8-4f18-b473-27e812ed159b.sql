-- 1) Donor IP + country on orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS donor_ip text,
  ADD COLUMN IF NOT EXISTS donor_country text;

-- Update INSERT policy to allow these optional fields (must be NULL from anon clients; server fills them)
DROP POLICY IF EXISTS "Anonymous can create pending orders only" ON public.orders;
CREATE POLICY "Anonymous can create pending orders only"
ON public.orders
FOR INSERT
TO anon, authenticated
WITH CHECK (
  status = 'pending'
  AND total_amount > 0
  AND total_amount < 100000
  AND quantity > 0
  AND quantity <= 100
  AND char_length(donor_name) >= 2
  AND char_length(donor_name) <= 80
  AND char_length(donor_email) <= 255
  AND donor_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  AND (donor_phone IS NULL OR char_length(donor_phone) <= 40)
  AND provider_txn_id IS NULL
  AND card_meta IS NULL
  AND failure_reason IS NULL
);

-- 2) Per-language image URLs on products (fallback to image_url)
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS image_url_ar text,
  ADD COLUMN IF NOT EXISTS image_url_tr text,
  ADD COLUMN IF NOT EXISTS image_url_en text;