declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    GOOGLE_MAPS_BROWSER_KEY?: string;
    BUCKET?: R2Bucket;
  }
}
