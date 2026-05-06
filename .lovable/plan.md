
## الهدف
تخزين الأسعار في قاعدة البيانات بالدولار/الليرة الكاملة (بدون سنت) بدل التخزين بالـ minor units، مع تنظيف كل كود التحويل (÷100 و ×100) من المشروع.

## التغييرات في قاعدة البيانات (Migration)

تحويل الأعمدة العددية من سنت إلى دولار كامل عبر القسمة على 100:

```sql
-- products.base_price: 10000 → 100, 17500 → 175, 11500 → 115
UPDATE public.products SET base_price = base_price / 100;

-- product_price_matrix.price: 11500 → 115, 25000 → 250, ...
UPDATE public.product_price_matrix SET price = price / 100;

-- orders: نحدّث الأعمدة الموجودة (إن وجدت طلبات سابقة) للحفاظ على الاتساق
UPDATE public.orders SET unit_price = unit_price / 100, total_amount = total_amount / 100;

-- تحديث RLS policy على orders لرفع حد المبلغ الأقصى (كان < 1000000 سنت = $10,000)
-- نُعيد إنشاؤه بحد منطقي بالدولار الكامل (مثلاً < 100000 = $100,000)
DROP POLICY "Anonymous can create pending orders only" ON public.orders;
CREATE POLICY "Anonymous can create pending orders only"
ON public.orders FOR INSERT TO anon, authenticated
WITH CHECK (
  status = 'pending'
  AND total_amount > 0
  AND total_amount < 100000
  AND quantity > 0 AND quantity <= 100
  AND char_length(donor_name) BETWEEN 2 AND 80
  AND char_length(donor_email) <= 255
  AND donor_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  AND (donor_phone IS NULL OR char_length(donor_phone) <= 40)
  AND provider_txn_id IS NULL AND card_meta IS NULL AND failure_reason IS NULL
);
```

تبقى الأعمدة `integer` لأن خياراتك بدون فواصل عشرية.

## التغييرات في الكود

### 1) `src/hooks/usePricing.ts`
حذف القسمة على 100:
- `return Math.round(row.price / 100)` → `return row.price`
- `return Math.round(product.base_price / 100)` → `return product.base_price`

### 2) `supabase/functions/ziraat-payment-init/index.ts`
- `serverUnitPrice = m.price` و `mrow.price` و `prod.base_price` تبقى كما هي (لكن الآن قيم كاملة).
- إرسال المبلغ للبنك: `amount: total` يبقى صحيحاً الآن (دولار كامل بدون قسمة).
- تعديل `unit_price: z.number().int().min(1)` و الحدود العليا للـ validation لتعكس النطاق الجديد.

### 3) `supabase/functions/create-payment/index.ts`
- نفس الشيء: استخدام القيم مباشرة بدون أي تحويل.

### 4) `src/pages/Payment3DSMock.tsx`
- `formatAmount(amount)` يعرض القيمة مباشرة (TRY/USD) بدون قسمة، ومع `toLocaleString` بدون كسور.

### 5) `src/components/site/CheckoutSection.tsx`
- لا تغيير في المنطق (يستخدم `selection.unitPrice` المُحلّ مسبقاً من `usePricing`)، فقط التأكد أن `data.amount` المعروض في رابط 3DS هو دولار كامل.

### 6) `supabase/functions/payment-callback/index.ts`
- مراجعة استخدام `total_amount` للتأكد من عدم وجود تحويل.

## النتيجة المتوقعة
- في صفحة التحقق 3DS سيظهر `$175` أو `175 ₺` بدلاً من `10000`.
- قاعدة البيانات تحتوي قيماً نظيفة (100, 175, 115, ...) مطابقة للأسعار المعروضة في الواجهة.
- المبلغ المُرسل لبوابة زراعات بنك يكون بالقيمة الكاملة كما تتطلبه واجهتها.

هل توافق على التنفيذ؟
