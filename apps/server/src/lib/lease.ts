export type LeaseToken = string & { readonly __leaseToken: unique symbol };

export function createLeaseToken(): LeaseToken {
  return crypto.randomUUID() as LeaseToken;
}

export function leaseUntil(now: Date, durationMs: number) {
  return new Date(now.getTime() + durationMs);
}
