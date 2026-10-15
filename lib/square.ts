import { env } from "cloudflare:workers";

// Square deposit links. Configure these on the host (never commit them):
//   SQUARE_ACCESS_TOKEN            – from the Square Developer Dashboard (production or sandbox)
//   SQUARE_LOCATION_ID             – the Medical Life Line location
//   SQUARE_ENVIRONMENT             – "production" or "sandbox" (default sandbox until you switch)
//   SQUARE_WEBHOOK_SIGNATURE_KEY   – from the webhook subscription for payment.updated
//   SITE_URL                       – https://medilifelinetrans.com (used for the redirect and webhook URL)
const SQUARE_VERSION = "2026-09-16";
type SquareEnv = { SQUARE_ACCESS_TOKEN?: string; SQUARE_LOCATION_ID?: string; SQUARE_ENVIRONMENT?: string; SQUARE_WEBHOOK_SIGNATURE_KEY?: string; SITE_URL?: string };
const cfg = () => env as unknown as SquareEnv;

export function squareConfigured() {
  const e = cfg();
  return !!(e.SQUARE_ACCESS_TOKEN && e.SQUARE_LOCATION_ID);
}

function apiBase() {
  return cfg().SQUARE_ENVIRONMENT === "production" ? "https://connect.squareup.com" : "https://connect.squareupsandbox.com";
}

export function siteUrl() {
  return (cfg().SITE_URL || "https://medilifelinetrans.com").replace(/\/$/, "");
}

export async function createDepositLink(o: { rideId: string; amount: number; date: string; name: string; email?: string; phone: string }) {
  const e = cfg();
  if (!e.SQUARE_ACCESS_TOKEN || !e.SQUARE_LOCATION_ID) throw new Error("Square is not connected yet. Add your Square keys on the host, or record the deposit manually.");
  const amount = Math.round(o.amount * 100);
  if (!Number.isInteger(amount) || amount < 100) throw new Error("Deposit amount is invalid.");
  const res = await fetch(`${apiBase()}/v2/online-checkout/payment-links`, {
    method: "POST",
    headers: { Authorization: `Bearer ${e.SQUARE_ACCESS_TOKEN}`, "Square-Version": SQUARE_VERSION, "Content-Type": "application/json" },
    body: JSON.stringify({
      idempotency_key: `deposit-${o.rideId}-${amount}`,
      order: {
        location_id: e.SQUARE_LOCATION_ID,
        reference_id: o.rideId,
        line_items: [{ name: `Ride deposit (50%) – ${o.date}`, quantity: "1", base_price_money: { amount, currency: "USD" } }],
      },
      checkout_options: { redirect_url: `${siteUrl()}/deposit-received`, ask_for_shipping_address: false },
      ...(o.email ? { pre_populated_data: { buyer_email: o.email } } : {}),
      payment_note: `Medical Life Line deposit for ${o.name}, ride ${o.date}`,
    }),
    signal: AbortSignal.timeout(15000),
  });
  const data: any = await res.json().catch(() => ({}));
  if (!res.ok || !data.payment_link?.url) {
    const detail = data.errors?.[0]?.detail;
    throw new Error(`Square could not create the payment link${detail ? `: ${detail}` : "."}`);
  }
  return { url: String(data.payment_link.url), linkId: String(data.payment_link.id), orderId: String(data.payment_link.order_id) };
}

/** Verify Square's x-square-hmacsha256-signature: base64(HMAC-SHA256(signatureKey, notificationUrl + rawBody)). */
export async function verifySquareSignature(rawBody: string, signature: string | null, notificationUrl: string) {
  const key = cfg().SQUARE_WEBHOOK_SIGNATURE_KEY;
  if (!key || !signature) return false;
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey("raw", enc.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(notificationUrl + rawBody)));
  let binary = "";
  for (const byte of mac) binary += String.fromCharCode(byte);
  const expected = btoa(binary);
  if (expected.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  return diff === 0;
}
