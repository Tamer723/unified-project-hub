ALTER TABLE public.product_price_matrix
  ADD COLUMN IF NOT EXISTS weight_kg numeric;

UPDATE public.product_price_matrix SET price = 850, weight_kg = 50  WHERE country_code = 'JM' AND animal_code = 'sheep';
UPDATE public.product_price_matrix SET price = 750, weight_kg = 50  WHERE country_code = 'WB' AND animal_code = 'sheep';
UPDATE public.product_price_matrix SET price = 180, weight_kg = 23  WHERE country_code = 'SD' AND animal_code = 'sheep';
UPDATE public.product_price_matrix SET price = 350, weight_kg = 40  WHERE country_code = 'LB' AND animal_code = 'sheep';
UPDATE public.product_price_matrix SET price = 320, weight_kg = 42  WHERE country_code = 'SY' AND animal_code = 'sheep';
UPDATE public.product_price_matrix SET price = 130, weight_kg = 23  WHERE country_code = 'YE' AND animal_code = 'sheep';
UPDATE public.product_price_matrix SET price = 175, weight_kg = 20  WHERE country_code = 'BD' AND animal_code = 'sheep';

UPDATE public.product_price_matrix SET price = 530, weight_kg = 350 WHERE country_code = 'JM' AND animal_code = 'cow_share';
UPDATE public.product_price_matrix SET price = 500, weight_kg = 350 WHERE country_code = 'WB' AND animal_code = 'cow_share';
UPDATE public.product_price_matrix SET price = 120, weight_kg = 200 WHERE country_code = 'SD' AND animal_code = 'cow_share';
UPDATE public.product_price_matrix SET price = 345, weight_kg = 350 WHERE country_code = 'LB' AND animal_code = 'cow_share';
UPDATE public.product_price_matrix SET price = 360, weight_kg = 350 WHERE country_code = 'SY' AND animal_code = 'cow_share';
UPDATE public.product_price_matrix SET price = 120, weight_kg = 200 WHERE country_code = 'YE' AND animal_code = 'cow_share';
UPDATE public.product_price_matrix SET price = 115, weight_kg = 150 WHERE country_code = 'BD' AND animal_code = 'cow_share';