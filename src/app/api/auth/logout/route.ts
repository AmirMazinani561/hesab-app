import { signOut } from "@/lib/auth";
import { ok } from "@/lib/api";
export const dynamic = "force-dynamic";
export async function POST() { await signOut(); return ok(); }
