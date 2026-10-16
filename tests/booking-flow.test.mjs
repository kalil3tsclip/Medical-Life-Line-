// End-to-end booking → deposit → payment checks against the real API route code and a real SQLite database.
// Run: node tests/build-routes.mjs tests/.build && node --no-warnings --test tests/booking-flow.test.mjs
// (BUILD_DIR env var overrides tests/.build.)
import { test, before, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createD1 } from "./d1-sqlite.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const BUILD = process.env.BUILD_DIR || path.join(here, ".build");
const SITE = "https://medilifelinetrans.com";
const OWNER = { email: "vgcaldwell89@gmail.com", userId: "owner" };
const SIG_KEY = "test-signature-key";

let quotes, admin, webhook, availability, db;
let routeMiles = 12, routeMinutes = 25, squareCalls = [];

const houstonDate = (offsetDays) => {
  const d = new Date(Date.now() + offsetDays * 86400000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Chicago", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
};
const DAY = houstonDate(3); // a date safely in the booking window
const isWeekday = (date) => { const w = new Date(date + "T12:00:00Z").getUTCDay(); return w > 0 && w < 6; };

const req = (url, method, body, headers = {}) => new Request(SITE + url, { method, headers: { "content-type": "application/json", origin: SITE, ...headers }, body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body) });
const json = async (res) => ({ status: res.status, body: await res.json() });
const place = (label, lat, lon) => ({ label, lat, lon });
const HOME = place("1522 Texas Pkwy, Missouri City, TX 77489", 29.6186, -95.5267);
const CLINIC = place("Houston Methodist Hospital, 6565 Fannin St, Houston, TX 77030", 29.7114, -95.3992);

function quoteBody(over = {}) {
  return { name: "Test Rider", phone: "832-555-0142", email: "", pickup: HOME, destination: CLINIC, service: "wheelchair", date: DAY, time: "09:00", first: false, consent: true, website: "", key: randomUUID(), ...over };
}
function sign(body) { return createHmac("sha256", SIG_KEY).update(SITE + "/api/square-webhook" + body).digest("base64"); }
async function squareEvent(event) {
  const raw = JSON.stringify(event);
  return json(await webhook.POST(new Request(SITE + "/api/square-webhook", { method: "POST", headers: { "x-square-hmacsha256-signature": sign(raw) }, body: raw })));
}
const paymentEvent = (orderId, cents, status = "COMPLETED", id = "pay_" + randomUUID().slice(0, 8)) => ({ type: "payment.updated", data: { object: { payment: { id, order_id: orderId, status, amount_money: { amount: cents, currency: "USD" } } } } });
const refundEvent = (paymentId, cents, id = "ref_" + randomUUID().slice(0, 8)) => ({ type: "refund.updated", data: { object: { refund: { id, payment_id: paymentId, status: "COMPLETED", amount_money: { amount: cents, currency: "USD" } } } } });
const ride = async (id) => { const r = await db.prepare("SELECT * FROM ride_requests WHERE id=?").bind(id).first(); return r && { ...r, q: JSON.parse(r.estimate), d: JSON.parse(r.details) }; };

async function requestRide(over = {}) {
  const body = quoteBody(over);
  const q = await json(await quotes.POST(req("/api/quotes", "POST", body)));
  assert.equal(q.status, 200, JSON.stringify(q.body));
  const p = await json(await quotes.PATCH(req("/api/quotes", "PATCH", { id: body.key })));
  assert.equal(p.status, 200, JSON.stringify(p.body));
  return body.key;
}
async function sendLink(id) {
  globalThis.__TEST_USER = OWNER;
  return json(await admin.POST(req("/api/admin", "POST", { action: "deposit-link", id })));
}

