# خطة بناء منتج Istinar Real Estate

## 1. قرار التقنية

| الطبقة | الاختيار | سبب الاختيار |
| --- | --- | --- |
| Frontend | Next.js 16 + TypeScript + Tailwind CSS | واجهات عربية سريعة، صفحات عامة قابلة للفهرسة، وملائمة للنشر على Vercel. |
| Backend | Python 3.12 + Django 5.2 LTS + Django REST Framework | نموذج بيانات قوي، لوحة إدارة ناضجة، صلاحيات، API موثوق، وسرعة تطوير مناسبة لـSaaS. |
| Database | PostgreSQL في الإنتاج / SQLite للتطوير المحلي | علاقات متعددة المستأجرين، JSON للـpolygons وبيانات التحليل، وسهولة تشغيل محلي. |
| Auth | JWT access/refresh + حساب Django مخصص | فصل الواجهة عن الـAPI مع دعم الأدوار والصلاحيات. |
| Storage | مزود ملفات متوافق S3 في الإنتاج | صور المخططات والشعارات والملفات، دون ربط المنتج بمنصة محددة. |
| Deploy | Vercel للواجهة، Render للـDjango وPostgreSQL | يتطابق مع مسار النشر الذي اختاره مالك المنتج. |

## 2. حدود المنتج في النسخة الحالية

النسخة تبني دورة تشغيل مكتملة، وليست عرضاً شكلياً:

```text
مقدم خدمة ينشئ ملف الشركة والمخطط والقطع
→ ينشر المخطط التفاعلي
→ عميل يستكشف ويبحث ويقارن ويرسل اهتماماً
→ مقدم الخدمة يدير الطلب وحالة القطعة
→ الأحداث تتحول إلى لوحة طلب وتحليلات
→ رائد أعمال يحلل القطعة ويستقبل نتيجة قابلة للتفسير
→ مدير المنصة يراجع الشركات والمحتوى والاشتراكات
```

### مشمول في MVP

- حسابات وأدوار: مدير منصة، مالك/فريق مقدم خدمة، عميل، رائد أعمال.
- شركات عقارية متعددة المستأجرين، علامة وهوية وباقة وحالة مراجعة.
- مخططات، قطع، حالات البيع، Polygon JSON، فلترة وتصفح عام.
- صفحة شركة وصفحة مخطط تفاعلية وصفحة قطعة وطلب اهتمام.
- مفضلة ومقارنة وحسابات استخدام أدوات المستثمر.
- Opportunity Simulator بنتيجة مفسرة، مخاطر وخطوات مقترحة؛ لا يدعي دقة غير مضمونة.
- لوحة مقدم خدمة: مخططات، قطع، اهتمامات، مؤشرات طلب وإعدادات.
- لوحة مدير: مراجعة الشركات والمخططات والمستخدمين والاشتراكات والمؤشرات.
- Django Admin، API موثق ذاتياً، بيانات Demo، اختبارات Backend، بناء/Lint للواجهة.

### مؤجل عمداً

- تحصيل مدفوعات حقيقي: توجد طبقة اشتراك وحالات دفع قابلة للربط لاحقاً.
- CAD/GIS importer: يتم دعم الإدخال اليدوي وPolygon/GeoJSON JSON أولاً.
- توصيات AI أو تقييم عقاري آلي: لا تدخل قبل وجود بيانات مصادر معتمدة.
- عمولة وإتمام صفقات: تظل المنصة في MVP منظماً للـLeads والاهتمام.

## 3. بنية النظام

```text
frontend (Next.js / Vercel)
    │ REST + JWT
    ▼
backend (Django REST Framework / Render)
    ├── accounts        هوية وصلاحيات
    ├── realty          شركات، مخططات، قطع، فرق
    ├── engagement      اهتمام، مفضلة، أحداث سلوكية
    ├── intelligence    تحليلات فرص وحدود الاستخدام
    └── platform_admin  اشتراكات، تدقيق، مؤشرات الإدارة
    │
    ▼
PostgreSQL + object storage
```

