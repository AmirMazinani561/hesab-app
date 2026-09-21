import { currentUser, signOut } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function HubPage() {
  const user = await currentUser();
  if (!user) {
    redirect("/equity");
  }

  return (
    <div dir="rtl" className="hub-container">
      <style dangerouslySetInnerHTML={{__html: `
        .hub-container {
          min-height: 100vh;
          background-color: var(--bg);
          color: var(--text);
          font-family: Vazirmatn, sans-serif;

          margin: 0;
          padding: 0;
        }
        .hub-header {
          background-color: var(--panel);
          border-bottom: 1px solid var(--line);
          padding: 16px 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .hub-title {
          font-size: 20px;
          font-weight: bold;
          color: var(--text);
          margin: 0;
        }
        .hub-user-info {
          display: flex;
          gap: 16px;
          align-items: center;
        }
        .hub-logout-btn {
          background-color: #da3633;
          color: #fff;
          border: none;
          padding: 6px 12px;
          border-radius: 6px;
          cursor: pointer;
          font-weight: bold;
          font-size: 14px;
        }
        .hub-main {
          max-width: 900px;
          margin: 60px auto;
          padding: 0 24px;
        }
        .hub-h2 {
          text-align: center;
          font-size: 28px;
          margin-bottom: 40px;
          color: #fff;
        }
        .hub-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 24px;
        }
        .hub-card {
          background-color: var(--panel);
          border: 1px solid var(--line);
          border-radius: 12px;
          padding: 40px 24px;
          text-align: center;
          text-decoration: none;
          color: var(--text);
          display: flex;
          flex-direction: column;
          align-items: center;
          transition: all 0.2s ease-in-out;
          cursor: pointer;
          height: 100%;
        }
        .hub-card.equity:hover {
          border-color: #58a6ff;
          box-shadow: 0 4px 12px rgba(88, 166, 255, 0.1);
        }
        .hub-card.payroll:hover {
          border-color: #3fb950;
          box-shadow: 0 4px 12px rgba(63, 185, 80, 0.1);
        }
        .hub-icon-wrap {
          width: 80px;
          height: 80px;
          background-color: var(--bg);
          border: 1px solid var(--line);
          border-radius: 50%;
          display: flex;
          justify-content: center;
          align-items: center;
          margin-bottom: 24px;
        }
        .hub-card-title {
          font-size: 22px;
          font-weight: bold;
          color: #fff;
          margin-bottom: 12px;
        }
        .hub-card-desc {
          font-size: 14px;
          color: var(--mut);
          line-height: 1.6;
          margin: 0;
        }
      `}} />

      <header className="hub-header">
        <h1 className="hub-title">هاب مرکزی سیستم</h1>
        <div className="hub-user-info">
          <span style={{ fontSize: "14px", color: "var(--mut)" }}>کاربر: {user.username}</span>
          <form action={async () => {
            "use server";
            await signOut();
            redirect("/equity");
          }}>
            <button type="submit" className="hub-logout-btn">
              خروج
            </button>
          </form>
        </div>
      </header>

      <main className="hub-main">
        <h2 className="hub-h2">انتخاب ماژول</h2>
        
        <div className="hub-grid">
          <Link href="/equity" style={{ textDecoration: "none" }}>
            <div className="hub-card equity">
              <div className="hub-icon-wrap">
                <svg width="40" height="40" fill="none" stroke="#58a6ff" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <h3 className="hub-card-title">حساب سرمایه‌گذاران</h3>
              <p className="hub-card-desc">
                مدیریت آورده‌ها، برداشت‌ها و محاسبه سهم بر پایه وزن آلومینیوم.
              </p>
            </div>
          </Link>

          <Link href="/payroll" style={{ textDecoration: "none" }}>
            <div className="hub-card payroll">
              <div className="hub-icon-wrap">
                <svg width="40" height="40" fill="none" stroke="#3fb950" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="hub-card-title">حقوق و دستمزد</h3>
              <p className="hub-card-desc">
                مدیریت پرسنل، کارکرد، مساعده، تسویه‌حساب و همگام‌سازی با کیف پول.
              </p>
            </div>
          </Link>
        </div>
      </main>
    </div>
  );
}
