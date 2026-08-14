/** User and admin backoffice visibility derived from the public web capability contract. */
export function resolveBackofficeVisibility(features: {
  web: { billing: boolean; credits: boolean; creditPurchases: boolean };
}) {
  const payments = features.web.billing || features.web.creditPurchases;
  return {
    billing: features.web.billing,
    credits: features.web.credits,
    purchases: payments,
    payments,
  } as const;
}
