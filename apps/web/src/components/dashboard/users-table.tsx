"use no memo";

import type { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, ChevronDown, MoreHorizontal } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useDataTable } from "@/hooks/use-data-table";
import { useTranslations } from "@/i18n";

// Sample user data type
interface User {
  id: string;
  name: string;
  email: string;
  status: "active" | "inactive" | "pending";
  role: "admin" | "user" | "moderator";
  createdAt: string;
  lastLogin?: string;
}

// Sample data
const sampleUsers: User[] = [
  {
    id: "1",
    name: "John Doe",
    email: "john@example.com",
    status: "active",
    role: "admin",
    createdAt: "2024-01-15",
    lastLogin: "2024-01-20",
  },
  {
    id: "2",
    name: "Jane Smith",
    email: "jane@example.com",
    status: "active",
    role: "user",
    createdAt: "2024-01-10",
    lastLogin: "2024-01-19",
  },
  {
    id: "3",
    name: "Bob Johnson",
    email: "bob@example.com",
    status: "inactive",
    role: "user",
    createdAt: "2024-01-05",
    lastLogin: "2024-01-15",
  },
  {
    id: "4",
    name: "Alice Brown",
    email: "alice@example.com",
    status: "pending",
    role: "moderator",
    createdAt: "2024-01-20",
  },
  {
    id: "5",
    name: "Charlie Wilson",
    email: "charlie@example.com",
    status: "active",
    role: "user",
    createdAt: "2024-01-12",
    lastLogin: "2024-01-18",
  },
];

// Column definitions function that uses translations
function createColumns(t: ReturnType<typeof useTranslations>): ColumnDef<User>[] {
  return [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label={t("selectAll")}
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label={t("selectRow")}
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "name",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 hover:bg-transparent"
        >
          {t("name")}
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => <div className="font-medium">{row.getValue("name")}</div>,
      enableColumnFilter: true,
    },
    {
      accessorKey: "email",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 hover:bg-transparent"
        >
          {t("email")}
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => <div className="lowercase">{row.getValue("email")}</div>,
      enableColumnFilter: true,
    },
    {
      accessorKey: "status",
      header: t("status"),
      cell: ({ row }) => {
        const status = row.getValue("status") as string;
        return (
          <div className="capitalize">
            <span
              className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                status === "active"
                  ? "bg-green-100 text-green-800"
                  : status === "inactive"
                    ? "bg-red-100 text-red-800"
                    : "bg-yellow-100 text-yellow-800"
              }`}
            >
              {t(`statusOptions.${status}`)}
            </span>
          </div>
        );
      },
      enableColumnFilter: true,
      meta: {
        options: [
          { label: t("statusOptions.active"), value: "active" },
          { label: t("statusOptions.inactive"), value: "inactive" },
          { label: t("statusOptions.pending"), value: "pending" },
        ],
      },
    },
    {
      accessorKey: "role",
      header: t("role"),
      cell: ({ row }) => {
        const role = row.getValue("role") as string;
        return <div className="capitalize">{t(`roleOptions.${role}`)}</div>;
      },
      enableColumnFilter: true,
      meta: {
        options: [
          { label: t("roleOptions.admin"), value: "admin" },
          { label: t("roleOptions.user"), value: "user" },
          { label: t("roleOptions.moderator"), value: "moderator" },
        ],
      },
    },
    {
      accessorKey: "createdAt",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 hover:bg-transparent"
        >
          {t("createdAt")}
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const date = new Date(row.getValue("createdAt"));
        return <div>{date.toLocaleDateString()}</div>;
      },
    },
    {
      id: "actions",
      enableHiding: false,
      cell: ({ row }) => {
        const user = row.original;

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">{t("openMenu")}</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{t("actions")}</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => navigator.clipboard.writeText(user.id)}>
                {t("copyUserId")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>{t("viewUser")}</DropdownMenuItem>
              <DropdownMenuItem>{t("editUser")}</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];
}

interface UsersTableProps {
  className?: string;
}

export function UsersTable({ className }: UsersTableProps) {
  const t = useTranslations("dashboard.usersTable");

  // Simulate pagination - in real app, this would come from API
  const [globalFilter, setGlobalFilter] = React.useState("");

  // Create columns with translations
  const columns = React.useMemo(() => createColumns(t), [t]);

  // Filter data based on global filter
  const filteredData = React.useMemo(() => {
    if (!globalFilter) return sampleUsers;
    return sampleUsers.filter(
      (user) =>
        user.name.toLowerCase().includes(globalFilter.toLowerCase()) ||
        user.email.toLowerCase().includes(globalFilter.toLowerCase()) ||
        user.status.toLowerCase().includes(globalFilter.toLowerCase()) ||
        user.role.toLowerCase().includes(globalFilter.toLowerCase()),
    );
  }, [globalFilter]);

  // Calculate pagination
  const pageCount = Math.ceil(filteredData.length / 10);

  const { table } = useDataTable({
    data: filteredData,
    columns,
    pageCount,
    initialState: {
      pagination: {
        pageIndex: 0,
        pageSize: 10,
      },
    },
    enableAdvancedFilter: false,
    clearOnDefault: true,
  });

  return (
    <div className={className}>
      <div className="flex items-center py-4">
        <Input
          placeholder={t("filterPlaceholder")}
          value={globalFilter}
          onChange={(event) => setGlobalFilter(event.target.value)}
          className="max-w-sm"
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="ml-auto">
              {t("columns")} <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {table
              .getAllColumns()
              .filter((column) => column.getCanHide())
              .map((column) => {
                return (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) => column.toggleVisibility(!!value)}
                  >
                    {column.id}
                  </DropdownMenuCheckboxItem>
                );
              })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : typeof header.column.columnDef.header === "function"
                          ? header.column.columnDef.header(header.getContext())
                          : header.column.columnDef.header}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {typeof cell.column.columnDef.cell === "function"
                        ? cell.column.columnDef.cell(cell.getContext())
                        : cell.column.columnDef.cell}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  {t("noResults")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end space-x-2 py-4">
        <div className="flex-1 text-sm text-muted-foreground">
          {t("rowsSelected", {
            selected: table.getFilteredSelectedRowModel().rows.length,
            total: table.getFilteredRowModel().rows.length,
          })}
        </div>
        <div className="space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            {t("previous")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            {t("next")}
          </Button>
        </div>
      </div>
    </div>
  );
}