## 4. نموذج الصلاحيات

| الدور | الصلاحيات الأساسية |
| --- | --- |
| `platform_admin` | مراجعة كل الشركات والمحتوى، إدارة الباقات والحسابات ومؤشرات المنصة. |
| `provider_owner` | إدارة شركة واحدة أو أكثر، فريقها، مخططاتها وطلباتها. |
| `provider_staff` | يعمل ضمن شركة بصلاحيات عضو محددة. |
| `customer` | يتصفح، يحفظ، يقارن ويرسل اهتماماً. |
| `entrepreneur` | صلاحيات العميل إضافة إلى تحليل الفرص وحدود Pro. |

## 5. دورة البيانات والمقاييس

كل فتح قطعة أو حفظ أو مقارنة أو تحليل أو إرسال اهتمام يسجل كحدث. تُستخدم الأحداث لإظهار:

- أكثر القطع مشاهدة وطلباً.
- معدل التحول من مشاهدة إلى اهتمام.
- أكثر أنواع الاستخدام والأنشطة المطلوبة.
- استخدام أدوات التحليل وحدود الحساب المجاني.

## 6. API الرئيسية

- `/api/auth/register/`, `/api/auth/token/`, `/api/auth/me/`
- `/api/providers/`, `/api/providers/{slug}/`, `/api/providers/me/`
- `/api/developments/`, `/api/developments/{slug}/`, `/api/lots/`, `/api/lots/{id}/`
- `/api/interests/`, `/api/favorites/`, `/api/events/`
- `/api/analyses/`, `/api/usage/`
- `/api/dashboard/provider/`, `/api/dashboard/customer/`, `/api/admin/overview/`

## 7. خريطة صفحات الواجهة

### الواجهة العامة والعميل

| المسار | الغرض | الاتصال بالـAPI |
| --- | --- | --- |
| `/` | عرض القيمة، بحث سريع، مخططات وشركات مميزة | `providers`, `developments` |
| `/providers` و`/providers/[slug]` | اكتشاف مقدمي الخدمة وهوية كل شركة | `providers`, `developments?provider=` |
| `/developments` و`/developments/[slug]` | الفلترة واستكشاف المخطط التفاعلي | `developments`, `lots?development=` |
| `/lots/[id]` | تفاصيل القطعة، المفضلة، الاهتمام والتحليل | `lots`, `favorites`, `interests`, `analyses` |
| `/compare` | مقارنة قطع مختارة مع تسجيل حدث مقارنة | `lots`, `events` |
| `/login` و`/register` | تسجيل الدخول وإنشاء حساب بحسب الدور | `auth/token`, `auth/register` |

### لوحة العميل ورائد الأعمال

| المسار | الغرض |
| --- | --- |
| `/dashboard` | ملخص المفضلة، الطلبات، التحليلات وحدود الاستخدام. |
| `/dashboard/favorites` | القطع المحفوظة وإزالتها أو مقارنتها. |
| `/dashboard/analyses` | سجل تحليلات القرار القابل للمراجعة. |
| `/analyze` | Opportunity Simulator ومدخلات النشاط والميزانية والحي. |

### لوحة مقدم الخدمة

| المسار | الغرض |
| --- | --- |
| `/provider` | مؤشرات المخططات والقطع والطلبات والتحول. |
| `/provider/developments` | إدارة المخططات وحالات النشر. |
| `/provider/developments/new` | إنشاء مخطط ببياناته ومخطط الخلفية. |
| `/provider/developments/[id]` | إدارة القطع، Polygon، السعر والحالة والرؤية. |
| `/provider/interests` | صندوق اهتمام منظم وحالات متابعة وملاحظات داخلية. |
| `/provider/analytics` | الطلب، أكثر القطع مشاهدة واهتماماً والتحول. |
| `/provider/settings` و`/provider/billing` | هوية الشركة والفريق والنطاق والباقات. |

### لوحة الإدارة

