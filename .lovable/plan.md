## محاكاة دفع Ziraat 3D Secure (وضع التطوير)

سنبني تدفقًا متكاملاً يحاكي بنية ZiraatPay الفعلية، بحيث عند وصول بيانات الدخول الحقيقية نستبدل عنوان واحد فقط ونُمرّر السر الفعلي — دون تغيير الواجهة أو منطق الطلبات.

### بنية الـ 3D Secure التي سنحاكيها

```text
[Front] --(card+order)--> [edge: ziraat-payment-init]
                                  |
                                  v
                          إنشاء order (pending)
                                  |
                                  v
                          إرجاع threeDSUrl
                                  |
[Front] --redirect--> [page: /payment/3ds-mock]  (محاكاة شاشة OTP البنك)
                                  |
                          المستخدم يدخل OTP
                                  |
                                  v
[Front] --(otp+orderId)--> [edge: ziraat-payment-verify]
                                  |
                                  v
                  تحديث الطلب (success/failed)
                                  |
                                  v
              redirect إلى /success أو /failed
```

### 1. Edge Functions جديدة

**`supabase/functions/ziraat-payment-init/index.ts`**
- يستقبل: `order_id`, `card { number, holder, expMonth, expYear, cvc }`, `amount`, `currency`.
- في وضع المحاكاة (`MOCK_PAYMENT=true` افتراضيًا):
  - يخزّن البطاقة المُقنّعة (آخر 4 أرقام فقط) و `bin` في حقل `card_meta` على الطلب.
  - يضع الطلب في حالة `awaiting_3ds`.
  - يُرجع `{ threeDSUrl: "/payment/3ds-mock?orderId=..." , transactionId }`.
- بنية الاستجابة مطابقة لـ ZiraatPay (`responseCode`, `responseMessage`, `threeDSHtml`/`threeDSUrl`) ليكون الاستبدال سهلاً.

**`supabase/functions/ziraat-payment-verify/index.ts`**
- يستقبل: `order_id`, `otp`.
- في المحاكاة:
  - `otp === "123456"` → نجاح → الطلب `paid`.
  - `otp === "000000"` → فشل بطاقة → `failed (insufficient_funds)`.
  - غير ذلك → فشل OTP → `failed (otp_mismatch)`.
- يُرجع نفس شكل استجابة Ziraat (`approved`, `authCode`, `responseCode`).

كلتاهما مع CORS كاملة و Zod validation.

### 2. صفحة 3DS وهمية

**`src/pages/Payment3DSMock.tsx`** (المسار `/payment/3ds-mock`)
- تعرض شاشة شبيهة بشاشات OTP للبنوك التركية (شعار "Ziraat 3D Secure"، آخر 4 أرقام من البطاقة، المبلغ، حقل OTP من 6 خانات، عدّاد 60 ثانية).
- زر "تأكيد" يستدعي `ziraat-payment-verify` ثم يوجّه إلى `/success` أو `/failed`.
- نص توضيحي صغير: **"وضع المحاكاة — استخدم 123456 للنجاح أو 000000 لفشل البطاقة"**.

### 3. تعديل `CheckoutSection.tsx`
- زر "ادفع الآن" بدلاً من toast الوهمي:
  1. يتحقق من صلاحية رقم البطاقة (Luhn) و MM/YY و CVC.
  2. ينشئ الطلب عبر `create-payment` الموجود (نمدّده ليُعيد `order_id`).
  3. يستدعي `ziraat-payment-init` ببيانات البطاقة.
  4. يحفظ بيانات العودة في `sessionStorage` ويوجّه إلى `threeDSUrl`.
- إضافة تحقق Luhn في ملف مساعد `src/lib/card.ts` (إلى جانب `detectCardBrand` و `formatCardNumber` المنقولين من المكوّن).

### 4. تعديل قاعدة البيانات (migration)
على جدول `orders` أضف:
- `card_meta jsonb` (آخر 4، brand، holder name).
- `provider text` (`mock_ziraat` افتراضيًا).
- `provider_txn_id text`.
- توسيع enum `status` ليشمل `awaiting_3ds`, `paid`, `failed`.

### 5. تبديل لاحق إلى Ziraat الحقيقي
عند توفّر بيانات الدخول:
- إضافة Secrets: `ZIRAAT_MERCHANT_ID`, `ZIRAAT_TERMINAL_ID`, `ZIRAAT_API_USER`, `ZIRAAT_API_PASSWORD`, `ZIRAAT_3DS_KEY`.
- في `ziraat-payment-init` نستبدل الفرع الوهمي بطلب POST فعلي إلى:
  - `https://vpos.ziraatpay.com.tr/ziraatpay/api/v2/initiate3D`
- نحسب `hashData` (SHA-512 من حقول الطلب + storeKey) كما هو موثّق.
- نُمرّر `threeDSHtml` المُعاد كما هو إلى المتصفح (إما `iframe srcDoc` أو إعادة توجيه عبر form).
- `ziraat-payment-verify` يُستبدل بـ webhook على المسار `/functions/v1/ziraat-callback` يستقبل `MdStatus`, `mdErrorMsg` ويُحدّث الطلب — لا تغيير في الواجهة.

### ملفات سيتم إنشاؤها/تعديلها
- جديدة: `supabase/functions/ziraat-payment-init/index.ts`, `supabase/functions/ziraat-payment-verify/index.ts`, `src/pages/Payment3DSMock.tsx`, `src/lib/card.ts`
- تعديل: `src/components/site/CheckoutSection.tsx`, `src/App.tsx` (إضافة المسار), migration واحد على `orders`.

### فوائد هذا التصميم
- يعمل اليوم بدون أي مفاتيح.
- بنية الاستجابات والمعطيات مطابقة لـ Ziraat → التبديل يكون داخل الـ edge function فقط.
- بيانات البطاقة الحقيقية لا تُخزَّن أبدًا (PAN كامل لا يصل قاعدة البيانات).
