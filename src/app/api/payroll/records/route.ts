import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getMonthlyRecord, getPreviousMonthlyRecord, saveMonthlyRecord, listPayments } from "@/db/repo";

export async function GET(req: Request) {
  try {
    await requireUser();
    
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get("employeeId");
    const year = parseInt(searchParams.get("year") || "");
    const month = parseInt(searchParams.get("month") || "");

    if (!employeeId || isNaN(year) || isNaN(month)) {
      return NextResponse.json({ error: "employeeId, year, and month are required" }, { status: 400 });
    }

    const currentRecord = await getMonthlyRecord(employeeId, year, month);
    const prevRecord = await getPreviousMonthlyRecord(employeeId, year, month);
    
    // We also need to fetch payments for the previous month to calculate the exact previous balance
    let prevBalance = BigInt(0);
    if (prevRecord) {
      const prevPayments = await listPayments(prevRecord.id);
      const prevTotalPayments = prevPayments.reduce((acc, p) => acc + BigInt(p.amount_rial), BigInt(0));
      
      const prevSalary = BigInt(prevRecord.base_salary_rial || 0);
      const prevOvertimeDays = prevRecord.overtime_days || 0;
      
      // Calculate previous overtime amount: (prevSalary / 30) * prevOvertimeDays
      const prevOvertimeAmount = (prevSalary / BigInt(30)) * BigInt(Math.round(prevOvertimeDays));
      
      // Need to recursively get the balance before the previous month to be 100% accurate, 
      // but for simplicity in this implementation we assume the previous month's balance is passed down, 
      // or we can just fetch the "carried over" balance if we had a column.
      // Wait, we don't have a `previous_balance` column in the db schema.
      // So we must rely on the client to send the previous balance or we recursively calculate it.
      // Actually, since we only query one month prior, let's just return the prevRecord 
      // and let the client calculate it, or we do a recursive sum.
      // To prevent complex recursion, let's just return the prevRecord and prevPayments.
    }

    return NextResponse.json({ currentRecord, prevRecord });
  } catch (err: any) {
    const s = err.status || 500;
    return NextResponse.json({ error: err.message }, { status: s });
  }
}

export async function POST(req: Request) {
  try {
    await requireUser();
    const { employeeId, year, month, baseSalaryRial, overtimeDays } = await req.json();
    
    if (!employeeId || typeof year !== "number" || typeof month !== "number" || !baseSalaryRial) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const recordId = await saveMonthlyRecord(employeeId, year, month, baseSalaryRial.toString(), Number(overtimeDays) || 0);
    
    return NextResponse.json({ success: true, recordId });
  } catch (err: any) {
    const s = err.status || 500;
    return NextResponse.json({ error: err.message }, { status: s });
  }
}
