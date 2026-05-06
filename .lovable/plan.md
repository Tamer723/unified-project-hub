
# الخطة الكاملة — أضحيتك أجران (نسخة نهائية للمراجعة)

## 1) قاعدة البيانات (الجداول موجودة فعلاً)

الجداول `products` و`product_price_matrix` و`orders` جاهزة. سأقوم فقط بـ **تعبئة بيانات** (insert) — لا تغييرات schema.

**products** (3 صفوف):
| code | base_price (USD cents) | pricing_type | display_order |
|---|---|---|---|
| track1 — انحر سنة وأطعم غزة | 10000 | fixed | 1 |
| track2 — أضحيتك تعبر الحصار | 17500 | fixed | 2 |
| track3 — الأضاحي الحية | 11500 | matrix | 3 |

> ملاحظة: جدول `products` لا يحتوي عمود `code/title`. سأضيفهما عبر migration صغيرة (`code text unique`, `title_ar/en/tr text`) لربط منطقي مع الواجهة. (**هذا تغيير schema بسيط ومبرر**.)

**product_price_matrix** (14 صف لـ track3): 7 دول × {sheep, cow_share}

| country | sheep $ | cow_share $ |
|---|---|---|
| JM (القدس) | 285 | 285 |
| WB (الضفة) | 250 | 250 |
| LB (لبنان) | 230 | 200 |
| SY (سوريا) | 165 | 145 |
| SD (السودان) | 115 | 115 |
| YE (اليمن) | 175 | 155 |
| BD (بنغلاديش) | 195 | 175 |

(الأسعار الدقيقة من الأصل؛ سأُجاوبها على القيم النهائية أثناء التنفيذ مع التزام بالمدى 115–850).

## 2) جلب الأسعار في الواجهة

- Hook `usePricing()` يستعلم `products` + `product_price_matrix` مرة عند تحميل الصفحة (React Query، staleTime 5 دقائق).
- `lib/pricing.ts` يصبح **fallback ثابت** (نفس القيم) إن فشل الاستعلام.
- `formatPrice(amountUsd, locale)` يبقى كما هو (USD للعربية/الإنجليزية، TRY للتركية بسعر صرف ثابت 45).

## 3) تجانس بطاقات المسارات (الحل المعتمد)

كل بطاقة = `grid grid-rows-[auto_auto_auto_1fr_auto] h-full`:

```text
┌─────────────────────────┐
│ Placeholder 16:9 (ثابت) │  row 1
│ العنوان + شارة          │  row 2
│ منطقة Selector h-[120px]│  row 3 ← فارغة في 1/2، فيها Country+Animal في 3
│ المزايا (flex-1)        │  row 4 ← يمتد لملء الفراغ
│ السعر + زر (sticky bot) │  row 5 ← border-t + bg-cream-dark/50
└─────────────────────────┘
```

- **المسار 3**: داخل row 3 → `<Select>` للدولة (7 خيارات) + `<RadioGroup>` لـ {خروف/بقرة سبع}. السعر في row 5 يتحدث live.
- **المسارَين 1 و2**: row 3 يحوي `<div class="h-[120px]" />` فارغ ليبقى الارتفاع متطابقاً.
- شارة "الأكثر طلباً" تستخدم `position: absolute; top:-12px` فلا تؤثر.

عند الضغط "اختر هذا المسار":
- 1 و2 → يفتح `OrderForm` بـ trackId والسعر الثابت.
- 3 → يفتح `OrderForm` ويتخطى خطوة الاختيار (يمرّر country+animal+price المحدّدة).

## 4) إعادة بناء الواجهة لتطابق المرجع

### Header (3 طبقات)
1. **LanguageBar** بنّي داكن: شعار + اسم + 3 pills للغة (يمين).
2. **CountdownBar** أخضر: "متبقي على عيد الأضحى" + `DD:HH:MM:SS`.
3. **Sticky Header** أبيض/blur: روابط (المسارات/لماذا/الثقة/الأسئلة) + زر CTA دائري أخضر.

### Hero (شبكة عمودين md+)
- **يسار**: شارة → عنوان ضخم 6xl → فقرة بإطار ذهبي logical → زرّان → شريط 3 إحصائيات.
- **يمين**: visual stack — `PlaceholderImage 4:5` كبير + بطاقة عائمة "خروف من السودان $115" أسفل-يسار + بطاقة عائمة "✓ شهادة ذبح" أعلى-يمين.

