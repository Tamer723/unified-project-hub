# خطة تنفيذ نظام الدفع متعدد المزوّدين

## الهدف
السماح للأدمن بالتبديل من لوحة التحكم بين ثلاث بوابات دفع:
1. **Mock** — محاكاة (الوضع الحالي، للاختبار الداخلي)
2. **NestPay 3D Model** — النموذج في موقعنا، البنك يتحقق من 3DS فقط
3. **NestPay 3D Pay Hosting** — البنك يستضيف صفحة الدفع كاملة (الأبسط أمنياً)

مع مفتاح Test/Prod جاهز لاستخدام بيئة `entegrasyon.asseco-see.com.tr` التجريبية.

---

## 1. Migration: جدول `payment_settings`

```sql
create table public.payment_settings (
  id uuid primary key default '00000000-0000-0000-0000-000000000001',
  active_provider text not null default 'mock'
    check (active_provider in ('mock','nestpay_3d','nestpay_hosting')),
  test_mode boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by uuid
);
-- ضمان صف واحد فقط
create unique index payment_settings_singleton on public.payment_settings ((true));

alter table public.payment_settings enable row level security;
create policy "staff read settings" on public.payment_settings
  for select to authenticated
  using (has_any_role(array['admin','moderator','viewer']::user_role[]));
create policy "admin update settings" on public.payment_settings
  for update to authenticated using (has_role('admin'));

insert into public.payment_settings (id) values (default);

-- RPC عام لقراءة المزوّد النشط فقط (يحتاجه نموذج الطلب)
create function public.get_active_payment_provider()
returns table(active_provider text, test_mode boolean)
language sql stable security definer set search_path=public as $$
  select active_provider, test_mode from public.payment_settings limit 1;
$$;
grant execute on function public.get_active_payment_provider() to anon, authenticated;
```

---

## 2. Edge Functions

### أ) `payment-init` (جديدة، تستبدل `ziraat-payment-init`)
- نفس التحقق الحالي: Turnstile، تسعير من السيرفر، إنشاء طلب.
- تقرأ المزوّد النشط، ثم تتفرّع:
  - **mock** → `{ mode: 'internal_3ds', threeDSUrl: '/payment/3ds-mock?...' }`
  - **nestpay_3d** → تتطلب `card` في الـ body. تبني حقول NestPay (clientid, oid=order.id, amount, okUrl, failUrl, callbackUrl, rnd, currency=949/840, storetype='3D', hashAlgorithm='ver3', lang, TranType='Auth', pan, Ecom_Payment_Card_ExpDate_Year, Ecom_Payment_Card_ExpDate_Month, cv2). تحسب hash V3. تُرجع `{ mode: 'redirect_post', action: HOST_URL, fields: {..., hash} }`.
  - **nestpay_hosting** → بدون حقول البطاقة (`storetype='3D_PAY_HOSTING'`). تُرجع نفس الشكل.
- الـ host: `NESTPAY_HOST_URL_TEST` أو `NESTPAY_HOST_URL_PROD` بحسب `test_mode`.

### ب) `payment-callback` (إعادة كتابة)
- تستقبل `application/x-www-form-urlencoded` POST من البنك.
- تحسب hash V3 على كل البارامترات (مرتبة أبجدياً، عدا `encoding`/`hash`/`countdown`) + `storeKey`.
- تتحقق من تطابق `HASH`، ومن `mdStatus ∈ {1,2,3,4}` و `ProcReturnCode='00'` للنجاح.
- تحدّث `orders` (حماية idempotency: تحديث فقط إذا `status='pending'` أو `'awaiting_3ds'`).
- ترد بـ HTTP 302 إلى `/success` أو `/failed?reason=...`.
- `verify_jwt = false` في `supabase/config.toml`.

### حسابات Hash V3
```ts
function escape(v:string){return String(v??'').replaceAll('\\','\\\\').replaceAll('|','\\|');}
const keys = Object.keys(params).filter(k=>!['hash','encoding'].includes(k.toLowerCase()))
  .sort((a,b)=>a.toLowerCase().localeCompare(b.toLowerCase()));
const plaintext = keys.map(k=>escape(params[k])).join('|') + '|' + escape(storeKey);
const hash = base64(sha512(plaintext));
```

---

## 3. Frontend

### أ) `OrderForm.tsx`
- عند التحميل: استدعاء `supabase.rpc('get_active_payment_provider')`.
- إخفاء حقول البطاقة إذا `active_provider === 'nestpay_hosting'`.
- بعد `payment-init`:
  - `internal_3ds` → `navigate(threeDSUrl)`
  - `redirect_post` → بناء `<form method="POST" action={action}>` مخفي بكل الحقول وإرساله تلقائياً.

### ب) صفحة `/admin/payments` (`src/pages/admin/Payments.tsx`)
- محمية بـ `RequireAdmin`.
- Radio لاختيار المزوّد + Switch للـ Test/Prod.
- عرض الـ Callback URL: `https://ubzrshboajvdsztgptsk.supabase.co/functions/v1/payment-callback` (للنسخ).
- تحذير عند اختيار nestpay_*: قائمة الأسرار المطلوبة.
- زر حفظ → UPDATE.
- إضافة الرابط في `AppSidebar.tsx` ومسار في `App.tsx`.

---

## 4. الأسرار (لاحقاً، عند توقيع عقد Ziraat)
لن نطلبها الآن. عند التبديل لـ nestpay_* تظهر للمستخدم رسالة بالأسرار الناقصة:
- `NESTPAY_CLIENT_ID`
- `NESTPAY_STORE_KEY`
- `NESTPAY_HOST_URL_TEST` (افتراضي مقترح: `https://entegrasyon.asseco-see.com.tr/fim/est3Dgate`)
- `NESTPAY_HOST_URL_PROD`

---

## 5. الملفات

**جديد:**
- `supabase/migrations/<ts>_payment_settings.sql`
- `supabase/functions/payment-init/index.ts`
- `src/pages/admin/Payments.tsx`

**تعديل:**
- `supabase/functions/payment-callback/index.ts` (إعادة كتابة لـ NestPay V3)
- `supabase/config.toml` (verify_jwt=false لـ payment-callback)
- `src/components/site/OrderForm.tsx`
- `src/components/admin/AppSidebar.tsx`
- `src/App.tsx`
- `src/i18n/locales/{ar,en,tr}.json`

**يبقى:** `ziraat-payment-init` و `ziraat-payment-verify` و `Payment3DSMock` (للوضع mock).

---

## بعد الموافقة
سأبدأ بالـ migration ثم Edge Functions ثم الواجهة. كل شيء سيعمل فوراً في وضع Mock، والتبديل للحقيقي يكون بإضافة الأسرار وتغيير الإعداد من اللوحة.