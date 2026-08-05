/** Raw, provider-free official profile inputs shared by runtime and build overlays. */
export const productProfileDefinitions = {
  "full-saas": {
    admin: true,
    jobs: true,
    storage: true,
    mobile: false,
    web: { billing: true, credits: true, creditPurchases: true },
    native: { billing: false, credits: false, creditPurchases: false },
  },
  "account-app": {
    admin: true,
    jobs: true,
    storage: true,
    mobile: false,
    web: { billing: false, credits: false, creditPurchases: false },
    native: { billing: false, credits: false, creditPurchases: false },
  },
  directory: {
    admin: true,
    jobs: true,
    storage: false,
    mobile: false,
    web: { billing: false, credits: false, creditPurchases: false },
    native: { billing: false, credits: false, creditPurchases: false },
  },
  "directory-lite": {
    admin: true,
    jobs: false,
    storage: false,
    mobile: false,
    web: { billing: false, credits: false, creditPurchases: false },
    native: { billing: false, credits: false, creditPurchases: false },
  },
} as const;

export type ProductProfileId = keyof typeof productProfileDefinitions;
