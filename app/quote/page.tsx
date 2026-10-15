import type { Metadata } from "next";
import { PageLayout } from "@/components/PageLayout";
import { QuoteForm } from "@/components/QuoteForm";

export const metadata: Metadata = { title: "Instant Wheelchair Transportation Quote", description: "Get an instant estimated price for private-pay wheelchair transportation in Houston and Missouri City.", alternates: { canonical: "/quote" } };
export default function Quote(){return <PageLayout eyebrow="20% off your first ride" title="Get Your Instant Route Estimate" intro="Choose your route and date. Save your instant estimate, then request your ride."><section className="quote-page section"><div className="page-width"><QuoteForm/></div></section></PageLayout>}
