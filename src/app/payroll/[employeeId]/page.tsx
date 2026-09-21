import Link from "next/link";
import { currentUser, signOut } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getEmployee } from "@/db/repo";
import EmployeeClient from "./EmployeeClient";

export default async function EmployeePage({ params }: { params: Promise<{ employeeId: string }> }) {
  const user = await currentUser();
  if (!user) {
    redirect("/equity");
  }

  const { employeeId } = await params;
  const employee = await getEmployee(employeeId);

  if (!employee) {
    return (
      <div dir="rtl" style={{ color: "var(--text)", padding: 40, textAlign: "center", fontFamily: "Vazirmatn" }}>
        <h2>پرسنل یافت نشد.</h2>
        <Link href="/payroll" style={{ color: "#0969da" }}>بازگشت به لیست</Link>
      </div>
    );
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
          background-color: #d1242f;
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
      `}} />

      <header className="payroll-header">
        <div className="payroll-header-left">
          <Link href="/payroll" className="payroll-back-btn">
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            بازگشت به پرسنل
          </Link>
          <h1 className="payroll-title">جزئیات کارکرد: {employee.name} (کد: {employee.code})</h1>
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
        <EmployeeClient employeeId={employee.id} employeeName={employee.name} />
      </main>
    </div>
  );
}