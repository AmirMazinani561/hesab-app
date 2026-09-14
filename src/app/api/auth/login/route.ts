import { signIn } from "@/lib/auth";
import { ok, fail } from "@/lib/api";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json();
    if (!username || !password)
      return Response.json({ error: "نام کاربری و رمز عبور لازم است." }, { status: 400 });
    const u = await signIn(String(username), String(password));
    return ok({ user: u });
  } catch (e) {
    const m = (e as Error).message || "خطا در ورود";
    return Response.json({ error: m }, { status: 401 });
  }
}