| المسار | الغرض |
| --- | --- |
| `/admin` | مؤشرات المنصة والطلبات الجديدة والنشاط. |
| `/admin/providers` | اعتماد أو إيقاف الشركات. |
| `/admin/developments` | مراجعة المخططات وحالة النشر. |
| `/admin/users` | إدارة حالة ودور المستخدم. |
| `/admin/subscriptions` | الباقات والحالة والحدود. |

## 8. ملاحظات البيانات والأمان

- كل كيان تشغيلي رئيسي مرتبط بـProvider، ولا يمكن لعضو شركة قراءة أو تعديل بيانات شركة أخرى.
- القطع المخفية وغير المنشورة لا تظهر في الكتالوج العام.
- طلب الاهتمام يسمح بالضيف لكنه لا يعرّض سجلات الطلبات إلا للجهة المالكة أو مدير المنصة.
- كلمات المرور لا تعود أبداً من API، والجلسة تستخدم JWT access/refresh.
- لا يحوّل محرك التحليل بيانات ناقصة إلى حقيقة: تحفظ المدخلات، النتيجة، المخاطر وعبارة نطاق واضحة لكل تحليل.
- PostgreSQL في الإنتاج مطلوب قبل التوسع؛ SQLite هو خيار التطوير المحلي فقط.

## 9. خطة الإطلاق

1. إنشاء قاعدة PostgreSQL وربط `DATABASE_URL` في Render. ملف `render.yaml` يعرّف قاعدة البيانات وخطوة migration قبل النشر؛ تتطلب `preDeployCommand` خطة Render مدفوعة لخدمة الويب، لذا إن اختيرت خطة لا تدعمها شغّل migration من Render Shell قبل أول تشغيل.
2. ضبط `DJANGO_SECRET_KEY`, `DJANGO_DEBUG=False`, `DJANGO_ALLOWED_HOSTS`, و`CORS_ALLOWED_ORIGINS`.
3. تشغيل `python manage.py migrate`, `collectstatic --noinput` وإنشاء مدير حقيقي عبر `createsuperuser`.
4. ربط Vercel بمجلد `frontend` وضبط `NEXT_PUBLIC_API_URL` إلى URL خدمة Render.
5. تجربة الأدوار الثلاثة على بيانات حقيقية: مقدم خدمة، عميل، رائد أعمال.
6. تفعيل مزود تخزين للصور قبل استقبال ملفات فعلية، ثم مزود دفع قبل إعلان Pro مدفوع.

## 10. بوابات الجودة قبل النشر

- `backend/.venv/Scripts/python.exe manage.py check`
- `backend/.venv/Scripts/python.exe manage.py test`
- `backend/.venv/Scripts/python.exe manage.py makemigrations --check --dry-run`
- `frontend/npm run lint`
- `frontend/npm run build`
- اختبار بصري يدوي أو آلي لمسار عام، وطلب اهتمام، ولوحة مزود، ومحاكي فرصة، ولوحة مدير.

## 11. تشغيل محلي

### Backend

```powershell
cd D:\Istinar-RealEstate\backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
python manage.py migrate
python manage.py seed_demo
python manage.py runserver
```

### Frontend

```powershell
cd D:\Istinar-RealEstate\frontend
npm install
Copy-Item .env.local.example .env.local
npm run dev
```

## 12. معايير القبول

1. يمكن إنشاء شركة ومخطط وقطع ونشرها وفتحها في رابط عام.
2. يمكن للزائر تصفية القطع وفتح تفاصيلها وإرسال اهتمام.
3. يراها مقدم الخدمة في صندوق الطلبات ويغيّر الحالة.
4. يسجل النظام الأحداث ويعرض مؤشرات حقيقية محسوبة من البيانات المخزنة.
5. يستطيع رائد الأعمال تشغيل تحليل بمدخلات واضحة، مع نتيجة ومخاطر لا تدعي يقيناً.
6. يمكن لمدير المنصة مراجعة الكيانات من الواجهة وDjango Admin.
7. تمر اختبارات Django وبناء/Lint واجهة Next.js.
