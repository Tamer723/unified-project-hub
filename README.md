# أضحيتك أجران — حملة وقف القدس

موقع التبرع متعدد اللغات (عربي، تركي، إنجليزي) لمشروع توكيل الأضحية، تطوير **4C Studio**.

## المكدّس التقني

- React 18 + Vite 5 + TypeScript 5
- Tailwind CSS v3 + shadcn/ui
- i18next (AR / TR / EN)
- باك-إند مُدار: قاعدة بيانات Postgres + Edge Functions + Auth
- بوابات الدفع: iyzico (Checkout & 3DS)، NestPay/Ziraat، وضع وهمي للاختبار

## التشغيل محليًا

```bash
bun install
bun run dev
```

## النشر

الإنتاج: `https://campaign.4c.studio`

## استبدال الصور والوسائط

الصور المؤقتة موجودة حاليًا في:
- `src/components/site/Hero.tsx`
- `src/components/site/TrustSection.tsx`
- `src/components/site/WhySection.tsx`
- جدول `products.image_url` (وحقول اللغات الإضافية `image_url_ar/en/tr`)

ثلاث استراتيجيات:

1. **صورة موحّدة لكل اللغات** (المشاهد الميدانية، الطبيعة، الحيوانات): استورد الصورة من `src/assets/`:
   ```ts
   import hero from "@/assets/hero.jpg";
   <img src={hero} alt="..." />
   ```

2. **صورة لكل لغة** (بوسترات وإنفوجرافيك تحوي نصًا داخليًا):
   ```ts
   import { localizedAsset } from "@/lib/utils";
   const src = localizedAsset({ ar: "/img/poster-ar.jpg", en: "/img/poster-en.jpg", tr: "/img/poster-tr.jpg" });
   ```
   أو من قاعدة البيانات عبر صفحة الإدارة `/admin/products` (حقول صورة AR/EN/TR).

3. **فيديو موحّد + ترجمات `.vtt` متعددة اللغات**:
   ```html
   <video controls>
     <source src="/media/clip.mp4" type="video/mp4" />
     <track kind="subtitles" srclang="ar" src="/media/clip.ar.vtt" default />
     <track kind="subtitles" srclang="tr" src="/media/clip.tr.vtt" />
     <track kind="subtitles" srclang="en" src="/media/clip.en.vtt" />
   </video>
   ```

## مميزات لوحة التحكم

- إدارة المنتجات والمسارات والأسعار (USD/TRY) والوزن لكل دولة.
- تتبّع الطلبات مع IP المتبرع وعلم الدولة الجغرافية.
- تصدير CSV.
- إدارة بوابات الدفع.
- إشعارات Telegram للحالات (paid / failed / cancelled).
