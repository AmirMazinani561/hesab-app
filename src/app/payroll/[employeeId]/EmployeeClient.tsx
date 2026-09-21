"use client";

import React, { useState, useEffect, useMemo } from "react";

const MONTHS = [
  "فروردین", "اردیبهشت", "خرداد",
  "تیر", "مرداد", "شهریور",
  "مهر", "آبان", "آذر",
  "دی", "بهمن", "اسفند"
];

const PAYMENT_TYPES = ["پول نقد", "شارژ و اینترنت", "خرید", "حواله حساب"];

// توابع هوشمند تبدیل اعداد فارسی و انگلیسی
const toPersianDigits = (str: string | number) => {
  if (str === null || str === undefined) return "";
  const persianDigits = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
  return str.toString().replace(/\d/g, (x) => persianDigits[parseInt(x)]);
};

const toEnglishDigits = (str: string) => {
  if (!str) return "";
  const persianToEnglishMap: Record<string, string> = {
    "۰": "0", "۱": "1", "۲": "2", "۳": "3", "۴": "4", "۵": "5", "۶": "6", "۷": "7", "۸": "8", "۹": "9",
    "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4", "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9"
  };
  return str.replace(/[۰-۹٠-٩]/g, match => persianToEnglishMap[match]);
};

const formatRial = (val: string | number) => {
  if (!val) return "";
  const enVal = val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return toPersianDigits(enVal);
};

const parseRial = (val: string) => {
  const enVal = toEnglishDigits(val);
  return enVal.replace(/,/g, "").replace(/\D/g, "");
};

const formatDateInput = (val: string) => {
  const enVal = toEnglishDigits(val);
  const digits = enVal.replace(/\D/g, "");
  let formatted = digits;
  if (digits.length > 4 && digits.length <= 6) {
    formatted = `${digits.slice(0, 4)}/${digits.slice(4)}`;
  } else if (digits.length > 6) {
    formatted = `${digits.slice(0, 4)}/${digits.slice(4, 6)}/${digits.slice(6, 8)}`;
  }
  return toPersianDigits(formatted);
};

