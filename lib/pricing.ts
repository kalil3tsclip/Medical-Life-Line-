// Medical Life Line fare rules. Pure functions with no runtime imports so they can be tested directly.
// Approved rates (owner, 2026-10-15): $50 ambulatory / $65 wheelchair per leg, first 10 passenger miles
// included in EACH direction, $2.75 per additional passenger mile, each leg calculated separately.
// Kept as-is by owner decision: 20% first-ride discount, after-hours fees per leg, and the
// long-distance empty-return charge on one-way trips.

export const RATES = {
  base: { ambulatory: 50, wheelchair: 65 },
  includedMiles: 10,
  perMile: 2.75,
  firstRideDiscount: 0.2,
  longDistanceMiles: 75,
  emptyReturnPerMile: 1.5,
  policy: "2026-10-15",
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

/**
 * @param miles outbound passenger miles
 * @param returnMiles return-leg passenger miles, or null for a one-way trip
 */
export function price(
  miles: number,
  service: string,
  start: number,
  returnStart: number | null,
  first: boolean,
  returnMiles: number | null = returnStart === null ? null : miles,
) {
  const round = returnStart !== null;
  const back = round ? (returnMiles ?? miles) : 0;
  const outboundFare = legFare(miles, service);
  const returnFare = round ? legFare(back, service) : 0;
  const fees = timeFee(start) + (round ? timeFee(returnStart) : 0);
  // Long distance is a provisional route estimate; empty-return mileage applies only to one-way passenger journeys.
  const returnMileage = !round && miles >= RATES.longDistanceMiles ? miles * RATES.emptyReturnPerMile : 0;
  const subtotal = cents(outboundFare + returnFare + fees + returnMileage);
  const discount = first ? cents(subtotal * RATES.firstRideDiscount) : 0;
  const longest = Math.max(miles, back);
  return {
    subtotal,
    discount,
    total: cents(subtotal - discount),
    outboundFare,
    returnFare,
    afterHours: fees,
    returnMileage: cents(returnMileage),
    miles: Math.round(miles * 10) / 10,
    returnMiles: round ? Math.round(back * 10) / 10 : null,
    longDistance: longest >= RATES.longDistanceMiles,
    firstRide: first,
    policy: RATES.policy,
    reviewRequired: true,
  };
}
