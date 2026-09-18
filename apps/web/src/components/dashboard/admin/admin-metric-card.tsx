import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";

export function AdminMetricCard({
  icon: Icon,
  label,
  value,
  description,
}: {
  icon: LucideIcon;
  label: string;
  value: number | string;
  description?: string;
}) {
  return (
    <Card>
      <CardHeader className="space-y-1 pb-2">
        <Icon className="size-4 text-muted-foreground" />
        <CardDescription>{label}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold tabular-nums">{value}</div>
        {description ? <p className="mt-1 text-muted-foreground text-xs">{description}</p> : null}
      </CardContent>
    </Card>
  );
}
