// Run with: node --experimental-strip-types --test lib/pricing.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { price, legFare } from "./pricing.ts";

const NOON = 720; // 12:00, no after-hours fee
const one = (miles: number, service: string) => price(miles, service, NOON, null, false);
const round = (out: number, back: number, service: string) => price(out, service, NOON, NOON + 240, false, back);

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
  const r = round(8, 14, "ambulatory"); // out: under 10 free; back: 4 extra miles
  assert.equal(r.outboundFare, 50);
  assert.equal(r.returnFare, 61);
  assert.equal(r.total, 111);
  const w = round(30, 12, "wheelchair");
  assert.equal(w.total, 65 + 20 * 2.75 + 65 + 2 * 2.75);
});

test("round trip without explicit return miles uses outbound distance", () => {
  assert.equal(price(25, "ambulatory", NOON, NOON + 240, false).total, 182.5);
});

test("kept: 20% first-ride discount", () => {
  const r = price(25, "ambulatory", NOON, null, true);
  assert.equal(r.subtotal, 91.25);
  assert.equal(r.discount, 18.25);
  assert.equal(r.total, 73);
});

test("kept: after-hours fees per leg", () => {
  assert.equal(price(5, "ambulatory", 18 * 60, null, false).total, 95); // 6 p.m. +$45
  assert.equal(price(5, "ambulatory", 4 * 60, 23 * 60, false, 5).total, 250); // +$75 each leg
});

test("kept: long-distance empty-return on one-way trips only", () => {
  const r = one(80, "ambulatory");
  assert.equal(r.returnMileage, 120);
  assert.equal(r.total, legFare(80, "ambulatory") + 120);
  assert.equal(round(80, 80, "ambulatory").returnMileage, 0);
});
