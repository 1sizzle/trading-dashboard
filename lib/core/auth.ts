export const SESSION_COOKIE_NAME = "dashboard_session";
const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 30; // 30 days
export const SESSION_MAX_AGE_SECONDS = SESSION_DURATION_MS / 1000;

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function getSigningKey(): Promise<CryptoKey> {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET environment variable is not set");
  }
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

async function sign(payload: string): Promise<string> {
  const key = await getSigningKey();
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return toHex(signature);
}

export function checkPassword(candidate: string): boolean {
  const expected = process.env.DASHBOARD_PASSWORD;
  if (!expected) {
    throw new Error("DASHBOARD_PASSWORD environment variable is not set");
  }
  return timingSafeEqual(candidate, expected);
}

export async function createSessionToken(): Promise<string> {
  const expiresAt = Date.now() + SESSION_DURATION_MS;
  const payload = String(expiresAt);
  const signature = await sign(payload);
  return `${payload}.${signature}`;
}

export async function verifySessionToken(token: string | undefined | null): Promise<boolean> {
  if (!token) return false;

  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;

  const expiresAt = Number(payload);
  if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) return false;

  const expectedSignature = await sign(payload);
  return timingSafeEqual(expectedSignature, signature);
}
