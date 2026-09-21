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

export default function EmployeeClient({ employeeId }: { employeeId: string }) {
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
      // 1. Fetch records
      const recRes = await fetch(`/api/payroll/records?employeeId=${employeeId}&year=${year}&month=${month}`);
      if (recRes.ok) {
        const { currentRecord: cur, prevRecord: prv } = await recRes.json();
        setCurrentRecord(cur);
        setPrevRecord(prv);
        setBaseSalary(cur ? cur.base_salary_rial : "");
        setOvertimeDays(cur ? String(cur.overtime_days) : "");

        // 2. Fetch payments for current record
        if (cur?.id) {
          const payRes = await fetch(`/api/payroll/payments?recordId=${cur.id}`);
          if (payRes.ok) {
            setPayments(await payRes.json());
          }
        } else {
          setPayments([]);
        }

        // 3. Fetch payments for previous record to calculate exact balance
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

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentRecord?.id) {
      alert("ابتدا باید مبلغ حقوق را ذخیره کنید تا رکورد ماه ایجاد شود.");
      return;
    }
    if (!payDate || !payAmount || !payType) return;
    
    setAddingPay(true);
    try {
      const res = await fetch("/api/payroll/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recordId: currentRecord.id,
          paymentDate: payDate,
          amountRial: parseRial(payAmount),
          description: payDesc,
          paymentType: payType
        }),
      });
      if (res.ok) {
        setPayDate("");
        setPayAmount("");
        setPayDesc("");
        // refresh payments
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
      const pOtAmt = (pSal / BigInt(30)) * pOt;
      prevBal = (pSal + pOtAmt) - prevPaymentsAmount;
      // Note: In a real system, you'd carry over the exact cumulative balance.
      // Here we are calculating just based on previous month's single snapshot.
    }

    // Current Month Calc
    const cSal = BigInt(parseRial(baseSalary) || 0);
    const cOt = BigInt(Math.round(parseFloat(overtimeDays) || 0));
    const cOtAmt = (cSal / BigInt(30)) * cOt;
    
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

  return (
    <div>
      <style dangerouslySetInnerHTML={{__html: `
        .filters { display: flex; gap: 16px; margin-bottom: 24px; }
        .filter-select {
          background-color: #161b22;
          border: 1px solid #30363d;
          color: #c9d1d9;
          padding: 8px 16px;
          border-radius: 6px;
          font-family: inherit;
          font-size: 14px;
        }
        .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px; }
        .box {
          background-color: #161b22;
          border: 1px solid #30363d;
          border-radius: 12px;
          padding: 24px;
          text-align: center;
        }
        .box-title { color: #8b949e; font-size: 14px; margin-bottom: 12px; }
        .box-value { font-size: 24px; font-weight: bold; color: #fff; }
        .box-input {
          background: #0d1117;
          border: 1px solid #30363d;
          color: #fff;
          font-size: 24px;
          font-weight: bold;
          text-align: center;
          padding: 8px;
          border-radius: 6px;
          width: 100%;
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
        
        .table-wrap {
          background: #161b22;
          border: 1px solid #30363d;
          border-radius: 12px;
          overflow: hidden;
          margin-bottom: 24px;
        }
        .table { width: 100%; border-collapse: collapse; }
        .table th, .table td {
          padding: 12px 16px;
          border-bottom: 1px solid #30363d;
          text-align: right;
          color: #c9d1d9;
          font-size: 14px;
        }
        .table th { background: #21262d; font-weight: bold; color: #8b949e; }
        .table tr:last-child td { border-bottom: none; }
        .del-btn { color: #f85149; background: none; border: none; cursor: pointer; }
        
        .add-pay-form {
          display: flex;
          gap: 12px;
          padding: 16px;
          background: #0d1117;
          border-top: 1px solid #30363d;
        }
        .pay-input {
          background: #161b22;
          border: 1px solid #30363d;
          color: #fff;
          padding: 8px 12px;
          border-radius: 6px;
          font-family: inherit;
          font-size: 14px;
        }
      `}} />

      <div className="filters">
        <select className="filter-select" value={year} onChange={e => setYear(Number(e.target.value))}>
          {[1405, 1406, 1407, 1408, 1409].map(y => <option key={y} value={y}>سال {y}</option>)}
        </select>
        <select className="filter-select" value={month} onChange={e => setMonth(Number(e.target.value))}>
          {MONTHS.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
        </select>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", color: "#8b949e", padding: 40 }}>در حال بارگذاری...</div>
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
              <div style={{ fontSize: 12, color: "#8b949e", marginTop: 8 }}>(محاسبه خودکار)</div>
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
                  <tr key={p.id}>
                    <td>{i + 1}</td>
                    <td>{p.payment_date}</td>
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
                    <td colSpan={6} style={{ textAlign: "center", color: "#8b949e" }}>هیچ پرداختی در این ماه ثبت نشده است.</td>
                  </tr>
                )}
              </tbody>
            </table>
            
            <form className="add-pay-form" onSubmit={handleAddPayment}>
              <input required type="text" className="pay-input" placeholder="تاریخ (e.g. 14050110)" value={payDate} onChange={e => setPayDate(e.target.value)} style={{ width: 120 }} />
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
              <div className="box-title">مبلغ کل اضافه‌کار</div>
              <div className="box-value">{formatRial(calculated.cOtAmt.toString())}</div>
              <div style={{ fontSize: 12, color: "#8b949e", marginTop: 8 }}>(فرمول: حقوق این ماه ÷ ۳۰ × روزها)</div>
            </div>

            <div className="box" style={{ borderColor: calculated.finalBalance < BigInt(0) ? "#f85149" : "#3fb950" }}>
              <div className="box-title">جمع طلب یا بدهی پایان ماه</div>
              <div className="box-value" style={{ color: calculated.finalBalance < BigInt(0) ? "#f85149" : "#3fb950" }}>
                {calculated.finalBalance < BigInt(0) ? "-" : ""}{formatRial(calculated.finalBalance < BigInt(0) ? (-calculated.finalBalance).toString() : calculated.finalBalance.toString())}
              </div>
              <div style={{ fontSize: 12, color: "#8b949e", marginTop: 8 }}>
                {calculated.finalBalance < BigInt(0) ? "(بدهی به شرکت)" : "(طلب از شرکت)"}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