before(async () => {
  const load = (n) => import(pathToFileURL(path.join(BUILD, n + ".js")).href);
  [quotes, admin, webhook, availability] = await Promise.all(["quotes", "admin", "webhook", "availability"].map(load));
  globalThis.fetch = async (url, init) => {
    url = String(url);
    if (url.includes("router.project-osrm.org")) return new Response(JSON.stringify({ routes: [{ distance: routeMiles * 1609.344, duration: routeMinutes * 60 }] }));
    if (url.includes("/v2/online-checkout/payment-links")) {
      const body = JSON.parse(init.body); squareCalls.push(body);
      const n = squareCalls.length;
      return new Response(JSON.stringify({ payment_link: { id: "link_" + n, url: "https://square.link/u/test" + n, order_id: "order_" + body.order.reference_id } }));
    }
    throw new Error("Unexpected network call in test: " + url);
  };
});
beforeEach(() => {
  db = createD1(path.join(here, "../drizzle/0000_fuzzy_justice.sql"));
  globalThis.__TEST_ENV = { DB: db, SQUARE_ACCESS_TOKEN: "sandbox-token", SQUARE_LOCATION_ID: "LOC1", SQUARE_ENVIRONMENT: "sandbox", SQUARE_WEBHOOK_SIGNATURE_KEY: SIG_KEY, SITE_URL: SITE };
  globalThis.__TEST_USER = null;
  routeMiles = 12; routeMinutes = 25; squareCalls = [];
});

// ---------- Owner-only access ----------
test("owner dashboard data is refused to visitors and to other signed-in people", async () => {
  globalThis.__TEST_USER = null;
  assert.equal((await admin.GET()).status, 403);
  globalThis.__TEST_USER = { email: "someone@else.com" };
  assert.equal((await admin.GET()).status, 403);
  assert.equal((await admin.POST(req("/api/admin", "POST", { action: "block", date: DAY, start: 600, end: 660 }))).status, 403);
  globalThis.__TEST_USER = OWNER;
  assert.equal((await admin.GET()).status, 200);
});
test("owner actions from another website are refused", async () => {
  globalThis.__TEST_USER = OWNER;
  const r = await admin.POST(req("/api/admin", "POST", { action: "block", date: DAY, start: 600, end: 660 }, { origin: "https://evil.example" }));
  assert.equal(r.status, 403);
});

// ---------- Quotes and calendar ----------
test("website quote saves with approved pricing and 50% deposit", async () => {
  const body = quoteBody({ round: true, returnPlan: "scheduled", returnTime: "12:00" });
  const r = await json(await quotes.POST(req("/api/quotes", "POST", body)));
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.estimate.total, 2 * (65 + 2 * 2.75)); // 12 mi each way, wheelchair
  assert.equal(r.body.estimate.deposit, 70.5);
  assert.equal((await ride(body.key)).status, "quoted");
});
test("'I'll call when ready' is flagged for owner review and reserves no return time", async () => {
  const body = quoteBody({ round: true, returnPlan: "call" });
  const r = await json(await quotes.POST(req("/api/quotes", "POST", body)));
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.estimate.returnToArrange, true);
  assert.equal(r.body.estimate.ownerReview, true);
  const saved = await ride(body.key);
  assert.equal(saved.end, 9 * 60 + 2 * 25 + 45); // outbound trip + drive back + buffer only
  assert.equal(saved.d.returnTime, null);
  assert.equal(saved.status, "quoted"); // nothing is confirmed without the owner
});
test("a quote that overlaps a confirmed ride or blocked time is refused", async () => {
  globalThis.__TEST_USER = OWNER;
  await admin.POST(req("/api/admin", "POST", { action: "block", date: DAY, start: 8 * 60, end: 10 * 60 }));
  const r = await json(await quotes.POST(req("/api/quotes", "POST", quoteBody())));
  assert.equal(r.status, 400);
  assert.match(r.body.error, /does not fit|unavailable/);
});
test("wheelchair fit details are saved for owner review", async () => {
  const body = quoteBody({ wheelchairType: "power", combinedWeight: 420, steps: "few", notes: "Call when outside" });
  assert.equal((await quotes.POST(req("/api/quotes", "POST", body))).status, 200);
  const saved = await ride(body.key);
  assert.equal(saved.d.wheelchairType, "power");
  assert.equal(saved.d.combinedWeight, 420);
  assert.equal(saved.d.notes, "Call when outside");
});

