# خطة المرحلة الأولى: قاعدة البيانات والخلفية لمنصة التبرعات

سيتم إعداد كامل البنية الخلفية على Lovable Cloud (Supabase) دون أي واجهة أمامية. عند الموافقة، سيُفعَّل Lovable Cloud تلقائياً.

---

## 1. مخطط قاعدة البيانات (Migrations)

سيُنشأ migration واحد يحتوي:

### نوع مخصص
- `user_role` enum بقيمة `'admin'`

### جدول `campaigns`
الحملات متعددة اللغات (عربي/تركي/إنجليزي)، مع هدف ومبلغ مُجمَّع وعلم تفعيل.

### جدول `donations`
سجل التبرعات (للضيوف والمسجّلين)، يربط بحملة، ويحمل حالة الدفع ومرجع المزوّد ورابط الدفع وتاريخ انتهاء الصلاحية و metadata.

### جدول `user_roles`
يفصل الأدوار عن جدول المستخدمين (منعاً لتصعيد الصلاحيات)، مع قيد `unique(user_id, role)`.

### دالة `has_role(role_name)`
دالة `SECURITY DEFINER` بـ `search_path = public` للتحقق من صلاحية المستخدم الحالي دون التسبب بحلقات RLS.

> ملاحظة أمان: ستُستخدم بالشكل الموصى به `has_role(auth.uid(), role)` داخلياً، مع الإبقاء على التوقيع المطلوب `has_role(role_name)` كما طلبت.

---

## 2. سياسات RLS

### `campaigns`
- RLS مُفعَّل
- SELECT عام عندما `active = true`
- INSERT / UPDATE / DELETE للمسؤولين فقط

### `donations`
- RLS مُفعَّل
- INSERT مسموح للجميع (تبرع كضيف) — مع تحقق على مستوى Edge Function
- SELECT / UPDATE / DELETE للمسؤولين فقط
- تحديث `raised_amount` و status يتم عبر Edge Function بصلاحيات `service_role` (يتجاوز RLS بأمان)

### `user_roles`
- RLS مُفعَّل
- SELECT للمستخدم على صفوفه فقط
- جميع التعديلات للمسؤولين فقط

---

## 3. بيانات تجريبية

3 حملات نشطة بثلاث لغات (مثلاً: مساعدات شتوية، إفطار صائم، كفالة يتيم) بأهداف ومبالغ وهمية وصور placeholder.

---

## 4. Edge Functions

### أ. `create-payment` (عام، بدون JWT)
- التحقق من المدخلات بـ Zod: `campaign_id (uuid)`, `donor_name (1..100)`, `donor_email (email)`, `donor_phone (اختياري)`, `amount (int > 0)`, `currency (USD|TRY|EUR)`
- التحقق من وجود الحملة وأنها `active = true`
- إدراج صف في `donations` بحالة `pending`
- حالياً: توليد `payment_url` وهمي:
  `https://mock-payment.test/pay?ref={donation_id}`
- تعيين `expires_at = now() + 30 minutes`
- إرجاع `{ donation_id, payment_url, expires_at }`
- CORS كامل + `console.log` للتتبع

### ب. `payment-callback` (عام، بدون JWT)
- مدخلات Zod: `donation_id`, `status (success|failed)`, `provider_ref`, `signature`
- التحقق من التوقيع: حالياً Mock يقبل أي قيمة غير فارغة (مع TODO واضح لـ HMAC ZiraatPay لاحقاً)
- تحديث `donations.status` و `provider_ref` و `metadata` (الـ payload الكامل)
- عند `success`: زيادة `campaigns.raised_amount` ذرّياً (RPC أو UPDATE شرطي يمنع الزيادة المزدوجة إن وصل callback مرتين)
- إرجاع `{ success: true, donation_id, status }`

كلا الدالتين تستخدمان `service_role` للوصول الموثوق، وتتضمنان `corsHeaders` في كل الردود (بما فيها الأخطاء).

---

## 5. الأسرار (Secrets)

ستُطلب إضافتها (قيم Mock مؤقتة):
- `ZIRAATPAY_MERCHANT_ID` = `MOCK_MERCHANT`
- `ZIRAATPAY_TERMINAL_ID` = `MOCK_TERMINAL`
- `ZIRAATPAY_HASH_KEY` = `MOCK_HASH_KEY`

---

## 6. اعتبارات

- جميع المبالغ بالـ integer (قروش/سنت)
- لا واجهة أمامية في هذه المرحلة
- بعد التطبيق سيُجرى Security Scan تلقائي للتأكد من سلامة RLS
- ملف `App.tsx`/`Index.tsx` يبقى كما هو (سيُستخدم لاحقاً في المرحلة الثانية)

---

## مخرجات هذه المرحلة
1. Migration كامل (جداول + enum + دالة + RLS + seed)
2. دالتان Edge: `create-payment`, `payment-callback`
3. 3 أسرار مُسجَّلة في Cloud
4. تقرير فحص أمان
