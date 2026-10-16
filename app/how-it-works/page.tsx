import type { Metadata } from "next";

import { Accessibility as Wheelchair, CalendarCheck, CheckCircle2, HeartHandshake, Phone } from "lucide-react";
import { PageLayout } from "@/components/PageLayout";

export const metadata: Metadata = { title: "How It Works", description: "See how to request, confirm, and complete a wheelchair transportation trip with Medical Life Line.", alternates: { canonical: "/how-it-works" } };

const steps = [
  [CalendarCheck, "Request Your Quote", "Enter the pickup, destination, date, time, trip type, and wheelchair assistance needed."],
  [Phone, "We Confirm the Details", "We review your route and availability, then contact you with the final price and pickup details."],
  [Wheelchair, "We Arrive Ready to Assist", "Your driver arrives in a wheelchair-accessible vehicle and helps with safe loading and securement."],
  [HeartHandshake, "You Arrive With Care", "We complete the trip safely and keep communication clear for return rides when scheduled."],
] as const;

export default function HowItWorks() {
  return <PageLayout eyebrow="Simple from start to finish" title="How Your Ride Works" intro="Four clear steps. No mystery, no confusing handoffs—just dependable wheelchair and ambulatory transportation.">
    <section className="section page-width"><div className="process-list">{steps.map(([Icon, title, body], index) => <article className="process-card" key={title}><b>{index + 1}</b><Icon/><div><h2>{title}</h2><p>{body}</p></div></article>)}</div>
      <div className="info-card process-note"><h2>Before your ride</h2><ul className="check-list"><li><CheckCircle2/>Make sure ramps, walkways, and entrances are clear.</li><li><CheckCircle2/>Have appointment and caregiver details ready.</li><li><CheckCircle2/>Tell us about extra assistance needs in advance.</li><li><CheckCircle2/>Call 911 for emergencies—this is non-emergency transportation.</li></ul><div className="process-actions"><a href="/quote" className="primary-button">Get an Instant Quote</a><a href="tel:+13469097822" aria-label="Call Medical Life Line at 346-909-7822" className="secondary-button"><Phone size={18}/> Call (346) 909-7822</a></div></div>
    </section>
  </PageLayout>;
}
