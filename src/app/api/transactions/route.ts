import { requireUser } from "@/lib/auth";
import { ok, fail } from "@/lib/api";
import {
  ensureDatabase, listTransactions, createTransaction,
  updateTransaction, deleteTransaction, newId, TxStatus,
} from "@/db/repo";
import { isValidJdate } from "@/lib/jdate";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    await requireUser(); await ensureDatabase();
    const s = new URL(req.url).searchParams.get("status");
    const status = (s === "pending" || s === "confirmed") ? s as TxStatus : undefined;
    return ok({ transactions: await listTransactions({ status }) });
  } catch (e) { return fail(e); }
}

export async function POST(req: Request) {
  try {
    await requireUser(); await ensureDatabase();
    const b = await req.json();

    const amount = String(b.amount_rial ?? "").replace(/\D/g, "");
    if (!amount || Number(amount) <= 0)
      return Response.json({ error: "مبلغ باید بزرگ‌تر از صفر باشد." }, { status: 400 });

    if (!b.partner_id)
      return Response.json({ error: "شریک را انتخاب کنید." }, { status: 400 });

    if (!isValidJdate(String(b.jdate || "")))
      return Response.json({ error: "تاریخ شمسی معتبر نیست." }, { status: 400 });

    const kind = b.kind === "OUT" ? "OUT" : "IN";
    const status: TxStatus = b.status === "pending" ? "pending" : "confirmed";

    let price: string | null = null;
    if (status === "confirmed") {
      const p = String(b.price_rial_per_kg ?? "").replace(/[^\d.]/g, "");
      if (!p || Number(p) <= 0)
        return Response.json(
          { error: "برای تراکنش تأییدشده، قیمت شمش لازم است." }, { status: 400 });
      price = p;
    }

    const t = await createTransaction({
      id: b.id || newId(),
      partner_id: String(b.partner_id),
      kind, amount_rial: amount, price_rial_per_kg: price, status,
      jdate: String(b.jdate),
      description: b.description ? String(b.description).trim() : "",
      source: b.source ?? null,
      source_id: b.source_id ?? null,
    });
    return ok({ transaction: t });
  } catch (e) { return fail(e); }
}

export async function PUT(req: Request) {
  try {
    await requireUser(); await ensureDatabase();
    const b = await req.json();
    if (!b.id) return Response.json({ error: "شناسه لازم است." }, { status: 400 });

    const patch: Record<string, unknown> = {};
    if (b.partner_id !== undefined) patch.partner_id = String(b.partner_id);
    if (b.kind !== undefined) patch.kind = b.kind === "OUT" ? "OUT" : "IN";
    if (b.amount_rial !== undefined)
      patch.amount_rial = String(b.amount_rial).replace(/\D/g, "");
    if (b.jdate !== undefined) {
      if (!isValidJdate(String(b.jdate)))
        return Response.json({ error: "تاریخ شمسی معتبر نیست." }, { status: 400 });
      patch.jdate = String(b.jdate);
    }
    if (b.description !== undefined) patch.description = String(b.description);

    // قیمت‌گذاری یک تراکنش در انتظار
    if (b.price_rial_per_kg !== undefined) {
      const p = String(b.price_rial_per_kg).replace(/[^\d.]/g, "");
      if (!p || Number(p) <= 0)
        return Response.json({ error: "قیمت شمش معتبر نیست." }, { status: 400 });
      patch.price_rial_per_kg = p;
      patch.status = "confirmed";     // قیمت خورد ⇒ وارد محاسبات می‌شود
    }
    if (b.status !== undefined && b.price_rial_per_kg === undefined)
      patch.status = b.status === "pending" ? "pending" : "confirmed";

    await updateTransaction(String(b.id), patch);
    return ok();
  } catch (e) { return fail(e); }
}

export async function DELETE(req: Request) {
  try {
    await requireUser(); await ensureDatabase();
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return Response.json({ error: "شناسه لازم است." }, { status: 400 });
    await deleteTransaction(id);
    return ok();
  } catch (e) { return fail(e); }
}
