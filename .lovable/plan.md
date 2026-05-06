## ١) تسجيل IP وعلم دولة المتبرع

**قاعدة البيانات (هجرة):**
- إضافة عمودين على `orders`: `donor_ip text`, `donor_country text` (رمز ISO).
- تحديث سياسة RLS الخاصة بـ INSERT للسماح بالحقلين الاختياريين (مع إبقائهما NULL من العميل).

**Edge Function (`create-payment` و`payment-init`):**
- استخراج `IP` من `x-forwarded-for` (أول قيمة).
- استخراج رمز الدولة من `cf-ipcountry` إن وُجد، وإلا fallback لـ `https://ipapi.co/{ip}/country/` بمهلة 1.5s ضمن try/catch.
- تمرير `donor_ip` و`donor_country` ضمن `insert` للطلب.

**الواجهة (`src/pages/admin/Orders.tsx`):**
- عمود جديد "المصدر" يعرض: علم الدولة (Emoji محسوب من الرمز) + رمز الدولة + IP (mono صغير).
- إضافة الحقلين في `Sheet` التفاصيل وفي تصدير CSV.
- فلتر "دولة المتبرع" في الشريط.
- تحديث نوع `Order` في `src/hooks/useAdminStats.ts`.

**ملاحظة قانونية:** سأضيف نصًا مترجمًا في نموذج التبرع يوضح أن IP يُسجَّل لأغراض الأمان.

---

## ٢) دعم الصور الحقيقية متعددة اللغات (تحضير البنية فقط)

لن أبدّل الصور الآن — سترفعها لاحقًا. سأضيف البنية:
- helper `localizedAsset(name)` في `src/lib/utils.ts` يُرجع المسار حسب `i18n.language` (مثل `hero-ar.jpg`).
- أعمدة `image_url_ar`, `image_url_tr`, `image_url_en` على جدول `products` (مع fallback إلى `image_url`).
- تحديث `src/pages/admin/Products.tsx` لتعديل الصور لكل لغة.
- قسم في `README.md` يشرح كيفية استبدال الصور (ثلاث استراتيجيات: صورة موحّدة، صورة لكل لغة، فيديو + ترجمات `.vtt`).

---

## ٣) إزالة آثار Lovable

**إزالة آمنة بدون أثر على الإنتاج:**

| الموقع | التغيير |
|---|---|
| `package.json` | إزالة `lovable-tagger` |
| `vite.config.ts` | إزالة `componentTagger` |
| `README.md` | إعادة كتابته بمحتوى المشروع (حملة الأضحية / 4C Studio) |
| `index.html` | تبديل `og:image` و`twitter:image` بـ placeholder محلي `/og-image.jpg` (ستستبدله لاحقًا بصورتك) |
| `payment-callback/index.ts` | حذف دومينات `*.lovable.app` من `ALLOWED_ORIGINS` |
| `payment-init/index.ts` | نفس التعديل |
| `src/pages/admin/Payments.tsx` | تغيير "Lovable Cloud" إلى "لوحة الباك-إند" |

**يحتاج بديلاً قبل الإزالة:**

- `notify-telegram/index.ts` يستخدم `connector-gateway.lovable.dev` + `LOVABLE_API_KEY`. سأعيد كتابته ليستدعي `https://api.telegram.org/bot{TOKEN}/sendMessage` مباشرة. **أحتاج منك Bot Token من @BotFather** — سأطلبه عبر `add_secret` (`TELEGRAM_BOT_TOKEN`) قبل تعديل الدالة.

**تحذيرات:**
- حذف `componentTagger` يُعطّل ميزة "Edit with Lovable" داخل المعاينة الحية لـ Lovable. الإنتاج على `campaign.4c.studio` لن يتأثر.
- شعار "Edit with Lovable" على الموقع المنشور يُخفى من إعدادات النشر (يتطلب Pro). أخبرني إن أردت تفعيله.
- الدومين `*.lovable.app` لا يمكن حذفه من المنصة، لكن بعد ربط `campaign.4c.studio` يمكن تجاهله.

---

## خطة التنفيذ بالترتيب

1. هجرة DB: `donor_ip`, `donor_country` على `orders` + `image_url_{ar,tr,en}` على `products`.
2. تعديل `create-payment` + `payment-init` لالتقاط IP/country.
3. تحديث `useAdminStats.ts` + `Orders.tsx` (عمود + فلتر + sheet + CSV).
4. helper `localizedAsset()` + تحديث `Products.tsx` admin لإدارة الصور لكل لغة.
5. تنظيف Lovable: `package.json`, `vite.config.ts`, `README.md`, `index.html`, الدومينات في الـ functions، نص Payments.tsx.
6. طلب `TELEGRAM_BOT_TOKEN` ثم إعادة كتابة `notify-telegram` للاتصال المباشر بـ Telegram API.
7. (اختياري) إخفاء شعار Lovable من النشر — أخبرني.
