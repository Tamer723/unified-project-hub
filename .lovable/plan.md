## رفع شعار الموقع

استبدال الأيقونة المؤقتة "ق" بالشعار الذي رفعه المستخدم في:

1. **Favicon** (تبويب المتصفح): نسخ الصورة إلى `public/favicon.png` وتحديث `index.html` لإضافة `<link rel="icon" href="/favicon.png" type="image/png">`. حذف `public/favicon.ico` القديمة.

2. **شعار الـ Header**: نسخ الصورة إلى `src/assets/logo.png`، استيرادها في `src/components/site/Header.tsx` بـ `import logo from "@/assets/logo.png"`، واستبدال الـ `<div>` الحالي الذي يعرض الحرف "ق" بـ `<img src={logo} alt={t("header.name")} className="h-10 w-10 object-contain" />`.

## ملاحظة
سأبقي على نفس الأبعاد (10×10) لتجنّب كسر التنسيق. صورة OG/Twitter (`/og-image.jpg`) لم تُلمس — يفضّل أن ترفع لاحقاً صورة بانر أفقية مخصصة لها (1200×630).
