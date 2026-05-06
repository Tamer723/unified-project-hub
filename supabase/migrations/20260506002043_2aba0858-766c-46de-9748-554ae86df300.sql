-- Add identification + multilingual columns to products
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS code text UNIQUE,
  ADD COLUMN IF NOT EXISTS title_ar text,
  ADD COLUMN IF NOT EXISTS title_en text,
  ADD COLUMN IF NOT EXISTS title_tr text;

-- Seed the 3 tracks
INSERT INTO public.products (code, title_ar, title_en, title_tr, base_price, pricing_type, currency, display_order, active)
VALUES
  ('track1', 'انحر سنّة وأطعم غزة', 'Sacrifice for Sunnah & Feed Gaza', 'Sünnet için kurban kes ve Gazze''yi besle', 10000, 'fixed', 'USD', 1, true),
  ('track2', 'أضحيتك تعبر الحصار', 'Your Sacrifice Crosses the Siege', 'Kurbanın kuşatmayı aşıyor', 17500, 'fixed', 'USD', 2, true),
  ('track3', 'الأضاحي الحيّة', 'Live Sacrifices', 'Canlı kurbanlar', 11500, 'matrix', 'USD', 3, true)
ON CONFLICT (code) DO UPDATE SET
  title_ar = EXCLUDED.title_ar,
  title_en = EXCLUDED.title_en,
  title_tr = EXCLUDED.title_tr,
  base_price = EXCLUDED.base_price,
  pricing_type = EXCLUDED.pricing_type,
  display_order = EXCLUDED.display_order;

-- Seed price matrix for track3 (USD, whole dollars stored as cents)
WITH t3 AS (SELECT id FROM public.products WHERE code = 'track3')
INSERT INTO public.product_price_matrix (product_id, country_code, animal_code, price, currency, active)
SELECT t3.id, c.country_code, c.animal_code, c.price, 'USD', true
FROM t3, (VALUES
  ('JM','sheep',28500),('JM','cow_share',28500),
  ('WB','sheep',25000),('WB','cow_share',25000),
  ('LB','sheep',23000),('LB','cow_share',20000),
  ('SY','sheep',16500),('SY','cow_share',14500),
  ('SD','sheep',11500),('SD','cow_share',11500),
  ('YE','sheep',17500),('YE','cow_share',15500),
  ('BD','sheep',19500),('BD','cow_share',17500)
) AS c(country_code, animal_code, price)
ON CONFLICT DO NOTHING;