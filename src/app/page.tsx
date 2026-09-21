import { currentUser, signOut } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function HubPage() {
  // 1. Unified Single-User Authentication: Redirect to existing login screen (now in /equity) if unauthenticated.
  const user = await currentUser();
  if (!user) {
    redirect("/equity");
  }

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50 font-sans text-slate-900" style={{ fontFamily: "Vazirmatn, sans-serif" }}>
      {/* Persistent top navigation */}
      <header className="bg-white shadow-sm border-b px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold">هاب مرکزی سیستم</h1>
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

      {/* Main Dashboard Cards */}
      <main className="max-w-4xl mx-auto p-6 mt-10">
        <h2 className="text-2xl font-bold text-center mb-8">انتخاب ماژول</h2>
        
        <div className="grid md:grid-cols-2 gap-6">
          {/* Card 1: Equity */}
          <Link href="/equity" className="block group h-full">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 hover:shadow-md hover:border-blue-500 transition-all text-center h-full flex flex-col justify-center items-center">
              <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                {/* Aluminum Ingot / Investment icon */}
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3 text-slate-800">حساب سرمایه‌گذاران</h3>
              <p className="text-slate-500 text-sm leading-relaxed">
                مدیریت آورده‌ها، برداشت‌ها و محاسبه سهم بر پایه وزن آلومینیوم.
              </p>
            </div>
          </Link>

          {/* Card 2: Payroll */}
          <Link href="/payroll" className="block group h-full">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 hover:shadow-md hover:green-500 transition-all text-center h-full flex flex-col justify-center items-center">
              <div className="w-20 h-20 bg-green-50 text-green-600 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                {/* Payroll / Employees icon */}
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3 text-slate-800">حقوق و دستمزد</h3>
              <p className="text-slate-500 text-sm leading-relaxed">
                مدیریت پرسنل، کارکرد، مساعده، تسویه‌حساب و همگام‌سازی با کیف پول.
              </p>
            </div>
          </Link>
        </div>
      </main>
    </div>
  );
}
