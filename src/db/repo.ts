/**
 * ساخت خودکار جداول و تمام پرس‌وجوها.
 *
 * قاعدهٔ طلایی این فایل: هیچ قابلیت مخصوص یک دیتابیس به کار نرود.
 *   • بدون uuid / gen_random_uuid  → شناسه در برنامه ساخته می‌شود
 *   • بدون ستون محاسباتی (generated)
 *   • بدون view و trigger
 *   • بدون کلمات رزرو (به جای key از skey استفاده شده)
 * نتیجه: همین کد روی MySQL و PostgreSQL یکسان کار می‌کند.
 */
import { q, exec, getDialect, hasDb } from "./client";
import { randomUUID } from "crypto";

export const newId = () => randomUUID();

/* ================= انواع ================= */

export type PartnerRow = {
  id: string;
  name: string;
  color: string;
  note: string | null;
  created_at?: string;
};

export type TxStatus = "pending" | "confirmed";

export type TxRow = {
  id: string;
  partner_id: string;
  kind: "IN" | "OUT";
  amount_rial: string;
  price_rial_per_kg: string | null;
  status: TxStatus;
  jdate: string;
  description: string | null;
  source: string | null;
  source_id: string | null;
  created_at?: string;
};

export type PayrollEmployee = {
  id: string;
  code: string;
  name: string;
  created_at?: string;
};

export type PayrollMonthlyRecord = {
  id: string;
  employee_id: string;
  year: number;
  month: number;
  base_salary_rial: string;
  overtime_days: number;
  created_at?: string;
};

export type PayrollPayment = {
  id: string;
  record_id: string;
  payment_date: string;
  amount_rial: string;
  description: string;
  payment_type: string;
  created_at?: string;
};

/* ================= ساخت جداول ================= */

const TS = () =>
  getDialect() === "mysql"
    ? "timestamp not null default current_timestamp"
    : "timestamptz not null default now()";

const TXT = () => "text";

let readyFor = "";

export async function ensureDatabase(): Promise<void> {
  if (!hasDb) return;
  const key = process.env.DATABASE_URL || "";
  if (readyFor === key) return;

  await exec(`create table if not exists partners (
    id         varchar(64)  not null,
    name       varchar(191) not null,
    color      varchar(32)  not null,
    note       ${TXT()},
    created_at ${TS()},
    primary key (id)
  )`);

  await exec(`create table if not exists transactions (
    id                varchar(64)   not null,
    partner_id        varchar(64)   not null,
    kind              varchar(8)    not null,
    amount_rial       decimal(20,0) not null,
    price_rial_per_kg decimal(20,2)     null,
    status            varchar(16)   not null,
    jdate             varchar(8)    not null,
    description       ${TXT()},
    source            varchar(32)       null,
    source_id         varchar(64)       null,
    created_at        ${TS()},
    primary key (id)
  )`);

  await exec(`create table if not exists app_settings (
    skey       varchar(64) not null,
    svalue     ${TXT()},
    updated_at ${TS()},
    primary key (skey)
  )`);

  await exec(`create table if not exists users (
    id            varchar(64)  not null,
    username      varchar(150) not null,
    password_hash ${TXT()}     not null,
    full_name     varchar(191),
    created_at    ${TS()},
    primary key (id)
  )`);

  await exec(`create table if not exists payroll_employees (
    id         varchar(64)  not null,
    code       varchar(32)  not null,
    name       varchar(191) not null,
    created_at ${TS()},
    primary key (id)
  )`);

  await exec(`create table if not exists payroll_monthly_records (
    id               varchar(64)   not null,
    employee_id      varchar(64)   not null,
    year             int           not null,
    month            int           not null,
    base_salary_rial decimal(20,0) not null,
    overtime_days    decimal(10,2) not null,
    created_at       ${TS()},
    primary key (id)
  )`);

  await exec(`create table if not exists payroll_payments (
    id            varchar(64)   not null,
    record_id     varchar(64)   not null,
    payment_date  varchar(8)    not null,
    amount_rial   decimal(20,0) not null,
    description   ${TXT()},
    payment_type  varchar(32)   not null,
    created_at    ${TS()},
    primary key (id)
  )`);

  /* --- مهاجرت: افزودن ستون‌های جاافتاده به جدول‌های قدیمی ---
     `create table if not exists` روی دیتابیسی که از قبل ساخته شده
     هیچ کاری نمی‌کند، پس ستون‌های جدید باید صریحاً اضافه شوند. --- */
  // همهٔ ستون‌های لازم، نه فقط تازه‌ترین‌ها. دیتابیس‌های قدیمی ممکن است
  // چند نسخه عقب باشند، پس تک‌تک بررسی می‌شوند.
  await addColumnIfMissing("transactions", "kind", "varchar(8)");
  await addColumnIfMissing("transactions", "amount_rial", "decimal(20,0)");
  await addColumnIfMissing("transactions", "price_rial_per_kg", "decimal(20,2)");
  await addColumnIfMissing("transactions", "status", "varchar(16)");
  await addColumnIfMissing("transactions", "jdate", "varchar(8)");
  await addColumnIfMissing("transactions", "description", TXT());
  await addColumnIfMissing("transactions", "source", "varchar(32)");
  await addColumnIfMissing("transactions", "source_id", "varchar(64)");

  await addColumnIfMissing("partners", "color", "varchar(32)");
  await addColumnIfMissing("partners", "note", TXT());

  // ستون‌هایی که تازه اضافه شده‌اند مقدار خالی دارند، ولی کد انتظار
  // مقدار معتبر دارد. پیش‌فرض‌های امن را یک‌بار پر می‌کنیم.
  // ستون‌هایی که در نسخه‌های قدیمی NOT NULL بودند ولی حالا باید خالی
  // بمانند (تراکنش کیف پول تا وارد شدن قیمت، قیمت ندارد).
  await dropNotNull("transactions", "price_rial_per_kg");
  await dropNotNull("transactions", "weight_kg");
  await dropNotNull("transactions", "description");
  await dropNotNull("transactions", "source");
  await dropNotNull("transactions", "source_id");

  await backfill("update transactions set status = 'confirmed' where status is null");
  await backfill("update transactions set kind = 'IN' where kind is null");
  await backfill("update partners set color = '#4ade80' where color is null");

  await safeIdx("uniq_users_username", "users", "(username)", true);
  await safeIdx("idx_tx_partner", "transactions", "(partner_id)");
  await safeIdx("idx_tx_jdate", "transactions", "(jdate)");
  await safeIdx("idx_tx_status", "transactions", "(status)");
  await safeIdx("uniq_tx_source", "transactions", "(source, source_id)", true);

  readyFor = key;
}


