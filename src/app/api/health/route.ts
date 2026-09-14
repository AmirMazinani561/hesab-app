import { getDialect, hasDb, q } from "@/db/client";
import { ensureDatabase } from "@/db/repo";
export const dynamic = "force-dynamic";

/** نسخهٔ کد — با هر تغییر مهم بالا می‌رود تا بشود فهمید چه چیزی روی سرور است */
const BUILD = "v5-nullable";

export async function GET() {
  if (!hasDb)
    return Response.json({
      ok: false, build: BUILD, database: "unset",
      hint: "متغیر DATABASE_URL تنظیم نشده است.",
    }, { status: 500 });

  try {
    await ensureDatabase();
    await q("select 1 as x");

    // ستون‌های واقعی جدول تراکنش‌ها، برای عیب‌یابی از راه دور
    let cols: string[] = [];
    try {
      const rows = await q<{ column_name: string }>(
        `select column_name from information_schema.columns
          where table_name = 'transactions'
            and table_schema = ${getDialect() === "pg" ? "current_schema()" : "database()"}`
      );
      cols = rows.map(r => r.column_name).sort();
    } catch { /* بی‌اهمیت */ }

    const needed = ["kind","amount_rial","price_rial_per_kg","status","jdate","description","source","source_id"];

    // ستون‌هایی که باید خالی‌پذیر باشند ولی هنوز NOT NULL مانده‌اند
    let blockers: string[] = [];
    try {
      const rows = await q<{ column_name: string }>(
        `select column_name from information_schema.columns
          where table_name = 'transactions' and is_nullable = 'NO'
            and column_name in ('price_rial_per_kg','weight_kg','description','source','source_id')
            and table_schema = ${getDialect() === "pg" ? "current_schema()" : "database()"}`
      );
      blockers = rows.map(r => r.column_name).sort();
    } catch { /* بی‌اهمیت */ }
    const missing = needed.filter(c => !cols.includes(c));

    return Response.json({
      ok: missing.length === 0 && blockers.length === 0,
      build: BUILD,
      database: "connected", dialect: getDialect(),
      tablesReady: true,
      authSecret: !!process.env.AUTH_SECRET,
      walletToken: !!process.env.WALLET_INTAKE_TOKEN,
      columns: cols,
      missingColumns: missing,
      notNullBlockers: blockers,
      hint: missing.length
        ? `ستون‌های جاافتاده: ${missing.join(", ")}`
        : blockers.length
          ? `این ستون‌ها باید خالی‌پذیر شوند: ${blockers.join(", ")}`
          : "سیستم آماده استفاده است.",
    });
  } catch (e) {
    return Response.json({
      ok: false, build: BUILD, database: "error", dialect: getDialect(),
      hint: (e as Error).message,
    }, { status: 500 });
  }
}
