import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://medilifelinetrans.com"),
  title: { default: "Medical Life Line | Wheelchair Transportation Houston", template: "%s | Medical Life Line" },
  description: "Private-pay wheelchair transportation for medical appointments, dialysis, hospital discharges, rehabilitation visits, and essential trips in Houston and Missouri City.",
  keywords: ["wheelchair transportation Houston", "non emergency medical transportation Missouri City", "private pay wheelchair ride", "dialysis transportation Houston", "hospital discharge transportation"],
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
