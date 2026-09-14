/** تبدیل و اعتبارسنجی تاریخ شمسی — قالب داخلی: 'YYYYMMDD' مثلاً '14040622' */

/** '1404/6/2' یا '1404/06/02' → '14040602' (قالب کیف پول → قالب ما) */
export function fromSlash(s: string): string {
  const m = String(s).trim().match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
  if (!m) return "";
  return m[1] + m[2].padStart(2, "0") + m[3].padStart(2, "0");
}

/** '14040602' → '1404/06/02' */
export function toSlash(s: string): string {
  if (!/^\d{8}$/.test(s)) return s;
  return `${s.slice(0, 4)}/${s.slice(4, 6)}/${s.slice(6, 8)}`;
}

export function isValidJdate(s: string): boolean {
  if (!/^\d{8}$/.test(s)) return false;
  const y = +s.slice(0, 4), m = +s.slice(4, 6), d = +s.slice(6, 8);
  if (y < 1300 || y > 1500) return false;
  if (m < 1 || m > 12) return false;
  if (d < 1 || d > 31) return false;
  if (m >= 7 && m <= 11 && d > 30) return false;
  if (m === 12 && d > 30) return false;
  return true;
}

/** تاریخ امروز به وقت تهران، قالب 'YYYYMMDD' */
export function todayJ(): string {
  const p = new Intl.DateTimeFormat("en-u-ca-persian-nu-latn", {
    timeZone: "Asia/Tehran",
    year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date()).reduce<Record<string, string>>(
    (o, x) => (o[x.type] = x.value, o), {}
  );
  return String(p.year).padStart(4, "0") + p.month + p.day;
}
