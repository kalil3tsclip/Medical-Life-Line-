
import { Accessibility as Wheelchair, ArrowRight, CalendarCheck, CheckCircle2, Clock3, HeartHandshake, Hospital, MessageSquare, Phone, ShieldCheck, Star, Stethoscope } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { QuoteForm } from "@/components/QuoteForm";
import { ServiceTicker } from "@/components/ServiceTicker";

const services = [
  [Wheelchair, "Wheelchair & Ambulatory Rides", "Door-to-door help for wheelchair riders and riders who walk, in an accessible vehicle."],
  [Stethoscope, "Medical Appointments", "Dependable rides to doctors, specialists, therapy, and outpatient care."],
  [CalendarCheck, "Dialysis Transportation", "Consistent scheduled rides for ongoing dialysis treatment."],
  [Hospital, "Hospital Discharge Rides", "A comfortable wheelchair ride home or to another care setting."],
];
const reviews = [
  "Top-tier service with respect, safety, and genuine care.",
  "Reliable, punctual, and professional from start to finish.",
  "Patient, compassionate, and calm throughout the entire trip.",
  "Organized, communicative, and committed to a safe ride.",
  "Dependable, courteous, and the vehicle was exceptionally clean.",
  "The entire transport was smooth, professional, and stress-free.",
];

export default function Home() {
  return <main><SiteHeader />
    <section className="hero">
      <div className="hero-media">
        <picture>
          <source type="image/webp" media="(max-width: 820px)" srcSet="/wheelchair-transport-houston-900.webp" />
          <source type="image/webp" srcSet="/wheelchair-transport-houston.webp" />
          <img className="hero-image" src="/wheelchair-transport-houston.jpg" width={1672} height={941} fetchPriority="high" alt="Wheelchair passenger being safely assisted into a Medical Life Line accessible vehicle in Houston" />
        </picture>
        <div className="hero-glint" />
      </div>
      <div className="hero-shade" />
      <div className="hero-inner page-width">
        <div className="hero-copy">
          <span className="eyebrow">Private-pay transportation</span>
          <h1>Reliable Wheelchair &amp; Ambulatory Rides, From Door to Door.</h1>
          <p>Safe, comfortable transportation for medical appointments, dialysis, hospital discharges, rehabilitation visits, and essential trips.</p>
          <div className="hero-location">Serving Houston, Missouri City & Surrounding Areas</div>
          <div className="trust-row"><span><ShieldCheck /> Safe & Secure</span><span><Clock3 /> Reliable & On Time</span><span><HeartHandshake /> Compassionate Care</span></div>
        </div>
        <QuoteForm compact />
      </div>
    </section>
    <ServiceTicker />

    <section className="services-preview section page-width"><div className="section-heading"><span>Our Services</span><h2>Medical transportation built around your needs</h2><p>Wheelchair and ambulatory rides, delivered with care, patience, and dependable communication.</p></div><div className="service-grid">{services.map(([Icon, title, body]: any) => <article className="service-card" key={title}><Icon /><h3>{title}</h3><p>{body}</p><a href="/services" aria-label={`Learn more about ${title}`}><ArrowRight /></a></article>)}</div></section>

    <section className="about-band"><div className="page-width about-grid"><div className="about-logo"><img src="/medical-life-line-logo.jpg" alt="Medical Life Line" loading="lazy" width={600} height={220} /></div><div><span className="eyebrow red">About Medical Life Line</span><h2>Serving Our Community Since 2023</h2><p>Medical Life Line was founded with one clear mission: make wheelchair transportation safer, calmer, and more dependable. We understand that every trip carries a person, a family, and a schedule that matters.</p><ul className="check-list"><li><CheckCircle2 /> Respectful door-to-door assistance</li><li><CheckCircle2 /> Clean wheelchair-accessible vehicle</li><li><CheckCircle2 /> Clear communication before every ride</li></ul><a className="secondary-button" href="/about">Our Story <ArrowRight /></a></div></div></section>

    <section className="steps-section"><div className="page-width"><div className="section-heading light"><span>Simple. Convenient. Stress-free.</span><h2>How It Works</h2></div><div className="steps"><article><b>1</b><CalendarCheck /><h3>Request a Quote</h3><p>Enter your addresses and trip details.</p></article><article><b>2</b><Phone /><h3>Confirm Your Ride</h3><p>We review your needs and confirm availability.</p></article><article><b>3</b><Wheelchair /><h3>We Pick You Up</h3><p>We arrive ready to assist you safely.</p></article><article><b>4</b><HeartHandshake /><h3>Arrive With Care</h3><p>Reach your destination comfortably.</p></article></div><div className="center"><a href="/how-it-works" className="light-button">See the Full Process <ArrowRight /></a></div></div></section>

    <section className="dialysis-section section page-width"><div><span className="eyebrow red">Recurring transportation</span><h2>Reliable rides for ongoing dialysis care</h2><p>Three round trips per week for local riders, with consistent scheduling and priority service.</p><p><strong>Ask about our weekly dialysis program.</strong></p><small>Local program. Eligibility, mileage, scheduling, and availability apply.</small><a href="/quote" className="primary-button">Check My Route <ArrowRight /></a></div><div className="dialysis-card"><h3>Built for consistency</h3><ul><li><CheckCircle2 /> 3 round trips each week</li><li><CheckCircle2 /> Familiar, dependable service</li><li><CheckCircle2 /> Appointment-focused scheduling</li><li><CheckCircle2 /> Direct communication</li></ul></div></section>

    <section className="reviews-preview"><div className="section page-width"><div className="section-heading"><span>What clients say</span><h2>Care people remember</h2><div className="rating"><Star fill="currentColor" /> 5-star service</div></div><div className="review-grid">{reviews.map((review) => <article className="review-card" key={review}><div className="stars">★★★★★</div><p>“{review}”</p><span>Medical Life Line client</span></article>)}</div><div className="center"><a href="/reviews" className="secondary-button">Read More Reviews <ArrowRight /></a></div></div></section>

    <section className="final-cta"><div className="page-width"><div><span>Need a ride to your appointment?</span><h2>Get your route estimate in minutes.</h2></div><div><a href="/quote" className="light-button">Get an Instant Quote</a><a href="tel:+13469097822" aria-label="Call Medical Life Line at 346-909-7822" className="outline-light"><Phone /> (346) 909-7822</a><a href="sms:+13469097822" aria-label="Text Medical Life Line at 346-909-7822" className="outline-light"><MessageSquare /> Text Us</a></div></div></section>
    <SiteFooter />
  </main>;
}
