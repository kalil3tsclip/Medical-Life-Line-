import type { Metadata } from "next";
import { CheckCircle2, Clock3, CreditCard, MapPin, ShieldCheck, XCircle } from "lucide-react";
import { PageLayout } from "@/components/PageLayout";

export const metadata: Metadata = {
  title: "Booking & Cancellation Policy",
  description: "Medical Life Line deposit, cancellation, waiting time, same-day booking and service policies for private-pay wheelchair and ambulatory rides in Houston.",
  alternates: { canonical: "/policies" },
};

const policies = [
  [CreditCard, "Deposit & payment", [
    "A 50% deposit confirms your ride. We send a secure payment link after we review your request.",
    "Your ride is not confirmed until the deposit is paid. The balance is due after the trip.",
    "The price in your approved quote is honored. Changes you request, such as extra stops, a new destination or arranged waiting, are agreed with you first.",
  ]],
  [XCircle, "Cancellations & no-shows", [
    "Cancel at least 24 hours before your scheduled pickup for a full refund.",
    "With less than 24 hours notice, or if we arrive and the rider is not available, the charge is 50% of the affected fare. Your deposit counts toward it.",
    "If only the return ride is canceled, the charge applies to the return ride only.",
    "If we have to cancel, you receive a full refund for any service not provided.",
  ]],
  [Clock3, "Waiting time", [
    "Every pickup includes 15 minutes of free waiting.",
    "Longer waits, or staying during an appointment, must be arranged in advance: $15 for each started 15 minutes after the free 15.",
  ]],
  [CheckCircle2, "Same-day & after-hours rides", [
    "Same-day rides depend on availability and include a $25 same-day fee.",
    "Evening rides (6–10 p.m.) add $45 per leg; late-night rides (10 p.m.–5 a.m.) add $75 per leg. Overnight and long-distance trips are confirmed individually.",
  ]],
  [ShieldCheck, "What we transport", [
    "Ambulatory and wheelchair riders only.",
    "We do not transport oxygen or medical equipment, and we are not an ambulance service. For emergencies, call 911.",
    "Wheelchair riders: tell us about steps or difficult access when booking so we can confirm a safe pickup before accepting the ride.",
  ]],
  [MapPin, "Service area", [
    "Houston, Missouri City, Pearland, Sugar Land, Stafford and surrounding areas. Longer routes are reviewed individually.",
  ]],
] as const;

export default function Policies() {
  return <PageLayout eyebrow="Clear and fair" title="Booking & Cancellation Policy" intro="Simple rules that protect your appointment and our schedule. Questions? Call or text (346) 909-7822.">
    <section className="section page-width"><div className="policy-grid">{policies.map(([Icon, title, items]) => <article className="policy-card" key={title}><Icon /><h2>{title}</h2><ul>{items.map((item) => <li key={item}>{item}</li>)}</ul></article>)}</div>
      <p className="policy-note">Policy effective October 2026. Prices are estimates until confirmed by Medical Life Line.</p>
    </section>
  </PageLayout>;
}
