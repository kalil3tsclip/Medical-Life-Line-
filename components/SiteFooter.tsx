
import { Mail, MessageSquare, Phone } from "lucide-react";
import { FacebookIcon, InstagramIcon } from "./SocialIcons";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-cta">
        <div><strong>Ready for a safer ride?</strong><span>Get your trip estimate today.</span></div>
        <a href="/quote" className="light-button">Get an Instant Quote</a>
      </div>
      <div className="footer-grid page-width">
        <div className="footer-brand">
          <img src="/medical-life-line-logo.jpg" alt="Medical Life Line" loading="lazy" width={270} height={96} />
          <p>Reliable wheelchair transportation for medical appointments, dialysis, discharges, rehabilitation visits, and essential trips.</p>
        </div>
        <div><h2>Quick Links</h2><a href="/services">Services</a><a href="/how-it-works">How It Works</a><a href="/about">About Us</a><a href="/reviews">Reviews</a><a href="/faq">FAQ</a><a href="/contact">Contact</a></div>
        <div><h2>Contact</h2><a href="tel:+13469097822" aria-label="Call Medical Life Line at 346-909-7822"><Phone size={17} /> (346) 909-7822</a><a href="sms:+13469097822" aria-label="Text Medical Life Line at 346-909-7822"><MessageSquare size={17} /> Text us</a><a href="mailto:info@medilifelinetrans.com"><Mail size={17} /> info@medilifelinetrans.com</a><p>Houston, Missouri City, Pearland, Sugar Land, Stafford & surrounding areas</p></div>
        <div><h2>Follow Us</h2><div className="social-row"><a className="instagram" href="https://www.instagram.com/medicallifelinellc" target="_blank" rel="noreferrer" aria-label="Medical Life Line on Instagram"><InstagramIcon /></a><a className="facebook" href="https://www.facebook.com/61566218184529" target="_blank" rel="noreferrer" aria-label="Medical Life Line on Facebook"><FacebookIcon /></a></div></div>
      </div>
      <div className="copyright page-width">© 2026 Medical Life Line LLC. All rights reserved. <a href="/privacy">Privacy</a> <a href="/admin">Owner sign-in</a> <span>Non-emergency transportation only.</span></div>
      <div className="built-by page-width">Built by <a href="https://thestickyagent.com" target="_blank" rel="noopener">Sticky Agent</a></div>
    </footer>
  );
}
