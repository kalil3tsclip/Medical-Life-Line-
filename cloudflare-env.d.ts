declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    GOOGLE_MAPS_BROWSER_KEY?: string;
    SQUARE_ACCESS_TOKEN?: string;
    SQUARE_LOCATION_ID?: string;
    SQUARE_ENVIRONMENT?: string;
    SQUARE_WEBHOOK_SIGNATURE_KEY?: string;
    SITE_URL?: string;
    BUCKET?: R2Bucket;
  }
}
