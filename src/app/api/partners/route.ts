import { requireUser } from "@/lib/auth";
import { ok, fail } from "@/lib/api";
import {
  ensureDatabase, listPartners, createPartner,
  updatePartner, deletePartner, newId,
} from "@/db/repo";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireUser(); await ensureDatabase();
    return ok({ partners: await listPartners() });
  } catch (e) { return fail(e); }
}

export async function POST(req: Request) {
  try {
    await requireUser(); await ensureDatabase();
    const b = await req.json();
    const name = String(b.name || "").trim();
    if (!name) return Response.json({ error: "نام شریک لازم است." }, { status: 400 });
    const p = await createPartner({
      id: b.id || newId(), name,
      color: b.color || "#4ade80", note: b.note || "",
    });
    return ok({ partner: p });
  } catch (e) { return fail(e); }
}

export async function PUT(req: Request) {
  try {
    await requireUser(); await ensureDatabase();
    const b = await req.json();
    if (!b.id) return Response.json({ error: "شناسه لازم است." }, { status: 400 });
    await updatePartner(String(b.id), b);
    return ok();
  } catch (e) { return fail(e); }
}

export async function DELETE(req: Request) {
  try {
    await requireUser(); await ensureDatabase();
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return Response.json({ error: "شناسه لازم است." }, { status: 400 });
    await deletePartner(id);
    return ok();
  } catch (e) { return fail(e); }
}
