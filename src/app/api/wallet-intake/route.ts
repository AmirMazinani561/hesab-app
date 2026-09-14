/**
 * دریافت تراکنش از نرم‌افزار «کیف پول».
 *
 * کیف پول هنگام ثبت هر تراکنش این اندپوینت را صدا می‌زند. اگر یکی از دو
 * طرف تراکنش یکی از حساب‌های سرمایه باشد (مثلاً «سرمایه سلطانی»)، همان
 * تراکنش این‌جا با وضعیت pending ساخته می‌شود و تا وارد کردن قیمت شمش
 * در هیچ محاسبه‌ای شرکت نمی‌کند.
 *
 * امنیت: با توکن مشترک محافظت می‌شود، نه با نشست کاربر، چون تماس‌گیرنده
 * یک سرور است نه مرورگر.
 */
import { ok, fail } from "@/lib/api";
import {
  ensureDatabase, createTransaction, findBySource,
  listPartners, newId,
} from "@/db/repo";
import { fromSlash, isValidJdate } from "@/lib/jdate";
import { partnerOf, mappingCount, idMap, nameMap } from "@/lib/wallet-map";

export const dynamic = "force-dynamic";

function authorized(req: Request): boolean {
  const want = process.env.WALLET_INTAKE_TOKEN;
  if (!want) return false;                       // تنظیم نشده ⇒ بسته
  const got = req.headers.get("x-intake-token")
    || (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  return got === want;
}

export async function POST(req: Request) {
  try {
    if (!authorized(req))
      return Response.json({ error: "توکن نامعتبر است." }, { status: 401 });

    await ensureDatabase();
    const b = await req.json();

    /* --- کدام طرف شریک است؟ --- */
    // فهرست شرکا لازم است تا تطبیق خودکارِ نام انجام شود
    const partners = await listPartners();

    const fromPartner = partnerOf(
      b.fromAccountId ? String(b.fromAccountId) : undefined,
      b.fromAccountName ? String(b.fromAccountName) : undefined,
      partners
    );
    const toPartner = partnerOf(
      b.toAccountId ? String(b.toAccountId) : undefined,
      b.toAccountName ? String(b.toAccountName) : undefined,
      partners
    );

    // هیچ‌کدام شریک نیست ⇒ تراکنش خصوصی، کاری نداریم
    if (!fromPartner && !toPartner)
      return ok({ skipped: "no-partner" });

    // هر دو شریک‌اند ⇒ انتقال داخلی، از نظر سرمایهٔ کل خنثی است
    if (fromPartner && toPartner)
      return ok({ skipped: "internal-transfer" });

    // پول به حساب سرمایه رفت ⇒ آورده (IN)
    // پول از حساب سرمایه آمد ⇒ برداشت (OUT)
    const kind: "IN" | "OUT" = toPartner ? "IN" : "OUT";
    const partnerId = (toPartner || fromPartner) as string;

    /* --- شریک باید واقعاً وجود داشته باشد --- */
    if (!partners.some(p => p.id === partnerId))
      return Response.json({
        error: `شریکی با شناسهٔ ${partnerId} در نرم‌افزار سرمایه نیست. `
             + `نگاشت را بررسی کنید.`,
      }, { status: 400 });

    /* --- ضد تکرار --- */
    const srcId = String(b.id || "");
    if (srcId) {
      const dup = await findBySource("wallet", srcId);
      if (dup) return ok({ skipped: "duplicate", id: dup.id });
    }

    /* --- تاریخ: کیف پول '1404/06/22' می‌دهد --- */
    let jdate = "";
    if (b.shamsiDate) jdate = fromSlash(String(b.shamsiDate));
    if (!jdate && b.jdate && /^\d{8}$/.test(String(b.jdate))) jdate = String(b.jdate);
    if (!isValidJdate(jdate))
      return Response.json({ error: "تاریخ نامعتبر است." }, { status: 400 });

    /* --- مبلغ: هر دو نرم‌افزار ریال‌اند، کارمزد نادیده گرفته می‌شود --- */
    const amount = String(Math.round(Number(b.amount) || 0));
    if (!amount || Number(amount) <= 0)
      return Response.json({ error: "مبلغ نامعتبر است." }, { status: 400 });

    const t = await createTransaction({
      id: newId(),
      partner_id: partnerId,
      kind,
      amount_rial: amount,
      price_rial_per_kg: null,        // هنوز قیمت ندارد
      status: "pending",              // ⇒ خارج از همهٔ محاسبات
      jdate,
      description: b.description ? String(b.description).trim() : "",
      source: "wallet",
      source_id: srcId || null,
    });

    return ok({ created: t.id, kind, partner_id: partnerId });
  } catch (e) { return fail(e); }
}

/** تست اتصال: نشان می‌دهد هر حساب کیف پول به کدام شریک وصل می‌شود */
export async function GET(req: Request) {
  if (!authorized(req))
    return Response.json({ error: "توکن نامعتبر است." }, { status: 401 });

  try {
    await ensureDatabase();
    const partners = await listPartners();

    // اگر کیف پول نام حساب‌ها را بفرستد، همان‌ها را آزمایش می‌کنیم؛
    // وگرنه نام خود شرکا را به عنوان نمونه نشان می‌دهیم.
    const url = new URL(req.url);
    const probes = url.searchParams.getAll("name");

    const سناریوها = (probes.length ? probes : partners.map(p => "سرمایه " + p.name))
      .map(n => {
        const id = partnerOf(undefined, n, partners);
        const p = partners.find(x => x.id === id);
        return {
          حساب_کیف_پول: n,
          وصل_میشود_به: p ? p.name : "— هیچ شریکی —",
          تشخیص: p ? "خودکار" : "ناموفق",
        };
      });

    const ناموفق = سناریوها.filter(s => s.تشخیص === "ناموفق").length;

    return Response.json({
      ok: partners.length > 0 && ناموفق === 0,
      شرکا: partners.map(p => p.name),
      سناریوها,
      نگاشت_دستی: mappingCount(),
      hint: partners.length === 0
        ? "اول در صفحهٔ «شرکا» دو شریک بسازید."
        : ناموفق
          ? "بعضی نام‌ها تشخیص داده نشدند. نام دقیق حساب کیف پول را با ?name=... اینجا امتحان کنید."
          : "همه‌چیز درست است. نیازی به تنظیم دستی نیست.",
    });
  } catch (e) { return fail(e); }
}
