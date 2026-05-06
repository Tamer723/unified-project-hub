# خطة مزدوجة: تعطيل المسارات وعرض المسار في لوحة الطلبات

## 1) تعطيل المسار في الواجهة الأمامية عند `active=false`

**الوضع الحالي:** `usePricing` يصفّي `active=true` فقط، فالمنتج المعطّل يختفي من الجلب الأمامي ويصبح سعره من الـfallback، فيُرسل للدفع ويُرفض من الـedge function (هذا سبب خطأ "Unknown track: track1").

**التغيير:**
- `src/hooks/usePricing.ts`:
  - جلب كل المنتجات (إزالة `.eq("active", true)`) وإضافة `active` لـ`ProductRow`.
  - دالة جديدة `isTrackActive(trackCode, data)` ترجع `false` إذا المنتج موجود ومعطّل.
- `src/components/site/Tracks.tsx`: حساب `disabled = !isTrackActive(id, data)` وتمريره إلى `TrackCard`.
- `src/components/site/TrackCard.tsx`:
  - استقبال prop جديد `disabled?: boolean`.
  - إذا `disabled`: تطبيق `opacity-60 grayscale pointer-events-none` على البطاقة، إظهار شارة "غير متاح حالياً" مكان شارة "الأكثر طلباً"، وتعطيل زر الاختيار (`disabled` + نص بديل).
- `src/i18n/locales/{ar,en,tr}.json`: إضافة مفتاح `tracks.unavailable` ("غير متاح حالياً" / "Currently unavailable" / "Şu anda mevcut değil").

## 2) عرض المسار في لوحة الطلبات

**الوضع الحالي:** البيانات محفوظة بالكامل في `orders` (`product_id`, `matrix_id`, `unit_price`, `currency` — مجمّدة بـtrigger `protect_order_fields`)، لكن لوحة `/admin/orders` لا تعرض اسم المسار، فقط معرّفه ضمناً.

**التغيير:**
- `src/hooks/useAdminStats.ts`:
  - تعديل `useOrders` لاستعمال join: `select("*, products(code, title_ar, title_en), product_price_matrix(country_code, animal_code)")`.
  - توسيع نوع `Order` لإضافة `products` و`product_price_matrix` المرتبطين.
- `src/pages/admin/Orders.tsx`:
  - إضافة عمود "المسار" بين "المتبرع" و"الكمية" يعرض `products.title_ar` (مع شارة صغيرة لـ`code`، وللـtrack3 يضيف `country/animal`).
  - في لوحة التفاصيل (Sheet): إضافة صفوف "المسار" و"الدولة" و"الحيوان" (الأخيران للـtrack3 فقط).
  - تحديث `exportCsv` ليشمل عمود `track_code` و`track_title`.

## ملاحظات تقنية

- **بدون تغيير schema:** البيانات كلها موجودة، فقط نضيف joins وعرض. لا migration.
- **سياسات RLS:** `products` يقرأها المسؤولون عبر سياسة `Admins can manage products`، لكن السياسة العامة `Public can view active products` تقيّد المنتجات غير الفعّالة. سيتطلب الـjoin من لوحة الإدارة قراءة المنتجات بصرف النظر عن `active`؛ سياسة المسؤولين موجودة فعلاً (`ALL`) فستعمل دون تعديل.
- **حماية البيانات التاريخية:** الـtrigger `protect_order_fields` يضمن أن `unit_price/total_amount/currency/quantity/product_id` لا تتغير بعد الإنشاء، فالطلبات القديمة ستحتفظ بالسعر الأصلي حتى لو عُدّل المنتج لاحقاً ✅.
