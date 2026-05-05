# خطة بناء الصفحة الرئيسية — أضحيتك أجران (نسخة معدّلة)

## 1. نظام التصميم (sweet-adjustments)

تحديث `src/index.css` و`tailwind.config.ts` بألوان HSL:

| التوكن | HSL | الأصل |
|--------|-----|-------|
| `--background` (cream) | `40 50% 93%` | #f5efe4 |
| `--cream-dark` | `38 38% 88%` | #ede5d4 |
| `--sand` | `36 47% 61%` | #c9a96e |
| `--brown` (foreground) | `30 40% 21%` | #4a3520 |
| `--brown-mid` | `30 43% 29%` | #6b4c2a |
| `--primary` (green) | `150 38% 26%` | #2a5c45 |
| `--green-mid` | `150 36% 33%` | #357558 |
| `--green-pale` | `144 27% 93%` | #e8f2ec |
| `--muted-foreground` | `33 25% 38%` | #7a6248 |
| `--radius` | `1rem` | حواف ناعمة |

- خطوط: `Noto Naskh Arabic` + `Inter` من Google Fonts.
- Tailwind: ألوان مخصّصة (`cream`, `sand`, `brown`, `green`, `green-pale`)، `boxShadow.soft / elevated`، `borderRadius.xl/2xl`.
- إلغاء وضع dark (نبقي الفاتح فقط).

## 2. هيكل الملفات

```text
src/
  i18n/
    config.ts
    locales/{ar,tr,en}.json
  hooks/useDirection.ts          ← يضبط <html lang/dir>
  lib/
    constants.ts                 ← EID_DATE = 2026-05-27, USD_TO_TRY = 45
    pricing.ts                   ← matrix الدول/الحيوانات + formatPrice
  components/site/
    Header.tsx
    CountdownBar.tsx
    LanguageSwitcher.tsx
    Hero.tsx
    Tracks.tsx
    TrackCard.tsx
    OrderForm.tsx                ← Dialog من 3 خطوات
    PlaceholderImage.tsx         ← بديل صور Unsplash
    TrustSection.tsx
    Faq.tsx
    Footer.tsx
  pages/
    Index.tsx
    Success.tsx                  ← /success
    Failed.tsx                   ← /failed
main.tsx                          ← يستورد ./i18n/config
App.tsx                           ← يضيف routes /success و /failed
```

## 3. العملة (مُحدّث)

`lib/pricing.ts`:
```text
USD_TO_TRY = 45  (ثابت)

formatPrice(amountUsdCents, locale):
  if locale === 'tr':  return `${(amountUsd * 45).toLocaleString('tr-TR')} ₺`
  else:                return `$${amountUsd}`
```
- الأسعار في الكود تُخزَّن بالـ USD سنتات.
- `ar` و `en` → عرض `$` فقط، بدون أي إشارة لليرة.
- `tr` → عرض `₺` فقط، بدون أي إشارة للدولار.
- عند إرسال الطلب لـ ZiraatPay لاحقاً: تُمرَّر `currency: "TRY"` للمستخدم التركي و`currency: "USD"` لغيره.

## 4. الصور — Placeholders (مُحدّث)

`PlaceholderImage.tsx`:
- `<div>` بنسبة 4:3 أو 16:9، تدرّج `from-cream-dark to-green/15`، حدّ ذهبي خفيف، أيقونة مركزية من lucide (`Heart`, `Beef`, `Package` …) بلون green.
- لا أي روابط Unsplash. يُستخدم في Hero + بطاقات Tracks + Trust.

## 5. الصفحات

### `/` (Index)
أقسام بالترتيب: Header → Hero → Tracks → OrderForm Dialog → Trust → FAQ → Footer.

**Header**: شريط بنّي علوي يحوي شعار "ق" دائري أخضر + اسم الوقف + `LanguageSwitcher` (3 pills). تحته `CountdownBar` بتدرّج أخضر يعرض `DD : HH : MM : SS` لـ EID_DATE = 2026-05-27، يحدّث كل ثانية. زر CTA يقفز لـ `#tracks`.

