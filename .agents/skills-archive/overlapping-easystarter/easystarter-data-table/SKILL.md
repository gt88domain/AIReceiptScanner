---
name: easystarter-data-table
description: Generate data table pages with pagination, sorting, and search
---

# Data Table Page Generator

Generate a new data table page with server-side pagination, sorting, and search following the project's patterns.

## Instructions

When the user asks to create a data table page, follow these steps:

1. **Gather Requirements**
   - Ask for the resource name (e.g., "products", "orders")
   - Ask what columns to display
   - Ask which columns should be sortable
   - Ask if search is needed and on which fields

2. **Create the File Structure**

   ```
   apps/web/src/
   ├── routes/_authed/(dashboard)/{resource}.tsx    # Route file
   └── components/dashboard/{resource}/
       ├── index.tsx                                 # Exports
       ├── types.ts                                  # Type definitions
       ├── use-{resource}.ts                         # Data fetching hook
       ├── {resource}-table.tsx                      # Table component
       ├── {resource}-table-container.tsx            # Container with state
       ├── actions-cell.tsx                          # Row actions (optional)
       └── table-row-skeleton.tsx                    # Loading skeleton
   ```

3. **Create Route File**

   Location: `apps/web/src/routes/_authed/(dashboard)/{resource}.tsx`

   ```typescript
   import { createFileRoute } from "@tanstack/react-router";
   import { z } from "zod";
   import { {Resource}TableContainer } from "@/components/dashboard/{resource}";

   const searchSchema = z.object({
     page: z.number().optional().default(0),
     size: z.number().optional().default(10),
     search: z.string().optional().default(""),
     sort: z.string().optional().default("createdAt:desc"),
   });

   export const Route = createFileRoute("/_authed/(dashboard)/{resource}")({
     component: {Resource}TableContainer,
     validateSearch: searchSchema,
   });
   ```

4. **Create Types File**

   Location: `apps/web/src/components/dashboard/{resource}/types.ts`

   ```typescript
   export interface {Resource} {
     id: string;
     name: string;
     // ... other fields
     createdAt: Date;
     updatedAt: Date;
   }
   ```

5. **Create Data Fetching Hook**

   Location: `apps/web/src/components/dashboard/{resource}/use-{resource}.ts`

   ```typescript
   import { keepPreviousData, useQuery } from "@tanstack/react-query";
   import type { SortingState } from "@tanstack/react-table";
   import { orpc } from "@/utils/orpc";
   import type { {Resource} } from "./types";

   export const {resource}Keys = {
     all: ["{resource}"] as const,
     lists: () => [...{resource}Keys.all, "list"] as const,
     list: (params: {
       pageIndex: number;
       pageSize: number;
       search: string;
       sorting: SortingState;
     }) => [...{resource}Keys.lists(), params] as const,
   };

   interface Use{Resource}Params {
     pageIndex: number;
     pageSize: number;
     search: string;
     sorting: SortingState;
   }

   export function use{Resource}({ pageIndex, pageSize, search, sorting }: Use{Resource}Params) {
     return useQuery({
       queryKey: {resource}Keys.list({ pageIndex, pageSize, search, sorting }),
       queryFn: async () => {
         const result = await orpc.{resource}.list.call({
           page: pageIndex + 1,
           perPage: pageSize,
           name: search || undefined,
           sort: sorting.map((s) => ({
             id: s.id as "name" | "createdAt",
             desc: s.desc,
           })),
         });

         return {
           items: result.data as {Resource}[],
           total: result.total,
           pageCount: result.pageCount,
         };
       },
       placeholderData: keepPreviousData,
     });
   }
   ```

