import type { Metadata } from "next";
import { PageLayout } from "@/components/PageLayout";

export const metadata: Metadata = { title: "Deposit Received", robots: { index: false, follow: false } };
export default function DepositReceived() {
  return <PageLayout eyebrow="Thank you" title="Your Deposit Was Received" intro="Thank you for choosing Medical Life Line.">
    <section className="section page-width" style={{ maxWidth: 720, textAlign: "center" }}>
      <p>Your ride is confirmed once we've matched your payment, usually within minutes. We'll contact you if anything needs attention. The balance is due after your trip.</p>
      <p>Need to change or cancel? Please let us know at least 24 hours before pickup. <a href="/policies">See our booking policy</a>.</p>
      <p><a className="primary-button" href="tel:+13469097822">Call (346) 909-7822</a> <a className="secondary-button" href="sms:+13469097822">Text us</a></p>
    </section>
  </PageLayout>;
}
