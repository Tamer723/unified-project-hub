## المشكلة

عند تدفق `iyzico_3ds` نعرض صفحة التحدي داخل `<iframe>`. بعد إدخال OTP، تُرجع `payment-callback` استجابة `302` فيتم التوجيه **داخل الـ iframe** بدل النافذة الأم — فتظهر صفحة النجاح داخل البوب-أب.

## الحل الشامل

استبدال جميع الـ `302 redirect` في `payment-callback` بصفحة HTML صغيرة "تكسر" الـ iframe إلى النافذة الأم. يعمل في كل التدفقات (iyzico الآن، NestPay/زراعات بنك مستقبلاً، وأي بوابة جديدة) بدون آثار جانبية على التدفقات التي تعمل في صفحة كاملة.

### الملف المعدَّل

**`supabase/functions/payment-callback/index.ts`**

1. إضافة دالة:
```ts
function breakoutRedirect(url: string): Response {
  const safe = url.replace(/"/g, "&quot;");
  const html = `<!doctype html><html><head><meta charset="utf-8">
<title>Redirecting…</title>
<meta http-equiv="refresh" content="0;url=${safe}">
<script>
(function(){
  try { (window.top || window).location.replace(${JSON.stringify(url)}); }
  catch(e){ window.location.replace(${JSON.stringify(url)}); }
})();
</script></head>
<body style="font-family:system-ui;text-align:center;padding:2rem">
<p>جارٍ التحويل…</p>
<p><a href="${safe}" target="_top">اضغط هنا للمتابعة</a></p>
</body></html>`;
  return new Response(html, {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
  });
}
```

2. استبدال **كل** استدعاءات `redirect(...)` بـ `breakoutRedirect(...)` في الملف (مسار iyzico، مسار NestPay، وكتلة `catch` العامة). يمكن إبقاء `redirect()` القديمة كـ alias محذوف أو حذفها.

### ملاحظة على iframe sandbox

في `src/components/site/CheckoutSection.tsx` السطر 688، الـ `sandbox` الحالي:
`allow-scripts allow-forms allow-same-origin allow-top-navigation`

`allow-top-navigation` كافٍ لاستدعاء `window.top.location.replace` بعد تفاعل المستخدم (ضغط OTP). لا تغيير مطلوب، لكن سنُضيف `allow-top-navigation-by-user-activation` احتياطاً لبعض المتصفحات.

## بدون تغييرات أخرى

- لا تعديل على `payment-init` ولا على قاعدة البيانات.
- التدفقات التي تعمل في صفحة كاملة (NestPay POST كامل) ستعمل كما كانت — لأن `window.top === window` فيها.
