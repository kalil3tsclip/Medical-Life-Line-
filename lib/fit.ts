// Wheelchair fit checks for owner review. Pure function: never auto-rejects, only lists what to check.
export type VehicleLimits = { rampLbs?: number | null; securementLbs?: number | null; usableWidthIn?: number | null; doorHeightIn?: number | null };
export type RiderNeeds = { service?: string; wheelchairType?: string | null; combinedWeight?: number | null; steps?: string | null };

export function fitIssues(d: RiderNeeds, v: VehicleLimits): string[] {
  if (d.service !== "wheelchair") return [];
  const issues: string[] = [];
  const missing = [
    !v.rampLbs && "ramp rating",
    !v.securementLbs && "securement limit",
    !v.usableWidthIn && "usable width",
    !v.doorHeightIn && "door clearance",
  ].filter(Boolean) as string[];
  if (missing.length) issues.push(`van limits not recorded (${missing.join(", ")}): review fit`);
  if (!d.combinedWeight) issues.push("ask rider + chair weight");
  else {
    const limit = Math.min(v.rampLbs || Infinity, v.securementLbs || Infinity);
    if (Number.isFinite(limit) && d.combinedWeight > limit) issues.push(`OVER van limit: about ${d.combinedWeight} lb vs ${limit} lb`);
  }
  if (d.wheelchairType && d.wheelchairType !== "standard") issues.push(`${d.wheelchairType === "power" ? "power chair or scooter" : "wide / bariatric chair"}: confirm chair width${v.usableWidthIn ? ` (van ${v.usableWidthIn} in)` : ""} and height${v.doorHeightIn ? ` (door ${v.doorHeightIn} in)` : ""}`);
  if (d.steps && d.steps !== "none") issues.push(`steps at pickup or drop-off (${d.steps === "few" ? "1–3" : "more than 3"}): confirm safe access`);
  return issues;
}