**Hero**: خلفية cream مع دوائر radial-gradient، شارة "موسم الأضحية 1447هـ"، عنوان كبير "أضحيتك أجران"، فقرة في صندوق بحدّ ذهبي logical (`border-s-4 border-sand`)، زرّان (primary أخضر + outline)، 3 بطاقات إحصائيات (5000+ / 6 / 5+).

**Tracks**: شبكة 3 أعمدة (1 على الموبايل):
- المسار 1 — انحر سنّة وأطعم غزة، $100 ثابت، شارة "الأكثر طلباً ⭐".
- المسار 2 — أضحيتك تعبر الحصار، $175 ثابت.
- المسار 3 — الأضاحي الحيّة، يبدأ من $115. عند اختياره يفتح OrderForm مع قوائم منسدلة (دولة 6 خيارات + حيوان: خروف/ماعز $115 أو بقرة سبع $250) والسعر يُحدَّث live.

**OrderForm** (Dialog، 3 خطوات بمؤشّر progress):
1. **الاختيار**: اسم المسار، (للمسار 3) قائمتا الدولة والحيوان، عدد الأضاحي (≥1)، الإجمالي live بالعملة الحالية.
2. **بياناتك**: الاسم* + البريد* + الهاتف + النية/الأسماء + checkbox توكيل شرعي* (zod + react-hook-form).
3. **الدفع**: ملخص + زر "المتابعة للدفع" (mock → `toast` + `navigate("/success")` للتجربة)، شارات VISA/MC SVG inline + 🔒.

**Trust**: 3 بطاقات (`Camera`, `ShieldCheck`, `FileCheck`).
**FAQ**: Accordion من Radix بـ 5 أسئلة من i18n.
**Footer**: شعار + روابط social (lucide) + سطر حقوق النشر بالسنة الجارية.

### `/success` (مُضاف)
صفحة بسيطة بخلفية cream وبطاقة وسط الشاشة:
- أيقونة `CheckCircle2` خضراء كبيرة.
- عنوان "تمّ استلام أضحيتك بفضل الله" + نص توضيحي + أيقونة قلب.
- زرّان: "العودة للرئيسية" → `/` و "وكّل أضحية أخرى" → `/#tracks`.
- يحترم اللغة والاتجاه الحاليَّين عبر i18n.

### `/failed` (مُضاف)
نفس البنية بأيقونة `XCircle` بلون destructive مع نص "تعذّر إتمام الدفع" + سبب اختياري من query (`?reason=...`) + زر "إعادة المحاولة" يعود إلى `/#tracks`.

## 6. i18n

- `react-i18next` + `i18next` + `i18next-browser-languagedetector`.
- 3 ملفات JSON بنفس البنية. مفاتيح رئيسية: `header.*`, `hero.*`, `tracks.*`, `track1/2/3.*`, `form.*`, `trust.*`, `faq.*`, `footer.*`, `success.*`, `failed.*`, `price.format`.
- `useDirection`: عند تغيير اللغة يُحدِّث `document.documentElement.lang/dir` (`ar`→rtl، باقيها ltr).

## 7. الاستجابة و RTL

- استخدام classes منطقية (`ms-`, `me-`, `border-s`, `text-start`) لتجنّب التبديل اليدوي.
- `md:` (768px) للتبديل من عمود إلى شبكة.
- على الموبايل: زر CTA في الـ Header يُختصر لأيقونة.

## 8. خارج النطاق الآن

- لا اتصال بالـ Supabase ولا استدعاء `create-payment` (mock فقط ينقل لـ `/success`).
- ZiraatPay نفسه: نُجهّز فقط مفتاح العملة (`TRY` للتركي، `USD` لغيره) ليُمرَّر لاحقاً دون تغيير الواجهة.
