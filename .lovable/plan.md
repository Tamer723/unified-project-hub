## ما سيتغير

### 1. قاعدة البيانات (migration)
- `product_price_matrix`: إضافة عمود `weight_kg numeric` (nullable).
- تحديث 14 صفاً (7 دول × خروف/بقرة) بالأسعار والأوزان الجديدة.

### 2. الأسعار والأوزان الجديدة (USD / كغ)

| الدولة | خروف $ | خروف كغ | بقرة (حصة) $ | بقرة كغ |
|---|---|---|---|---|
| القدس (JM) | 850 | 50 | 530 | 350 |
| الضفة (WB) | 750 | 50 | 500 | 350 |
| السودان (SD) | 180 | 23 | 120 | 200 |
| لبنان (LB) | 350 | 40 | 345 | 350 |
| سوريا (SY) | 320 | 42 | 360 | 350 |
| اليمن (YE) | 130 | 23 | 120 | 200 |
| بنغلاديش (BD) | 175 | 20 | 115 | 150 |

### 3. ملفات الكود

**`src/lib/pricing.ts`**
- تحديث `FALLBACK_MATRIX` بالأسعار الجديدة.
- إضافة `FALLBACK_WEIGHTS`.

**`src/hooks/usePricing.ts`**
- إضافة `weight_kg` إلى `MatrixRow` وقراءته من Supabase.
- إضافة `resolveTrackWeight(country, animal, data)`.

**`src/components/site/TrackCard.tsx` (الواجهة الأمامية)**
- في بطاقة `track3` فقط، عند توفر الدولة والحيوان: عرض سطر "الوزن التقريبي: X كغ" أسفل المحدِّدين.

**`src/i18n/locales/{ar,tr,en}.json`**
- إضافة `track3.weight_value` بصياغة `{{kg}}`.

**`src/pages/admin/Pricing.tsx` (لوحة التحكم)**
- إضافة عمود "الوزن (كغ)" في جدول المصفوفة.
- خلية تعديل قابلة للحفظ (نفس نمط `EditableCell` الحالي للسعر) — تُرسِل `update({ weight_kg })` إلى نفس الـ mutation.

### 4. ما لن يتغير
- جدول `products` و `orders` و edge functions (الوزن للعرض فقط).
- `src/integrations/supabase/types.ts` يُحدَّث تلقائياً.