6. **Create Table Container**

   Location: `apps/web/src/components/dashboard/{resource}/{resource}-table-container.tsx`

   ```typescript
   "use no memo";

   import { useNavigate, useSearch } from "@tanstack/react-router";
   import type { SortingState } from "@tanstack/react-table";
   import { useCallback, useMemo } from "react";

   import { parseSortString, serializeSortString } from "@/lib/parsers";
   import type { ExtendedColumnSort } from "@/types/data-table";
   import type { {Resource} } from "./types";
   import { use{Resource} } from "./use-{resource}";
   import { {Resource}Table } from "./{resource}-table";

   const sortableColumnIds = ["name", "createdAt"] as const;
   const sortableColumnSet = new Set<string>(sortableColumnIds);

   export function {Resource}TableContainer() {
     const navigate = useNavigate();
     const searchParams = useSearch({ from: "/_authed/(dashboard)/{resource}" });

     const defaultSorting = useMemo<ExtendedColumnSort<{Resource}>[]>(
       () => [{ id: "createdAt", desc: true }],
       [],
     );

     // Get values from search params with defaults
     const page = searchParams.page ?? 0;
     const size = searchParams.size ?? 10;
     const search = searchParams.search ?? "";
     const sortString = searchParams.sort ?? "createdAt:desc";

     // Parse sort string to sorting state
     const sort = useMemo(() => {
       const parsed = parseSortString<{Resource}>(sortString, sortableColumnSet);
       return parsed ?? defaultSorting;
     }, [sortString, defaultSorting]);

     // Update search params helper
     const setSearchParams = useCallback(
       (updates: Partial<typeof searchParams>) => {
          navigate({
           to: ".",
           search: (prev) => ({ ...prev, ...updates }),
           replace: true,
         });
       },
       [navigate],
     );

     // Normalize sorting
     const safeSorting = useMemo(() => {
       const filtered = sort
         .filter((item) => sortableColumnSet.has(item.id as string))
         .map((item) => ({
           ...item,
           id: item.id as Extract<keyof {Resource}, string>,
         })) as ExtendedColumnSort<{Resource}>[];

       return filtered.length > 0 ? filtered : defaultSorting;
     }, [sort, defaultSorting]);

     const normalizeSorting = useCallback(
       (value: SortingState): ExtendedColumnSort<{Resource}>[] => {
         const filtered = value
           .filter((item) => sortableColumnSet.has(item.id as string))
           .map((item) => ({
             ...item,
             id: item.id as Extract<keyof {Resource}, string>,
           })) as ExtendedColumnSort<{Resource}>[];

         return filtered.length > 0 ? filtered : defaultSorting;
       },
       [defaultSorting],
     );

     const { data, isLoading } = use{Resource}({
       pageIndex: page,
       pageSize: size,
       search,
       sorting: safeSorting,
     });

     const items = data?.items ?? [];
     const total = data?.total ?? 0;

     return (
       <{Resource}Table
         data={items}
         total={total}
         pageIndex={page}
         pageSize={size}
         search={search}
         sorting={safeSorting}
         loading={isLoading}
         onSearch={(newSearch) => setSearchParams({ search: newSearch, page: 0 })}
         onPageChange={(newPageIndex) => setSearchParams({ page: newPageIndex })}
         onPageSizeChange={(newPageSize) =>
           setSearchParams({ size: newPageSize, page: 0 })
         }
         onSortingChange={(newSorting) => {
           const nextSorting = normalizeSorting(newSorting);
           setSearchParams({ sort: serializeSortString(nextSorting), page: 0 });
         }}
       />
     );
   }
   ```

