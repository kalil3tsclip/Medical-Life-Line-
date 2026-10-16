"use client";
import { useEffect, useMemo, useState } from "react";
import { fitIssues } from "@/lib/fit";

type Ride = { id: string; name: string; phone: string; email: string; date: string; start: number; end: number; details: string; estimate: string; status: string; payment: string; created: string };

const houstonToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Chicago", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const addDays = (date: string, n: number) => { const d = new Date(date + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const clock = (m: number) => { const h = Math.floor(m / 60) % 24, mm = String(m % 60).padStart(2, "0"); return `${h % 12 || 12}:${mm} ${h < 12 ? "a.m." : "p.m."}`; };
const hhmmToClock = (s?: string | null) => (s ? clock(Number(s.slice(0, 2)) * 60 + Number(s.slice(3))) : "");
const money = (n?: number | null) => (n == null ? "—" : `$${n.toFixed(2)}`);
const dayLabel = (date: string) => new Date(date + "T12:00:00Z").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" });
const ACTIVE = ["requested", "held", "confirmed", "completed"];
const fmtPhone = (p: string) => (p.length === 10 ? `(${p.slice(0, 3)}) ${p.slice(3, 6)}-${p.slice(6)}` : p);
const WHEELCHAIR: Record<string, string> = { standard: "standard wheelchair", wide: "wide / bariatric wheelchair", power: "power wheelchair or scooter" };
const STEPS: Record<string, string> = { none: "No steps", few: "1–3 steps", many: "More than 3 steps" };

function parse(r: Ride) {
  let d: any = {}, q: any = {};
  try { d = JSON.parse(r.details); } catch {}
  try { q = JSON.parse(r.estimate); } catch {}
  return { d, q };
}
function collected(r: Ride, q: any) {
  if (r.payment === "paid") return q.total ?? 0;
  if (r.payment === "deposit-paid") return q.depositPaid ?? q.deposit ?? 0;
  return 0;
}

