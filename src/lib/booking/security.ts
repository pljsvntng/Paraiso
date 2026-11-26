import {
  createHash,
  randomBytes,
  scrypt as derive,
  timingSafeEqual,
  createCipheriv,
  createDecipheriv,
} from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { db, type Staff } from "./db";
import { BookingError } from "./validation";
import { demoRequested } from "./demo-mode";
const scrypt = promisify(derive);
export const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export const token = () => randomBytes(32).toString("hex");
export async function hashPassword(password: string) {
  if (password.length < 12 || password.length > 128)
    throw new BookingError(400, "Use a password with 12–128 characters.");
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${((await scrypt(password, salt, 64)) as Buffer).toString("hex")}`;
}
export async function verifyPassword(password: string, stored: string) {
  const [salt, digest] = stored.split(":");
  if (!salt || !digest) return false;
  const actual = (await scrypt(password, salt, 64)) as Buffer;
  const expected = Buffer.from(digest, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
export const sessionCookie = demoRequested()
  ? "paraiso_demo_session"
  : "paraiso_session";
export const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 8 * 60 * 60,
};
export async function currentStaff(): Promise<Staff | null> {
  const value = (await cookies()).get(sessionCookie)?.value;
  if (!value) return null;
  const result = await db().query<Staff>(
    `SELECT u.id,u.full_name,u.email,u.role,u.can_approve,u.can_export,u.can_verify_payments FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>now() AND u.active`,
    [hash(value)],
  );
  return result.rows[0] ?? null;
}
export async function requireStaff(admin = false) {
  const user = await currentStaff();
  if (!user) throw new BookingError(401, "Please sign in to continue.");
  if (admin && user.role !== "ADMIN")
    throw new BookingError(403, "Administrator access required.");
  return user;
}
export function requireApproval(user: Staff) {
  if (user.role !== "ADMIN" && !user.can_approve)
    throw new BookingError(
      403,
      "Your account cannot approve or decline requests.",
    );
}
export function sameOrigin(request: Request) {
  const expected = new URL(process.env.APP_URL || request.url).origin;
  if (request.headers.get("origin") !== expected)
    throw new BookingError(
      403,
      "Please submit this form from the resort website.",
    );
}
export async function rateLimit(key: string, limit: number, seconds: number) {
  const result = await db().query(
    `INSERT INTO rate_limits(key,count,expires_at) VALUES($1,1,now()+$2*interval '1 second') ON CONFLICT(key) DO UPDATE SET count=CASE WHEN rate_limits.expires_at<now() THEN 1 ELSE rate_limits.count+1 END, expires_at=CASE WHEN rate_limits.expires_at<now() THEN now()+$2*interval '1 second' ELSE rate_limits.expires_at END RETURNING count`,
    [hash(key), seconds],
  );
  if (result.rows[0].count > limit)
    throw new BookingError(429, "Too many attempts. Please try again later.");
}
export function clientKey(request: Request) {
  // Enable only with a proxy that overwrites this header; never trust arbitrary forwarded headers.
  return process.env.TRUSTED_IP_HEADER
    ? request.headers.get(process.env.TRUSTED_IP_HEADER)?.slice(0, 100) ||
        "unknown"
    : "shared";
}
function encryptionKey() {
  const key = Buffer.from(process.env.INTEGRATION_ENCRYPTION_KEY || "", "hex");
  if (key.length !== 32)
    throw new BookingError(
      503,
      "Configure the server integration encryption key first.",
    );
  return key;
}
export function encrypt(value: string) {
  const iv = randomBytes(12),
    cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const output = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), output]
    .map((b) => b.toString("hex"))
    .join(":");
}
export function decrypt(value: string) {
  const [iv, tag, ciphertext] = value
    .split(":")
    .map((v) => Buffer.from(v, "hex"));
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]).toString("utf8");
}
