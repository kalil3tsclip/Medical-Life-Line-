// Houston (America/Chicago) wall-clock helpers. Pure functions, no runtime imports.
const TZ = "America/Chicago";

function offsetMs(instant: number) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: TZ, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" }).formatToParts(new Date(instant)).map((p) => [p.type, p.value]));
  const asUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
  return asUtc - Math.floor(instant / 1000) * 1000;
}

/** UTC milliseconds for a Houston date (YYYY-MM-DD) and minutes after local midnight. */
export function houstonToUtcMs(date: string, minutes: number) {
  const [y, m, d] = date.split("-").map(Number);
  const guess = Date.UTC(y, m - 1, d, Math.floor(minutes / 60), minutes % 60);
  const first = guess - offsetMs(guess);
  return guess - offsetMs(first);
}

/**
 * When an unpaid deposit hold ends: the owner's chosen window (default 24h), but never later than
 * `beforePickupMinutes` before the scheduled pickup. Returns null when there is not enough time left
 * for an online deposit (less than `minMinutes` from now).
 */
export function holdDeadline(o: { now: number; date: string; start: number; holdMinutes?: number; beforePickupMinutes?: number; minMinutes?: number }) {
  const windowMs = (o.holdMinutes ?? 24 * 60) * 60000;
  const latest = houstonToUtcMs(o.date, o.start) - (o.beforePickupMinutes ?? 60) * 60000;
  const until = Math.min(o.now + windowMs, latest);
  return until - o.now < (o.minMinutes ?? 10) * 60000 ? null : until;
}
