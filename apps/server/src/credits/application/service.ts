import type { Database } from "@/db";
import {
  beginBillableOperation,
  completeBillableOperation,
  failBillableOperation,
} from "./billable-operation";
import { revokeCreditPurchase, revokeCreditPurchaseBySource } from "./consume";
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
  BeginBillableOperationInput,
  CompleteBillableOperationInput,
  CreditServiceContext,
  CreditUser,
  FailBillableOperationInput,
  ListCreditOrdersInput,
  ListPackagesInput,
  ListTransactionsInput,
} from "./types";

export {
  completeCreditOrderPurchase,
  beginBillableOperation,
  completeBillableOperation,
  createCreditCheckoutSession,
  expireCredits,
  failBillableOperation,
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
    beginBillableOperation: (input: BeginBillableOperationInput) =>
      beginBillableOperation(db, input, serviceContext),
    completeBillableOperation: (input: CompleteBillableOperationInput) =>
      completeBillableOperation(db, input),
    failBillableOperation: (input: FailBillableOperationInput) => failBillableOperation(db, input),
    createCheckoutSession: (input: Parameters<typeof createCreditCheckoutSession>[1]) =>
      createCreditCheckoutSession(db, input),
    runMaintenance: (now?: Date) => runCreditMaintenance(db, now),
  };
}
