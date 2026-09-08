import { useMutation, useQuery } from "@tanstack/react-query";
import { CreditCardIcon, Loader2Icon, RotateCcwIcon, XCircleIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useOrpc } from "@/hooks/use-orpc";
import { AdminEmptyState } from "./admin-empty-state";
import { AdminPageHeader } from "./admin-page-header";

export function AdminPayments() {
  const orpc = useOrpc();
  const operations = useQuery(orpc.admin.listPaymentOperations.queryOptions({ input: {} }));
  const deadLetters = useQuery(orpc.admin.listDeadLetterWebhooks.queryOptions({ input: {} }));
  const retryOperation = useMutation({
    ...orpc.admin.retryPaymentOperation.mutationOptions(),
    onSuccess: async ({ queued }) => {
      if (queued) {
        toast.success("Payment operation queued for retry.");
        await operations.refetch();
      } else {
        toast.error("This payment operation is no longer retryable.");
      }
    },
    onError: () => toast.error("Payment operation retry failed."),
  });
  const resolveManualReview = useMutation({
    ...orpc.admin.resolvePaymentOperationManualReview.mutationOptions(),
    onSuccess: async ({ resolved }) => {
      if (resolved) {
        toast.success("Manual review resolved.");
        await operations.refetch();
      } else {
        toast.error("This operation is no longer in manual review.");
      }
    },
    onError: () => toast.error("Manual review could not be resolved."),
  });
  const replayWebhook = useMutation({
    ...orpc.admin.replayWebhook.mutationOptions(),
    onSuccess: async ({ queued }) => {
      if (queued) {
        toast.success("Webhook queued for replay.");
        await deadLetters.refetch();
      } else {
        toast.error("This webhook is no longer replayable.");
      }
    },
    onError: () => toast.error("Webhook replay failed."),
  });

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
                    <th className="px-3 py-2 text-right font-medium">Actions</th>
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
                      <td className="px-3 py-3">
                        <div className="flex justify-end gap-2">
                          {operation.status === "failed" ? (
                            <Button
                              disabled={retryOperation.isPending}
                              onClick={() => retryOperation.mutate({ operationId: operation.id })}
                              size="sm"
                              variant="outline"
                            >
                              {retryOperation.isPending &&
                              retryOperation.variables?.operationId === operation.id ? (
                                <Loader2Icon className="size-4 animate-spin" />
                              ) : (
                                <RotateCcwIcon className="size-4" />
                              )}
                              Retry
                            </Button>
                          ) : null}
                          {operation.status === "manual_review" ? (
                            <>
                              <Button
                                disabled={resolveManualReview.isPending}
                                onClick={() =>
                                  resolveManualReview.mutate({
                                    operationId: operation.id,
                                    resolution: "requeue",
                                  })
                                }
                                size="sm"
                                variant="outline"
                              >
                                Requeue
                              </Button>
                              <Button
                                disabled={resolveManualReview.isPending}
                                onClick={() =>
                                  resolveManualReview.mutate({
                                    operationId: operation.id,
                                    resolution: "mark_failed",
                                  })
                                }
                                size="sm"
                                variant="outline"
                              >
                                <XCircleIcon className="size-4" />
                                Mark failed
                              </Button>
                            </>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Dead-letter webhooks</CardTitle>
          <CardDescription>Webhook events that exhausted automatic processing.</CardDescription>
        </CardHeader>
        <CardContent>
          {deadLetters.isPending ? <Skeleton className="h-32 w-full" /> : null}
          {deadLetters.isError ? (
            <AdminEmptyState
              description="Dead-letter webhooks could not be loaded."
              icon={CreditCardIcon}
              title="Webhooks unavailable"
            />
          ) : null}
          {deadLetters.data?.items.length === 0 ? (
            <AdminEmptyState
              description="No webhook events require manual replay."
              icon={CreditCardIcon}
              title="No dead-letter webhooks"
            />
          ) : null}
          {deadLetters.data?.items.length ? (
            <div className="divide-y">
              {deadLetters.data.items.map((event) => (
                <div className="flex items-center justify-between gap-4 py-3" key={event.id}>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{event.eventType}</p>
                    <p className="text-xs text-muted-foreground">
                      {event.provider} · {event.attemptCount} attempts ·{" "}
                      {formatDate(event.deadLetteredAt)}
                    </p>
                    {event.lastError ? (
                      <p className="mt-1 line-clamp-2 text-xs text-destructive">
                        {event.lastError}
                      </p>
                    ) : null}
                  </div>
                  <Button
                    disabled={replayWebhook.isPending}
                    onClick={() => replayWebhook.mutate({ eventId: event.id })}
                    size="sm"
                    variant="outline"
                  >
                    {replayWebhook.isPending && replayWebhook.variables?.eventId === event.id ? (
                      <Loader2Icon className="size-4 animate-spin" />
                    ) : (
                      <RotateCcwIcon className="size-4" />
                    )}
                    Replay
                  </Button>
                </div>
              ))}
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
