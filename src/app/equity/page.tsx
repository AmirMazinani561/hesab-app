import { BODY_HTML } from "./body";
import Link from "next/link";

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
      <div 
        dir="rtl" 
        className="bg-slate-900 text-slate-300 py-2 px-4 flex justify-between items-center text-sm font-sans z-50 relative"
        style={{ fontFamily: "Vazirmatn, sans-serif" }}
      >
        <span>شما در ماژول <strong>حساب سرمایه‌گذاران</strong> هستید.</span>
        <Link href="/" className="bg-slate-700 hover:bg-slate-600 text-white px-3 py-1 rounded transition-colors flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          بازگشت به هاب مرکزی
        </Link>
      </div>
      <div dangerouslySetInnerHTML={{ __html: BODY_HTML }} />
      <script src="/app.js?v=r7" defer />
    </>
  );
}
