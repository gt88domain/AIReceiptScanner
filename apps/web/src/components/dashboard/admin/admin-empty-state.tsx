import type { LucideIcon } from "lucide-react";

export function AdminEmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center rounded-lg border border-dashed px-6 text-center">
      <Icon className="size-5 text-muted-foreground" />
      <h2 className="mt-3 font-medium">{title}</h2>
      <p className="mt-1 max-w-md text-muted-foreground text-sm">{description}</p>
    </div>
  );
}
