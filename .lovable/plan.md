## الهدف
إضافة بوابة **iyzico** بوضعَين:
1. `iyzico_checkout` — Checkout Form (يستضيف iyzico صفحة الدفع، الأبسط).
2. `iyzico_3ds` — Payment with 3DS (نموذج البطاقة في موقعنا، البنك يتحقق OTP).

كلاهما يعمل على بيئة Sandbox (`https://sandbox-api.iyzipay.com`) أو Production (`https://api.iyzipay.com`) حسب `test_mode`.

## الأسرار المطلوبة
- `IYZICO_API_KEY`
- `IYZICO_SECRET_KEY`

سأطلبهما عبر أداة الأسرار الآمنة (لا تكتبهما في الشات مرة أخرى — وبعد الاختبار **دوّر** الأسرار التي شاركتَها لأنها أصبحت مكشوفة).

## التغييرات

### 1) `supabase/functions/payment-init/index.ts`
إضافة فرعَين جديدَين بعد فرع NestPay:

**iyzico_checkout (Hosted):**
- `POST /payment/iyzipay/checkoutform/initialize/auth/ecom`
- بدون بيانات بطاقة في الطلب.
- نستخدم body فيه: `locale`, `conversationId=order.id`, `price`, `paidPrice`, `currency` (TRY/USD)، `basketId`, `callbackUrl`, `buyer`, `shippingAddress`, `billingAddress`, `basketItems`.
- الردّ يحوي `paymentPageUrl` و`token` → نُعيدهما للواجهة كـ `mode: "redirect_url"` مع `action: paymentPageUrl`.
- نخزّن `token` في `orders.provider_ref` للتحقق لاحقاً.

**iyzico_3ds:**
- `POST /payment/3dsecure/initialize`
- يتطلّب بيانات البطاقة (موجودة في `Body.card`).
- البنك يردّ بـ HTML form (3DS HTML) base64-encoded في `threeDSHtmlContent`.
- نُعيد للواجهة `mode: "render_html"` مع `html` (decoded) → الواجهة تكتبها داخل iframe لتنفيذ تحدي 3DS.

**التوقيع (PKI v1):**
```
authString = randomString + body
hmac = HMAC-SHA256(secret, authString) → hex
authHeader = "IYZWSv2 " + base64("apiKey:{apiKey}&randomKey:{randomString}&signature:{hmac}")
```
(iyzico v2 — أحدث وأبسط من v1).

### 2) `supabase/functions/payment-callback/index.ts`
- استقبال `POST` من iyzico بحقل `token` و`conversationId`.
- استدعاء:
  - Checkout: `POST /payment/iyzipay/checkoutform/auth/ecom/detail` بـ `{ token }`.
  - 3DS: `POST /payment/3dsecure/auth` بـ `{ paymentId, conversationData }`.
- إذا `status: "success"` و`paymentStatus: "SUCCESS"` → `orders.status = "paid"`، تخزين `paymentId` في `provider_txn_id`.
- وإلا → `failed` مع `failure_reason`.
- التوجيه النهائي إلى `/success` أو `/failed`.

### 3) `supabase/functions/payment-config-check/index.ts`
- إضافة `iyzico_api_key` و`iyzico_secret_key` للردّ.

### 4) `supabase/config.toml`
لا تغيير (الدوال الحالية مُعرَّفة بالفعل).

### 5) `src/pages/admin/Payments.tsx`
- إضافة خيارَي `iyzico_checkout` و`iyzico_3ds` في القائمة.
- شارة الأسرار تشمل iyzico (مماثلة لشارة NestPay).
- `test_mode` يبقى مشتركاً (sandbox/prod).

### 6) `src/components/site/CheckoutSection.tsx`
- بوابة `iyzico_checkout` و`nestpay_hosting`: إخفاء حقول البطاقة.
- معالجة `mode: "redirect_url"`: `window.location.href = action`.
- معالجة `mode: "render_html"`: إنشاء iframe بـ `srcdoc=html` ضمن مودال للتحدي.

### 7) قاعدة البيانات
لا حاجة لمايجريشن — الحقول نصّية، نُضيف القيم الجديدة في الواجهة فقط.

## ملاحظة أمنية (مهمّة)
الأسرار التي شاركتَها في الرسالة السابقة أصبحت مكشوفة في سجل المحادثة. أنصح بشدّة بتدويرها من لوحة iyzico Sandbox فور الانتهاء من الاختبار.
