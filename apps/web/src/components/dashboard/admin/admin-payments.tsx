import { useQuery } from "@tanstack/react-query";
import { CreditCardIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useOrpc } from "@/hooks/use-orpc";
import { AdminEmptyState } from "./admin-empty-state";
import { AdminPageHeader } from "./admin-page-header";

export function AdminPayments() {
  const orpc = useOrpc();
  const operations = useQuery(orpc.admin.listPaymentOperations.queryOptions({ input: {} }));

  return (
    <div className="space-y-6">
      <AdminPageHeader
        description="Read-only payment operations. Refunds, disputes, and provider actions stay in the provider dashboard."
        title="Payments"
      />
      <Card>
        <CardHeader>
          <CardTitle>Recent payment operations</CardTitle>
          <CardDescription>
            Provider identifiers and direct provider record links are not exposed here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {operations.isPending ? <Skeleton className="h-40 w-full" /> : null}
          {operations.isError ? (
            <AdminEmptyState
              description="Payment operations could not be loaded. Refresh the page to try again."
              icon={CreditCardIcon}
              title="Payments unavailable"
            />
          ) : null}
          {operations.data?.length === 0 ? (
            <AdminEmptyState
              description="No payment operations have been recorded."
              icon={CreditCardIcon}
              title="No payment activity"
            />
          ) : null}
          {operations.data && operations.data.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="border-b text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">Type</th>
                    <th className="px-3 py-2 font-medium">Provider</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium">Attempts</th>
                    <th className="px-3 py-2 font-medium">Failure reason</th>
                    <th className="px-3 py-2 font-medium">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {operations.data.map((operation) => (
                    <tr className="border-b last:border-0" key={operation.id}>
                      <td className="px-3 py-3 capitalize">
                        {operation.operationType.replaceAll("_", " ")}
                      </td>
                      <td className="px-3 py-3 capitalize">{operation.provider}</td>
                      <td className="px-3 py-3 capitalize">
                        {operation.status.replaceAll("_", " ")}
                      </td>
                      <td className="px-3 py-3 tabular-nums">{operation.attemptCount}</td>
                      <td className="px-3 py-3 text-muted-foreground">
                        {operation.manualReviewCode ?? "—"}
                      </td>
                      <td className="px-3 py-3 text-muted-foreground">
                        {formatDate(operation.updatedAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(
    value,
  );
}
