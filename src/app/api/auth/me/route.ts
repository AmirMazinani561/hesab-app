import { currentUser } from "@/lib/auth";
export const dynamic = "force-dynamic";
export async function GET() {
  const u = await currentUser();
  return Response.json({ user: u });
}