/**
 * افزودن ستون در صورت نبودن. روی هر دو گویش کار می‌کند و اجرای دوباره‌اش
 * بی‌خطر است. برای دیتابیس‌هایی لازم است که پیش از افزوده‌شدن این ستون‌ها
 * ساخته شده‌اند.
 */
/**
 * برداشتن قید NOT NULL از ستونی که در نسخه‌های قدیمی اجباری بوده.
 * روی ستون نداشته یا قید نداشته، بی‌خطر رد می‌شود.
 */
async function dropNotNull(table: string, col: string) {
  if (getDialect() !== "pg") return;   // MySQL نیاز به تعریف کامل نوع دارد
  try {
    await exec(`alter table ${table} alter column ${col} drop not null`);
  } catch { /* ستون نیست یا از قبل nullable است */ }
}

/** اجرای امنِ به‌روزرسانی پرکننده؛ خطا نباید راه‌اندازی را متوقف کند */
async function backfill(sql: string) {
  try { await exec(sql); } catch { /* بی‌اهمیت */ }
}

async function addColumnIfMissing(table: string, col: string, type: string) {
  // روش اول و مطمئن‌ترین: مستقیم اضافه کن و اگر بود، خطا را نادیده بگیر.
  // این کار به information_schema وابسته نیست و روی Supabase/pooler هم
  // درست کار می‌کند، جایی که ممکن است schema جاری آن چیزی نباشد که انتظار داریم.
  try {
    if (getDialect() === "pg") {
      await exec(`alter table ${table} add column if not exists ${col} ${type}`);
    } else {
      await exec(`alter table ${table} add column ${col} ${type} null`);
    }
    return;
  } catch (e) {
    const msg = String((e as Error)?.message || "").toLowerCase();
    // «از قبل وجود دارد» یعنی کار تمام است
    if (msg.includes("duplicate") || msg.includes("exists")) return;
    console.warn(`[migrate] ${table}.${col} ناموفق:`, (e as Error)?.message);
  }
}

