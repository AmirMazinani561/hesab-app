# راهنمای استقرار

سه مسیر ممکن. هر سه با **همین کد** کار می‌کنند — فقط `DATABASE_URL` فرق می‌کند.

---

## متغیرهای محیطی مشترک

| نام | توضیح | الزامی |
|---|---|---|
| `DATABASE_URL` | آدرس اتصال دیتابیس | ✅ |
| `AUTH_SECRET` | کلید امضای نشست، حداقل ۳۲ کاراکتر تصادفی | ✅ |
| `ADMIN_USERNAME` | نام کاربری مدیر (پیش‌فرض `admin`) | — |
| `ADMIN_PASSWORD` | رمز مدیر، **فقط در اولین اجرا** استفاده می‌شود | ✅ |
| `WALLET_INTAKE_TOKEN` | توکن اتصال کیف پول | برای اتصال |
| `WALLET_PARTNER_MAP` | نگاشت حساب کیف پول به شریک | برای اتصال |

تولید کلید امن:

```bash
openssl rand -hex 32
```

---

## ۱) Vercel + Supabase

ساده‌ترین راه برای شروع.

### گام ۱ — دیتابیس
در Supabase پروژه بسازید، سپس:
**Project Settings → Database → Connection string → URI**

آدرس چیزی شبیه این است:
```
postgresql://postgres.xxxx:PASSWORD@aws-0-region.pooler.supabase.com:6543/postgres
```

> از حالت **Session pooler** یا **Transaction pooler** استفاده کنید،
> نه اتصال مستقیم؛ روی Vercel پایدارتر است.

### گام ۲ — استقرار
1. مخزن را به GitHub بفرستید.
2. در Vercel روی **Import Project** بزنید.
3. در **Environment Variables** مقادیر بالا را وارد کنید.
4. **Deploy**.

### گام ۳ — بررسی
```
https://your-app.vercel.app/api/health
```

---

## دایرکت‌ادمین

برای هاست‌هایی که **Setup Node.js App** دارند.

### گام ۱ — دیتابیس MySQL
در **MySQL Management** یک دیتابیس و کاربر بسازید.
نام‌ها معمولاً پیشوند اکانت می‌گیرند: `myuser_hesab`.

### گام ۲ — آپلود
همهٔ فایل‌ها به‌جز `node_modules`، `.next` و `.env` را آپلود کنید.

### گام ۳ — اپلیکیشن Node
| فیلد | مقدار |
|---|---|
| Node.js version | ۲۰ یا بالاتر |
| Application mode | `Production` |
| Application root | مسیر پوشهٔ پروژه |
| Startup file | `server.js` |

### گام ۴ — متغیرها
```
DATABASE_URL=mysql://myuser_h:PASSWORD@localhost:3306/myuser_hesab
AUTH_SECRET=...
ADMIN_PASSWORD=...
```

> اگر رمز کاراکتر خاص دارد، encode کنید (`@` → `%40`).

### گام ۵ — بیلد
```bash
npm install
STANDALONE=1 npm run build
```
سپس **Restart**.

---

## VPS

```bash
git clone <repo> && cd hesab-app
npm install
cp .env.example .env && nano .env
npm run build

npm i -g pm2
pm2 start npm --name hesab -- start
pm2 startup && pm2 save
```

پشت Nginx:
```nginx
location / {
  proxy_pass http://127.0.0.1:3000;
  proxy_set_header Host $host;
  proxy_set_header X-Forwarded-Proto $scheme;
}
```

---

## مهاجرت بین دیتابیس‌ها

چون هیچ قابلیت مخصوص یک دیتابیس به کار نرفته، جابه‌جایی ساده است:

1. از داخل برنامه **پشتیبان JSON** بگیرید.
2. `DATABASE_URL` را به مقصد جدید تغییر دهید.
3. برنامه را اجرا کنید — جدول‌ها خودکار ساخته می‌شوند.
4. پشتیبان را **بازگردانی** کنید.

---

## عیب‌یابی

| نشانه | علت و راه‌حل |
|---|---|
| `AUTH_SECRET تنظیم نشده` | متغیر را اضافه و سرویس را ری‌استارت کنید |
| `ADMIN_PASSWORD تنظیم نشده` | هیچ کاربری وجود ندارد و رمز اولیه داده نشده |
| `اتصال به دیتابیس برقرار نشد` | آدرس، پورت یا فایروال |
| `نام کاربری یا رمز دیتابیس نادرست` | در دایرکت‌ادمین پیشوند اکانت را فراموش نکنید |
| صفحهٔ سفید | لاگ‌ها را ببینید؛ معمولاً `npm run build` اجرا نشده |
