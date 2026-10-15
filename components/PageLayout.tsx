import { SiteHeader } from "./SiteHeader";
import { SiteFooter } from "./SiteFooter";
import { ServiceTicker } from "./ServiceTicker";

export function PageLayout({ eyebrow, title, intro, children }: { eyebrow: string; title: string; intro: string; children: React.ReactNode }) {
  return <main><SiteHeader /><section className="page-hero"><div className="page-width"><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{intro}</p></div></section><ServiceTicker />{children}<SiteFooter /></main>;
}
