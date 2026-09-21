import Link from "next/link";
import { currentUser, signOut } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function PayrollPage() {
  const user = await currentUser();
  if (!user) {
    redirect("/equity"); // Redirect to existing login screen
  }

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50 font-sans text-slate-900" style={{ fontFamily: "Vazirmatn, sans-serif" }}>
      {/* Top Navigation */}
      <header className="bg-white shadow-sm border-b px-6 py-4 flex justify-between items-center z-50 relative">
        <div className="flex items-center gap-4">
          <Link href="/" className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1 rounded transition-colors flex items-center gap-2 text-sm font-semibold">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            بازگشت به هاب
          </Link>
          <h1 className="text-xl font-bold border-r pr-4 mr-2 border-slate-200">ماژول حقوق و دستمزد</h1>
        </div>
        <div className="flex gap-4 items-center">
          <span className="text-sm text-slate-500">کاربر: {user.username}</span>
          <form action={async () => {
            "use server";
            await signOut();
            redirect("/equity");
          }}>
            <button type="submit" className="text-sm text-red-600 hover:text-red-700 font-bold px-3 py-1 bg-red-50 rounded transition-colors">
              خروج
            </button>
          </form>
        </div>
      </header>

      {/* Blank Dashboard Main */}
      <main className="max-w-6xl mx-auto p-6 mt-6">
        <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-10 text-center min-h-[400px] flex flex-col items-center justify-center">
          <div className="w-20 h-20 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mb-6">
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-700 mb-2">به زودی...</h2>
          <p className="text-slate-500 max-w-md mx-auto leading-relaxed">
            ساختار پایه ماژول حقوق و دستمزد آماده شده است. فرم‌ها، جداول و امکانات مربوط به مدیریت پرسنل و کارکرد به زودی در این قسمت پیاده‌سازی خواهند شد.
          </p>
        </div>
      </main>
    </div>
  );
}