// ---------- Phone bookings ----------
test("phone booking saves on the same calendar and blocks website quotes", async () => {
  globalThis.__TEST_USER = OWNER;
  const r = await json(await admin.POST(req("/api/admin", "POST", { action: "manual", name: "Caller", phone: "(713) 555-0199", service: "ambulatory", pickup: "8800 Main St, Houston", destination: "MD Anderson, Houston", date: DAY, time: "09:00", freeAt: "11:00", fare: 80, notes: "Daughter calling" })));
  assert.equal(r.status, 200, JSON.stringify(r.body));
  const saved = await ride(r.body.id);
  assert.equal(saved.status, "requested");
  assert.equal(saved.q.deposit, 40);
  // Hold it with a deposit link; a website quote at the same time must now be refused.
  assert.equal((await sendLink(r.body.id)).status, 200);
  const clash = await json(await quotes.POST(req("/api/quotes", "POST", quoteBody({ time: "09:30" }))));
  assert.equal(clash.status, 400);
});

// ---------- Deposit links and payments ----------
test("deposit link holds the ride for 24 hours and charges exactly 50%", async () => {
  const id = await requestRide();
  const r = await sendLink(id);
  assert.equal(r.status, 200, JSON.stringify(r.body));
  const saved = await ride(id);
  assert.equal(saved.status, "held");
  assert.equal(squareCalls[0].order.line_items[0].base_price_money.amount, Math.round(saved.q.deposit * 100));
  const hours = (Date.parse(saved.q.holdUntil) - Date.now()) / 3600000;
  assert.ok(hours > 23.9 && hours <= 24);
});
test("a second deposit link cannot hold a time that overlaps an active hold", async () => {
  const a = await requestRide({ time: "09:00" });
  assert.equal((await sendLink(a)).status, 200);
  // Second request entered by phone at an overlapping time (website quotes are already blocked by the hold).
  globalThis.__TEST_USER = OWNER;
  const b = await json(await admin.POST(req("/api/admin", "POST", { action: "manual", name: "Other", phone: "7135550100", service: "ambulatory", pickup: "Somewhere 1", destination: "Somewhere 2", date: DAY, time: "09:30", freeAt: "10:30", fare: 60 })));
  const second = await sendLink(b.body.id);
  assert.equal(second.status, 400);
  assert.match(second.body.error, /overlaps/);
});
test("forged payment notifications are rejected", async () => {
  const raw = JSON.stringify(paymentEvent("order_x", 100));
  const r = await webhook.POST(new Request(SITE + "/api/square-webhook", { method: "POST", headers: { "x-square-hmacsha256-signature": "bogus" }, body: raw }));
  assert.equal(r.status, 401);
});
test("successful payment confirms the ride; repeated notifications change nothing", async () => {
  const id = await requestRide();
  await sendLink(id);
  const { q } = await ride(id);
  const ev = paymentEvent(q.squareOrderId, Math.round(q.deposit * 100));
  const first = await squareEvent(ev);
  assert.equal(first.body.confirmed, true);
  let saved = await ride(id);
  assert.equal(saved.status, "confirmed");
  assert.equal(saved.payment, "deposit-paid");
  const snapshot = saved.estimate;
  await squareEvent(ev); await squareEvent(ev);
  saved = await ride(id);
  assert.equal(saved.estimate, snapshot);
});
test("failed or pending payments do not confirm anything", async () => {
  const id = await requestRide();
  await sendLink(id);
  const { q } = await ride(id);
  for (const status of ["FAILED", "CANCELED", "PENDING", "APPROVED"]) await squareEvent(paymentEvent(q.squareOrderId, Math.round(q.deposit * 100), status));
  const saved = await ride(id);
  assert.equal(saved.status, "held");
  assert.equal(saved.payment, "unpaid");
});
test("payment after the hold expired is flagged, not confirmed", async () => {
  const id = await requestRide();
  await sendLink(id);
  const r = await ride(id);
  await db.prepare("UPDATE ride_requests SET estimate=? WHERE id=?").bind(JSON.stringify({ ...r.q, holdUntil: new Date(Date.now() - 60000).toISOString() }), id).run();
  const res = await squareEvent(paymentEvent(r.q.squareOrderId, Math.round(r.q.deposit * 100)));
  assert.equal(res.body.flagged, "lateDeposit");
  const saved = await ride(id);
  assert.equal(saved.status, "held");
  assert.equal(saved.payment, "deposit-paid");
  assert.equal(saved.q.lateDeposit, true);
});
test("an old link paid after another ride took the time is flagged, never double-booked", async () => {
  const a = await requestRide({ time: "09:00" });
  await sendLink(a);
  const A = await ride(a);
  // Hold lapses; owner books a phone ride at the same time and confirms it with a deposit.
  await db.prepare("UPDATE ride_requests SET estimate=? WHERE id=?").bind(JSON.stringify({ ...A.q, holdUntil: new Date(Date.now() - 1000).toISOString() }), a).run();
  globalThis.__TEST_USER = OWNER;
  const b = await json(await admin.POST(req("/api/admin", "POST", { action: "manual", name: "Phone", phone: "7135550111", service: "ambulatory", pickup: "Addr 1", destination: "Addr 2", date: DAY, time: "09:00", freeAt: "10:30", fare: 60 })));
  const conf = await json(await admin.POST(req("/api/admin", "POST", { id: b.body.id, status: "confirmed", payment: "deposit-paid" })));
  if (isWeekday(DAY) && 9 * 60 < 1080) assert.equal(conf.status, 200, JSON.stringify(conf.body));
  // Now the first rider pays the old link.
  const res = await squareEvent(paymentEvent(A.q.squareOrderId, Math.round(A.q.deposit * 100)));
  assert.ok(["lateDeposit", "depositConflict"].includes(res.body.flagged));
  const confirmedAt9 = await db.prepare("SELECT COUNT(*) AS n FROM ride_requests WHERE date=? AND status='confirmed'").bind(DAY).first();
  assert.equal(confirmedAt9.n, 1);
});
test("a confirmed ride that appeared during a valid hold is still protected", async () => {
  const a = await requestRide({ time: "09:00" });
  await sendLink(a);
  const A = await ride(a);
  // Simulate the owner force-confirming an overlapping ride while A's hold is still active.
  await db.prepare("INSERT INTO ride_requests(id,name,phone,email,date,start,end,details,estimate,status,payment,created) VALUES(?,?,?,?,?,?,?,?,?,'confirmed','paid',?)").bind(randomUUID(), "X", "7135550123", "", DAY, 9 * 60, 10 * 60, "{}", "{}", new Date().toISOString()).run();
  const res = await squareEvent(paymentEvent(A.q.squareOrderId, Math.round(A.q.deposit * 100)));
  assert.equal(res.body.flagged, "depositConflict");
  assert.equal((await ride(a)).status, "held");
});
test("a short payment is flagged, not confirmed", async () => {
  const id = await requestRide();
  await sendLink(id);
  const { q } = await ride(id);
  const res = await squareEvent(paymentEvent(q.squareOrderId, Math.round(q.deposit * 100) - 500));
  assert.equal(res.body.flagged, "underpaid");
  assert.equal((await ride(id)).status, "held");
});
test("payment for a ride the owner already canceled is flagged for refund", async () => {
  const id = await requestRide();
  await sendLink(id);
  const { q } = await ride(id);
  await db.prepare("UPDATE ride_requests SET status='canceled' WHERE id=?").bind(id).run();
  const res = await squareEvent(paymentEvent(q.squareOrderId, Math.round(q.deposit * 100)));
  assert.equal(res.body.flagged, "paidAfterCancel");
  assert.equal((await ride(id)).status, "canceled");
});
test("refunds are recorded once each; a full refund marks the payment refunded", async () => {
  const id = await requestRide();
  await sendLink(id);
  let r = await ride(id);
  const pay = paymentEvent(r.q.squareOrderId, Math.round(r.q.deposit * 100), "COMPLETED", "pay_full");
  await squareEvent(pay);
  const half = Math.round(r.q.deposit * 50);
  const ref1 = refundEvent("pay_full", half, "ref_1");
  await squareEvent(ref1); await squareEvent(ref1); // duplicate notification
  r = await ride(id);
  assert.equal(r.q.refunded, half / 100);
  assert.equal(r.payment, "deposit-paid");
  await squareEvent(refundEvent("pay_full", Math.round(r.q.deposit * 100) - half, "ref_2"));
  r = await ride(id);
  assert.equal(r.payment, "refunded");
});
test("deposit links are refused when Square is not connected", async () => {
  globalThis.__TEST_ENV.SQUARE_ACCESS_TOKEN = undefined;
  const id = await requestRide();
  const r = await sendLink(id);
  assert.equal(r.status, 400);
  assert.match(r.body.error, /Square is not connected/);
  assert.equal((await ride(id)).status, "requested");
});

