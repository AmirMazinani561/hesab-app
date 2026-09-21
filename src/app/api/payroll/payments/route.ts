import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createPayment, deletePayment, listPayments } from "@/db/repo";

export async function GET(req: Request) {
  try {
    await requireUser();
    
    const { searchParams } = new URL(req.url);
    const recordId = searchParams.get("recordId");

    if (!recordId) {
      return NextResponse.json({ error: "recordId is required" }, { status: 400 });
    }

    const payments = await listPayments(recordId);
    return NextResponse.json(payments);
  } catch (err: any) {
    const s = err.status || 500;
    return NextResponse.json({ error: err.message }, { status: s });
  }
}

export async function POST(req: Request) {
  try {
    await requireUser();
    const { recordId, paymentDate, amountRial, description, paymentType } = await req.json();
    
    if (!recordId || !paymentDate || !amountRial || !paymentType) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const paymentId = await createPayment({
      record_id: recordId,
      payment_date: paymentDate,
      amount_rial: amountRial.toString(),
      description: description || "",
      payment_type: paymentType
    });
    
    return NextResponse.json({ success: true, paymentId });
  } catch (err: any) {
    const s = err.status || 500;
    return NextResponse.json({ error: err.message }, { status: s });
  }
}

export async function DELETE(req: Request) {
  try {
    await requireUser();
    
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    await deletePayment(id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    const s = err.status || 500;
    return NextResponse.json({ error: err.message }, { status: s });
  }
}