7. **Create Table Component**

   Location: `apps/web/src/components/dashboard/{resource}/{resource}-table.tsx`

   ```typescript
   "use no memo";

   import type {
     ColumnDef,
     SortingState,
     VisibilityState,
   } from "@tanstack/react-table";
   import {
     flexRender,
     getCoreRowModel,
     getPaginationRowModel,
     getSortedRowModel,
     useReactTable,
   } from "@tanstack/react-table";
   import { debounce } from "lodash-es";
   import { XIcon } from "lucide-react";
   import { useCallback, useEffect, useMemo, useState } from "react";

   import { DataTableAdvancedToolbar } from "@/components/data-table/data-table-advanced-toolbar";
   import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
   import { DataTablePagination } from "@/components/data-table/data-table-pagination";
   import { Button } from "@/components/ui/button";
   import { Input } from "@/components/ui/input";
   import { Skeleton } from "@/components/ui/skeleton";
   import {
     Table,
     TableBody,
     TableCell,
     TableHead,
     TableHeader,
     TableRow,
   } from "@/components/ui/table";
   import { useTranslations } from "@/i18n";
   import type { ExtendedColumnSort } from "@/types/data-table";
   import type { {Resource} } from "./types";
   import { TableRowSkeleton } from "./table-row-skeleton";

   interface {Resource}TableProps {
     data: {Resource}[];
     total: number;
     pageIndex: number;
     pageSize: number;
     search: string;
     sorting: ExtendedColumnSort<{Resource}>[];
     loading?: boolean;
     onSearch: (search: string) => void;
     onPageChange: (pageIndex: number) => void;
     onPageSizeChange: (pageSize: number) => void;
     onSortingChange: (sorting: SortingState) => void;
   }

   export function {Resource}Table({
     data,
     total,
     pageIndex,
     pageSize,
     search,
     sorting,
     loading,
     onSearch,
     onPageChange,
     onPageSizeChange,
     onSortingChange,
   }: {Resource}TableProps) {
     const t = useTranslations("dashboard.{resource}");
     const [localSearch, setLocalSearch] = useState(search);
     const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

     // Sync local search with URL search
     useEffect(() => {
       setLocalSearch(search);
     }, [search]);

     // Debounced search
     const debouncedSearch = useMemo(
       () =>
         debounce((value: string) => {
           onSearch(value);
         }, 500),
       [onSearch],
     );

     const handleSearchChange = useCallback(
       (value: string) => {
         setLocalSearch(value);
         debouncedSearch(value);
       },
       [debouncedSearch],
     );

     const handleSearchKeyDown = useCallback(
       (e: React.KeyboardEvent<HTMLInputElement>) => {
         if (e.key === "Enter") {
           debouncedSearch.cancel();
           onSearch(localSearch);
         }
       },
       [debouncedSearch, localSearch, onSearch],
     );

     const columns = useMemo<ColumnDef<{Resource}>[]>(
       () => [
         {
           accessorKey: "name",
           header: ({ column }) => (
             <DataTableColumnHeader column={column} title={t("table.name")} />
           ),
           cell: ({ row }) => <div>{row.getValue("name")}</div>,
         },
         // Add more columns here
         {
           accessorKey: "createdAt",
           header: ({ column }) => (
             <DataTableColumnHeader column={column} title={t("table.createdAt")} />
           ),
           cell: ({ row }) => (
             <div>
               {new Date(row.getValue("createdAt")).toLocaleDateString()}
             </div>
           ),
         },
       ],
       [t],
     );

     const table = useReactTable({
       data,
       columns,
       pageCount: Math.ceil(total / pageSize),
       state: {
         sorting,
         columnVisibility,
         pagination: { pageIndex, pageSize },
       },
       onSortingChange,
       onColumnVisibilityChange: setColumnVisibility,
       getCoreRowModel: getCoreRowModel(),
       getSortedRowModel: getSortedRowModel(),
       getPaginationRowModel: getPaginationRowModel(),
       manualPagination: true,
       manualSorting: true,
     });

     return (
       <div className="space-y-4">
         <DataTableAdvancedToolbar table={table}>
           <div className="flex items-center gap-2">
             <Input
               placeholder={t("table.searchPlaceholder")}
               value={localSearch}
               onChange={(e) => handleSearchChange(e.target.value)}
               onKeyDown={handleSearchKeyDown}
               className="h-8 w-[150px] lg:w-[250px]"
             />
             {localSearch && (
               <Button
                 variant="ghost"
                 size="sm"
                 onClick={() => handleSearchChange("")}
               >
                 <XIcon className="size-4" />
               </Button>
             )}
           </div>
         </DataTableAdvancedToolbar>

         <div className="rounded-md border">
           <Table>
             <TableHeader>
               {table.getHeaderGroups().map((headerGroup) => (
                 <TableRow key={headerGroup.id}>
                   {headerGroup.headers.map((header) => (
                     <TableHead key={header.id}>
                       {header.isPlaceholder
                         ? null
                         : flexRender(
                             header.column.columnDef.header,
                             header.getContext(),
                           )}
                     </TableHead>
                   ))}
                 </TableRow>
               ))}
             </TableHeader>
             <TableBody>
               {loading ? (
                 Array.from({ length: pageSize }).map((_, i) => (
                   <TableRowSkeleton key={i} columnCount={columns.length} />
                 ))
               ) : table.getRowModel().rows.length > 0 ? (
                 table.getRowModel().rows.map((row) => (
                   <TableRow key={row.id}>
                     {row.getVisibleCells().map((cell) => (
                       <TableCell key={cell.id}>
                         {flexRender(
                           cell.column.columnDef.cell,
                           cell.getContext(),
                         )}
                       </TableCell>
                     ))}
                   </TableRow>
                 ))
               ) : (
                 <TableRow>
                   <TableCell
                     colSpan={columns.length}
                     className="h-24 text-center"
                   >
                     {t("table.noResults")}
                   </TableCell>
                 </TableRow>
               )}
             </TableBody>
           </Table>
         </div>

         <DataTablePagination
           table={table}
           onPageChange={onPageChange}
           onPageSizeChange={onPageSizeChange}
         />
       </div>
     );
   }
   ```

8. **Create Table Row Skeleton**

   Location: `apps/web/src/components/dashboard/{resource}/table-row-skeleton.tsx`

   ```typescript
   import { Skeleton } from "@/components/ui/skeleton";
   import { TableCell, TableRow } from "@/components/ui/table";

   interface TableRowSkeletonProps {
     columnCount: number;
   }

   export function TableRowSkeleton({ columnCount }: TableRowSkeletonProps) {
     return (
       <TableRow>
         {Array.from({ length: columnCount }).map((_, i) => (
           <TableCell key={i}>
             <Skeleton className="h-4 w-full" />
           </TableCell>
         ))}
       </TableRow>
     );
   }
   ```

9. **Create Index File**

   Location: `apps/web/src/components/dashboard/{resource}/index.tsx`

   ```typescript
   export * from "./types";
   export * from "./use-{resource}";
   export * from "./{resource}-table";
   export * from "./{resource}-table-container";
   ```

## Key Patterns

- Use `"use no memo"` directive for table components
- Use TanStack Router for URL state management
- Use TanStack Query for data fetching with `keepPreviousData`
- Implement debounced search with Enter key support
- Use server-side pagination and sorting
- Create reusable skeleton components for loading states
- Follow the established file structure for consistency
