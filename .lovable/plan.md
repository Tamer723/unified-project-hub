# خطة الإضافات الثلاث

## 1) استعادة وتغيير كلمة مرور الأدمن

### واجهات جديدة
- **`/auth`** (تحديث): إضافة رابط "نسيت كلمة المرور؟" → يفتح تبويب/نموذج لإدخال البريد ويستدعي `supabase.auth.resetPasswordForEmail` مع `redirectTo: ${origin}/reset-password`.
- **`/reset-password`** (صفحة عامة جديدة): تكتشف `type=recovery` في الـ hash، تعرض حقلي كلمة مرور جديدة + تأكيد، تستدعي `supabase.auth.updateUser({ password })`.
- **`/admin/account`** (صفحة جديدة داخل لوحة التحكم): "حسابي" — تغيير كلمة المرور للمستخدم الحالي مباشرة (`updateUser({ password })`) بعد التحقق من كلمة المرور الحالية.

### البريد
**القرار:** لتجنّب أي علامة تجارية لطرف ثالث في رسائل البريد، نُعدّ **دومين بريد مخصص** على ساب-دومين من نطاقك (`campaign.4c.studio` أو `notify.4c.studio`)، ثم نُنشئ **قوالب بريد مخصصة بهويتك** (شعار 4C، ألوان المشروع البنية/الذهبية، RTL عربي). هذا يجعل المُرسِل مثل `no-reply@notify.4c.studio` والتصميم خالصاً لك.

- خطوات تلقائية: فتح حوار إعداد الدومين → بعد الإضافة، توليد القوالب الستة (`signup`, `recovery`, `magic-link`, `invite`, `email-change`, `reauthentication`) → تخصيصها بألوان `index.css` (sand/brown/green-pale) + شعار من `public/`.
- الرسالة الأهم لنا الآن: **recovery** (استعادة كلمة المرور).
- ملاحظة: القوالب تنشط بعد التحقق من DNS؛ نعطيك زر متابعة الحالة في "Cloud → Emails".

## 2) إدارة المستخدمين والصلاحيات (admin / moderator / viewer)

### قاعدة البيانات (Migration)
```sql
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'moderator';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'viewer';
```
- تحديث دالة `has_role` لتدعم تمرير الدور (موجودة سلفاً).
- إضافة دالة مساعدة `has_any_role(roles user_role[])` لتسهيل الفحص.
- تحديث RLS على `orders` و`products` و`product_price_matrix`:
  - **SELECT**: `admin OR moderator OR viewer`
  - **UPDATE/INSERT/DELETE على `products` و`pricing`**: `admin OR moderator`
  - **UPDATE على `orders`**: `admin` فقط (لحماية المالية)
  - **`user_roles` management**: `admin` فقط

### Edge Function
- تحديث `admin-users`:
  - `grant_role` / `revoke_role` بدلاً من admin فقط (يقبل `role: 'admin'|'moderator'|'viewer'`).
  - `invite_user` جديد: يستخدم `admin.auth.admin.inviteUserByEmail(email, { redirectTo })` ثم يُسند الدور المختار.
  - يُرجع جميع الأدوار لكل مستخدم.

### واجهة `/admin/users`
- جدول محسّن: أعمدة (البريد، الأدوار كـ Badges ملوّنة، آخر دخول، إجراءات).
- زر **"دعوة مستخدم"** يفتح Dialog: حقل بريد + اختيار دور → يرسل دعوة.
- لكل صف: قائمة منسدلة لإضافة/إزالة أدوار.
- حماية: لا يستطيع admin إزالة دوره الخاص إذا كان آخر admin (فحص في الـ function).

### واجهة الحماية في الفرونت
- `useAuth` يُرجع `roles: string[]` بدلاً من `isAdmin` فقط.
- `RequireAdmin` يصبح `RequireRole({roles: ['admin','moderator','viewer']})` قابل لإعادة الاستخدام.
- إخفاء أزرار التعديل عن viewer، وأزرار إدارة المستخدمين عن غير admin.

## 3) إشعارات تلغرام عند كل عملية (نجاح/فشل)

### الإعداد
- **Connector تلغرام**: نطلب منك ربط حساب تلغرام (بوت موجود أو إنشاء جديد عبر BotFather). تقرر فقط، ثم نتولى الكود.
- **Secrets جديدة**:
  - `TELEGRAM_ADMIN_CHAT_ID` (تضيفه يدوياً — رقم الـ chat للأدمن، تحصل عليه برسالة `/start` أو من `@userinfobot`).

### الكود
- **Edge Function جديدة `notify-telegram`** (`verify_jwt = false`، تُستدعى داخلياً فقط):
  - تستقبل `{order_id, status}`.
  - تجلب الطلب + المنتج + المصفوفة من DB.
  - تُنسّق رسالة HTML عربية:
    ```
    ✅ توكيل ناجح — #ABC123
    👤 الاسم: محمد
    📧 البريد: ...
    📞 الهاتف: ...
    🐏 المنتج: أضحية متنوعة - 🇸🇾 سوريا - خروف
    💰 المبلغ: 250 USD × 2 = 500 USD
    🕐 الوقت: ...
    ```
    وللفشل: `❌ فشل توكيل — #ABC123` + سبب الفشل.
  - ترسل عبر `https://connector-gateway.lovable.dev/telegram/sendMessage`.

- **التشغيل التلقائي**: نعدّل `ziraat-payment-verify` و`payment-callback` لاستدعاء `notify-telegram` بعد كل تحديث حالة (نجاح أو فشل أو expired).
- (بديل أنظف): **Database Trigger + pg_net** يستدعي الـ function عند `UPDATE` على `orders.status`، حتى لو تم التغيير من لوحة التحكم. سنستخدم هذا الخيار.

### إعدادات الأدمن
- صفحة `/admin/account` تحوي قسم "إشعارات تلغرام":
  - عرض حالة الربط (متصل/غير متصل).
  - حقل لتحديث `TELEGRAM_ADMIN_CHAT_ID` (يُحفظ كـ secret عبر function إدارية).
  - زر "اختبار الإرسال" يُرسل رسالة تجريبية.

---

## الملفات المُتأثرة

**جديدة:**
- `src/pages/ResetPassword.tsx`
- `src/pages/admin/Account.tsx`
- `src/components/admin/RequireRole.tsx`
- `supabase/functions/notify-telegram/index.ts`
- Migration: تعديل enum `user_role` + RLS + trigger

**معدّلة:**
- `src/App.tsx` (route جديد + reset-password)
- `src/pages/Auth.tsx` (نسيت كلمة المرور)
- `src/pages/admin/Users.tsx` (دعوة + إدارة أدوار)
- `src/components/admin/AppSidebar.tsx` (رابط حسابي)
- `src/components/admin/RequireAdmin.tsx` → استبدال بـ RequireRole
- `src/hooks/useAuth.ts` (roles array)
- `supabase/functions/admin-users/index.ts` (invite + grant_role/revoke_role)
- `supabase/functions/ziraat-payment-verify/index.ts` (استدعاء notify)
- `supabase/functions/payment-callback/index.ts` (استدعاء notify)

## الترتيب المقترح للتنفيذ
1. Migration الأدوار + تحديث RLS.
2. صفحة استعادة كلمة المرور + تحديث Auth.
3. نظام الأدوار + صفحة Users المحسّنة + الدعوات.
4. صفحة "حسابي" (تغيير كلمة المرور).
5. ربط تلغرام + function + trigger.
6. إعداد دومين البريد المخصص + قوالب بهويتك.

هل أبدأ التنفيذ بهذا الترتيب؟
