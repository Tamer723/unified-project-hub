ALTER TABLE public.products
  DROP COLUMN IF EXISTS name_ar,
  DROP COLUMN IF EXISTS name_tr,
  DROP COLUMN IF EXISTS name_en,
  DROP COLUMN IF EXISTS description_ar,
  DROP COLUMN IF EXISTS description_tr,
  DROP COLUMN IF EXISTS description_en;

ALTER TABLE public.product_price_matrix
  DROP COLUMN IF EXISTS country_ar,
  DROP COLUMN IF EXISTS country_tr,
  DROP COLUMN IF EXISTS country_en,
  DROP COLUMN IF EXISTS animal_ar,
  DROP COLUMN IF EXISTS animal_tr,
  DROP COLUMN IF EXISTS animal_en;

ALTER TABLE public.product_price_matrix
  ADD COLUMN animal_code text not null default 'sheep';