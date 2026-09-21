/**
 * احراز هویت سمت سرور.
 *
 * این همان چیزی است که در نسخهٔ تک‌فایلی ممکن نبود: رمز عبور روی سرور
 * بررسی می‌شود و مرورگر فقط یک کوکی امضاشدهٔ httpOnly می‌گیرد.
 * نه رمز و نه کلید دیتابیس هرگز به مرورگر نمی‌رسد.
 */
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { ensureDatabase, findUser, countUsers, createUser } from "@/db/repo";

const COOKIE = "hesab_session";
const DAYS = 30;

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 16) {
    throw new Error(
      "AUTH_SECRET تنظیم نشده یا کوتاه است. یک رشتهٔ تصادفی حداقل ۳۲ کاراکتری قرار دهید."
    );
  }
  return new TextEncoder().encode(s);
}

export async function hashPassword(pw: string) {
  return bcrypt.hash(pw, 10);
}

/** ورود: نام کاربری و رمز را بررسی و کوکی نشست را ست می‌کند */
export async function signIn(username: string, password: string) {
  await ensureDatabase();
  await seedFirstUser();

  const u = await findUser(username.trim().toLowerCase());
  if (!u) throw new Error("نام کاربری یا رمز عبور نادرست است.");

  const okPw = await bcrypt.compare(password, u.password_hash);
  if (!okPw) throw new Error("نام کاربری یا رمز عبور نادرست است.");

  const token = await new SignJWT({ uid: u.id, un: u.username })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${DAYS}d`)
    .sign(secret());

  (await cookies()).set(COOKIE, token, {
    httpOnly: true,                                   // جاوااسکریپت مرورگر نمی‌بیندش
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: DAYS * 24 * 60 * 60,
  });

  return { id: u.id, username: u.username };
}

export async function signOut() {
  (await cookies()).delete(COOKIE);
}

/** کاربر فعلی از روی کوکی — یا null اگر وارد نشده باشد */
export async function currentUser() {
  try {
    const c = (await cookies()).get(COOKIE)?.value;
    if (!c) return null;
    const { payload } = await jwtVerify(c, secret());
    return { id: String(payload.uid), username: String(payload.un) };
  } catch {
    return null;
  }
}

/** نگهبان: در هر Route Handler اول این را صدا بزنید */
export async function requireUser() {
  await ensureDatabase();
  const u = await currentUser();
  if (!u) throw new HttpError(401, "برای این کار باید وارد شوید.");
  return u;
}

/** اولین اجرا: اگر هیچ کاربری نیست، از متغیرهای محیطی بساز */
export async function seedFirstUser() {
  const n = await countUsers();
  if (n > 0) return;

  const un = (process.env.ADMIN_USERNAME || "admin").trim().toLowerCase();
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) {
    throw new Error(
      "هیچ کاربری وجود ندارد و ADMIN_PASSWORD تنظیم نشده است. " +
      "در تنظیمات محیطی، ADMIN_USERNAME و ADMIN_PASSWORD را وارد کنید."
    );
  }
  await createUser(un, await hashPassword(pw));
}

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}
