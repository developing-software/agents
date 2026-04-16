import type { RequestEvent } from "@sveltejs/kit";
import { dev } from "$app/environment";

export interface AuthSession {
  accounts: Record<string, { email: string }>;
  current?: string;
}

const COOKIE_NAME = "auth";
const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: !dev,
  path: "/",
  maxAge: 60 * 60 * 24 * 365,
};

const encoder = new TextEncoder();

function b64urlEncode(bytes: Uint8Array): string {
  let str = "";
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function b64urlDecode(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/") + pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function hmacKey(): Promise<CryptoKey> {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is not set");
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

async function sign(data: string): Promise<string> {
  const key = await hmacKey();
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  return b64urlEncode(new Uint8Array(sig));
}

async function verify(data: string, sig: string): Promise<boolean> {
  const key = await hmacKey();
  const sigBytes = b64urlDecode(sig);
  return crypto.subtle.verify(
    "HMAC",
    key,
    sigBytes.buffer.slice(sigBytes.byteOffset, sigBytes.byteOffset + sigBytes.byteLength),
    encoder.encode(data),
  );
}

const EMPTY: AuthSession = { accounts: {} };

export async function readSession(event: RequestEvent): Promise<AuthSession> {
  const raw = event.cookies.get(COOKIE_NAME);
  if (!raw) return { ...EMPTY };
  const [payload, sig] = raw.split(".");
  if (!payload || !sig) {
    event.cookies.delete(COOKIE_NAME, { path: "/" });
    return { ...EMPTY };
  }
  if (!(await verify(payload, sig))) {
    event.cookies.delete(COOKIE_NAME, { path: "/" });
    return { ...EMPTY };
  }
  try {
    const json = new TextDecoder().decode(b64urlDecode(payload));
    const parsed = JSON.parse(json) as AuthSession;
    return { accounts: parsed.accounts ?? {}, current: parsed.current };
  } catch {
    event.cookies.delete(COOKIE_NAME, { path: "/" });
    return { ...EMPTY };
  }
}

export async function writeSession(event: RequestEvent, session: AuthSession): Promise<void> {
  if (!session.accounts || Object.keys(session.accounts).length === 0) {
    event.cookies.delete(COOKIE_NAME, { path: "/" });
    return;
  }
  const payload = b64urlEncode(encoder.encode(JSON.stringify(session)));
  const sig = await sign(payload);
  event.cookies.set(COOKIE_NAME, `${payload}.${sig}`, COOKIE_OPTS);
}

export async function addAccountToSession(
  event: RequestEvent,
  accountID: string,
  email: string,
): Promise<void> {
  const session = await readSession(event);
  session.accounts[accountID] = { email };
  session.current = accountID;
  await writeSession(event, session);
}

export async function dropCurrentAccount(event: RequestEvent): Promise<AuthSession> {
  const session = await readSession(event);
  if (session.current) delete session.accounts[session.current];
  session.current = Object.keys(session.accounts)[0];
  await writeSession(event, session);
  return session;
}
