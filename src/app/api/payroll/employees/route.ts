import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { listEmployees, createEmployee } from "@/db/repo";

export async function GET() {
  try {
    await requireUser();
    const emps = await listEmployees();
    return NextResponse.json(emps);
  } catch (err: any) {
    const s = err.status || 500;
    return NextResponse.json({ error: err.message }, { status: s });
  }
}

export async function POST(req: Request) {
  try {
    await requireUser();
    const { name } = await req.json();
    
    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const emp = await createEmployee(name.trim());
    return NextResponse.json(emp);
  } catch (err: any) {
    const s = err.status || 500;
    return NextResponse.json({ error: err.message }, { status: s });
  }
}
