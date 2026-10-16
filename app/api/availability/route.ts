import { busy, regularBlocked, reply, today, validDate } from "@/lib/booking";
import { clockLabel, houstonNowMinutes, ONLINE_FIRST_PICKUP, ONLINE_LAST_PICKUP, SAME_DAY_LEAD_MINUTES } from "@/lib/time";

// Pickup times offered online: 5:00 a.m. to 9:30 p.m. every 30 minutes, Houston time.
// Today's list skips times less than an hour away. Late-night rides are arranged by phone.
export async function GET(r: Request) {
  try {
    const date = new URL(r.url).searchParams.get("date") || "";
    if (!validDate(date)) return reply({ error: "Choose a date within the next 90 days." }, 400);
    const occupied = await busy(date);
    const earliest = date === today() ? houstonNowMinutes() + SAME_DAY_LEAD_MINUTES : 0;
    const slots = [];
    for (let start = ONLINE_FIRST_PICKUP; start <= ONLINE_LAST_PICKUP; start += 30) {
      if (start < earliest) continue;
      const evening = start >= 1080;
      slots.push({
        time: `${String(Math.floor(start / 60)).padStart(2, "0")}:${String(start % 60).padStart(2, "0")}`,
        label: `${clockLabel(start)}${evening ? " (evening +$45)" : ""}`,
        available: !regularBlocked(date, start, start + 30) && !occupied.some((b) => start < b.end && start + 30 > b.start),
        afterHours: evening,
      });
    }
    return reply({ slots, note: slots.length ? null : "No more online pickup times today. Please call (346) 909-7822." });
  } catch {
    return reply({ error: "Availability could not load. Try again or call (346) 909-7822." }, 503);
  }
}
