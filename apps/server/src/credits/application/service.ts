import type { Database } from "@/db";
import { consumeCredits, revokeCreditPurchase, revokeCreditPurchaseBySource } from "./consume";
import { grantCreditPackagePurchase, grantCredits, recordNativeCreditOrderPurchase } from "./grant";
import { expireCredits, runCreditMaintenance } from "./maintenance";
import {
  completeCreditOrderPurchase,
  createCreditCheckoutSession,
  markCreditOrderRefunded,
  markCreditOrderStatus,
} from "./orders";
import { getBalance, listCreditOrders, listPackages, listTransactions } from "./read";
import type {
  ConsumeCreditsInput,
  CreditServiceContext,
  CreditUser,
  ListCreditOrdersInput,
  ListPackagesInput,
  ListTransactionsInput,
} from "./types";

export {
  completeCreditOrderPurchase,
  consumeCredits,
  createCreditCheckoutSession,
  expireCredits,
  getBalance,
  grantCreditPackagePurchase,
  grantCredits,
  listCreditOrders,
  listPackages,
  listTransactions,
  markCreditOrderRefunded,
  markCreditOrderStatus,
  recordNativeCreditOrderPurchase,
  revokeCreditPurchase,
  revokeCreditPurchaseBySource,
  runCreditMaintenance,
};

/** Public facade that keeps the existing credits service API stable. */
export function createCreditsService(db: Database, serviceContext: CreditServiceContext = {}) {
  return {
    listPackages: (input: ListPackagesInput) => listPackages(input),
    getBalance: (user: CreditUser) => getBalance(db, user, serviceContext),
    listTransactions: (input: ListTransactionsInput) => listTransactions(db, input, serviceContext),
    listOrders: (input: ListCreditOrdersInput) => listCreditOrders(db, input),
    consumeCredits: (input: ConsumeCreditsInput) => consumeCredits(db, input, serviceContext),
    createCheckoutSession: (input: Parameters<typeof createCreditCheckoutSession>[1]) =>
      createCreditCheckoutSession(db, input),
    runMaintenance: (now?: Date) => runCreditMaintenance(db, now),
  };
}
