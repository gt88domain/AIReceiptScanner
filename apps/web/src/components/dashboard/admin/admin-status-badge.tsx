import { Badge } from "@/components/ui/badge";

const statusClasses = {
  configured: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  disabled: "border-muted-foreground/20 bg-muted text-muted-foreground",
  missing: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
} as const;

export function AdminStatusBadge({ status }: { status: keyof typeof statusClasses }) {
  return (
    <Badge className={statusClasses[status]} variant="outline">
      {status}
    </Badge>
  );
}
