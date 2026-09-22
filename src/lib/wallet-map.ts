/**
 * تشخیص اینکه کدام حساب کیف پول به کدام شریک سرمایه‌گذاری مربوط است.
 *
 * روش اصلی: **خودکار**. نام حساب کیف پول با نام شرکای موجود در دیتابیس
 * مقایسه می‌شود. اگر حسابی «سرمایه سلطانی» نام داشته باشد و شریکی به نام
 * «سلطانی» وجود داشته باشد، خودشان به هم وصل می‌شوند. هیچ تنظیمی لازم نیست.
 *
 * روش دستی (اختیاری، فقط برای موارد خاص): اگر نام‌ها آن‌قدر متفاوت‌اند که
 * تشخیص خودکار جواب نمی‌دهد، می‌توان با متغیرهای محیطی صریح نگاشت داد.
 */

/** یکسان‌سازی متن فارسی برای مقایسهٔ مطمئن */
export function normalizeFa(s: string): string {
  return String(s || "")
    .replace(/\u200c/g, " ")        // نیم‌فاصله → فاصله
    .replace(/[يى]/g, "ی")          // ی عربی → ی فارسی
    .replace(/ك/g, "ک")             // ک عربی → ک فارسی
    .replace(/[أإآا]/g, "ا")        // انواع الف
    .replace(/ة/g, "ه")
    .replace(/[\u064B-\u0652]/g, "") // اعراب
    .replace(/\s+/g, " ")           // چند فاصله → یک فاصله
    .trim()
    .toLowerCase();
}

/**
 * کلمات عمومی که معنای هویتی ندارند. برای مقایسه حذف می‌شوند تا
 * «سرمایه سلطانی» و «آقای سلطانی» و «سلطانی» یکی شناخته شوند.
 */
const STOPWORDS = [
  "سرمایه", "سرمایه گذاری", "حساب", "شراکت", "سهم", "شریک",
  "اقای", "آقای", "خانم", "جناب", "مهندس", "دکتر", "حاج",
];

/** هستهٔ معنادار نام: نام یکسان‌سازی‌شده بدون کلمات عمومی */
export function coreName(s: string): string {
  let t = normalizeFa(s);
  for (const w of STOPWORDS) {
    t = t.replace(new RegExp(`(^|\\s)${normalizeFa(w)}(\\s|$)`, "g"), " ");
  }
  return t.replace(/\s+/g, " ").trim();
}

function parseJson(raw: string | undefined): Record<string, string> {
  if (!raw) return {};
  try {
    const o = JSON.parse(raw);
    return o && typeof o === "object" ? o : {};
  } catch {
    return {};
  }
}

/** نگاشت دستی بر اساس شناسهٔ حساب (اختیاری) */
export const idMap = () => parseJson(process.env.WALLET_PARTNER_MAP);

/** نگاشت دستی بر اساس نام حساب (اختیاری) */
export function nameMap(): Record<string, string> {
  const raw = parseJson(process.env.WALLET_PARTNER_NAMES);
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) out[normalizeFa(k)] = v;
  return out;
}

export function mappingCount(): number {
  return Object.keys(idMap()).length + Object.keys(nameMap()).length;
}

export type PartnerLite = { id: string; name: string };

/**
 * تطبیق خودکار نام حساب با فهرست شرکا.
 *
 * سه مرحله، از دقیق به منعطف. عمداً محافظه‌کار است: اگر نام حساب به بیش
 * از یک شریک بخورد، هیچ‌کدام برگردانده نمی‌شود تا پول اشتباهی به حساب
 * شریک دیگر نرود.
 */
export function autoMatch(
  accountName: string | undefined,
  partners: PartnerLite[]
): string | null {
  if (!accountName || !partners.length) return null;

  const acc = normalizeFa(accountName);
  const accCore = coreName(accountName);
  if (!accCore) return null;

  // ۱) برابری کامل نام
  let hits = partners.filter(p => normalizeFa(p.name) === acc);
  if (hits.length === 1) return hits[0].id;

  // ۲) برابری هسته‌ها: «سرمایه سلطانی» ↔ «سلطانی»
  hits = partners.filter(p => coreName(p.name) === accCore);
  if (hits.length === 1) return hits[0].id;

  // ۳) دربرگیری هسته: «سرمایه آقای سلطانی» شامل «سلطانی»
  //    فقط برای نام‌های ۳ حرف به بالا تا تطبیق تصادفی رخ ندهد.
  hits = partners.filter(p => {
    const pc = coreName(p.name);
    if (pc.length < 3) return false;
    return accCore === pc
        || accCore.split(" ").includes(pc)
        || new RegExp(`(^|\\s)${pc}(\\s|$)`).test(accCore);
  });
  if (hits.length === 1) return hits[0].id;

  return null;   // مبهم یا بی‌نتیجه ⇒ دست نگه دار
}

/**
 * یک طرف تراکنش را بررسی می‌کند و در صورت شریک بودن، شناسهٔ شریک را
 * برمی‌گرداند. اولویت با نگاشت دستی است، بعد تشخیص خودکار.
 */
export function partnerOf(
  accountId: string | undefined,
  accountName: string | undefined,
  partners: PartnerLite[] = []
): string | null {
  const byId = idMap();
  if (accountId && byId[accountId]) return byId[accountId];

  if (accountName) {
    const byName = nameMap();
    const key = normalizeFa(accountName);
    if (byName[key]) return byName[key];
  }

  return autoMatch(accountName, partners);
}

export type EmployeeLite = { id: string; name: string };

/**
 * تطبیق خودکار نام حساب کیف پول با فهرست پرسنل حقوق و دستمزد.
 */
export function matchEmployee(
  accountName: string | undefined,
  employees: EmployeeLite[] = []
): EmployeeLite | null {
  if (!accountName || !employees.length) return null;

  const acc = normalizeFa(accountName);
  const accCore = coreName(accountName);
  if (!acc && !accCore) return null;

  // ۱) برابری کامل نام نرمالایز شده
  let hits = employees.filter(e => normalizeFa(e.name) === acc);
  if (hits.length === 1) return hits[0];

  // ۲) برابری هسته نام‌ها (مثلاً «حقوق علی رضایی» یا «علی رضایی»)
  if (accCore) {
    hits = employees.filter(e => coreName(e.name) === accCore);
    if (hits.length === 1) return hits[0];
  }

  // ۳) دربرگیری نام یا هسته نام
  hits = employees.filter(e => {
    const eNorm = normalizeFa(e.name);
    const eCore = coreName(e.name);
    if (eNorm.length < 3) return false;
    return acc.includes(eNorm) || (accCore && eCore && accCore.includes(eCore));
  });
  if (hits.length === 1) return hits[0];

  return null;
}
