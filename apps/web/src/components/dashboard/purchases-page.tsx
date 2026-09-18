import { formatCurrency } from "@repo/shared";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ReceiptTextIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useOrpc } from "@/hooks/use-orpc";

type PurchaseHistoryCursor = {
  createdAt: Date;
  type: "subscription" | "membership" | "credits";
  id: string;
};

export function PurchasesPage() {
  const orpc = useOrpc();
  const [cursor, setCursor] = useState<PurchaseHistoryCursor>();
  const [previousCursors, setPreviousCursors] = useState<(PurchaseHistoryCursor | undefined)[]>([]);
  const purchases = useQuery(
    orpc.payments.listPurchaseHistoryPage.queryOptions({ input: { cursor, limit: 50 } }),
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Purchases</h1>
        <p className="mt-2 text-muted-foreground">
          Your subscriptions, memberships, and credit orders.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Payment history</CardTitle>
          <CardDescription>
            Amounts are shown only when the completed order records them.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {purchases.isPending ? <PurchaseSkeleton /> : null}
          {purchases.isError ? (
            <div className="flex items-center justify-between gap-4">
              <p className="text-muted-foreground text-sm">Purchase history could not be loaded.</p>
              {previousCursors.length > 0 ? (
                <Button
                  onClick={() => {
                    const previous = previousCursors.at(-1);
                    setPreviousCursors((current) => current.slice(0, -1));
                    setCursor(previous);
                  }}
                  variant="outline"
                >
                  Previous
                </Button>
              ) : null}
            </div>
          ) : null}
          {purchases.data?.items.length === 0 ? <EmptyPurchases /> : null}
          {purchases.data && purchases.data.items.length > 0 ? (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead className="border-b text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 font-medium">Type</th>
                      <th className="px-3 py-2 font-medium">Item</th>
                      <th className="px-3 py-2 font-medium">Amount</th>
                      <th className="px-3 py-2 font-medium">Status</th>
                      <th className="px-3 py-2 font-medium">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {purchases.data.items.map((purchase, index) => (
                      <tr
                        className="border-b last:border-0"
                        key={`${purchase.type}-${purchase.label}-${index}`}
                      >
                        <td className="px-3 py-3 capitalize">{purchase.type}</td>
                        <td className="px-3 py-3 font-medium">{purchase.label}</td>
                        <td className="px-3 py-3 tabular-nums">
                          {purchase.amountCents !== null && purchase.currency
                            ? formatCurrency(purchase.amountCents, purchase.currency)
                            : "Not recorded"}
                        </td>
                        <td className="px-3 py-3 capitalize">
                          {purchase.status.replaceAll("_", " ")}
                        </td>
                        <td className="px-3 py-3 text-muted-foreground">
                          {formatDate(purchase.completedAt ?? purchase.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  disabled={previousCursors.length === 0 || purchases.isFetching}
                  onClick={() => {
                    const previous = previousCursors.at(-1);
                    setPreviousCursors((current) => current.slice(0, -1));
                    setCursor(previous);
                  }}
                  variant="outline"
                >
                  Previous
                </Button>
                <Button
                  disabled={!purchases.data.nextCursor || purchases.isFetching}
                  onClick={() => {
                    setPreviousCursors((current) => [...current, cursor]);
                    setCursor(purchases.data?.nextCursor ?? undefined);
                  }}
                  variant="outline"
                >
                  Next
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

function EmptyPurchases() {
  return (
    <div className="flex min-h-40 flex-col items-center justify-center gap-2 text-center">
      <ReceiptTextIcon className="size-6 text-muted-foreground" />
      <p className="font-medium text-sm">No purchases yet</p>
      <p className="text-muted-foreground text-sm">Completed purchases will appear here.</p>
    </div>
  );
}

function PurchaseSkeleton() {
  return <Skeleton className="h-40 w-full" />;
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(value);
}
