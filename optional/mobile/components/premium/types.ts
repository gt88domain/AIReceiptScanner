import type { CheckoutPolicyDecision } from "@repo/app-config/membership";

export type PlanOption = {
  key: string;
  planId: string;
  priceId: string;
  priceType: "subscription" | "lifetime";
  interval: "month" | "year" | null;
  title: string;
  billingNote: string;
  price: string;
  suffix?: string;
  badge?: string;
};

export type ResolvedPlanOption = PlanOption & {
  decision: CheckoutPolicyDecision;
  isCurrent: boolean;
};
