# 🚀 دليل الإعداد والنشر — Setup & Deployment

## التشغيل محلياً (بدون أي إعداد)

```bash
npm install
npm run dev
```

بدون مفاتيح Supabase يعمل التطبيق تلقائياً بوضع **التخزين المحلي**: قاعدة بيانات JSON في `data/db.json` والملفات في `data/uploads/`. مثالي للتجربة والتطوير.

> ملاحظة: الكاميرا تتطلب اتصالاً آمناً — `localhost` يعمل، لكن لتجربة الجوال على شبكتك المحلية استخدم نفقاً مثل `ngrok` أو انشر على Vercel مباشرة.

## النشر الإنتاجي (Supabase + Vercel)

كل جداول التطبيق معزولة في Postgres schema مستقلة اسمها **`kidsbook`** — لذلك تقدر تركّبه على **مشروع Supabase جديد** أو على **مشروع موجود مشترك مع تطبيق آخر** (مثل Holoform) بدون أي تصادم، وتفصله لاحقاً بسهولة (انظر «فصل التطبيق لمشروع مستقل» بالأسفل).

### 1. Supabase (جديد أو مشترك — نفس الخطوات)

1. افتح مشروع Supabase (الجديد أو الموجود) → **SQL Editor** ونفّذ محتوى `supabase/migrations/0001_init.sql` بالكامل — ينشئ schema `kidsbook` بجداولها (`books`, `book_pages`, `scans`) ودالة `record_scan()` مع RLS والصلاحيات، وينشئ bucket التخزين العام `book-assets`.
2. ⚠️ **خطوة إلزامية:** من **Settings → API → Exposed schemas** أضف `kidsbook` للقائمة (بجانب `public`) — بدونها يرفض الخادم كل الاستعلامات بخطأ schema.
3. من **Project Settings → API** انسخ:
   - `Project URL`
   - المفتاح السري (**Secret/Service role key**) — ⚠️ خادم فقط، لا يوضع في الكود أو الشات أبداً.

### 2. Vercel

1. اربط مستودع GitHub بمشروع Vercel جديد (كل push ينشر تلقائياً).
2. أضف متغيرات البيئة:

| المتغير | القيمة |
|---|---|
| `SUPABASE_URL` | رابط مشروع Supabase |
| `SUPABASE_SECRET_KEY` | المفتاح السري (server-only) |
| `NEXT_PUBLIC_APP_URL` | الدومين النهائي، مثل `https://mybook.vercel.app` — تُبنى عليه روابط QR |

3. انشر. افتح `/api/health` للتأكد: يجب أن ترى `"storage": "supabase"`.

## سير العمل بعد النشر

1. **أنشئ كتاباً** من لوحة التحكم وأضف صفحاته: لكل صفحة صورة مرجعية (نفس المطبوعة في الكتاب) + ملف GLB متحرك + صوت اختياري.
2. اضغط **«تجهيز الكتاب للمسح»** — يبني ملف التعرف على الصور (`.mind`) في متصفحك ويرفعه.
3. اضغط **نشر** ونزّل رمز **QR** واطبعه على غلاف الكتاب.
4. جرّب بنفسك على الجوال قبل التوزيع — وللمعاينة بدون كتاب مطبوع أضف `?demo=1` لرابط الكتاب.

## نصائح للصور المرجعية

- الصور الغنية بالتفاصيل والألوان والتباين تُتتبَّع ممتازاً؛ الرسومات البسيطة على خلفية سادة سيئة التتبع.
- يُنصح بحد أقصى ~15 صفحة لكل كتاب — أكثر من ذلك يبطئ التعرف؛ قسّم الكتب الكبيرة.
- الصور تُصغَّر تلقائياً إلى 2048px قبل الرفع (حماية من خامات WebGL السوداء على الجوالات).

## فصل التطبيق لمشروع Supabase مستقل (لاحقاً)

بما أن كل شيء داخل schema `kidsbook`، الفصل لا يحتاج **أي تغيير في الكود** — فقط نقل بيانات وتبديل متغيرات بيئة:

1. **أنشئ مشروع Supabase جديداً** ونفّذ عليه نفس `supabase/migrations/0001_init.sql` + خطوة **Exposed schemas** (`kidsbook`).
2. **انقل بيانات الجداول** (روابط الاتصال المباشرة من Settings → Database):
   ```bash
   pg_dump "$OLD_DB_URL" --schema=kidsbook --data-only | psql "$NEW_DB_URL"
   ```
3. **انسخ ملفات التخزين** من bucket `book-assets` القديم للجديد — الأسهل سكربت صغير يسرد الملفات عبر Supabase API وينزّل/يرفع (أو Supabase CLI). كل الملفات في مجلدات `image/`, `model/`, `audio/`, `mind/`.
4. **أعد كتابة الروابط المخزنة** (تشير للدومين القديم) — نفّذ على المشروع الجديد مع تبديل `OLD`/`NEW`:
   ```sql
   update kidsbook.books set
     cover_url = replace(cover_url, 'https://OLD.supabase.co', 'https://NEW.supabase.co'),
     mind_url  = replace(mind_url,  'https://OLD.supabase.co', 'https://NEW.supabase.co');
   update kidsbook.book_pages set
     target_image_url = replace(target_image_url, 'https://OLD.supabase.co', 'https://NEW.supabase.co'),
     model_url        = replace(model_url,        'https://OLD.supabase.co', 'https://NEW.supabase.co'),
     audio_url        = replace(audio_url,        'https://OLD.supabase.co', 'https://NEW.supabase.co');
   ```
   > ملاحظة: تغيّر الروابط يجعل الكتب تظهر بحالة «يحتاج إعادة تجهيز» (البصمة تقارن روابط الصور) — إما اضغط «تجهيز الكتاب» مرة أخرى لكل كتاب، أو حدّث `config->mindFingerprint` بنفس الاستبدال.
5. **بدّل في Vercel** قيمتي `SUPABASE_URL` و`SUPABASE_SECRET_KEY` للمشروع الجديد وأعد النشر.
6. تحقق من `/api/health` ثم افتح كتاباً وجرّبه، وبعدها احذف schema `kidsbook` وbucket `book-assets` من المشروع القديم.

## استكشاف الأخطاء

| العرَض | السبب المرجح | الحل |
|---|---|---|
| `storage: local` على الإنتاج | متغيرات البيئة ناقصة | أضف `SUPABASE_URL` و`SUPABASE_SECRET_KEY` وأعد النشر |
| خطأ schema عند أي عملية قاعدة بيانات | `kidsbook` غير مضافة للـ Exposed schemas | Settings → API → Exposed schemas → أضف `kidsbook` |
| فشل الرفع بـ Storage error | الـ bucket غير موجود | نفّذ الـ SQL (ينشئ `book-assets`) |
| «الكاميرا لا تعمل» عند الطفل | متصفح داخل تطبيق (واتساب…) | التطبيق يعرض تحذيراً تلقائياً — افتح في Safari/Chrome |
| رمز QR يشير إلى localhost | `NEXT_PUBLIC_APP_URL` غير مضبوط | اضبطه على الدومين النهائي |
| التتبع ضعيف | صورة مرجعية فقيرة التفاصيل | استبدلها بصورة أغنى تفاصيلاً |
| المشهد لا يتحرك | ملف GLB بلا أنيميشن | يُضاف طفو تلقائي؛ أو ارفع GLB فيه أنيميشن |

## التشخيص الميداني

في صفحة العارض، افتح console المتصفح واقرأ `window.__arStats` — عدّادات المعالجة والعثور على الأهداف.
