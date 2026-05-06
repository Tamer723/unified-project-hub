## تنفيذ تشديد الحماية الكامل (مع Turnstile تجريبي)

سأطبّق كل طبقات الحماية المتفق عليها سابقًا، مع استخدام مفاتيح Turnstile التجريبية الرسمية من Cloudflare التي تنجح دائمًا — ليسهل استبدالها لاحقًا بمفاتيحك الحقيقية بتغيير قيمتين فقط.

### 1. Migration على قاعدة البيانات

**أ. تشديد سياسة INSERT على `orders`:**
```sql
DROP POLICY "Anyone can create order" ON public.orders;

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
```
ملاحظة: `ziraat-payment-init` يستخدم `service_role` فيتجاوز RLS (يضع `awaiting_3ds` و `card_meta` بحرية). أي عميل عادي لن يستطيع إنشاء طلب مدفوع مزوّر.

**ب. Trigger لحماية الحقول المالية من التعديل بعد الإنشاء:**
```sql
CREATE OR REPLACE FUNCTION public.protect_order_fields()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NEW.total_amount <> OLD.total_amount
     OR NEW.currency <> OLD.currency
     OR NEW.unit_price <> OLD.unit_price
     OR NEW.quantity <> OLD.quantity
     OR NEW.product_id <> OLD.product_id THEN
    RAISE EXCEPTION 'Financial fields are immutable';
  END IF;
  RETURN NEW;
END;$$;

CREATE TRIGGER orders_protect_financial
BEFORE UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.protect_order_fields();
```

### 2. تحسين `ziraat-payment-init`

- **التحقق من السعر من DB:** بدلاً من الثقة بـ `unit_price` القادم من العميل، نقرأ السعر الحقيقي من `product_price_matrix` (إن وُجد `matrix_id`) أو من `products.base_price`، ونحسب `total_amount` على الخادم.
- **التحقق من Turnstile token:** نستقبل `captchaToken` ونتحقق منه عبر `https://challenges.cloudflare.com/turnstile/v0/siteverify`.
- **تنظيف الكود:** التأكد من عدم تسجيل أي بيانات بطاقة في console.

### 3. تحسين `ziraat-payment-verify` (Idempotency)

- رفض التحديث إذا كانت حالة الطلب ليست `awaiting_3ds`.
- إرجاع نفس النتيجة السابقة إذا حاول العميل تكرار التحقق على طلب `paid` أو `failed`.

### 4. دمج Turnstile في الواجهة

**`src/components/site/CheckoutSection.tsx`:**
- تحميل سكربت Turnstile (`https://challenges.cloudflare.com/turnstile/v0/api.js`).
- إضافة `<div class="cf-turnstile" data-sitekey="...">` فوق زر الدفع.
- عند الضغط على "ادفع"، نقرأ الـ token من الـ widget ونرسله مع طلب init.

**Site Key المستخدم (تجريبي — ينجح دائمًا):**
```
1x00000000000000000000AA
```

### 5. Secret في الخادم

سأطلب منك إضافة:
- `TURNSTILE_SECRET_KEY` = `1x0000000000000000000000000000000AA` (تجريبي)

عند جاهزية مفاتيحك الحقيقية: تستبدل قيمة الـ secret + قيمة `siteKey` في `CheckoutSection.tsx`.

### 6. عدم تطبيق Rate Limiting

البنية التحتية الحالية لا توفّر primitives موثوقة (لا Redis مدار). نعتمد على Turnstile + قيود RLS كحاجز أساسي ضد الإساءة.

---

### الملفات المتأثرة
- migration جديدة (سياسة + trigger + function).
- `supabase/functions/ziraat-payment-init/index.ts` — التحقق من السعر + Turnstile.
- `supabase/functions/ziraat-payment-verify/index.ts` — idempotency.
- `src/components/site/CheckoutSection.tsx` — Turnstile widget + إرسال token.
- إضافة secret `TURNSTILE_SECRET_KEY`.

موافق على التنفيذ؟
