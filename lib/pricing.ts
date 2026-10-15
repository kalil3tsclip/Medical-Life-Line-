// Medical Life Line fare rules. Pure functions with no runtime imports so they can be tested directly.
//
// Approved by owner 2026-10-15:
//  - $50 ambulatory / $65 wheelchair per leg, first 10 passenger miles included in EACH direction,
//    $2.75 per additional passenger mile, each leg calculated on its own route.
//  - After-hours fees per leg and the long-distance empty-return charge on one-way trips (kept).
//  - 20% first-ride discount on transportation fare only (not fees), max $25, once per booking.
//  - $25 same-day booking fee, once per booking.
//  - 50% deposit to confirm a booking; balance after the trip.
//  - Waiting: first 15 minutes free, then $15 per started 15 minutes, only when arranged
//    (added by the owner, never in the instant quote).
//  - Cancellation: 24+ hours before pickup = full refund; under 24 hours or no-show = 50% of the
//    affected fare (deposit counts toward it); if we cancel = full refund.

export const RATES = {
  base: { ambulatory: 50, wheelchair: 65 },
  includedMiles: 10,
  perMile: 2.75,
  firstRideDiscount: 0.2,
  firstRideDiscountCap: 25,
  sameDayFee: 25,
  depositShare: 0.5,
  waitFreeMinutes: 15,
  waitFeePer15: 15,
  cancelNoticeHours: 24,
  lateCancelShare: 0.5,
  longDistanceMiles: 75,
  reviewMiles: 60,
  emptyReturnPerMile: 1.5,
  policy: "2026-10-15b",
} as const;

const cents = (n: number) => Math.round(n * 100) / 100;

/** After-hours fee for a leg starting at `m` minutes after midnight (Houston time). */
export function timeFee(m: number) {
  return m < 300 || m >= 1320 ? 75 : m >= 1080 ? 45 : 0;
}

/** Fare for one passenger leg before fees and discounts. */
export function legFare(miles: number, service: string) {
  const base = service === "ambulatory" ? RATES.base.ambulatory : RATES.base.wheelchair;
  return cents(base + Math.max(0, miles - RATES.includedMiles) * RATES.perMile);
}

/** Waiting charge for an arranged wait of `minutes` (first 15 free, then per started 15 minutes). */
export function waitFee(minutes: number) {
  const billable = Math.max(0, minutes - RATES.waitFreeMinutes);
  return Math.ceil(billable / 15) * RATES.waitFeePer15;
}

/** Charge when a rider cancels: nothing with 24+ hours notice, otherwise 50% of the affected fare. */
export function cancellationCharge(affectedFare: number, hoursBeforePickup: number, noShow = false) {
  if (!noShow && hoursBeforePickup >= RATES.cancelNoticeHours) return 0;
  return cents(affectedFare * RATES.lateCancelShare);
}

export type QuoteInput = {
  miles: number; // outbound passenger miles
  service: string;
  start: number; // outbound pickup, minutes after midnight
  round?: boolean;
  returnStart?: number | null; // return pickup if known; null = return time to be arranged
  returnMiles?: number | null; // return-leg miles; defaults to outbound miles
  first?: boolean;
  sameDay?: boolean;
};

export function quote(q: QuoteInput) {
  const round = !!q.round;
  const back = round ? (q.returnMiles ?? q.miles) : 0;
  const outboundFare = legFare(q.miles, q.service);
  const returnFare = round ? legFare(back, q.service) : 0;
  const fare = cents(outboundFare + returnFare);
  const afterHours = timeFee(q.start) + (round && q.returnStart != null ? timeFee(q.returnStart) : 0);
  const sameDayFee = q.sameDay ? RATES.sameDayFee : 0;
  // Long distance is a provisional route estimate; empty-return mileage applies only to one-way passenger journeys.
  const returnMileage = cents(!round && q.miles >= RATES.longDistanceMiles ? q.miles * RATES.emptyReturnPerMile : 0);
  const subtotal = cents(fare + afterHours + sameDayFee + returnMileage);
  const discount = q.first ? Math.min(cents(fare * RATES.firstRideDiscount), RATES.firstRideDiscountCap) : 0;
  const total = cents(subtotal - discount);
  const longest = Math.max(q.miles, back);
  return {
    subtotal,
    discount,
    total,
    deposit: cents(total * RATES.depositShare),
    fare,
    outboundFare,
    returnFare,
    afterHours,
    sameDayFee,
    returnMileage,
    miles: Math.round(q.miles * 10) / 10,
    returnMiles: round ? Math.round(back * 10) / 10 : null,
    returnToArrange: round && q.returnStart == null,
    longDistance: longest >= RATES.longDistanceMiles,
    ownerReview: longest >= RATES.reviewMiles || (round && q.returnStart == null),
    firstRide: !!q.first,
    policy: RATES.policy,
    reviewRequired: true,
  };
}

/** Back-compatible wrapper used by older code paths. */
export function price(
  miles: number,
  service: string,
  start: number,
  returnStart: number | null,
  first: boolean,
  returnMiles: number | null = returnStart === null ? null : miles,
) {
  return quote({ miles, service, start, round: returnStart !== null, returnStart, returnMiles, first });
}
