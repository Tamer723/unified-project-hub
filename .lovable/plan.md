## الهدف
في صفحة `Admin/Payments`، عند اختيار `nestpay_3d` أو `nestpay_hosting`، نعرض حالة الأسرار (`NESTPAY_CLIENT_ID` و`NESTPAY_STORE_KEY`) ونمنع الحفظ إذا كانت ناقصة.

## التغييرات

### 1) Edge Function جديدة: `supabase/functions/payment-config-check/index.ts`
- بدون JWT (verify_jwt = false) — تُستدعى من شاشة الإدارة فقط، لكن لا تكشف القيم.
- ترجع فقط:
  ```json
  { "nestpay_client_id": true/false, "nestpay_store_key": true/false }
  ```
- تقرأ `Deno.env.get(...)` وترجع boolean (موجود/غير موجود) — لا تُرجع القيم.
- إضافة بلوك في `supabase/config.toml` لها مع `verify_jwt = false` (سنحمي بمستوى الواجهة عبر RequireAdmin، والتسريب صفري لأنها booleans فقط).

### 2) تحديث `src/pages/admin/Payments.tsx`
- عند التحميل: استدعاء `supabase.functions.invoke("payment-config-check")` وتخزين الحالة.
- بجانب كل خيار NestPay يظهر شارة:
  - 🟢 "الأسرار مهيّأة" إذا كلاهما موجود.
  - 🔴 "أسرار ناقصة: NESTPAY_CLIENT_ID / NESTPAY_STORE_KEY" مع قائمة الناقص.
- زر **حفظ التغييرات** يُعطَّل (`disabled`) إذا:
  - البوابة المختارة nestpay_* و الأسرار ناقصة.
- رسالة Alert واضحة فوق الزر تشرح لماذا الحفظ معطّل، مع رابط/إرشاد لإضافة الأسرار من إعدادات Lovable Cloud.
- زر "إعادة فحص" بجانب الشارة لإعادة الاستعلام دون إعادة تحميل الصفحة.

### 3) لا تغييرات على قاعدة البيانات
الفحص يتم عبر env فقط. لا حاجة لجداول/RLS جديدة.

## ملاحظات تقنية
- الدالة الجديدة آمنة: لا تُعيد قيم الأسرار، فقط وجودها.
- بوابة `mock` تبقى دائماً قابلة للحفظ.
- لا تغيير على `payment-init` أو `payment-callback`.
