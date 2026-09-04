// Cloudflare Workers environment types
interface CloudflareEnv {
  API_SERVICE: Fetcher;
  VITE_SERVER_URL: string;
  // Add other bindings as needed
}

interface Fetcher {
  fetch(request: Request): Promise<Response>;
}

// Make API_SERVICE available globally in Workers environment
declare const API_SERVICE: Fetcher | undefined;

declare module "cloudflare:workers" {
  export const env: CloudflareEnv;
}
