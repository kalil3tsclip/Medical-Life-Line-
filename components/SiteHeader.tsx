import { Menu, Phone } from "lucide-react";
import { FacebookIcon, InstagramIcon } from "./SocialIcons";

const nav = [
  ["Home", "/"],
  ["Services", "/services"],
  ["How It Works", "/how-it-works"],
  ["About", "/about"],
  ["Reviews", "/reviews"],
  ["FAQ", "/faq"],
  ["Contact", "/contact"],
];

export function SiteHeader() {
  return (
    <>
      <div className="promo" role="region" aria-label="First ride promotion">
        <div className="promo-track">
          {[0, 1].map((copy) => <div className="promo-message" key={copy} aria-hidden={copy === 1}>
            <span>20% OFF YOUR FIRST RIDE</span><span className="promo-dot">•</span>
            <a href="/quote">GET AN INSTANT QUOTE TODAY</a><span className="promo-dot">•</span>
            <a href="tel:+13469097822" aria-label="Call Medical Life Line at 346-909-7822">CALL (346) 909-7822</a><span className="promo-dot">•</span>
          </div>)}
        </div>
      </div>
      <div className="owner-access-bar"><a href="/admin">Owner Login →</a></div>
      <header className="site-header">
        <a href="/" className="brand" aria-label="Medical Life Line home">
          <img src="/medical-life-line-logo.jpg" alt="Medical Life Line non-emergency medical transportation" />
        </a>
        <nav className="desktop-nav" aria-label="Main navigation">
          {nav.map(([label, href]) => <a key={href} href={href}>{label}</a>)}
        </nav>
        <div className="header-actions">
          <a href="https://www.instagram.com/medicallifelinellc" aria-label="Medical Life Line on Instagram" target="_blank" rel="noreferrer"><InstagramIcon /></a>
          <a href="https://www.facebook.com/61566218184529" aria-label="Medical Life Line on Facebook" target="_blank" rel="noreferrer"><FacebookIcon /></a>
          <a href="tel:+13469097822" aria-label="Call Medical Life Line at 346-909-7822" className="phone-button"><Phone size={18} /> <span>(346) 909-7822</span></a>
        </div>
        <details className="mobile-menu-shell">
          <summary className="menu-button" aria-label="Open menu"><Menu /></summary>
          <nav id="mobile-menu" className="mobile-nav" aria-label="Mobile navigation">
            {nav.map(([label, href]) => <a key={href} href={href}>{label}</a>)}
            <a href="/admin">Owner Login</a>
            <a href="/quote" className="primary-button">Get an Instant Quote</a>
            <a href="tel:+13469097822" aria-label="Call Medical Life Line at 346-909-7822" className="mobile-call"><Phone size={18} /> (346) 909-7822</a>
          </nav>
        </details>
      </header>
    </>
  );
}
