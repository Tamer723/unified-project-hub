## التعديل في `src/components/site/CheckoutSection.tsx`

تغيير حساب `phoneExample` (placeholder حقل الهاتف) ليستخدم `nationalNumber` من المثال (بدون الصفر الأول) ثم تنسيقه عبر `AsYouType`، بدلاً من `formatNational()` الذي يضيف الصفر.

النتيجة: النص الافتراضي في حقل الهاتف يظهر بدون الصفر الأول (مثلاً `512 345 6789` بدلاً من `0512 345 6789`).