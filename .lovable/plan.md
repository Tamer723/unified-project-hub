## المشكلة
دالة `payment-init` تفشل في الإقلاع، فيظهر "Failed to fetch" عند الضغط على زر الدفع لأي بوابة (وهمية أو NestPay).

السبب من السجلات:
```
worker boot error: module '.../std@0.224.0/encoding/base64.ts' does not provide an export named 'encode'
```

## الإصلاح
تعديل سطر استيراد واحد في `supabase/functions/payment-init/index.ts`:

```ts
// قبل
import { encode as encodeBase64 } from "https://deno.land/std@0.224.0/encoding/base64.ts";

// بعد
import { encodeBase64 } from "https://deno.land/std@0.224.0/encoding/base64.ts";
```

باقي الكود يستخدم `encodeBase64(...)` أصلاً، فلا تغييرات أخرى مطلوبة. بعد الموافقة سيُعاد نشر الدالة تلقائياً وتعود البوابتان للعمل.
