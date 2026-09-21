import Link from "next/link";
import { currentUser, signOut } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function PayrollPage() {
  const user = await currentUser();
  if (!user) {
    redirect("/equity"); // Redirect to existing login screen
  }

  return (
    <div dir="rtl" className="payroll-container">
      <style dangerouslySetInnerHTML={{__html: `
        .payroll-container {
          min-height: 100vh;
          background-color: #0d1117;
          color: #c9d1d9;
          font-family: Vazirmatn, sans-serif;
          margin: 0;
          padding: 0;
        }
        .payroll-header {
          background-color: #161b22;
          border-bottom: 1px solid #30363d;
          padding: 16px 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .payroll-header-left {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .payroll-back-btn {
          background-color: #21262d;
          color: #c9d1d9;
          border: 1px solid #30363d;
          padding: 6px 12px;
          border-radius: 6px;
          text-decoration: none;
          font-size: 14px;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: 0.2s;
        }
        .payroll-back-btn:hover {
          background-color: #30363d;
        }
        .payroll-title {
          font-size: 20px;
          font-weight: bold;
          color: #c9d1d9;
          margin: 0;
          padding-right: 16px;
          border-right: 1px solid #30363d;
        }
        .payroll-user-info {
          display: flex;
          gap: 16px;
          align-items: center;
        }
        .payroll-logout-btn {
          background-color: #da3633;
          color: #fff;
          border: none;
          padding: 6px 12px;
          border-radius: 6px;
          cursor: pointer;
          font-weight: bold;
          font-size: 14px;
        }
        .payroll-main {
          max-width: 1000px;
          margin: 40px auto;
          padding: 0 24px;
        }
        .payroll-dashboard-blank {
          background-color: #161b22;
          border: 1px solid #30363d;
          border-radius: 12px;
          padding: 80px 24px;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 400px;
        }
        .payroll-icon-wrap {
          width: 80px;
          height: 80px;
          background-color: #0d1117;
          border: 1px solid #30363d;
          border-radius: 50%;
          display: flex;
          justify-content: center;
          align-items: center;
          margin-bottom: 24px;
        }
        .payroll-h2 {
          font-size: 24px;
          font-weight: bold;
          color: #fff;
          margin-bottom: 16px;
        }
        .payroll-p {
          font-size: 16px;
          color: #8b949e;
          line-height: 1.8;
          max-width: 500px;
          margin: 0 auto;
        }
      `}} />

      <header className="payroll-header">
        <div className="payroll-header-left">
          <Link href="/" className="payroll-back-btn">
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            بازگشت به هاب
          </Link>
          <h1 className="payroll-title">ماژول حقوق و دستمزد</h1>
        </div>
        <div className="payroll-user-info">
          <span style={{ fontSize: "14px", color: "#8b949e" }}>کاربر: {user.username}</span>
          <form action={async () => {
            "use server";
            await signOut();
            redirect("/equity");
          }}>
            <button type="submit" className="payroll-logout-btn">
              خروج
            </button>
          </form>
        </div>
      </header>

      <main className="payroll-main">
        <div className="payroll-dashboard-blank">
          <div className="payroll-icon-wrap">
            <svg width="40" height="40" fill="none" stroke="#8b949e" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <h2 className="payroll-h2">به زودی...</h2>
          <p className="payroll-p">
            ساختار پایه ماژول حقوق و دستمزد آماده شده است. فرم‌ها، جداول و امکانات مربوط به مدیریت پرسنل و کارکرد به زودی در این قسمت پیاده‌سازی خواهند شد.
          </p>
        </div>
      </main>
    </div>
  );
}
