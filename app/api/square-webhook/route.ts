import { database, reply } from "@/lib/booking";
import { siteUrl, verifySquareSignature } from "@/lib/square";

// Square calls this when a payment or refund changes.
// A ride is confirmed automatically ONLY when all of these hold:
//   - the payment is COMPLETED for the ride's deposit order and covers the full deposit,
//   - the ride is still "held" and its 24-hour hold has not expired,
//   - no confirmed ride or blocked time overlaps it.
// Anything else records the payment and flags the ride for the owner (it never confirms a conflict).
// Repeated notifications are harmless: a ride already marked paid is not changed again.
type Flag = "lateDeposit" | "depositConflict" | "underpaid" | "paidAfterCancel";

export async function POST(r: Request) {
  const raw = await r.text();
  const ok = await verifySquareSignature(raw, r.headers.get("x-square-hmacsha256-signature"), `${siteUrl()}/api/square-webhook`);
  if (!ok) return reply({ error: "Invalid signature." }, 401);
  let event: any;
  try { event = JSON.parse(raw); } catch { return reply({ ok: true }); }
  try {
    if (event?.type === "refund.created" || event?.type === "refund.updated") return await onRefund(event?.data?.object?.refund);
    if (event?.type === "payment.created" || event?.type === "payment.updated") return await onPayment(event?.data?.object?.payment);
    return reply({ ok: true });
  } catch {
    return reply({ error: "Temporary error." }, 500); // Square retries failed deliveries
  }
}

async function onPayment(payment: any) {
  if (!payment || payment.status !== "COMPLETED" || !payment.order_id) return reply({ ok: true });
  const d = database();
  const ride = await d.prepare("SELECT id,date,start,end,status,payment,estimate FROM ride_requests WHERE json_extract(estimate,'$.squareOrderId')=?").bind(payment.order_id).first<any>();
  if (!ride || ride.payment !== "unpaid") return reply({ ok: true }); // unknown order, or duplicate notification
  const q = JSON.parse(ride.estimate);
  const paid = (payment.amount_money?.amount ?? 0) / 100;
  const now = new Date().toISOString();
  const base = { ...q, depositPaid: paid, squarePaymentId: payment.id, depositPaidAt: now };
  let flag: Flag | null = null;
  if (ride.status === "canceled") flag = "paidAfterCancel";
  else if (paid + 0.005 < (q.deposit ?? 0)) flag = "underpaid";
  else if (ride.status !== "held" || !q.holdUntil || q.holdUntil < now) flag = "lateDeposit";
  if (!flag) {
    const estimate = JSON.stringify(base);
    const confirmed = await d.prepare("UPDATE ride_requests SET status='confirmed',payment='deposit-paid',estimate=? WHERE id=? AND payment='unpaid' AND status='held' AND NOT EXISTS(SELECT 1 FROM ride_requests AS other WHERE other.id<>? AND other.date=? AND other.status='confirmed' AND other.start<? AND other.end>?) AND NOT EXISTS(SELECT 1 FROM availability_blocks WHERE date=? AND start<? AND end>?)").bind(estimate, ride.id, ride.id, ride.date, ride.end, ride.start, ride.date, ride.end, ride.start).run();
    if (confirmed.meta.changes) return reply({ ok: true, confirmed: true });
    flag = "depositConflict";
  }
  await d.prepare("UPDATE ride_requests SET payment='deposit-paid',estimate=? WHERE id=? AND payment='unpaid'").bind(JSON.stringify({ ...base, [flag]: true }), ride.id).run();
  return reply({ ok: true, flagged: flag });
}

async function onRefund(refund: any) {
  if (!refund || refund.status !== "COMPLETED" || !refund.payment_id) return reply({ ok: true });
  const d = database();
  const ride = await d.prepare("SELECT id,payment,estimate FROM ride_requests WHERE json_extract(estimate,'$.squarePaymentId')=?").bind(refund.payment_id).first<any>();
  if (!ride) return reply({ ok: true });
  const q = JSON.parse(ride.estimate);
  const refunds: Record<string, number> = { ...(q.refunds || {}) };
  refunds[refund.id] = (refund.amount_money?.amount ?? 0) / 100; // keyed by refund id, so repeats don't double count
  const refunded = Math.round(Object.values(refunds).reduce((a, b) => a + b, 0) * 100) / 100;
  const full = refunded + 0.005 >= (q.depositPaid ?? 0);
  await d.prepare("UPDATE ride_requests SET payment=?,estimate=? WHERE id=?").bind(full ? "refunded" : ride.payment, JSON.stringify({ ...q, refunds, refunded }), ride.id).run();
  return reply({ ok: true, refunded });
}
