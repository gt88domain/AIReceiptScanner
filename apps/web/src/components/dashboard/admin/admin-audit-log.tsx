"use no memo";

import { useQuery } from "@tanstack/react-query";
import { getCoreRowModel, type ColumnDef, useReactTable } from "@tanstack/react-table";
import { ClipboardListIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useOrpc } from "@/hooks/use-orpc";
import { AdminEmptyState } from "./admin-empty-state";
import { AdminPageHeader } from "./admin-page-header";

type AuditLog = {
  id: string;
  actorEmail: string;
  action: string;
  entityType: string;
  entityId: string;
  createdAt: Date;
};

const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

export function AdminAuditLog() {
  const orpc = useOrpc();
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 25 });
  const audit = useQuery(
    orpc.admin.listAuditLog.queryOptions({
      input: {
        page: pagination.pageIndex + 1,
        perPage: pagination.pageSize,
      },
    }),
  );
  const columns = useMemo<ColumnDef<AuditLog>[]>(
    () => [
      {
        accessorKey: "createdAt",
        header: ({ column }) => <DataTableColumnHeader column={column} label="Time" />,
        cell: ({ row }) => dateTimeFormatter.format(row.original.createdAt),
      },
      {
        accessorKey: "actorEmail",
        header: ({ column }) => <DataTableColumnHeader column={column} label="Actor" />,
      },
      {
        accessorKey: "action",
        header: ({ column }) => <DataTableColumnHeader column={column} label="Action" />,
      },
      {
        id: "target",
        header: "Target",
        cell: ({ row }) => `${row.original.entityType} · ${row.original.entityId}`,
      },
      {
        id: "summary",
        header: "Summary",
        cell: ({ row }) => `Updated ${row.original.entityType}`,
      },
    ],
    [],
  );
  const table = useReactTable({
    data: audit.data?.data ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    onPaginationChange: setPagination,
    pageCount: audit.data?.pageCount ?? 0,
    state: { pagination },
  });

  return (
    <div className="space-y-6">
      <AdminPageHeader
        description="Administrative changes to durable application state. Sensitive values are redacted before records are stored."
        title="Audit"
      />
      {audit.isPending ? <AuditSkeleton /> : null}
      {audit.isError ? (
        <AdminEmptyState
          description="The audit log could not be loaded. Refresh the page to try again."
          icon={ClipboardListIcon}
          title="Audit unavailable"
        />
      ) : null}
      {audit.data?.total === 0 ? (
        <AdminEmptyState
          description="No administrative changes recorded."
          icon={ClipboardListIcon}
          title="No audit records"
        />
      ) : null}
      {audit.data && audit.data.total > 0 ? <DataTable table={table} /> : null}
    </div>
  );
}

function AuditSkeleton() {
  return (
    <Card>
      <CardContent className="space-y-3 py-6">
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton className="h-10" key={index} />
        ))}
      </CardContent>
    </Card>
  );
}
