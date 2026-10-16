import { env } from "cloudflare:workers";
import { headers } from "next/headers";

// Owner sign-in through Cloudflare Access.
// Cloudflare Access sits in front of /admin and /api/admin, asks for the owner's email and a one-time code,
// then forwards a signed token in the Cf-Access-Jwt-Assertion header. This file verifies that token on the
// server (signature, issuer, audience, expiry) and checks the email against OWNER_EMAILS.
// Nothing here trusts a plain header: a visitor who sends their own headers gets nothing.
//
// Host settings (not secret, but set on the host, never in code):
//   ACCESS_TEAM_DOMAIN  e.g. medicallifeline.cloudflareaccess.com
//   ACCESS_AUD          the Application Audience (AUD) tag of the Access application
//   OWNER_EMAILS        comma-separated, defaults to the owner's address
type AuthEnv = { ACCESS_TEAM_DOMAIN?: string; ACCESS_AUD?: string; OWNER_EMAILS?: string };
const cfg = () => env as unknown as AuthEnv;
const DEFAULT_OWNER = "vgcaldwell89@gmail.com";

export type Identity = { email: string };

let keyCache: { domain: string; at: number; keys: Map<string, CryptoKey> } | null = null;

const b64urlBytes = (s: string) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4)), (c) => c.charCodeAt(0));
const b64urlJson = (s: string) => JSON.parse(new TextDecoder().decode(b64urlBytes(s)));

async function signingKeys(domain: string, forceRefresh = false) {
  if (!forceRefresh && keyCache && keyCache.domain === domain && Date.now() - keyCache.at < 3600_000) return keyCache.keys;
  const res = await fetch(`https://${domain}/cdn-cgi/access/certs`, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error("Could not load Cloudflare Access keys.");
  const data: any = await res.json();
  const keys = new Map<string, CryptoKey>();
  for (const jwk of data.keys || []) {
    if (jwk.kty !== "RSA" || !jwk.kid) continue;
    keys.set(jwk.kid, await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]));
  }
  keyCache = { domain, at: Date.now(), keys };
  return keys;
}

/** Verifies a Cloudflare Access token. Returns the email, or null if anything is wrong. */
export async function verifyAccessToken(token: string | null | undefined, nowMs = Date.now()): Promise<Identity | null> {
  const { ACCESS_TEAM_DOMAIN: domain, ACCESS_AUD: aud } = cfg();
  if (!token || !domain || !aud) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const header = b64urlJson(parts[0]);
    const claims = b64urlJson(parts[1]);
    if (header.alg !== "RS256" || !header.kid) return null;
    let key = (await signingKeys(domain)).get(header.kid);
    if (!key) key = (await signingKeys(domain, true)).get(header.kid); // keys rotate
    if (!key) return null;
    const ok = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, b64urlBytes(parts[2]), new TextEncoder().encode(`${parts[0]}.${parts[1]}`));
    if (!ok) return null;
    const now = Math.floor(nowMs / 1000);
    if (claims.iss !== `https://${domain}`) return null;
    if (!(Array.isArray(claims.aud) ? claims.aud.includes(aud) : claims.aud === aud)) return null;
    if (typeof claims.exp !== "number" || claims.exp < now - 30) return null;
    if (typeof claims.nbf === "number" && claims.nbf > now + 30) return null;
    if (typeof claims.email !== "string" || !claims.email.includes("@")) return null;
    return { email: claims.email.toLowerCase() };
  } catch {
    return null;
  }
}

export function ownerEmails() {
  return (cfg().OWNER_EMAILS || DEFAULT_OWNER).split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
}

/** The signed-in person (via Cloudflare Access), or null. */
export async function currentIdentity(): Promise<Identity | null> {
  const h = await headers();
  return verifyAccessToken(h.get("cf-access-jwt-assertion"));
}

export async function isOwner() {
  const who = await currentIdentity();
  return !!who && ownerEmails().includes(who.email);
}

export const accessConfigured = () => !!(cfg().ACCESS_TEAM_DOMAIN && cfg().ACCESS_AUD);
export const SIGN_OUT_PATH = "/cdn-cgi/access/logout";
