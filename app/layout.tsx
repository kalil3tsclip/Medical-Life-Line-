import type { Metadata, Viewport } from "next";
import "./globals.css";

const SITE = "https://medilifelinetrans.com";
const DESCRIPTION =
  "Private-pay wheelchair and ambulatory transportation for medical appointments, dialysis, hospital discharges, rehabilitation visits, and essential trips in Houston, Missouri City, Pearland, Sugar Land, and Stafford.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: { default: "Medical Life Line | Wheelchair Transportation Houston", template: "%s | Medical Life Line" },
  description: DESCRIPTION,
  keywords: [
    "wheelchair transportation Houston",
    "non emergency medical transportation Houston",
    "non emergency medical transportation Missouri City",
    "wheelchair van Pearland",
    "medical transportation Sugar Land",
    "medical transportation Stafford TX",
    "private pay wheelchair ride",
    "dialysis transportation Houston",
    "hospital discharge transportation",
    "ambulatory medical rides Houston",
  ],
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    url: SITE,
    siteName: "Medical Life Line",
    title: "Medical Life Line | Wheelchair Transportation Houston",
    description: DESCRIPTION,
    locale: "en_US",
    images: [{ url: "/og-image.jpg", width: 1200, height: 630, alt: "Medical Life Line wheelchair-accessible van assisting a passenger" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Medical Life Line | Wheelchair Transportation Houston",
    description: DESCRIPTION,
    images: ["/og-image.jpg"],
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export const viewport: Viewport = { themeColor: "#062f62", width: "device-width", initialScale: 1 };

const business = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "@id": `${SITE}/#business`,
  name: "Medical Life Line Transportation",
  alternateName: "Medical Life Line",
  description: DESCRIPTION,
  url: SITE,
  logo: `${SITE}/medical-life-line-logo.jpg`,
  image: `${SITE}/og-image.jpg`,
  telephone: "+1-346-909-7822",
  email: "info@medilifelinetrans.com",
  foundingDate: "2023",
  address: { "@type": "PostalAddress", addressLocality: "Houston", addressRegion: "TX", addressCountry: "US" },
  areaServed: ["Houston", "Missouri City", "Pearland", "Sugar Land", "Stafford"].map((name) => ({ "@type": "City", name, containedInPlace: { "@type": "State", name: "Texas" } })),
  sameAs: ["https://www.instagram.com/medicallifelinellc", "https://www.facebook.com/61566218184529"],
  makesOffer: [
    "Wheelchair transportation",
    "Ambulatory medical transportation",
    "Dialysis transportation",
    "Hospital discharge transportation",
  ].map((name) => ({ "@type": "Offer", itemOffered: { "@type": "Service", name } })),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(business) }} />
        {children}
      </body>
    </html>
  );
}
