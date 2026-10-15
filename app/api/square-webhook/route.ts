import { database, reply } from "@/lib/booking";
import { siteUrl, verifySquareSignature } from "@/lib/square";

// Square calls this when a payment changes. A COMPLETED payment on a deposit order marks the ride
// "deposit-paid" and confirms it if the slot is still free; otherwise it stays held for the owner to resolve.
export async function POST(r: Request) {
  const raw = await r.text();
  const ok = await verifySquareSignature(raw, r.headers.get("x-square-hmacsha256-signature"), `${siteUrl()}/api/square-webhook`);
  if (!ok) return reply({ error: "Invalid signature." }, 401);
  let event: any;
  try { event = JSON.parse(raw); } catch { return reply({ ok: true }); }
  const payment = event?.data?.object?.payment;
  if (event?.type !== "payment.updated" && event?.type !== "payment.created") return reply({ ok: true });
  if (!payment || payment.status !== "COMPLETED" || !payment.order_id) return reply({ ok: true });
  try {
    const d = database();
    const ride = await d.prepare("SELECT id,date,start,end,status,payment,estimate FROM ride_requests WHERE json_extract(estimate,'$.squareOrderId')=?").bind(payment.order_id).first<any>();
    if (!ride || ride.payment !== "unpaid") return reply({ ok: true });
    const paid = (payment.amount_money?.amount ?? 0) / 100;
    const estimate = JSON.stringify({ ...JSON.parse(ride.estimate), depositPaid: paid, squarePaymentId: payment.id, depositPaidAt: new Date().toISOString() });
    const confirmed = await d.prepare("UPDATE ride_requests SET status='confirmed',payment='deposit-paid',estimate=? WHERE id=? AND payment='unpaid' AND NOT EXISTS(SELECT 1 FROM ride_requests AS other WHERE other.id<>? AND other.date=? AND other.status='confirmed' AND other.start<? AND other.end>?) AND NOT EXISTS(SELECT 1 FROM availability_blocks WHERE date=? AND start<? AND end>?)").bind(estimate, ride.id, ride.id, ride.date, ride.end, ride.start, ride.date, ride.end, ride.start).run();
    if (!confirmed.meta.changes) {
      const flagged = JSON.stringify({ ...JSON.parse(estimate), depositConflict: true });
      await d.prepare("UPDATE ride_requests SET payment='deposit-paid',estimate=? WHERE id=? AND payment='unpaid'").bind(flagged, ride.id).run();
    }
    return reply({ ok: true });
  } catch {
    return reply({ error: "Temporary error." }, 500); // Square retries failed deliveries
  }
}
