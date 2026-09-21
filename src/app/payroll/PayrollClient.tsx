"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";

type Employee = {
  id: string;
  code: string;
  name: string;
};

export default function PayrollClient() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const res = await fetch("/api/payroll/employees");
      if (res.ok) {
        const data = await res.json();
        setEmployees(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/payroll/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });
      if (res.ok) {
        setNewName("");
        await fetchEmployees();
      } else {
        const data = await res.json();
        alert("خطا در ثبت پرسنل: " + (data.error || "نامشخص"));
      }
    } catch (err: any) {
      console.error(err);
      alert("خطا در برقراری ارتباط با سرور");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <style dangerouslySetInnerHTML={{__html: `
        .dashboard-container {
          display: flex;
          flex-direction: column;
          gap: 32px;
        }
        .form-card {
          background-color: var(--panel);
          border: 1px solid var(--line);
          border-radius: 12px;
          padding: 24px;
        }
        .form-title {
          font-size: 18px;
          font-weight: bold;
          margin: 0 0 16px 0;
          color: var(--text);
        }
        .form-group {
          display: flex;
          gap: 16px;
        }
        .form-input {
          flex: 1;
          background-color: var(--bg);
          border: 1px solid var(--line);
          border-radius: 6px;
          padding: 10px 16px;
          color: var(--text);
          font-family: inherit;
          font-size: 14px;
        }
        .form-input:focus {
          outline: none;
          border-color: #58a6ff;
        }
        .form-btn {
          background-color: #238636;
          color: #fff;
          border: 1px solid rgba(240, 246, 252, 0.1);
          border-radius: 6px;
          padding: 10px 24px;
          font-weight: bold;
          font-size: 14px;
          cursor: pointer;
          font-family: inherit;
          transition: 0.2s;
        }
        .form-btn:hover:not(:disabled) {
          background-color: #2ea043;
        }
        .form-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .emp-list {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          gap: 16px;
        }
        .emp-card {
          background-color: var(--panel);
          border: 1px solid var(--line);
          border-radius: 12px;
          padding: 20px;
          text-decoration: none;
          color: var(--text);
          display: flex;
          align-items: center;
          gap: 16px;
          transition: 0.2s;
        }
        .emp-card:hover {
          border-color: var(--mut);
          background-color: var(--btn);
        }
        .emp-icon {
          width: 48px;
          height: 48px;
          background-color: var(--line);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          color: var(--mut);
        }
        .emp-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .emp-name {
          font-size: 16px;
          font-weight: bold;
          color: #fff;
        }
        .emp-code {
          font-size: 12px;
          color: var(--mut);
        }
        .loading {
          text-align: center;
          color: var(--mut);
          padding: 40px;
        }
      `}} />

      <div className="dashboard-container">
        <div className="form-card">
          <h2 className="form-title">ثبت پرسنل جدید</h2>
          <form className="form-group" onSubmit={handleCreate}>
            <input 
              type="text"
              className="form-input"
              placeholder="نام و نام خانوادگی پرسنل را وارد کنید..."
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              disabled={isSubmitting}
            />
            <button type="submit" className="form-btn" disabled={!newName.trim() || isSubmitting}>
              {isSubmitting ? "در حال ثبت..." : "ثبت پرسنل"}
            </button>
          </form>
        </div>

        <div>
          <h2 className="form-title" style={{ marginBottom: "24px" }}>لیست پرسنل</h2>
          {loading ? (
            <div className="loading">در حال بارگذاری...</div>
          ) : employees.length === 0 ? (
            <div className="loading">هیچ پرسنلی ثبت نشده است.</div>
          ) : (
            <div className="emp-list">
              {employees.map(emp => (
                <Link href={`/payroll/${emp.id}`} key={emp.id} className="emp-card">
                  <div className="emp-icon">
                    <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div className="emp-info">
                    <span className="emp-name">{emp.name}</span>
                    <span className="emp-code">کد پرسنلی: {emp.code}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
