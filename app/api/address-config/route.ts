import { env } from "cloudflare:workers";
// This is a public browser key, restricted by website referrer in Google Cloud.
export function GET(){return Response.json({browserKey:env.GOOGLE_MAPS_BROWSER_KEY||null},{headers:{"Cache-Control":"no-store"}});}
