# Medical Life Line Transportation - continuation instructions

## Owner and scope
Owner: Vernell Caldwell. This project was created in ChatGPT Sites. The owner wants to continue the entire existing project in Claude Code. Preserve existing work and styling; do not rebuild from scratch. Inspect the code and this handoff first, then get the project running locally and continue the approved work. Do not deploy, change DNS, remove the current site or alter production data without the owner's instruction.

## Retrieved project
- Current URL: https://medilifelinetrans.com
- Sites project: appgprj_6ab10a564784819192ad0307098f14f8
- Retrieved source commit: 6a8de786b487f360b821f8083170982286b2b5b3
- Site metadata reported latest saved version 10. This export is from the source repository; it was not independently matched to the deployed bundle.
- Complete tracked source is in website/. Its source files are unchanged.
- React 19, Next-compatible Vinext, Vite, Tailwind, TypeScript, Cloudflare Workers, D1, Drizzle.
- Pages: home, about, services, how-it-works, reviews, quote, contact, privacy and admin.
- Quote/request persistence, route estimate, availability blocks, owner dashboard and status/payment recording exist in the code. A recorded payment status is not evidence of payment processor integration.

## Approved pricing from this conversation (overrides older source rates)
- Ambulatory: $50 one way / $100 base round trip.
- Wheelchair: $65 one way / $130 base round trip.
- First 10 passenger miles included in EACH direction.
- $2.75 for each additional passenger mile beyond 10, calculated separately for outbound and return routes.
- Airport rides follow these base rates. Need actual terminal and destination to give a firm quote; 25 miles in the attached PDF is an example, not a confirmed airport distance.
- At 25 miles, ambulatory $91.25 one way / $182.50 round trip, wheelchair $106.25 one way / $212.50 round trip, assuming equal mileage in both directions and before separately agreed extras/discounts.
- Source lib/booking.ts STILL uses $60/$70 and $3.50 after 10 miles. Update calculation and all affected displayed content to approved rates; this export did not perform that implementation.
- Source currently doubles outbound route mileage for round trips rather than fetching the reverse route independently. Implement separate-leg excess-mile calculations as necessary.
- Source includes a 20% first-ride discount, time surcharges and a long-distance empty-return charge. These were not newly approved or removed in the pricing conversation. Ask the owner whether they should remain before finalizing pricing; do not silently stack or remove them.

## Business and contact details
Business: Medical Life Line Transportation. Service area: Houston, Missouri City, Pearland, Sugar Land, Stafford and surrounding areas. Premium, approachable, senior-friendly design.
- Pricing sheet / conversation phone: 832-922-0184.
- Current source phone: (346) 909-7822 across call/text links and API messages.
- Confirm with the owner which phone should be public before replacing it everywhere; do not assume the source is wrong.
- Email: info@medilifelinetrans.com.
- Website: medilifelinetrans.com.
- Instagram and Facebook links are in SiteHeader.tsx / SiteFooter.tsx.
- Website includes a vehicle image and logo in public/.

## Data and integrations checked during export
Live D1 binding DB has tables availability_blocks and ride_requests. Both returned zero rows without truncation at export time (2026-10-15 UTC). Schema/migrations are included. See database-snapshot.json. No booking/customer records were returned, and no R2 binding was declared. This is a point-in-time snapshot; future bookings will require a new export before a hosting cutover.
The environment-variable read returned no entries; no secrets or provider credentials are included.
Address autocomplete uses a Google browser-key endpoint with Photon fallback; routes use router.project-osrm.org. Review availability/terms for production independently. GOOGLE_MAPS_BROWSER_KEY is referenced by app/api/address-config/route.ts; configure a restricted key if needed.

## Local startup
Work in website/. Node >=22.13.0 is required. package.json declares pnpm@11.25.0 and pnpm-lock.yaml is included. Use that package-manager version to install from the lockfile, then `pnpm dev`. A clean checkout defaults to the portable profile; no ChatGPT plugin filesystem is required for this default. Start with package.json, README.md and scripts/execution-profile.mjs. Do not invoke ChatGPT-only absolute helper paths outside this environment.
For local D1, build using `pnpm build`, then apply the included drizzle/0000_fuzzy_justice.sql to the NEW local database once using the README's Wrangler instructions. Do not apply it to a database that already has those tables. Do not import live personal data into development by default.
No dependencies were installed and no build/dev server was run as part of this file export. Verify setup on the owner's computer; report actual results rather than assuming it runs.

## Hosting migration work still required
- Claude Code is the editor; hosting still needs an actual deployment target/account.
- The existing app uses Cloudflare Workers and D1. Keep that stack initially where practical, or explicitly plan a database/runtime adaptation.
- Admin authentication currently relies on ChatGPT Sites-injected identity headers and dispatch-owned sign-in routes. That hosting identity does not move with these files. Local mock identity is not production auth; the default local user is not the approved owner.
- lib/booking.ts allows the owner email vgcaldwell89@gmail.com. Implement trusted authentication and an owner allowlist on a new host. Never trust client-supplied oai-authenticated-user-* headers on a standalone public host.
- .openai/hosting.json records the original Site identity and D1 binding, not portable database credentials. Preserve it as provenance, but provision a new database/binding for external hosting.
- Existing DNS/domain ownership, live hosting, auth service and provider account credentials are not transferred by the ZIP. Keep current hosting until replacement is validated and owner authorizes cutover.

## Relevant earlier requests to verify against current code
The owner previously requested working click-to-call/text links, a working quote form, accurate address selection, real social links, separate menu pages and correct mobile navigation, an owner dashboard with saved rides, and clear booking/deposit confirmation. Some are present in retrieved code; inspect/test before describing any as broken or complete. Earlier wishes for confirmation/reminder/status SMS and automated payments are not proof of implemented providers.

## Validation and handoff standard
Preserve branding and routes. Verify pricing at 0,10,20,25 miles and asymmetric round trips; validate quote persistence and owner access with an isolated local database. Check mobile navigation, call/text links and autocomplete. Do not contact customers, send SMS or emails, charge cards or deploy while merely validating local code. Report what changed, what passed and remaining hosting/integration blockers.
