import { requireUser } from "@/lib/auth";
import { ok, fail } from "@/lib/api";
import { ensureDatabase, getSetting, setSetting } from "@/db/repo";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireUser(); await ensureDatabase();
    return ok({ price: await getSetting("price") });
  } catch (e) { return fail(e); }
}

export async function POST(req: Request) {
  try {
    await requireUser(); await ensureDatabase();
    const b = await req.json();
    await setSetting("price", String(b.price ?? "").replace(/\D/g, ""));
    return ok();
  } catch (e) { return fail(e); }
}
