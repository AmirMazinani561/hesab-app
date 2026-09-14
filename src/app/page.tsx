import { BODY_HTML } from "./body";

/**
 * رابط کاربری برنامه.
 *
 * بدنهٔ HTML از ماژول body.ts می‌آید (نه از خواندن فایل هنگام اجرا)، تا در
 * محیط بدون‌سرور Vercel حتماً داخل بستهٔ تابع قرار بگیرد.
 *
 * اسکریپت با تگ ساده و defer بارگذاری می‌شود تا پس از آمادگی DOM اجرا شود.
 */
export default function Home() {
  return (
    <>
      <div dangerouslySetInnerHTML={{ __html: BODY_HTML }} />
      <script src="/app.js?v=r6" defer />
    </>
  );
}
