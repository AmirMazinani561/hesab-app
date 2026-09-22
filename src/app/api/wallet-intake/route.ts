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
  ensureDatabase, createTransaction, findBySource, findSimilarTransaction,
  listPartners, newId, listEmployees, getMonthlyRecord, saveMonthlyRecord,
  createPayment, findPaymentBySourceId, findSimilarPayrollPayment,
} from "@/db/repo";
import { fromSlash, isValidJdate } from "@/lib/jdate";
import { partnerOf, mappingCount, idMap, nameMap, normalizeFa, matchEmployee } from "@/lib/wallet-map";

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
    const srcId = String(b.id || "");

    /* --- تاریخ: کیف پول '1404/06/22' یا '14040622' می‌دهد --- */
    let jdate = "";
    if (b.shamsiDate) jdate = fromSlash(String(b.shamsiDate));
    if (!jdate && b.jdate && /^\d{8}$/.test(String(b.jdate))) jdate = String(b.jdate);
    if (!isValidJdate(jdate))
      return Response.json({ error: "تاریخ نامعتبر است." }, { status: 400 });

    /* --- مبلغ: هر دو نرم‌افزار ریال‌اند، کارمزد نادیده گرفته می‌شود --- */
    const amount = String(Math.round(Number(b.amount) || 0));
    if (!amount || Number(amount) <= 0)
      return Response.json({ error: "مبلغ نامعتبر است." }, { status: 400 });

    /* ========================================================== */
    /* ۱. بررسی شرکای سرمایه (سرمایه سلطانی و سرمایه مزینانی)   */
    /* ========================================================== */
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

    if (fromPartner && toPartner) {
      // انتقال داخلی بین دو شریک ⇒ از نظر سرمایهٔ کل خنثی است
      return ok({ skipped: "internal-transfer" });
    }

    const partnerId = (toPartner || fromPartner) as string | null;
    if (partnerId) {
      const matchedPartner = partners.find(p => p.id === partnerId);
      const pName = matchedPartner ? normalizeFa(matchedPartner.name) : "";

      // فیلتر قطعی: شریک باید حتماً یکی از دو شخص «سلطانی» یا «مزینانی» باشد
      if (pName.includes("سلطانی") || pName.includes("مزینانی")) {
        let kind: "IN" | "OUT" = toPartner ? "OUT" : "IN";
        if (b.kind === "IN" || b.kind === "OUT") {
          kind = b.kind;
        }

        /* --- ضد تکرار بر اساس شناسه منبع کیف پول --- */
        if (srcId) {
          const dup = await findBySource("wallet", srcId);
          if (dup) return ok({ skipped: "duplicate", id: dup.id, type: "equity" });
        }

        /* --- ضد تکرار هوشمند بر اساس تطابق شریک، نوع، تاریخ شمسی و مبلغ --- */
        const existing = await findSimilarTransaction({
          partnerId,
          kind,
          amountRial: amount,
          jdate,
        });
        if (existing) {
          return ok({ skipped: "duplicate", id: existing.id, type: "equity" });
        }

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

        return ok({ created: t.id, kind, partner_id: partnerId, type: "equity" });
      }
    }

    /* ========================================================== */
    /* ۲. بررسی پرسنل سیستم حقوق و دستمزد (Payroll)              */
    /* ========================================================== */
    const employees = await listEmployees();
    const matchedEmp = matchEmployee(b.toAccountName, employees) || matchEmployee(b.fromAccountName, employees);

    if (matchedEmp) {
      /* --- ضد تکرار بر اساس شناسه منبع کیف پول --- */
      if (srcId) {
        const dupPay = await findPaymentBySourceId(srcId);
        if (dupPay) {
          return ok({ skipped: "duplicate", id: dupPay.id, type: "payroll" });
        }
      }

      const year = parseInt(jdate.slice(0, 4), 10);
      const month = parseInt(jdate.slice(4, 6), 10);

      /* --- یافتن یا ایجاد رکورد ماهانه کارمند --- */
      const existingRec = await getMonthlyRecord(matchedEmp.id, year, month);
      let recordId = existingRec?.id;
      if (!recordId) {
        recordId = await saveMonthlyRecord(matchedEmp.id, year, month, "0", 0);
      }

      /* --- ضد تکرار هوشمند بر اساس رکورد ماه، تاریخ پرداخت و مبلغ --- */
      const similarPay = await findSimilarPayrollPayment(recordId, jdate, amount);
      if (similarPay) {
        return ok({ skipped: "duplicate", id: similarPay.id, type: "payroll" });
      }

      /* --- ثبت در جدول پرداختی‌های حقوق در حالت «در انتظار» --- */
      const paymentId = await createPayment({
        record_id: recordId,
        payment_date: jdate,
        amount_rial: amount,
        description: b.description ? String(b.description).trim() : "پرداخت از کیف پول",
        payment_type: "در انتظار",
        source_id: srcId || null,
      });

      return ok({
        created: paymentId,
        type: "payroll",
        employee_id: matchedEmp.id,
        employee_name: matchedEmp.name,
        year,
        month,
        status: "pending",
      });
    }

    // نه شریک سرمایه است و نه پرسنل حقوق
    return ok({ skipped: "no-match" });
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
