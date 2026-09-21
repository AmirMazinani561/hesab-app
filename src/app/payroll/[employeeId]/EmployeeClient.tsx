"use client";

import React, { useState, useEffect, useMemo } from "react";

const MONTHS = [
  "فروردین", "اردیبهشت", "خرداد",
  "تیر", "مرداد", "شهریور",
  "مهر", "آبان", "آذر",
  "دی", "بهمن", "اسفند"
];

const PAYMENT_TYPES = ["پول نقد", "شارژ و اینترنت", "خرید", "حواله حساب"];

const formatRial = (val: string | number) => {
  if (!val) return "";
  return val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

const parseRial = (val: string) => {
  return val.replace(/,/g, "").replace(/\D/g, "");
};

// Date formatter (auto slash)
const formatDateInput = (val: string) => {
  const digits = val.replace(/\D/g, "");
  if (digits.length <= 4) return digits;
  if (digits.length <= 6) return `${digits.slice(0,4)}/${digits.slice(4)}`;
  return `${digits.slice(0,4)}/${digits.slice(4,6)}/${digits.slice(6,8)}`;
};

const cleanDate = (val: string) => val.replace(/\D/g, "");

// Round up to nearest 50000
const roundUp50k = (val: bigint) => {
  if (val === 0n) return 0n;
  const remainder = val % 50000n;
  if (remainder === 0n) return val;
  return val + (50000n - remainder);
};

type RecordData = {
  id: string;
  base_salary_rial: string;
  overtime_days: number;
};

type Payment = {
  id: string;
  payment_date: string;
  amount_rial: string;
  description: string;
  payment_type: string;
};

export default function EmployeeClient({ employeeId, employeeName }: { employeeId: string, employeeName?: string }) {
  const [year, setYear] = useState(1405);
  const [month, setMonth] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [currentRecord, setCurrentRecord] = useState<RecordData | null>(null);
  const [prevRecord, setPrevRecord] = useState<RecordData | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);

  // Inputs
  const [baseSalary, setBaseSalary] = useState("");
  const [overtimeDays, setOvertimeDays] = useState("");
  
  // New Payment form
  const [payDate, setPayDate] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [payDesc, setPayDesc] = useState("");
  const [payType, setPayType] = useState(PAYMENT_TYPES[0]);
  const [addingPay, setAddingPay] = useState(false);
  const [prevPaymentsAmount, setPrevPaymentsAmount] = useState(BigInt(0));

  useEffect(() => {
    fetchData();
  }, [year, month]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const recRes = await fetch(`/api/payroll/records?employeeId=${employeeId}&year=${year}&month=${month}`);
      if (recRes.ok) {
        const { currentRecord: cur, prevRecord: prv } = await recRes.json();
        setCurrentRecord(cur);
        setPrevRecord(prv);
        setBaseSalary(cur ? cur.base_salary_rial : "");
        setOvertimeDays(cur ? String(cur.overtime_days) : "");

        if (cur?.id) {
          const payRes = await fetch(`/api/payroll/payments?recordId=${cur.id}`);
          if (payRes.ok) {
            setPayments(await payRes.json());
          }
        } else {
          setPayments([]);
        }

        if (prv?.id) {
          const prevPayRes = await fetch(`/api/payroll/payments?recordId=${prv.id}`);
          if (prevPayRes.ok) {
            const prevPays: Payment[] = await prevPayRes.json();
            const total = prevPays.reduce((acc, p) => acc + BigInt(p.amount_rial), BigInt(0));
            setPrevPaymentsAmount(total);
          }
        } else {
          setPrevPaymentsAmount(BigInt(0));
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const saveRecord = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const res = await fetch("/api/payroll/records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId,
          year,
          month,
          baseSalaryRial: parseRial(baseSalary) || "0",
          overtimeDays: parseFloat(overtimeDays) || 0
        }),
      });
      if (res.ok) {
        await fetchData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handlePayDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPayDate(formatDateInput(e.target.value));
  };

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentRecord?.id) {
      alert("ابتدا باید مبلغ حقوق را ذخیره کنید تا رکورد ماه ایجاد شود.");
      return;
    }
    const cleanD = cleanDate(payDate);
    if (!cleanD || !payAmount || !payType) return;
    
    setAddingPay(true);
    try {
      const res = await fetch("/api/payroll/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recordId: currentRecord.id,
          paymentDate: cleanD,
          amountRial: parseRial(payAmount),
          description: payDesc,
          paymentType: payType
        }),
      });
      if (res.ok) {
        setPayDate("");
        setPayAmount("");
        setPayDesc("");
        const payRes = await fetch(`/api/payroll/payments?recordId=${currentRecord.id}`);
        if (payRes.ok) {
          setPayments(await payRes.json());
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAddingPay(false);
    }
  };

  const handleDeletePayment = async (id: string) => {
    if (!confirm("آیا از حذف این پرداختی مطمئن هستید؟")) return;
    try {
      await fetch(`/api/payroll/payments?id=${id}`, { method: "DELETE" });
      setPayments(payments.filter(p => p.id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  // Calculations
  const calculated = useMemo(() => {
    // Prev Month Calc
    let prevBal = BigInt(0);
    if (prevRecord) {
      const pSal = BigInt(prevRecord.base_salary_rial || 0);
      const pOt = BigInt(Math.round(prevRecord.overtime_days || 0));
      const pOtAmt = roundUp50k((pSal / BigInt(30)) * pOt);
      prevBal = (pSal + pOtAmt) - prevPaymentsAmount;
    }

    // Current Month Calc
    const cSal = BigInt(parseRial(baseSalary) || 0);
    const cOt = BigInt(Math.round(parseFloat(overtimeDays) || 0));
    const rawOtAmt = (cSal / BigInt(30)) * cOt;
    const cOtAmt = roundUp50k(rawOtAmt);
    
    const cPays = payments.reduce((acc, p) => acc + BigInt(p.amount_rial), BigInt(0));
    
    const finalBalance = (prevBal + cSal + cOtAmt) - cPays;

    return {
      prevBal,
      cSal,
      cOtAmt,
      cPays,
      finalBalance
    };
  }, [prevRecord, prevPaymentsAmount, baseSalary, overtimeDays, payments]);

  const groupedPayments = useMemo(() => {
    const groups: Record<string, { total: bigint, list: Payment[] }> = {};
    payments.forEach(p => {
      if (!groups[p.payment_type]) groups[p.payment_type] = { total: BigInt(0), list: [] };
      groups[p.payment_type].total += BigInt(p.amount_rial);
      groups[p.payment_type].list.push(p);
    });
    return groups;
  }, [payments]);

  const getRowStyle = (type: string) => {
    switch(type) {
      case "پول نقد": return { backgroundColor: "rgba(63, 185, 80, 0.15)" }; // green
      case "شارژ و اینترنت": return { backgroundColor: "rgba(88, 166, 255, 0.15)" }; // blue
      case "خرید": return { backgroundColor: "rgba(210, 153, 34, 0.15)" }; // yellow
      case "حواله حساب": return { backgroundColor: "rgba(137, 87, 229, 0.15)" }; // purple
      default: return {};
    }
  };

  return (
    <div>
      <style dangerouslySetInnerHTML={{__html: `
        .filters { display: flex; gap: 16px; margin-bottom: 24px; align-items: center; justify-content: space-between; }
        .filters-left { display: flex; gap: 16px; }
        .filter-select {
          background-color: var(--panel);
          border: 1px solid var(--line);
          color: var(--text);
          padding: 8px 16px;
          border-radius: 6px;
          font-family: inherit;
          font-size: 14px;
        }
        .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px; }
        .box {
          background-color: var(--panel);
          border: 1px solid var(--line);
          border-radius: 12px;
          padding: 24px;
          text-align: center;
        }
        .box-title { color: var(--mut); font-size: 14px; margin-bottom: 12px; }
        .box-value { font-size: 24px; font-weight: bold; color: #fff; }
        .box-input {
          background: var(--bg);
          border: 1px solid var(--line);
          color: var(--text);
          font-size: 20px;
          font-weight: bold;
          padding: 8px 12px;
          border-radius: 6px;
          width: 100%;
          text-align: center;
          font-family: inherit;
        }
        .box-input:focus { outline: none; border-color: #58a6ff; }
        .save-btn {
          background: #238636;
          color: #fff;
          border: none;
          padding: 8px 16px;
          border-radius: 6px;
          cursor: pointer;
          font-family: inherit;
          font-weight: bold;
          margin-top: 16px;
        }
        .save-btn:hover { background: #2ea043; }
        .save-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .print-btn {
          background: #1f6feb;
          color: #fff;
          border: none;
          padding: 8px 16px;
          border-radius: 6px;
          cursor: pointer;
          font-family: inherit;
          font-weight: bold;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .print-btn:hover { background: #388bfd; }
        
        .table-wrap {
          background: var(--panel);
          border: 1px solid var(--line);
          border-radius: 12px;
          overflow: hidden;
          margin-bottom: 24px;
        }
        .table { width: 100%; border-collapse: collapse; }
        .table th, .table td {
          padding: 12px 16px;
          border-bottom: 1px solid var(--line);
          text-align: right;
          color: var(--text);
          font-size: 14px;
        }
        .table th { background: var(--btn); font-weight: bold; color: var(--mut); }
        .table tr:last-child td { border-bottom: none; }
        .del-btn { color: #f85149; background: none; border: none; cursor: pointer; }
        
        .add-pay-form {
          display: flex;
          gap: 12px;
          padding: 16px;
          background: var(--bg);
          border-top: 1px solid var(--line);
        }
        .pay-input {
          background: var(--panel);
          border: 1px solid var(--line);
          color: var(--text);
          padding: 8px 12px;
          border-radius: 6px;
          font-family: inherit;
          font-size: 14px;
        }

        /* --- PRINT A4 STYLES --- */
        @media print {
          @page { size: A4 portrait; margin: 15mm; }
          body, html {
            background-color: #fff !important;
            color: #111 !important;
            font-family: Vazirmatn, sans-serif !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print { display: none !important; }
          .print-only { 
            display: block !important; 
            width: 100% !important; 
            max-width: none !important; 
            box-sizing: border-box; 
          }
          .payroll-header { display: none !important; }
          .payroll-main { margin: 0 !important; padding: 0 !important; max-width: none !important; width: 100% !important; box-sizing: border-box; }
          
          .report-header {
            text-align: center;
            border-bottom: 2px solid #333;
            padding-bottom: 10px;
            margin-bottom: 20px;
            width: 100%;
          }
          .report-header h2 { margin: 0; font-size: 20px; color: #111 !important; text-align: center; }
          .report-header p { margin: 5px 0 0 0; font-size: 14px; color: #333 !important; text-align: center; }
          
          .report-grid-3 {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 15px;
            margin-bottom: 20px;
            width: 100%;
          }
          .report-grid-4 {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 10px;
            margin-bottom: 20px;
            align-items: stretch;
            width: 100%;
          }
          .report-box {
            border: 1px solid #333;
            border-radius: 6px;
            padding: 12px;
            text-align: center;
            background-color: #f3f4f6 !important;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
          }
          .report-box-title { font-size: 12px; font-weight: bold; margin-bottom: 8px; color: #111 !important; text-align: center; }
          .report-box-value { font-size: 18px; font-weight: bold; color: #111 !important; text-align: center; }
          
          .report-pos { color: #1a7f37 !important; } /* Green */
          .report-neg { color: #d1242f !important; } /* Red */
          
          .report-group-wrap {
            margin-bottom: 0;
            page-break-inside: avoid;
            display: flex;
            flex-direction: column;
            height: 100%;
            border: 1px solid #333;
            box-sizing: border-box;
          }
          .report-group-title {
            background-color: #f3f4f6 !important;
            border-bottom: 1px solid #333;
            padding: 8px 12px;
            font-weight: bold;
            font-size: 14px;
            display: flex;
            justify-content: center;
            align-items: center;
            color: #111 !important;
            text-align: center;
          }
          .report-table {
            width: 100%;
            border-collapse: collapse;
          }
          .report-table th, .report-table td {
            border: 1px solid #333;
            padding: 6px 10px;
            text-align: center;
            font-size: 12px;
            color: #111 !important;
            border-left: none;
            border-right: none;
          }
          .report-table tr:first-child th, .report-table tr:first-child td {
            border-top: none;
          }
          .report-table tr:last-child th, .report-table tr:last-child td {
            border-bottom: none;
          }
          .report-table th { background-color: #f3f4f6 !important; color: #111 !important; text-align: center; }
          
          .empty-data-td {
            text-align: center !important;
            vertical-align: middle;
            color: #111 !important;
            padding: 20px !important;
            border-bottom: none !important;
          }
          
          .report-footer-box {
            border: 2px solid #333;
            padding: 15px;
            text-align: center;
            margin-top: 30px;
            border-radius: 8px;
            background-color: #f3f4f6 !important;
            page-break-inside: avoid;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            width: 100%;
            box-sizing: border-box;
          }
          .report-footer-title { font-size: 16px; font-weight: bold; margin-bottom: 10px; color: #111 !important; text-align: center; }
          .report-footer-val { font-size: 24px; font-weight: bold; text-align: center; }
          }
          .report-footer-title { font-size: 16px; font-weight: bold; margin-bottom: 10px; }
          .report-footer-val { font-size: 24px; font-weight: bold; }
        }
        @media screen {
          .print-only { display: none !important; }
        }
      `}} />

      {/* --- SCREEN UI --- */}
      <div className="no-print">
        <div className="filters">
          <div className="filters-left">
            <select className="filter-select" value={year} onChange={e => setYear(Number(e.target.value))}>
              {[1405, 1406, 1407, 1408, 1409].map(y => <option key={y} value={y}>سال {y}</option>)}
            </select>
            <select className="filter-select" value={month} onChange={e => setMonth(Number(e.target.value))}>
              {MONTHS.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
            </select>
          </div>
          <button className="print-btn" onClick={() => window.print()}>
            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            گزارش چاپی
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", color: "var(--mut)", padding: 40 }}>در حال بارگذاری...</div>
        ) : (
          <>
            <div className="grid-2">
              <div className="box">
                <div className="box-title">مبلغ ریالی حقوق این ماه</div>
                <input 
                  type="text"
                  className="box-input"
                  value={formatRial(baseSalary)}
                  onChange={e => setBaseSalary(parseRial(e.target.value))}
                  placeholder="مثلاً 100,000,000"
                />
                <button className="save-btn" onClick={saveRecord} disabled={saving}>
                  {saving ? "در حال ذخیره..." : "ذخیره تغییرات ماه"}
                </button>
              </div>
              <div className="box">
                <div className="box-title">طلب/بدهی از ماه قبل</div>
                <div className="box-value" style={{ color: calculated.prevBal < BigInt(0) ? "#f85149" : "#3fb950" }}>
                  {calculated.prevBal < BigInt(0) ? "-" : ""}{formatRial(calculated.prevBal < BigInt(0) ? (-calculated.prevBal).toString() : calculated.prevBal.toString())}
                </div>
                <div style={{ fontSize: 12, color: "var(--mut)", marginTop: 8 }}>(محاسبه خودکار)</div>
              </div>
            </div>

            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>ردیف</th>
                    <th>تاریخ</th>
                    <th>نوع پرداخت</th>
                    <th>شرح</th>
                    <th>مبلغ پرداختی</th>
                    <th>عملیات</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p, i) => (
                    <tr key={p.id} style={getRowStyle(p.payment_type)}>
                      <td>{i + 1}</td>
                      <td>{formatDateInput(p.payment_date)}</td>
                      <td>{p.payment_type}</td>
                      <td>{p.description}</td>
                      <td style={{ fontWeight: "bold" }}>{formatRial(p.amount_rial)}</td>
                      <td>
                        <button className="del-btn" onClick={() => handleDeletePayment(p.id)}>حذف</button>
                      </td>
                    </tr>
                  ))}
                  {payments.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ textAlign: "center", color: "var(--mut)" }}>هیچ پرداختی در این ماه ثبت نشده است.</td>
                    </tr>
                  )}
                </tbody>
              </table>
              
              <form className="add-pay-form" onSubmit={handleAddPayment}>
                <input required type="text" className="pay-input" placeholder="تاریخ (مثلاً 1405/01/10)" value={payDate} onChange={handlePayDateChange} style={{ width: 140 }} />
                <select className="pay-input" value={payType} onChange={e => setPayType(e.target.value)}>
                  {PAYMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <input type="text" className="pay-input" placeholder="شرح (اختیاری)" value={payDesc} onChange={e => setPayDesc(e.target.value)} style={{ flex: 1 }} />
                <input required type="text" className="pay-input" placeholder="مبلغ ریالی" value={formatRial(payAmount)} onChange={e => setPayAmount(parseRial(e.target.value))} style={{ width: 150 }} />
                <button type="submit" className="save-btn" style={{ margin: 0 }} disabled={addingPay || !currentRecord?.id}>
                  {addingPay ? "..." : "افزودن"}
                </button>
              </form>
            </div>

            <div className="grid-2" style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
              <div className="box">
                <div className="box-title">تعداد روزهای اضافه‌کار</div>
                <input 
                  type="number"
                  step="0.5"
                  className="box-input"
                  value={overtimeDays}
                  onChange={e => setOvertimeDays(e.target.value)}
                  placeholder="مثلاً 2.5"
                />
                <button className="save-btn" onClick={saveRecord} disabled={saving}>ذخیره</button>
              </div>
              
              <div className="box">
                <div className="box-title">مبلغ کل اضافه‌کار (رند شده)</div>
                <div className="box-value">{formatRial(calculated.cOtAmt.toString())}</div>
                <div style={{ fontSize: 12, color: "var(--mut)", marginTop: 8 }}>(پایه ÷ ۳۰ × روزها، رند به ۵۰هزار بالا)</div>
              </div>

              <div className="box" style={{ borderColor: calculated.finalBalance < BigInt(0) ? "#f85149" : "#3fb950" }}>
                <div className="box-title">جمع طلب یا بدهی پایان ماه</div>
                <div className="box-value" style={{ color: calculated.finalBalance < BigInt(0) ? "#f85149" : "#3fb950" }}>
                  {calculated.finalBalance < BigInt(0) ? "-" : ""}{formatRial(calculated.finalBalance < BigInt(0) ? (-calculated.finalBalance).toString() : calculated.finalBalance.toString())}
                </div>
                <div style={{ fontSize: 12, color: "var(--mut)", marginTop: 8 }}>
                  {calculated.finalBalance < BigInt(0) ? "(بدهی به شرکت)" : "(طلب از شرکت)"}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* --- A4 PRINT UI --- */}
      <div className="print-only" dir="rtl">
        <div className="report-header">
          <h2>فیش حقوقی و صورت‌وضعیت پرسنل</h2>
          <p>
            {employeeName ? `نام پرسنل: ${employeeName} | ` : ""}
            دوره: {MONTHS[month - 1]} سال {year}
          </p>
        </div>

        {/* Row 1: Income & Balances */}
        <div className="report-grid-3">
          <div className="report-box">
            <div className="report-box-title">حقوق ماه</div>
            <div className="report-box-value">{formatRial(calculated.cSal.toString())} ریال</div>
          </div>
          <div className="report-box">
            <div className="report-box-title">مانده ماه قبل</div>
            <div className={`report-box-value ${calculated.prevBal < 0n ? "report-neg" : "report-pos"}`}>
              {calculated.prevBal < 0n ? "-" : ""}{formatRial(calculated.prevBal < 0n ? (-calculated.prevBal).toString() : calculated.prevBal.toString())} ریال
              <span style={{fontSize: "12px", marginRight: "8px", fontWeight: "normal"}}>
                {calculated.prevBal < 0n ? "(بدهکار)" : "(بستانکار)"}
              </span>
            </div>
          </div>
          <div className="report-box">
            <div className="report-box-title">اضافه‌کار ({overtimeDays || "0"} روز)</div>
            <div className="report-box-value">{formatRial(calculated.cOtAmt.toString())} ریال</div>
          </div>
        </div>

        {/* Row 2 & 3: Payment Summaries & Details */}
        <div className="report-grid-4">
          {PAYMENT_TYPES.map(type => {
            const data = groupedPayments[type] || { total: 0n, list: [] };
            return (
              <div key={type} className="report-group-wrap" style={{ marginBottom: 0 }}>
                <div className="report-group-title">
                  <span>جمع {type}: {formatRial(data.total.toString())}</span>
                </div>
                <table className="report-table">
                  <thead>
                    <tr>
                      <th>تاریخ</th>
                      <th>مبلغ (ریال)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.list.length > 0 ? (
                      data.list.map(p => (
                        <tr key={p.id}>
                          <td>{formatDateInput(p.payment_date)}</td>
                          <td style={{ fontWeight: "bold" }}>{formatRial(p.amount_rial)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={2} className="empty-data-td">موردی ثبت نشده</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>

        {/* Row 4: Final Result */}
        <div className="report-footer-box">
          <div className="report-footer-title">مانده نهایی ماه</div>
          <div className={`report-footer-val ${calculated.finalBalance < 0n ? "report-neg" : "report-pos"}`}>
             {calculated.finalBalance < 0n ? "بدهکار به شرکت: " : "بستانکار از شرکت: "}
             {formatRial(calculated.finalBalance < 0n ? (-calculated.finalBalance).toString() : calculated.finalBalance.toString())} ریال
          </div>
        </div>
      </div>
    </div>
  );
}
