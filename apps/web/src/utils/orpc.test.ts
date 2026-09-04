// @vitest-environment jsdom

import { beforeEach, expect, it, vi } from "vitest";

const toastError = vi.hoisted(() => vi.fn());

vi.mock("sonner", () => ({
  toast: { error: toastError },
}));

import { getWebRequestContext } from "./orpc";

beforeEach(() => {
  toastError.mockClear();
});

it("retries only the query that raised the cache error", async () => {
  const { queryClient } = getWebRequestContext();
  queryClient.setQueryData(["healthy"], "cached");
  const refetch = vi.spyOn(queryClient, "refetchQueries").mockResolvedValue(undefined);

  await expect(
    queryClient.fetchQuery({
      queryKey: ["failed"],
      queryFn: async () => {
        throw new Error("request failed");
      },
      retry: false,
    }),
  ).rejects.toThrow("request failed");

  expect(toastError).toHaveBeenCalledOnce();
  const toastOptions = toastError.mock.calls[0]?.[1];
  const action = toastOptions?.action;
  if (!action || typeof action !== "object" || !("onClick" in action)) {
    throw new Error("Retry action was not registered");
  }
  action.onClick();

  expect(refetch).toHaveBeenCalledOnce();
  const filters = refetch.mock.calls[0]?.[0];
  const failedQuery = queryClient.getQueryCache().find({ exact: true, queryKey: ["failed"] });
  const healthyQuery = queryClient.getQueryCache().find({ exact: true, queryKey: ["healthy"] });
  if (!filters?.predicate || !failedQuery || !healthyQuery) {
    throw new Error("Expected queries and retry predicate were not available");
  }
  expect(filters.predicate(failedQuery)).toBe(true);
  expect(filters.predicate(healthyQuery)).toBe(false);
});
