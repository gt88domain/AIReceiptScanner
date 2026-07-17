"use no memo";

import type { ColumnDef, SortingState, VisibilityState } from "@tanstack/react-table";
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { getVisibleUserContact, getVisibleUserName, isPhoneUser } from "@repo/shared";
import { debounce } from "lodash-es";
import {
  CheckCircle2,
  ChevronLeftIcon,
  ChevronRightIcon,
  Loader2Icon,
  Mail,
  RefreshCwIcon,
  Smartphone,
  UsersIcon,
  XCircle,
  XIcon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DataTableAdvancedToolbar } from "@/components/data-table/data-table-advanced-toolbar";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useTranslations } from "@/i18n";
import { TableRowSkeleton } from "./table-row-skeleton";
import type { User } from "./types";

interface UsersTableProps {
  data: User[];
  total: number;
  pageIndex: number;
  pageSize: number;
  search: string;
  sorting: SortingState;
  loading?: boolean;
  refreshing?: boolean;
  onSearch: (search: string) => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onRefresh?: () => void;
  onSortingChange?: (sorting: SortingState) => void;
}

export function UsersTable({
  data,
  total,
  pageIndex,
  pageSize,
  search,
  sorting,
  loading,
  refreshing,
  onSearch,
  onPageChange,
  onPageSizeChange,
  onRefresh,
  onSortingChange,
}: UsersTableProps) {
  const t = useTranslations("dashboard.users");
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [localSearch, setLocalSearch] = useState(search);

  // Sync local search with prop when it changes externally
  useEffect(() => {
    setLocalSearch(search);
  }, [search]);

  // Debounced search using lodash (500ms as fallback)
  const debouncedSearch = useMemo(
    () =>
      debounce((value: string) => {
        onSearch(value);
        onPageChange(0);
      }, 500),
    [onSearch, onPageChange],
  );

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      debouncedSearch.cancel();
    };
  }, [debouncedSearch]);

  const handleSearchChange = useCallback(
    (value: string) => {
      setLocalSearch(value);
      debouncedSearch(value);
    },
    [debouncedSearch],
  );

  // Immediate search on Enter key
  const handleSearchSubmit = useCallback(() => {
    debouncedSearch.cancel();
    onSearch(localSearch);
    onPageChange(0);
  }, [debouncedSearch, localSearch, onSearch, onPageChange]);

  const columns: ColumnDef<User>[] = useMemo(
    () => [
      {
        id: "avatar",
        accessorKey: "image",
        header: ({ column }) => <DataTableColumnHeader column={column} label={t("table.avatar")} />,
        cell: ({ row }) => {
          const user = row.original;
          const visibleName = getVisibleUserName(user);
          const visibleContact = getVisibleUserContact(user);
          const fallback = (visibleName ?? visibleContact)?.slice(0, 2).toUpperCase() ?? "??";

          return (
            <div className="flex items-center">
              <Avatar className="h-9 w-9">
                <AvatarImage
                  alt={visibleName ?? visibleContact ?? ""}
                  src={user.image ?? undefined}
                />
                <AvatarFallback>{fallback}</AvatarFallback>
              </Avatar>
            </div>
          );
        },
        meta: {
          label: t("table.avatar"),
        },
        enableSorting: false,
        minSize: 120,
        size: 140,
      },
      {
        id: "name",
        accessorKey: "name",
        header: ({ column }) => <DataTableColumnHeader column={column} label={t("table.name")} />,
        cell: ({ row }) => {
          const user = row.original;
          return <div className="font-medium">{getVisibleUserName(user)}</div>;
        },
        meta: {
          label: t("table.name"),
        },
        minSize: 120,
        size: 140,
      },
      {
        id: "contact",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t("table.contact")} />
        ),
        cell: ({ row }) => {
          const user = row.original;
          const phoneUser = isPhoneUser(user);
          const Icon = phoneUser ? Smartphone : Mail;
          const contact = phoneUser ? user.phoneNumber : getVisibleUserContact(user);

          return (
            <div className="flex items-center gap-2">
              <Icon className="size-4 text-muted-foreground" />
              <span>{contact ?? "-"}</span>
            </div>
          );
        },
        meta: {
          label: t("table.contact"),
        },
        enableSorting: false,
        minSize: 180,
        size: 200,
      },
      {
        id: "emailVerified",
        accessorKey: "emailVerified",
        header: t("table.status"),
        cell: ({ row }) => {
          const user = row.original;
          const verified = isPhoneUser(user) ? user.phoneNumberVerified : user.emailVerified;
          const Icon = verified ? CheckCircle2 : XCircle;

          return (
            <Badge variant="outline" className="capitalize">
              <Icon className={verified ? "stroke-green-500" : "stroke-red-500"} />
              {verified ? t("table.verified") : t("table.unverified")}
            </Badge>
          );
        },
        meta: {
          label: t("table.status"),
        },
        enableSorting: false,
        minSize: 100,
        size: 120,
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
    onSortingChange: (updater) => {
      const next = typeof updater === "function" ? updater(sorting) : updater;
      onSortingChange?.(next);
    },
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: (updater) => {
      const next = typeof updater === "function" ? updater({ pageIndex, pageSize }) : updater;
      if (next.pageSize !== pageSize) {
        onPageSizeChange(next.pageSize);
        if (pageIndex !== 0) onPageChange(0);
      } else if (next.pageIndex !== pageIndex) {
        onPageChange(next.pageIndex);
      }
    },
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: true,
    manualSorting: true,
    enableMultiSort: false,
  });
  const pageCount = Math.ceil(total / pageSize);
  const canGoPrevious = pageIndex > 0;
  const canGoNext = pageCount > 0 && pageIndex < pageCount - 1;

  return (
    <div className="flex min-h-[36rem] flex-col overflow-hidden">
      <div className="mb-4 flex shrink-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 font-semibold leading-none">
            <UsersIcon className="size-5" />
            {t("title")}
          </div>
          <div className="mt-1 text-muted-foreground text-sm">{t("description")}</div>
        </div>
        <DataTableAdvancedToolbar table={table} className="shrink-0 items-center p-0 sm:w-auto">
          <div className="flex flex-1 flex-wrap items-center gap-2">
            <div className="relative">
              <Input
                placeholder={t("table.searchPlaceholder")}
                value={localSearch}
                onChange={(event) => handleSearchChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    handleSearchSubmit();
                  }
                }}
                className="h-8 w-[260px] pr-8"
              />
              {localSearch.length > 0 ? (
                <Button
                  aria-label="Clear search"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    debouncedSearch.cancel();
                    setLocalSearch("");
                    onSearch("");
                    onPageChange(0);
                  }}
                  className="absolute right-0 top-0 h-8 w-8 p-0 hover:bg-transparent"
                >
                  <XIcon className="size-3" />
                </Button>
              ) : null}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0"
              disabled={refreshing}
              onClick={onRefresh}
            >
              {refreshing ? (
                <Loader2Icon className="mr-2 size-4 animate-spin" />
              ) : (
                <RefreshCwIcon className="mr-2 size-4" />
              )}
              {t("refresh")}
            </Button>
          </div>
        </DataTableAdvancedToolbar>
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
        <div className="min-h-0 flex-1 overflow-auto rounded-lg border [scrollbar-color:var(--border)_transparent] [scrollbar-gutter:stable] [scrollbar-width:thin] [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb:hover]:bg-muted-foreground/45 [&::-webkit-scrollbar-track]:bg-transparent">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-card">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: pageSize }).map((_, index) => (
                  <TableRowSkeleton key={index} columns={columns.length} />
                ))
              ) : table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                    className="h-14"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="py-3">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center text-muted-foreground"
                  >
                    {t("table.noResults")}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <div className="mt-4 flex shrink-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <span>{t("pagination.rowsPerPage")}</span>
            <Select
              value={`${pageSize}`}
              onValueChange={(value) => {
                onPageSizeChange(Number(value));
                if (pageIndex !== 0) onPageChange(0);
              }}
            >
              <SelectTrigger size="sm" className="h-8 w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent side="top">
                {[10, 20, 50].map((value) => (
                  <SelectItem key={value} value={`${value}`}>
                    {value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span>
              {t("pagination.total", {
                total,
              })}
            </span>
          </div>
          <div className="flex items-center justify-end gap-2">
            <span className="text-muted-foreground text-sm">
              {t("pagination.pageInfo", {
                page: pageIndex + 1,
                pageCount: Math.max(pageCount, 1),
              })}
            </span>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              disabled={!canGoPrevious || loading}
              aria-label={t("pagination.previous")}
              onClick={() => onPageChange(Math.max(pageIndex - 1, 0))}
            >
              <ChevronLeftIcon className="size-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              disabled={!canGoNext || loading}
              aria-label={t("pagination.next")}
              onClick={() => onPageChange(pageIndex + 1)}
            >
              <ChevronRightIcon className="size-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
