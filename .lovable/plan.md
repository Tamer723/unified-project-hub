## المشكلة
iyzico Checkout Form يُحوّل المستخدم إلى الـ callback مع `token` فقط بدون `conversationId`، فيُرفض الطلب برسالة `missing oid` ولا تكتمل خطوة التحقق رغم نجاح الدفع في Sandbox.

## الحل
تعديل `supabase/functions/payment-callback/index.ts`:

1. تخفيف شرط كشف iyzico ليكفي وجود `token` أو `paymentId` (دون اشتراط `conversationId`).
2. عند غياب `conversationId`، البحث عن الطلب في جدول `orders` عبر `provider_ref` (الذي يُحفظ بقيمة الـ token عند `payment-init`).
3. إبقاء بقية المنطق كما هو: استدعاء `/payment/iyzipos/checkoutform/auth/ecom/detail/` بتوقيع HMAC، تحديث الطلب فقط إذا كان بحالة `pending`/`awaiting_3ds`.

## الأمان
- التحقق الفعلي عبر استدعاء iyzico بتوقيع المفتاح السرّي — token مزوّر سيفشل.
- `provider_ref` يُكتب من السيرفر فقط، غير قابل للتلاعب من العميل.
- التحديث idempotent.

## ملف واحد فقط للتعديل
`supabase/functions/payment-callback/index.ts` (سطور 69-83 تقريباً).
