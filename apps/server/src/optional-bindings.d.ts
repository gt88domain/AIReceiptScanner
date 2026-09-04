declare namespace Cloudflare {
  interface Env {
    BACKOFFICE_PREVIEW?: string;
    BACKOFFICE_PREVIEW_TICKETS?: string;
    CREEM_API_KEY: string;
    CREEM_WEBHOOK_SECRET: string;
    CONTACT_RECIPIENT: string;
    EMAIL_FROM: string;
    GITHUB_CLIENT_SECRET: string;
    GOOGLE_CLIENT_SECRET: string;
    R2_PUBLIC_URL: string;
    RESEND_API_KEY: string;
    REVENUECAT_WEBHOOK_SECRET: string;
    STRIPE_SECRET_KEY: string;
    STRIPE_WEBHOOK_SECRET: string;
    TURNSTILE_SECRET_KEY: string;
    WAFFO_ENVIRONMENT: string;
    WAFFO_MERCHANT_ID: string;
    WAFFO_PRIVATE_KEY: string;
  }
}
