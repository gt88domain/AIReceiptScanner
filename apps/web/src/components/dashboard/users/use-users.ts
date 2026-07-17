"use no memo";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { SortingState } from "@tanstack/react-table";
import { client } from "@/utils/orpc";

// Query keys for cache management
export const usersKeys = {
  all: ["admin", "users"] as const,
  lists: () => [...usersKeys.all, "lists"] as const,
  list: (params: { pageIndex: number; pageSize: number; search: string; sorting: SortingState }) =>
    [...usersKeys.lists(), params] as const,
};

interface UseUsersParams {
  pageIndex: number;
  pageSize: number;
  search: string;
  sorting: SortingState;
}

/**
 * Hook to fetch users with pagination, search, and sorting.
 * Uses keepPreviousData to avoid flickering when changing pages.
 */
export function useUsers({ pageIndex, pageSize, search, sorting }: UseUsersParams) {
  return useQuery({
    queryKey: usersKeys.list({
      pageIndex,
      pageSize,
      search,
      sorting,
    }),
    queryFn: async () => {
      const result = await client.admin.listUsers({
        page: pageIndex + 1,
        perPage: pageSize,
        name: search || undefined,
        sort: sorting
          .filter((s): s is typeof s & { id: "name" | "createdAt" } =>
            ["name", "createdAt"].includes(s.id),
          )
          .map((s) => ({ id: s.id, desc: s.desc })),
      });

      return {
        items: result.data ?? [],
        total: result.total ?? 0,
        pageCount: result.pageCount ?? 0,
      };
    },
    placeholderData: keepPreviousData,
  });
}