export function Dashboard() {
  const [data, setData] = useState<{ rides: Ride[]; blocks: any[]; square?: boolean; vehicle?: any }>({ rides: [], blocks: [] });
  const [error, setError] = useState(""), [notice, setNotice] = useState(""), [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true), [saving, setSaving] = useState(false);
  const [day, setDay] = useState(houstonToday());
  const [links, setLinks] = useState<Record<string, string>>({});
  const [holds, setHolds] = useState<Record<string, string>>({});

  async function load() { setError(""); setLoading(true); try { const r = await fetch("/api/admin"); const d: any = await r.json(); if (!r.ok) throw new Error(d.error); setData(d); } catch (e) { setError(e instanceof Error ? e.message : String(e)); } finally { setLoading(false); } }
  useEffect(() => { load(); }, []);
  async function save(body: any, done?: (d: any) => void) {
    setError(""); setNotice(""); setSaving(true);
    try { const r = await fetch("/api/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); const d: any = await r.json(); if (!r.ok) throw new Error(d.error); done?.(d); await load(); return true; }
    catch (e) { setError(e instanceof Error ? e.message : "Unable to save."); return false; }
    finally { setSaving(false); }
  }
  async function depositLink(r: Ride) {
    await save({ action: "deposit-link", id: r.id, holdMinutes: holds[r.id] ? Number(holds[r.id]) : undefined }, (d) => { setLinks((l) => ({ ...l, [r.id]: d.url })); setNotice(`Deposit link ready for ${r.name}: ${money(d.deposit)}. Text or copy it below.`); });
  }
  function exportData() { const rows = data.rides.map((r) => ({ ...r, ...parse(r) })); const url = URL.createObjectURL(new Blob([JSON.stringify(rows, null, 2)], { type: "application/json" })); const a = document.createElement("a"); a.href = url; a.download = "medical-life-line-records.json"; a.click(); URL.revokeObjectURL(url); }

  const today = houstonToday(), weekEnd = addDays(today, 6);
  const rides = data.rides;
  const strip = useMemo(() => {
    let scheduled = 0, got = 0, owed = 0, awaitingDeposit = 0;
    for (const r of rides) {
      if (!ACTIVE.includes(r.status) || r.date < today || r.date > weekEnd) continue;
      const { q } = parse(r); const total = q.total ?? 0; const c = collected(r, q);
      scheduled += total; got += c;
      if (r.payment === "unpaid" && ["requested", "held"].includes(r.status)) awaitingDeposit += q.deposit ?? 0;
      if (["confirmed", "completed"].includes(r.status)) owed += Math.max(0, total - c);
    }
    return { scheduled, got, owed, awaitingDeposit };
  }, [rides, today, weekEnd]);

  const attention = useMemo(() => rides.filter((r) => { const { q } = parse(r); return (r.date >= today && ["quoted", "requested", "held", "confirmed"].includes(r.status)) || (r.status === "completed" && r.payment !== "paid") || q.depositConflict || q.lateDeposit || q.underpaid || q.paidAfterCancel || (q.refunded && r.payment !== "refunded"); }).map((r) => {
    const { d, q } = parse(r); const reasons: string[] = [];
    if (q.manual) reasons.push("needs a price");
    if (r.status === "requested") reasons.push("new request: review and send deposit link");
    if (r.status === "held" && r.payment === "unpaid") reasons.push(q.holdUntil && q.holdUntil < new Date().toISOString() ? "deposit hold expired" : "waiting on deposit");
    if (q.depositConflict) reasons.push("deposit paid but time conflicts: call rider, refund or move");
    if (q.lateDeposit) reasons.push("deposit paid after hold expired: confirm or refund");
    if (q.underpaid) reasons.push(`deposit short: paid ${money(q.depositPaid)} of ${money(q.deposit)}`);
    if (q.paidAfterCancel) reasons.push("paid after ride was canceled: refund in Square");
    if (q.refunded && r.payment !== "refunded") reasons.push(`partial refund ${money(q.refunded)}`);
    if (["quoted", "requested", "held"].includes(r.status)) reasons.push(...fitIssues(d, data.vehicle || {}));
    if (d.returnPlan === "call") reasons.push("return time to be arranged");
    if (q.ownerReview && !q.manual) reasons.push("long trip: double-check route");
    if (q.tightArrival) reasons.push("tight for appointment time");
    if (r.status === "completed" && r.payment !== "paid") reasons.push("balance not marked paid");
    return { r, reasons };
  }).filter((x) => x.reasons.length).sort((a, b) => (a.r.date + a.r.start).localeCompare(b.r.date + b.r.start)), [rides, today, data.vehicle]);

  const reminders = rides.filter((r) => r.status === "confirmed" && (r.date === addDays(today, 1) || r.date === addDays(today, 2))).sort((a, b) => (a.date + String(a.start).padStart(4, "0")).localeCompare(b.date + String(b.start).padStart(4, "0")));
  const v = data.vehicle || {};
  const vehicleIncomplete = !v.rampLbs || !v.securementLbs || !v.usableWidthIn || !v.doorHeightIn;
  const dayRides = rides.filter((r) => r.date === day && ACTIVE.includes(r.status)).sort((a, b) => a.start - b.start);
  const records = rides.filter((r) => { const { d } = parse(r); return (r.name + r.phone + r.email + r.date + (d.riderName || "") + d.pickup + d.destination).toLowerCase().includes(filter.toLowerCase()); });

  return <main className="admin-shell page-width section">
    <a href="/" className="no-print">← Website</a>
    <h1>Ride desk</h1>
    <p className="no-print">Your schedule, requests, payments and customers. All times are Houston time.</p>
    {error && <p role="alert" className="form-error">{error}</p>}
    {notice && <p role="status" className="admin-notice">{notice}</p>}

    <section className="money-strip no-print" aria-label="Next 7 days">
      <div><span>Booked fares · next 7 days</span><b>{money(strip.scheduled)}</b></div>
      <div><span>Collected</span><b>{money(strip.got)}</b></div>
      <div><span>Deposits awaiting payment</span><b>{money(strip.awaitingDeposit)}</b></div>
      <div><span>Balances still owed</span><b>{money(strip.owed)}</b></div>
    </section>

    <section className="no-print"><h2>Needs attention {attention.length > 0 && <span className="count-pill">{attention.length}</span>}</h2>
      {loading ? <p>Loading…</p> : attention.length === 0 ? <p className="muted">Nothing waiting on you.</p> : <ul className="attention-list">{attention.map(({ r, reasons }) => <li key={r.id}><a href={`#ride-${r.id}`}><b>{r.name}</b> · {r.date} {clock(r.start)}</a><span>{reasons.join(" · ")}</span></li>)}</ul>}
    </section>

    <section className="no-print"><h2>Reminder calls &amp; texts</h2><p className="muted">Until automatic reminders are switched on: text or call each rider for the next two days, then tap Done.</p>
      {reminders.length === 0 ? <p className="muted">No confirmed rides in the next two days.</p> : <ul className="reminder-list">{reminders.map((r) => { const { d, q } = parse(r); const who = d.riderName || r.name; const body = encodeURIComponent(`Hi ${r.name}, this is Medical Life Line confirming ${who === r.name ? "your" : `${who}'s`} ride on ${dayLabel(r.date)}. Pickup at ${clock(r.start)} from ${d.pickup}. Reply or call (346) 909-7822 with any changes.`); return <li key={r.id} className={q.remindedAt ? "done" : ""}><span><b>{who}</b> · {dayLabel(r.date)} · {clock(r.start)}</span><span className="reminder-actions"><a href={`sms:+1${r.phone}?&body=${body}`}>Text</a><a href={`tel:+1${r.phone}`}>Call</a>{q.remindedAt ? <em>Done {new Date(q.remindedAt).toLocaleString("en-US", { timeZone: "America/Chicago", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</em> : <button disabled={saving} onClick={() => save({ action: "reminded", id: r.id })}>Done</button>}</span></li>; })}</ul>}
    </section>

    <details className="info-card no-print vehicle-card" open={vehicleIncomplete}><summary>Van limits {vehicleIncomplete ? "· not complete: wheelchair requests need your review" : `· ramp ${v.rampLbs} lb, securement ${v.securementLbs} lb`}</summary>
      <p className="muted">Enter only verified numbers from the ramp label, securement system or conversion paperwork. Leave blank if unknown.</p>
      <form className="admin-form" key={v.updated || "new"} onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); const num = (k: string) => (f.get(k) ? Number(f.get(k)) : null); save({ action: "vehicle", rampLbs: num("rampLbs"), securementLbs: num("securementLbs"), usableWidthIn: num("usableWidthIn"), doorHeightIn: num("doorHeightIn"), source: String(f.get("source") || "") || null }, () => setNotice("Van limits saved.")); }}>
        <div className="form-grid"><label>Ramp rated capacity (lb, rider + chair)<input name="rampLbs" type="number" min="1" step="1" defaultValue={v.rampLbs ?? ""} /></label><label>Wheelchair securement limit (lb)<input name="securementLbs" type="number" min="1" step="1" defaultValue={v.securementLbs ?? ""} /></label></div>
        <div className="form-grid"><label>Usable ramp/aisle width (in)<input name="usableWidthIn" type="number" min="1" step="0.5" defaultValue={v.usableWidthIn ?? ""} /></label><label>Door opening height (in)<input name="doorHeightIn" type="number" min="1" step="0.5" defaultValue={v.doorHeightIn ?? ""} /></label></div>
        <label className="select-label">Where these numbers came from<input name="source" maxLength={200} placeholder="e.g. ramp label photo, conversion paperwork" defaultValue={v.source ?? ""} /></label>
        <button disabled={saving}>Save van limits</button>
      </form>
    </details>

    <section className="day-schedule"><div className="day-head"><h2>Schedule · {dayLabel(day)}</h2><div className="admin-toolbar no-print"><button onClick={() => setDay(addDays(day, -1))}>← Prev</button><input type="date" value={day} onChange={(e) => e.target.value && setDay(e.target.value)} /><button onClick={() => setDay(houstonToday())}>Today</button><button onClick={() => setDay(addDays(day, 1))}>Next →</button><button onClick={() => window.print()}>Print day</button></div></div>
      {dayRides.length === 0 ? <p className="muted">No rides on this day.</p> : <ol className="manifest">{dayRides.map((r) => { const { d, q } = parse(r); return <li key={r.id} className={`manifest-item status-${r.status}`}>
        <div className="manifest-time"><b>{clock(r.start)}</b><span>pickup</span>{d.appointmentTime && <small>arrive by {hhmmToClock(d.appointmentTime)}</small>}<small>van free {clock(r.end)}</small></div>
        <div className="manifest-body">
          <h3>{d.riderName || r.name} <span className={`tag tag-${r.status}`}>{r.status}</span> <span className="tag">{d.service}</span>{d.source === "phone" && <span className="tag">phone booking</span>}</h3>
          <p><b>From</b> {d.pickup}<br /><b>To</b> {d.destination}</p>
          {d.round && <p><b>Return</b> {d.returnPlan === "call" ? "to be arranged: rider will call" : hhmmToClock(d.returnTime)}</p>}
          {d.riderName && <p>Booked by {r.name}</p>}
          {d.steps && d.steps !== "none" && <p><b>Access:</b> {STEPS[d.steps]}</p>}
          {d.wheelchairType && <p><b>Chair:</b> {WHEELCHAIR[d.wheelchairType] || d.wheelchairType}{d.combinedWeight ? ` · about ${d.combinedWeight} lb with chair` : ""}</p>}
          {d.notes && <p className="ride-notes">📝 {d.notes}</p>}
          <p><a href={`tel:+1${r.phone}`}>Call {fmtPhone(r.phone)}</a> · <a href={`sms:+1${r.phone}`}>Text</a> · {money(q.total)} · {r.payment}</p>
        </div></li>; })}</ol>}
    </section>

    <details className="info-card no-print phone-booking"><summary>+ Add a phone booking</summary>
      <form className="admin-form" onSubmit={async (e) => { e.preventDefault(); const form = e.currentTarget, f = new FormData(form); const ok = await save({ action: "manual", name: f.get("name"), phone: f.get("phone"), email: String(f.get("email") || ""), riderName: String(f.get("riderName") || "") || undefined, service: f.get("service"), pickup: f.get("pickup"), destination: f.get("destination"), date: f.get("date"), time: f.get("time"), appointmentTime: String(f.get("appointmentTime") || ""), returnTime: String(f.get("returnTime") || ""), freeAt: f.get("freeAt"), fare: Number(f.get("fare")), notes: String(f.get("notes") || "") }, () => setNotice("Phone booking saved as a request. Send the deposit link when ready.")); if (ok) form.reset(); }}>
        <div className="form-grid"><label>Caller name<input name="name" required maxLength={100} /></label><label>Phone<input name="phone" required type="tel" /></label></div>
        <div className="form-grid"><label>Rider name (if different)<input name="riderName" maxLength={100} /></label><label>Email (optional)<input name="email" type="email" /></label></div>
        <label className="select-label">Service<select name="service"><option value="wheelchair">Wheelchair</option><option value="ambulatory">Ambulatory</option></select></label>
        <label className="select-label">Pickup address<input name="pickup" required minLength={4} maxLength={300} /></label>
        <label className="select-label">Destination<input name="destination" required minLength={4} maxLength={300} /></label>
        <div className="form-grid"><label>Date<input name="date" type="date" required defaultValue={day} /></label><label>Pickup time<input name="time" type="time" required /></label></div>
        <div className="form-grid"><label>Appointment time (optional)<input name="appointmentTime" type="time" /></label><label>Return pickup (optional)<input name="returnTime" type="time" /></label></div>
        <div className="form-grid"><label>Van free again at<input name="freeAt" type="time" required /></label><label>Agreed fare ($)<input name="fare" type="number" min="1" step="0.01" required /></label></div>
        <label className="select-label">Notes<textarea name="notes" rows={2} maxLength={500} /></label>
        <button disabled={saving}>Save phone booking</button>
      </form>
    </details>

    <h2 className="no-print">Availability calendar</h2>
    <form className="admin-toolbar no-print" onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); const m = (s: string) => Number(s.slice(0, 2)) * 60 + Number(s.slice(3)); save({ action: "block", date: f.get("date"), start: m(String(f.get("start"))), end: m(String(f.get("end"))) }); }}><label>Date<input required type="date" name="date" /></label><label>From<input required type="time" name="start" defaultValue="05:00" /></label><label>Until<input required type="time" name="end" defaultValue="23:59" /></label><button disabled={saving}>Block time</button></form>
    <div className="no-print">{data.blocks.map((b: any) => <p key={b.id}>{b.date} · {clock(b.start)}–{clock(b.end)} <button disabled={saving} onClick={() => save({ action: "unblock", id: b.id })}>Remove block</button></p>)}</div>

    <h2 className="no-print">Customers & trip records</h2>
    <div className="admin-toolbar no-print"><input type="search" placeholder="Search name, phone, address or date" value={filter} onChange={(e) => setFilter(e.target.value)} /><button onClick={() => load()} disabled={saving}>Refresh</button><button onClick={exportData}>Export records</button></div>
    {!data.square && <p className="muted no-print">Square isn't connected yet, so deposit links can't be created. You can still record deposits by hand.</p>}
    <div className="no-print">{loading ? <p>Loading saved records…</p> : records.length === 0 ? <p>No records yet. New website requests and phone bookings appear here.</p> : records.map((r) => { const { d, q } = parse(r); const link = links[r.id] || q.depositUrl; const smsBody = link ? encodeURIComponent(`Hi ${r.name}, this is Medical Life Line. To confirm your ride on ${r.date} at ${clock(r.start)}, please pay the ${money(q.deposit)} deposit here: ${link}`) : ""; return <article className="admin-ride" id={`ride-${r.id}`} key={r.id}>
      <header><h3>{r.name}{d.riderName ? ` (rider: ${d.riderName})` : ""}</h3><strong>{q.total == null ? "Quote needed" : money(q.total)} · {r.status}</strong></header>
      <p>{r.date} at {clock(r.start)}{d.appointmentTime ? ` · arrive by ${hhmmToClock(d.appointmentTime)}` : ""}{d.round ? ` · Return ${d.returnPlan === "call" ? "to be arranged" : hhmmToClock(d.returnTime)}` : ""} · {d.service}{d.source === "phone" ? " · phone booking" : ""}</p>
      <p>{d.pickup} → {d.destination}</p>
      <p><a href={`tel:+1${r.phone}`}>{fmtPhone(r.phone)}</a>{r.email && <> · <a href={`mailto:${r.email}`}>{r.email}</a></>}</p>
      {d.notes && <p className="ride-notes">📝 {d.notes}</p>}
      <p className="muted">Fare {money(q.fare ?? q.subtotal)}{q.afterHours ? ` · after-hours ${money(q.afterHours)}` : ""}{q.sameDayFee ? ` · same-day ${money(q.sameDayFee)}` : ""}{q.discount ? ` · first-ride −${money(q.discount)}` : ""} · deposit {money(q.deposit)}{q.miles != null ? ` · ${q.miles} mi${q.returnMiles != null && q.returnMiles !== q.miles ? ` out / ${q.returnMiles} back` : ""}` : ""}{q.holdUntil && r.status === "held" ? ` · held until ${new Date(q.holdUntil).toLocaleString("en-US", { timeZone: "America/Chicago" })}` : ""}</p>
      {["quoted", "requested", "held"].includes(r.status) && r.payment === "unpaid" && !q.manual && <div className="deposit-tools">{data.square && <label className="hold-select">Pay within<select value={holds[r.id] ?? (r.date === today ? "60" : "")} onChange={(e) => setHolds((h) => ({ ...h, [r.id]: e.target.value }))}><option value="">24 hours</option><option value="240">4 hours</option><option value="120">2 hours</option><option value="60">1 hour</option><option value="30">30 minutes</option></select></label>}{data.square && <button disabled={saving} onClick={() => depositLink(r)}>{link ? "Refresh deposit link" : `Send ${money(q.deposit)} deposit link`}</button>}{link && <><a className="secondary-button" href={`sms:+1${r.phone}?&body=${smsBody}`}>Text link to rider</a><button type="button" onClick={() => navigator.clipboard?.writeText(link).then(() => setNotice("Link copied."))}>Copy link</button></>}</div>}
      <form className="admin-toolbar" onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); save({ id: r.id, status: f.get("status"), payment: f.get("payment"), verifiedTotal: f.get("verifiedTotal") ? Number(f.get("verifiedTotal")) : undefined, verifiedEnd: f.get("verifiedEnd") || undefined }); }}>
        {q.manual && <><label>Verified final fare (after any discount)<input required name="verifiedTotal" type="number" min="1" step="0.01" /></label><label>Vehicle available again<input required name="verifiedEnd" type="time" /></label></>}
        <label>Trip status<select name="status" defaultValue={r.status}><option>quoted</option><option>requested</option><option>held</option><option>confirmed</option><option>completed</option><option>canceled</option></select></label>
        <label>Payment<select name="payment" defaultValue={r.payment}><option>unpaid</option><option>deposit-paid</option><option>paid</option><option>refunded</option></select></label>
        <button disabled={saving}>Save</button>
      </form></article>; })}</div>
  </main>;
}
