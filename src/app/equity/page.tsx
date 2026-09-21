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
      {/* دکمه شناور بازگشت به هاب بدون به هم ریختن چیدمان اصلی */}
      <a 
        href="/" 
        style={{
          position: "fixed", 
          top: "16px", 
          left: "16px", 
          zIndex: 9999, 
          background: "#161b22", 
          color: "#58a6ff", 
          padding: "8px 16px", 
          borderRadius: "6px", 
          textDecoration: "none", 
          fontSize: "13px",
          border: "1px solid #30363d",
          boxShadow: "0 4px 12px rgba(0,0,0,0.5)"
        }}
      >
        ← بازگشت به هاب
      </a>
      <div dangerouslySetInnerHTML={{ __html: BODY_HTML }} />
      <script src="/app.js?v=r7" defer />
    </>
  );
}
