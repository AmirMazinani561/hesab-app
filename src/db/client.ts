/**
 * لایهٔ اتصال دوگانه به دیتابیس — MySQL/MariaDB و PostgreSQL
 *
 * همان الگویی که نرم‌افزار «کیف پول» استفاده می‌کند، تا هر دو برنامه
 * هم‌خانواده بمانند و مهاجرت بین هاست‌ها بدون تغییر کد ممکن باشد.
 *
 * انتخاب نوع دیتابیس فقط از روی DATABASE_URL انجام می‌شود:
 *   mysql://...       → MySQL / MariaDB (دایرکت‌ادمین، سی‌پنل)
 *   postgresql://...  → PostgreSQL (Supabase، Neon، VPS)
 */

export type Dialect = "mysql" | "pg";

/* آدرس اتصال در هر فراخوانی خوانده می‌شود، نه یک‌بار هنگام بارگذاری ماژول.
   دلیل: در محیط توسعه با تغییر .env، ماژول دوباره اجرا نمی‌شود و استخر
   قدیمی با گویش قبلی باقی می‌ماند. */
const dbUrl = () => process.env.DATABASE_URL || "";

const dialectOf = (u: string): Dialect => (u.startsWith("mysql") ? "mysql" : "pg");

/** گویش فعلی دیتابیس */
export const getDialect = (): Dialect => dialectOf(dbUrl());

/** برای سازگاری با کدهای موجود */
export const dialect: Dialect = dialectOf(process.env.DATABASE_URL || "");

/** آیا اتصال دیتابیس اصلاً تنظیم شده است؟ */
export const hasDb = !!process.env.DATABASE_URL;

/* ------------------------------------------------------------------ */
/*  اتصال تنبل (lazy) و تک‌نمونه‌ای                                    */
/*  در محیط توسعه، hot-reload نباید هر بار استخر جدید بسازد.          */
/* ------------------------------------------------------------------ */

type AnyPool = {
  query: (sql: string, params?: unknown[]) => Promise<unknown>;
  end?: () => Promise<void>;
};

const g = globalThis as unknown as { __dbPool?: AnyPool; __dbUrl?: string };

async function getPool(): Promise<AnyPool> {
  const url = dbUrl();
  if (!url) throw new Error("DATABASE_URL تنظیم نشده است.");

  // اگر آدرس اتصال عوض شده، استخر قدیمی را دور بینداز
  if (g.__dbPool && g.__dbUrl === url) return g.__dbPool;
  if (g.__dbPool && g.__dbUrl !== url) {
    try { await g.__dbPool.end?.(); } catch { /* مهم نیست */ }
    g.__dbPool = undefined;
  }
  g.__dbUrl = url;

  if (dialectOf(url) === "mysql") {
    const mysql = await import("mysql2/promise");
    g.__dbPool = mysql.createPool({
      uri: url,
      waitForConnections: true,
      connectionLimit: 5,
      // اعداد بزرگ به صورت رشته برگردند تا دقت ریال از دست نرود
      supportBigNumbers: true,
      bigNumberStrings: true,
      decimalNumbers: false,
    }) as unknown as AnyPool;
  } else {
    const { Pool } = await import("pg");
    const needSsl = /supabase|neon|render|amazonaws/i.test(url)
      && !/sslmode=disable/.test(url);
    g.__dbPool = new Pool({
      connectionString: url,
      max: 5,
      ssl: needSsl ? { rejectUnauthorized: false } : undefined,
    }) as unknown as AnyPool;
  }
  return g.__dbPool;
}

/* ------------------------------------------------------------------ */
/*  تبدیل جای‌نگهدار                                                   */
/*  کد را با ? می‌نویسیم؛ برای پستگرس خودکار به $1,$2,… تبدیل می‌شود.  */
/* ------------------------------------------------------------------ */

function toPgParams(sql: string): string {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

/** اجرای پرس‌وجو و دریافت ردیف‌ها */
export async function q<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = []
): Promise<T[]> {
  const pool = await getPool();
  if (getDialect() === "mysql") {
    const res = (await pool.query(sql, params)) as unknown;
    // mysql2 برای SELECT آرایه‌ای [rows, fields] برمی‌گرداند، ولی برای
    // دستوراتی مثل CREATE/INSERT یک شیء ResultSetHeader می‌دهد که آرایه نیست.
    if (Array.isArray(res)) {
      const rows = (res as unknown[])[0];
      return Array.isArray(rows) ? (rows as T[]) : [];
    }
    return [];
  }
  const res = (await pool.query(toPgParams(sql), params)) as { rows?: T[] };
  return res.rows ?? [];
}

/** اجرای دستور بدون نیاز به خروجی */
export async function exec(sql: string, params: unknown[] = []): Promise<void> {
  await q(sql, params);
}

/** ترجمهٔ خطاهای دیتابیس به پیام فارسی قابل فهم */
export function translateDbError(err: unknown): string {
  const e = err as { code?: string; message?: string };
  const m = e?.message || "";
  const c = e?.code || "";

  if (c === "ECONNREFUSED" || /ECONNREFUSED/.test(m))
    return "اتصال به دیتابیس برقرار نشد. آدرس و پورت را بررسی کنید.";
  if (c === "ER_ACCESS_DENIED_ERROR" || /password authentication failed/i.test(m))
    return "نام کاربری یا رمز دیتابیس نادرست است.";
  if (c === "ER_BAD_DB_ERROR" || /database .* does not exist/i.test(m))
    return "دیتابیس با این نام وجود ندارد.";
  if (c === "ER_DUP_ENTRY" || c === "23505")
    return "این رکورد قبلاً ثبت شده است.";
  if (c === "ER_NO_REFERENCED_ROW_2" || c === "23503")
    return "شریک انتخاب‌شده وجود ندارد.";
  if (/DATABASE_URL/.test(m)) return m;

  return m || "خطای ناشناخته در ارتباط با دیتابیس.";
}