/** ساخت ایندکس به شکلی که روی هر دو دیتابیس و در اجرای دوباره خطا ندهد */
async function safeIdx(name: string, table: string, cols: string, uniq = false) {
  const u = uniq ? "unique " : "";
  try {
    if (getDialect() === "pg") {
      await exec(`create ${u}index if not exists ${name} on ${table} ${cols}`);
    } else {
      const rows = await q<{ c: number }>(
        `select count(*) as c from information_schema.statistics
         where table_schema = database() and table_name = ? and index_name = ?`,
        [table, name]
      );
      if (Number(rows[0]?.c || 0) === 0) {
        await exec(`create ${u}index ${name} on ${table} ${cols}`);
      }
    }
  } catch {
    /* ایندکس اختیاری است؛ نبودش برنامه را متوقف نکند */
  }
}

/* ================= شرکا ================= */

export const listPartners = () =>
  q<PartnerRow>(`select * from partners order by created_at asc`);

export async function createPartner(p: Omit<PartnerRow, "created_at">) {
  await exec(
    `insert into partners (id, name, color, note) values (?, ?, ?, ?)`,
    [p.id, p.name, p.color, p.note ?? ""]
  );
  return p;
}

export async function updatePartner(
  id: string,
  p: Partial<Pick<PartnerRow, "name" | "color" | "note">>
) {
  const set: string[] = [];
  const val: unknown[] = [];
  if (p.name !== undefined) { set.push("name = ?"); val.push(p.name); }
  if (p.color !== undefined) { set.push("color = ?"); val.push(p.color); }
  if (p.note !== undefined) { set.push("note = ?"); val.push(p.note); }
  if (!set.length) return;
  val.push(id);
  await exec(`update partners set ${set.join(", ")} where id = ?`, val);
}

export async function deletePartner(id: string) {
  // حذف آبشاری را خودمان انجام می‌دهیم تا به کلید خارجی وابسته نباشیم
  await exec(`delete from transactions where partner_id = ?`, [id]);
  await exec(`delete from partners where id = ?`, [id]);
}

/* ================= تراکنش‌ها ================= */

export function listTransactions(opts: { status?: TxStatus } = {}) {
  if (opts.status) {
    return q<TxRow>(
      `select * from transactions where status = ? order by jdate asc, id asc`,
      [opts.status]
    );
  }
  return q<TxRow>(`select * from transactions order by jdate asc, id asc`);
}