const cleanDate = (val: string) => toEnglishDigits(val).replace(/\D/g, "");

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

  const [baseSalary, setBaseSalary] = useState("");
  const [overtimeDays, setOvertimeDays] = useState("");
  
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
          overtimeDays: parseFloat(toEnglishDigits(overtimeDays)) || 0
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

  // مرتب‌سازی ریاضی و قطعی تاریخ‌ها (از قدیمی به جدید)
  const sortedPayments = useMemo(() => {
    return [...payments].sort((a, b) => {
      // تبدیل تاریخ به عدد خالص برای مقایسه دقیق (مثلاً ۱۴۰۵۰۶۲۹ -> 14050629)
      const dA = parseInt(toEnglishDigits(a.payment_date || "0").replace(/\D/g, ""), 10) || 0;
      const dB = parseInt(toEnglishDigits(b.payment_date || "0").replace(/\D/g, ""), 10) || 0;
      
      if (dA !== dB) {
        return dA - dB;
      }
      return (a.id || "").localeCompare(b.id || "");
    });
  }, [payments]);

  const calculated = useMemo(() => {
    let prevBal = BigInt(0);
    if (prevRecord) {
      const pSal = BigInt(prevRecord.base_salary_rial || 0);
      const pOt = BigInt(Math.round(prevRecord.overtime_days || 0));
      const pOtAmt = roundUp50k((pSal / BigInt(30)) * pOt);
      prevBal = (pSal + pOtAmt) - prevPaymentsAmount;
    }

    const cSal = BigInt(parseRial(baseSalary) || 0);
    const otValue = parseFloat(toEnglishDigits(overtimeDays)) || 0;
    const cOt = BigInt(Math.round(otValue));
    const rawOtAmt = (cSal / BigInt(30)) * cOt;
    const cOtAmt = roundUp50k(rawOtAmt);
    
    // استفاده از لیست مرتب‌شده برای محاسبه
    const cPays = sortedPayments.reduce((acc, p) => acc + BigInt(p.amount_rial), BigInt(0));
    const finalBalance = (prevBal + cSal + cOtAmt) - cPays;

    return { prevBal, cSal, cOtAmt, cPays, finalBalance };
  }, [prevRecord, prevPaymentsAmount, baseSalary, overtimeDays, sortedPayments]);

  const groupedPayments = useMemo(() => {
    const groups: Record<string, { total: bigint, list: Payment[] }> = {};
    // گروه‌بندی از روی لیست مرتب‌شده انجام می‌شود تا در پرینت هم تاریخ‌ها مرتب باشند
    sortedPayments.forEach(p => {
      if (!groups[p.payment_type]) groups[p.payment_type] = { total: BigInt(0), list: [] };
      groups[p.payment_type].total += BigInt(p.amount_rial);
      groups[p.payment_type].list.push(p);
    });
    return groups;
  }, [sortedPayments]);

  const getRowStyle = (type: string) => {
    switch(type) {
      case "پول نقد": return { backgroundColor: "rgba(26, 127, 55, 0.1)" };
      case "شارژ و اینترنت": return { backgroundColor: "rgba(9, 105, 218, 0.1)" };
      case "خرید": return { backgroundColor: "rgba(180, 83, 9, 0.1)" };
      case "حواله حساب": return { backgroundColor: "rgba(137, 87, 229, 0.1)" };
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
        .box-value { font-size: 24px; font-weight: bold; color: var(--text); }
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
        .box-input:focus { outline: none; border-color: #0969da; }
        .save-btn {
          background: #1a7f37;
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
          background: #0969da;
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
          text-align: center;
          vertical-align: middle;
          color: var(--text);
          font-size: 14px;
        }
        .table th { background: var(--panel2); font-weight: bold; color: var(--mut); }
        .table tr:last-child td { border-bottom: none; }
        .del-btn { color: #d1242f; background: none; border: none; cursor: pointer; }
        
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

        @media print {
          @page { size: A4 portrait; margin: 10mm; }
          body, html {
            background-color: #fff !important;
            color: #000 !important;
            font-family: Vazirmatn, sans-serif !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .no-print { display: none !important; }
          .print-only { 
            display: block !important; 
            width: 100% !important; 
            box-sizing: border-box !important;
            direction: rtl;
          }
          
          .report-header {
            text-align: center;
            border-bottom: 2px solid #000;
            padding-bottom: 10px;
            margin-bottom: 20px;
            width: 100%;
          }
          .report-header h2 { 
            margin: 0 auto; 
            font-size: 20px; 
            color: #000 !important; 
            text-align: center; 
          }
          .report-header p { 
            margin: 6px 0 0 0; 
            font-size: 14px; 
            color: #333 !important; 
            text-align: center; 
          }
          
          .report-grid-3 {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 15px;
            margin-bottom: 20px;
          }
          .report-box {
            border: 2px solid #000 !important;
            border-radius: 8px;
            padding: 12px;
            background-color: #f3f4f6 !important;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            height: 110px; 
            box-sizing: border-box;
          }
          .report-box-title { font-size: 13px; font-weight: bold; margin-bottom: 8px; color: #000 !important; text-align: center; }
          .report-box-value { font-size: 20px; font-weight: bold; color: #000 !important; margin-bottom: 6px; text-align: center; line-height: 1.1; }
          .report-box-sub { font-size: 13px; color: #000 !important; text-align: center; }
          
          .report-pos { color: #1a7f37 !important; }
          .report-neg { color: #d1242f !important; }
          
          .report-grid-4 {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 10px;
            margin-bottom: 20px;
            align-items: stretch;
          }
          .report-group-wrap {
            display: flex;
            flex-direction: column;
            border: 2px solid #000 !important;
            border-radius: 8px;
            background: #fff !important;
            overflow: hidden;
            box-sizing: border-box;
          }
          
          .report-group-header {
            background-color: #f1f5f9 !important;
            border-bottom: 2px solid #000 !important; 
            padding: 10px 4px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 70px; 
          }
          .rg-title { font-size: 13px; font-weight: bold; color: #000 !important; text-align: center; }
          .rg-amount { font-size: 15px; font-weight: bold; color: #000 !important; margin-top: 6px; text-align: center; }
          
          .flex-th {
            display: flex;
            background: #f8fafc !important;
            border-bottom: 2px solid #000 !important;
            height: 36px;
            align-items: stretch;
          }
          .flex-th > div {
            flex: 1;
            text-align: center;
            font-size: 12px;
            font-weight: bold;
            color: #000 !important;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .flex-th > div:first-child { border-left: 1px solid #000 !important; }
          
          .flex-tbody {
            display: flex;
            flex-direction: column;
            flex-grow: 1;
          }
          .flex-tr {
            display: flex;
            border-bottom: 1px solid #000 !important;
            min-height: 34px;
          }
          .flex-tr:last-child { border-bottom: none !important; }
          .flex-tr > div {
            flex: 1;
            text-align: center;
            padding: 6px 2px;
            font-size: 12px;
            color: #000 !important;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .flex-tr > div:first-child { border-left: 1px solid #000 !important; }
          
          .flex-empty {
            display: flex;
            align-items: center;
            justify-content: center;
            flex-grow: 1;
            padding: 20px;
            color: #555 !important;
            font-size: 12px;
          }
          
          .report-footer-box {
            border: 2px solid #000 !important;
            padding: 15px;
            border-radius: 8px;
            background-color: #f3f4f6 !important;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
          }
          .report-footer-title { font-size: 16px; font-weight: bold; margin-bottom: 10px; color: #000 !important; }
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
              {[1405, 1406, 1407, 1408, 1409].map(y => <option key={y} value={y}>سال {toPersianDigits(y)}</option>)}
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
                  placeholder="مثلاً ۱۰۰,۰۰۰,۰۰۰"
                />
                <button className="save-btn" onClick={saveRecord} disabled={saving}>
                  {saving ? "در حال ذخیره..." : "ذخیره تغییرات ماه"}
                </button>
              </div>
              <div className="box">
                <div className="box-title">طلب/بدهی از ماه قبل</div>
                <div className="box-value" style={{ color: calculated.prevBal < BigInt(0) ? "var(--down)" : "var(--up)" }}>
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
                  {/* رندر بر اساس لیست مرتب شده جدید */}
                  {sortedPayments.map((p, i) => (
                    <tr key={p.id} style={getRowStyle(p.payment_type)}>
                      <td>{toPersianDigits(i + 1)}</td>
                      <td>{formatDateInput(p.payment_date)}</td>
                      <td>{p.payment_type}</td>
                      <td>{p.description}</td>
                      <td style={{ fontWeight: "bold" }}>{formatRial(p.amount_rial)}</td>
                      <td>
                        <button className="del-btn" onClick={() => handleDeletePayment(p.id)}>حذف</button>
                      </td>
                    </tr>
                  ))}
                  {sortedPayments.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ textAlign: "center", color: "var(--mut)" }}>هیچ پرداختی در این ماه ثبت نشده است.</td>
                    </tr>
                  )}
                </tbody>
              </table>
              
              <form className="add-pay-form" onSubmit={handleAddPayment}>
                <input required type="text" className="pay-input" placeholder="تاریخ (مثلاً ۱۴۰۵/۰۱/۱۰)" value={payDate} onChange={handlePayDateChange} style={{ width: 140 }} />
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
                  type="text"
                  inputMode="decimal"
                  className="box-input"
                  value={toPersianDigits(overtimeDays)}
                  onChange={e => {
                    const enVal = toEnglishDigits(e.target.value).replace(/[٫/]/g, ".").replace(/[^0-9.]/g, "");
                    setOvertimeDays(enVal);
                  }}
                  placeholder="مثلاً ۲.۵"
                />
                <button className="save-btn" onClick={saveRecord} disabled={saving}>ذخیره</button>
              </div>
              
              <div className="box">
                <div className="box-title">مبلغ کل اضافه‌کار (رند شده)</div>
                <div className="box-value">{formatRial(calculated.cOtAmt.toString())}</div>
                <div style={{ fontSize: 12, color: "var(--mut)", marginTop: 8 }}>(پایه ÷ ۳۰ × روزها، رند به ۵۰هزار بالا)</div>
              </div>

              <div className="box" style={{ borderColor: calculated.finalBalance < BigInt(0) ? "var(--down)" : "var(--up)" }}>
                <div className="box-title">جمع طلب یا بدهی پایان ماه</div>
                <div className="box-value" style={{ color: calculated.finalBalance < BigInt(0) ? "var(--down)" : "var(--up)" }}>
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
      <div className="print-only">
        <div className="report-header">
          <h2>فیش حقوقی و صورت‌وضعیت پرسنل</h2>
          <p>
            {employeeName ? `نام پرسنل: ${employeeName} | ` : ""}
            دوره: {MONTHS[month - 1]} سال {toPersianDigits(year)}
          </p>
        </div>

        <div className="report-grid-3">
          <div className="report-box">
            <div className="report-box-title">حقوق ماه</div>
            <div className="report-box-value">{formatRial(calculated.cSal.toString())}</div>
            <div className="report-box-sub">ریال</div>
          </div>
          <div className="report-box">
            <div className="report-box-title">مانده ماه قبل</div>
            <div className={`report-box-value ${calculated.prevBal < 0n ? "report-neg" : "report-pos"}`}>
              {calculated.prevBal < 0n ? "-" : ""}{formatRial(calculated.prevBal < 0n ? (-calculated.prevBal).toString() : calculated.prevBal.toString())}
            </div>
            <div className="report-box-sub">ریال {calculated.prevBal < 0n ? "(بدهکار)" : "(بستانکار)"}</div>
          </div>
          <div className="report-box">
            <div className="report-box-title">اضافه‌کار ({toPersianDigits(overtimeDays || "0")} روز)</div>
            <div className="report-box-value">{formatRial(calculated.cOtAmt.toString())}</div>
            <div className="report-box-sub">ریال</div>
          </div>
        </div>

        <div className="report-grid-4">
          {PAYMENT_TYPES.map(type => {
            const data = groupedPayments[type] || { total: 0n, list: [] };
            return (
              <div key={type} className="report-group-wrap">
                <div className="report-group-header">
                  <div className="rg-title">جمع {type}:</div>
                  <div className="rg-amount">{formatRial(data.total.toString()) || "۰"}</div>
                </div>
                
                <div className="flex-th">
                  <div>تاریخ</div>
                  <div>مبلغ (ریال)</div>
                </div>
                
                <div className="flex-tbody">
                  {data.list.length > 0 ? (
                    data.list.map(p => (
                      <div className="flex-tr" key={p.id}>
                        <div>{formatDateInput(p.payment_date)}</div>
                        <div style={{ fontWeight: "bold" }}>{formatRial(p.amount_rial)}</div>
                      </div>
                    ))
                  ) : (
                    <div className="flex-empty">موردی ثبت نشده</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

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