### قسم جديد: Why Two Rewards (لماذا أجران)
3 بطاقات بأيقونات + آية قرآنية لكل واحدة:
- أجر الأضحية — `{فَصَلِّ لِرَبِّكَ وَانْحَرْ}`
- أجر الإطعام — `{وَيُطْعِمُونَ الطَّعَامَ عَلَىٰ حُبِّهِ...}`
- أجر إغاثة المنكوبين — `{وَتَعَاوَنُوا عَلَى الْبِرِّ وَالتَّقْوَىٰ}`

### Tracks (كما في القسم 3 أعلاه)

### TrustSection
شريط 4 شارات صغيرة + 3 بطاقات (Camera/ShieldCheck/FileCheck) كما في الأصل.

### FAQ — توسيع لـ 6 أسئلة (من المرجع)

### Footer 3 أعمدة (عن الوقف / روابط سريعة / تواصل) + شريط حقوق سفلي.

### عناصر عائمة
- `StickyCta.tsx`: شريط سفلي يظهر بعد scroll > 600px على الموبايل، يحوي "تبرّع الآن" → `#tracks`.
- `WhatsAppFloat.tsx`: زر دائري ثابت bottom-end، رابط `https://wa.me/...` (رقم placeholder قابل للتعديل في `constants.ts`).

## 5) الطباعة والألوان

- خط عربي: **Tajawal** أوزان 400/700/900 (بدلاً من Noto Naskh) لمطابقة الطابع الهندسي.
- إضافة في `tailwind.config.ts`:
  - `borderRadius: { '3xl': '2rem', '4xl': '3rem' }`
  - `boxShadow.float: '0 24px 80px hsl(30 40% 21% / 0.18)'`
- في `index.css`: نمط SVG هندسي خفيف (نقاط/مثلثات `opacity-5`) كخلفية لـ Hero و Why.

## 6) i18n — مفاتيح جديدة

- `header.lang_bar.*`, `why.cards.[0..2].{verse,title,text}`, `trust.badges.*` (4 شارات), `faq.items.[0..5]`, `footer.{about,links,contact}.*`, `track3.countries.{JM,WB,LB,SY,SD,YE,BD}`, `track3.animals.{sheep,cow_share}`, `sticky_cta.label`, `whatsapp.aria`.

## 7) Edge Function `create-payment` (موجود)

سأضيف تحقّقاً server-side: عند `pricing_type='matrix'` يجلب السعر الفعلي من `product_price_matrix` بـ `(product_id, country_code, animal_code)` ولا يعتمد على ما يُرسله العميل. هذا يمنع التلاعب بالسعر.

## 8) ما لن يتغيّر

- ZiraatPay: لا اتصال فعلي الآن، الزر mock → `/success`.
- ملفات Supabase التلقائية (`client.ts`, `types.ts`) لا تُعدَّل يدوياً.

---

## الملفات المتأثرة (ملخص)

**جديد**: `WhySection.tsx`, `LanguageBar.tsx`, `StickyCta.tsx`, `WhatsAppFloat.tsx`, `TrackCard.tsx`, `hooks/usePricing.ts`.

**تعديل**: `Header.tsx` (3 طبقات), `Hero.tsx` (grid 2-col + visual stack), `Tracks.tsx` (يستخدم TrackCard + DB), `Faq.tsx` (6 أسئلة), `Footer.tsx` (3 أعمدة), `OrderForm.tsx` (يقبل preselection للمسار 3), `lib/pricing.ts` (fallback فقط), `index.css` + `tailwind.config.ts` (Tajawal + radii + shadows + pattern), ملفات `i18n/locales/*.json`.

**Migration صغيرة**: إضافة `code/title_ar/title_en/title_tr` لجدول `products` + insert البيانات + insert مصفوفة الأسعار.

**Edge Function**: تحديث `create-payment/index.ts` لاحتساب السعر من DB.

---

هل تعتمد كل ما سبق لأبدأ التنفيذ؟ أو هل تريد تعديل نقطة معيّنة (الدول/الأسعار/الخط/الأقسام)؟
