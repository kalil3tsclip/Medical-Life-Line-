// Run with: node --experimental-strip-types --test lib/pricing.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { quote, price, legFare, waitFee, cancellationCharge } from "./pricing.ts";

const NOON = 720; // 12:00, no after-hours fee
const one = (miles: number, service: string) => quote({ miles, service, start: NOON });
const round = (out: number, back: number, service: string) =>
  quote({ miles: out, service, start: NOON, round: true, returnStart: NOON + 240, returnMiles: back });

test("one-way base and per-mile rates at 0, 10, 20, 25 miles", () => {
  assert.equal(one(0, "ambulatory").total, 50);
  assert.equal(one(10, "ambulatory").total, 50);
  assert.equal(one(20, "ambulatory").total, 77.5);
  assert.equal(one(25, "ambulatory").total, 91.25);
  assert.equal(one(0, "wheelchair").total, 65);
  assert.equal(one(10, "wheelchair").total, 65);
  assert.equal(one(20, "wheelchair").total, 92.5);
  assert.equal(one(25, "wheelchair").total, 106.25);
});

test("round trips match the approved pricing sheet", () => {
  assert.equal(round(0, 0, "ambulatory").total, 100);
  assert.equal(round(0, 0, "wheelchair").total, 130);
  assert.equal(round(25, 25, "ambulatory").total, 182.5);
  assert.equal(round(25, 25, "wheelchair").total, 212.5);
});

test("asymmetric round trip prices each leg on its own mileage", () => {
  const r = round(8, 14, "ambulatory");
  assert.equal(r.outboundFare, 50);
  assert.equal(r.returnFare, 61);
  assert.equal(r.total, 111);
  assert.equal(round(30, 12, "wheelchair").total, 65 + 20 * 2.75 + 65 + 2 * 2.75);
});

test("first-ride discount: 20% of fare only, capped at $25", () => {
  const small = quote({ miles: 25, service: "ambulatory", start: NOON, first: true });
  assert.equal(small.discount, 18.25);
  assert.equal(small.total, 73);
  const big = quote({ miles: 25, service: "wheelchair", start: NOON, round: true, returnStart: NOON + 240, first: true });
  assert.equal(big.discount, 25); // 20% of 212.50 = 42.50, capped
  assert.equal(big.total, 187.5);
  const evening = quote({ miles: 5, service: "ambulatory", start: 18 * 60, first: true });
  assert.equal(evening.subtotal, 95); // $50 fare + $45 after-hours
  assert.equal(evening.discount, 10); // 20% of the $50 fare, not of the fee
});

test("same-day fee is $25 once per booking", () => {
  assert.equal(quote({ miles: 5, service: "ambulatory", start: NOON, sameDay: true }).total, 75);
  assert.equal(quote({ miles: 5, service: "ambulatory", start: NOON, round: true, returnStart: NOON + 120, sameDay: true }).total, 125);
});

test("deposit is 50% of the total", () => {
  assert.equal(one(10, "wheelchair").deposit, 32.5);
  assert.equal(round(25, 25, "ambulatory").deposit, 91.25);
});

test("return time to be arranged: priced as round trip, flagged for review, no return after-hours fee", () => {
  const r = quote({ miles: 12, service: "ambulatory", start: 19 * 60, round: true, returnStart: null });
  assert.equal(r.returnToArrange, true);
  assert.equal(r.ownerReview, true);
  assert.equal(r.total, 2 * (50 + 2 * 2.75) + 45);
});

test("after-hours fees per leg", () => {
  assert.equal(quote({ miles: 5, service: "ambulatory", start: 4 * 60, round: true, returnStart: 23 * 60 }).total, 250);
});

test("long-distance empty-return on one-way trips only; review flag from 60 miles", () => {
  const r = one(80, "ambulatory");
  assert.equal(r.returnMileage, 120);
  assert.equal(r.total, legFare(80, "ambulatory") + 120);
  assert.equal(round(80, 80, "ambulatory").returnMileage, 0);
  assert.equal(one(60, "ambulatory").ownerReview, true);
  assert.equal(one(59, "ambulatory").ownerReview, false);
});

test("waiting: 15 minutes free, then $15 per started 15 minutes", () => {
  assert.equal(waitFee(15), 0);
  assert.equal(waitFee(16), 15);
  assert.equal(waitFee(30), 15);
  assert.equal(waitFee(31), 30);
  assert.equal(waitFee(75), 60);
});

test("cancellation: free with 24h notice, otherwise 50% of affected fare", () => {
  assert.equal(cancellationCharge(100, 30), 0);
  assert.equal(cancellationCharge(100, 23.9), 50);
  assert.equal(cancellationCharge(100, 48, true), 50);
});

test("legacy price() wrapper still works", () => {
  assert.equal(price(25, "ambulatory", NOON, NOON + 240, false).total, 182.5);
  assert.equal(price(25, "ambulatory", NOON, null, false).total, 91.25);
});
