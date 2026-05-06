## المشاكل
1. **اللغة:** صفحة النجاح ظهرت بالعربية بدل التركية لأن `payment-callback` يُحوّل إلى `PUBLIC_SITE_URL` بدون تمرير اللغة، و`localStorage.i18nextLng` لا ينتقل بين منشأين مختلفين.
2. **بوابة وهمية غير مقصودة:** آخر طلب تبرع سُجِّل بـ `provider=mock_ziraat` رغم اختيار iyzico في لوحة التحكم — السبب الدالة القديمة `ziraat-payment-init` لا تزال منشورة وتُستدعى من نسخة منشورة قديمة.

## الحل (الخيار 2: نُبقي إمكانية الاختبار بـ mock OTP)

### A. حلّ مشكلة اللغة
1. **`CheckoutSection.tsx`**: إرسال `lang` (من `i18n.language`) ضمن body إلى `payment-init`.
2. **`payment-init/index.ts`**:
   - قبول `lang` اختياري (`ar|tr|en`).
   - حفظه في `orders.metadata.lang`.
   - تمريره داخل `callbackUrl` كـ `?lang=tr` وضبط `locale` في طلب iyzico بناءً عليه.
3. **`payment-callback/index.ts`**:
   - قراءة `lang` من query string، أو `orders.metadata.lang` كـ fallback.
   - تضمينه في URL إعادة التوجيه: `${origin}/success?order=…&lang=tr`.
4. **`Success.tsx` و `Failed.tsx`**: قراءة `lang` من URL واستدعاء `i18n.changeLanguage(lang)` فور التحميل.

### B. تنظيف البوابة الوهمية مع إبقائها للاختبار
1. **بناء دالة جديدة `payment-mock-verify`** تتحقق من OTP (`123456` نجاح، أي شيء آخر فشل) وتُحدّث الطلب بنفس منطق `ziraat-payment-verify` السابق.
2. **`Payment3DSMock.tsx`**: استبدال `supabase.functions.invoke("ziraat-payment-verify", …)` بـ `payment-mock-verify`.
3. **حذف الدالتين القديمتين** من Supabase: `ziraat-payment-init` و `ziraat-payment-verify` + حذف ملفاتهما + حذف كتلتيهما من `supabase/config.toml`.
4. **حماية إضافية في `payment-init`**: المسار الذي يُنشئ تدفّق mock يبقى يعمل عبر `active_provider='mock'` فقط (هذا منفّذ مسبقاً)، فلا يمكن استدعاؤه إذا كانت إعدادات لوحة التحكم على iyzico.

### C. تحسين بسيط
- في `payment-init` نحفظ `metadata.origin = req.headers.get('origin')`، وفي `payment-callback` نُعيد التوجيه إليه (مع قائمة بيضاء بالمنشآت المسموح بها) ليبقى المستخدم على نفس الدومين الذي بدأ منه.

## الأمان
- `lang` يُتحقّق من كونه ضمن `["ar","tr","en"]`.
- `payment-mock-verify` تعمل فقط للطلبات بحالة `awaiting_3ds` و `provider='mock'`.
- حذف الدالتين القديمتين يُغلق باب تسجيل تبرعات وهمية من نسخ منشورة قديمة.

## الملفات المتأثّرة
- `src/components/site/CheckoutSection.tsx` (إرسال lang)
- `src/pages/Success.tsx`, `src/pages/Failed.tsx` (قراءة lang)
- `src/pages/Payment3DSMock.tsx` (استدعاء الدالة الجديدة)
- `supabase/functions/payment-init/index.ts` (قبول/تمرير lang + حفظ origin)
- `supabase/functions/payment-callback/index.ts` (قراءة lang + إعادة لنفس origin)
- إنشاء: `supabase/functions/payment-mock-verify/index.ts`
- حذف: `supabase/functions/ziraat-payment-init/`, `supabase/functions/ziraat-payment-verify/`
- `supabase/config.toml` (حذف كتلتي ziraat)
