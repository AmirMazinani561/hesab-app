import Link from "next/link";
import { currentUser, signOut } from "@/lib/auth";
import { redirect } from "next/navigation";
import PayrollClient from "./PayrollClient";

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
          background-color: var(--bg);
          color: var(--text);
          font-family: Vazirmatn, sans-serif;
          margin: 0;
          padding: 0;
        }
        .payroll-header {
          background-color: var(--panel);
          border-bottom: 1px solid var(--line);
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
          background-color: var(--btn);
          color: var(--text);
          border: 1px solid var(--line);
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
          background-color: var(--line);
        }
        .payroll-title {
          font-size: 20px;
          font-weight: bold;
          color: var(--text);
          margin: 0;
          padding-right: 16px;
          border-right: 1px solid var(--line);
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
          background-color: var(--panel);
          border: 1px solid var(--line);
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
          background-color: var(--bg);
          border: 1px solid var(--line);
          border-radius: 50%;
          display: flex;
          justify-content: center;
          align-items: center;
          margin-bottom: 24px;
        }
        .payroll-h2 {
          font-size: 24px;
          font-weight: bold;
          color: var(--text);
          margin-bottom: 16px;
        }
        .payroll-p {
          font-size: 16px;
          color: var(--mut);
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
          <span style={{ fontSize: "14px", color: "var(--mut)" }}>کاربر: {user.username}</span>
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
          <PayrollClient />
      </main>
    </div>
  );
}