// ---------- Holds never run past pickup; van limits; reminder checklist ----------
const houstonNowMinutes = () => { const p = new Intl.DateTimeFormat("en-GB", { timeZone: "America/Chicago", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date()); return Number(p.slice(0, 2)) * 60 + Number(p.slice(3)); };
const hhmm = (m) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
async function phoneBooking(over = {}) {
  globalThis.__TEST_USER = OWNER;
  const r = await json(await admin.POST(req("/api/admin", "POST", { action: "manual", name: "Caller", phone: "7135550177", service: "ambulatory", pickup: "Addr A 1", destination: "Addr B 2", date: DAY, time: "09:00", freeAt: "10:00", fare: 70, ...over })));
  assert.equal(r.status, 200, JSON.stringify(r.body));
  return r.body.id;
}
test("same-day: a deposit hold ends at least 1 hour before pickup, or is refused when too close", { skip: houstonNowMinutes() > 20 * 60 || houstonNowMinutes() < 60 }, async () => {
  const today = houstonDate(0), now = houstonNowMinutes();
  const soon = await phoneBooking({ date: today, time: hhmm(now + 40), freeAt: hhmm(now + 100) });
  const refused = await sendLink(soon);
  assert.equal(refused.status, 400);
  assert.match(refused.body.error, /too soon/);
  assert.equal((await ride(soon)).status, "requested");
  const later = await phoneBooking({ date: today, time: hhmm(Math.min(now + 180, 23 * 60)), freeAt: hhmm(Math.min(now + 230, 23 * 60 + 50)), phone: "7135550178" });
  const ok = await sendLink(later);
  assert.equal(ok.status, 200, JSON.stringify(ok.body));
  const minutesLeft = (Date.parse(ok.body.holdUntil) - Date.now()) / 60000;
  assert.ok(minutesLeft <= 125 && minutesLeft > 100, `hold ends ${minutesLeft} min from now`);
});
test("owner can choose a shorter payment window", async () => {
  const id = await phoneBooking();
  globalThis.__TEST_USER = OWNER;
  const r = await json(await admin.POST(req("/api/admin", "POST", { action: "deposit-link", id, holdMinutes: 120 })));
  assert.equal(r.status, 200, JSON.stringify(r.body));
  const mins = (Date.parse(r.body.holdUntil) - Date.now()) / 60000;
  assert.ok(mins > 118 && mins <= 120);
});
test("van limits are saved and returned to the owner only", async () => {
  globalThis.__TEST_USER = OWNER;
  let g = await json(await admin.GET());
  assert.deepEqual(g.body.vehicle, {});
  const s = await admin.POST(req("/api/admin", "POST", { action: "vehicle", rampLbs: 800, securementLbs: 750, usableWidthIn: 30, doorHeightIn: 56, source: "ramp label" }));
  assert.equal(s.status, 200);
  g = await json(await admin.GET());
  assert.equal(g.body.vehicle.rampLbs, 800);
  assert.equal(g.body.vehicle.source, "ramp label");
  globalThis.__TEST_USER = { email: "x@y.com" };
  assert.equal((await admin.POST(req("/api/admin", "POST", { action: "vehicle", rampLbs: 9999 }))).status, 403);
});
test("reminder checklist records when the owner contacted the rider", async () => {
  const id = await phoneBooking();
  globalThis.__TEST_USER = OWNER;
  assert.equal((await admin.POST(req("/api/admin", "POST", { action: "reminded", id }))).status, 200);
  assert.ok((await ride(id)).q.remindedAt);
});