export async function createTransaction(t: Omit<TxRow, "created_at">) {
  await exec(
    `insert into transactions
     (id, partner_id, kind, amount_rial, price_rial_per_kg,
      status, jdate, description, source, source_id)
     values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [t.id, t.partner_id, t.kind, t.amount_rial, t.price_rial_per_kg,
     t.status, t.jdate, t.description ?? "", t.source, t.source_id]
  );
  return t;
}

export async function updateTransaction(id: string, t: Partial<TxRow>) {
  const map: Record<string, unknown> = {
    partner_id: t.partner_id,
    kind: t.kind,
    amount_rial: t.amount_rial,
    price_rial_per_kg: t.price_rial_per_kg,
    status: t.status,
    jdate: t.jdate,
    description: t.description,
  };
  const set: string[] = [];
  const val: unknown[] = [];
  for (const [k, v] of Object.entries(map)) {
    if (v !== undefined) { set.push(`${k} = ?`); val.push(v); }
  }
  if (!set.length) return;
  val.push(id);
  await exec(`update transactions set ${set.join(", ")} where id = ?`, val);
}

export const deleteTransaction = (id: string) =>
  exec(`delete from transactions where id = ?`, [id]);

/** آیا این تراکنش قبلاً از کیف پول آمده است؟ (ضد تکرار) */
export async function findBySource(source: string, sourceId: string) {
  const r = await q<TxRow>(
    `select * from transactions where source = ? and source_id = ? limit 1`,
    [source, sourceId]
  );
  return r[0] || null;
}

/** بررسی وجود تراکنش مشابه (ضد تکرار هوشمند بر اساس شریک، نوع، تاریخ و مبلغ) */
export async function findSimilarTransaction(params: {
  partnerId: string;
  kind: string;
  amountRial: string;
  jdate: string;
}) {
  const r = await q<TxRow>(
    `select * from transactions where partner_id = ? and kind = ? and amount_rial = ? and jdate = ? limit 1`,
    [params.partnerId, params.kind, params.amountRial, params.jdate]
  );
  return r[0] || null;
}

/* ================= تنظیمات ================= */

export async function getSetting(k: string): Promise<string | null> {
  const r = await q<{ svalue: string | null }>(
    `select svalue from app_settings where skey = ?`, [k]
  );
  return r[0]?.svalue ?? null;
}

export async function setSetting(k: string, v: string) {
  const sql =
    getDialect() === "mysql"
      ? `insert into app_settings (skey, svalue) values (?, ?)
         on duplicate key update svalue = values(svalue)`
      : `insert into app_settings (skey, svalue) values (?, ?)
         on conflict (skey) do update set svalue = excluded.svalue,
                                          updated_at = now()`;
  await exec(sql, [k, v]);
}

/* ================= کاربران ================= */

export async function findUser(username: string) {
  const r = await q<{ id: string; username: string; password_hash: string }>(
    `select * from users where username = ?`, [username]
  );
  return r[0] || null;
}

export async function countUsers(): Promise<number> {
  const r = await q<{ c: number | string }>(`select count(*) as c from users`);
  return Number(r[0]?.c || 0);
}

export async function createUser(username: string, hash: string) {
  const id = newId();
  await exec(
    `insert into users (id, username, password_hash) values (?, ?, ?)`,
    [id, username, hash]
  );
  return id;
}

export async function updateUserPassword(id: string, hash: string) {
  await exec(`update users set password_hash = ? where id = ?`, [hash, id]);
}

/* ================= حقوق و دستمزد ================= */

export const listEmployees = () => q<PayrollEmployee>(`select * from payroll_employees order by code asc`);

export async function createEmployee(name: string) {
  const id = newId();
  const existing = await q<{ code: string }>(`select code from payroll_employees order by cast(code as unsigned) desc limit 1`);
  const lastCode = existing.length ? parseInt(existing[0].code) : 0;
  const newCode = (lastCode + 1).toString();
  await exec(`insert into payroll_employees (id, code, name) values (?, ?, ?)`, [id, newCode, name]);
  return { id, code: newCode, name };
}

export async function getEmployee(id: string) {
  const r = await q<PayrollEmployee>(`select * from payroll_employees where id = ?`, [id]);
  return r[0] || null;
}

export async function getMonthlyRecord(employeeId: string, year: number, month: number) {
  const r = await q<PayrollMonthlyRecord>(
    `select * from payroll_monthly_records where employee_id = ? and year = ? and month = ? limit 1`,
    [employeeId, year, month]
  );
  return r[0] || null;
}

export async function getPreviousMonthlyRecord(employeeId: string, year: number, month: number) {
  let prevMonth = month - 1;
  let prevYear = year;
  if (prevMonth === 0) {
    prevMonth = 12;
    prevYear -= 1;
  }
  return getMonthlyRecord(employeeId, prevYear, prevMonth);
}

export async function saveMonthlyRecord(employeeId: string, year: number, month: number, baseSalaryRial: string, overtimeDays: number) {
  const existing = await getMonthlyRecord(employeeId, year, month);
  if (existing) {
    await exec(
      `update payroll_monthly_records set base_salary_rial = ?, overtime_days = ? where id = ?`,
      [baseSalaryRial, overtimeDays, existing.id]
    );
    return existing.id;
  } else {
    const id = newId();
    await exec(
      `insert into payroll_monthly_records (id, employee_id, year, month, base_salary_rial, overtime_days) values (?, ?, ?, ?, ?, ?)`,
      [id, employeeId, year, month, baseSalaryRial, overtimeDays]
    );
    return id;
  }
}

export const listPayments = (recordId: string) => q<PayrollPayment>(
  `select * from payroll_payments where record_id = ? order by payment_date asc, created_at asc`,
  [recordId]
);

export async function createPayment(p: Omit<PayrollPayment, "created_at" | "id">) {
  const id = newId();
  await exec(
    `insert into payroll_payments (id, record_id, payment_date, amount_rial, description, payment_type) values (?, ?, ?, ?, ?, ?)`,
    [id, p.record_id, p.payment_date, p.amount_rial, p.description, p.payment_type]
  );
  return id;
}

export const deletePayment = (id: string) => exec(`delete from payroll_payments where id = ?`, [id]);
