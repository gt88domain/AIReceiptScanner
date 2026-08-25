import { Button } from "@/components/ui/button";
import { AlertTriangleIcon } from "lucide-react";

type ListingErrorStateProps = {
  description: string;
  onRetry?: () => void;
  retryLabel?: string;
  title: string;
};

export function ListingErrorState({
  description,
  onRetry,
  retryLabel,
  title,
}: ListingErrorStateProps) {
  return (
    <section className="flex min-h-64 flex-col items-center justify-center rounded-card border border-destructive/30 bg-destructive/5 px-6 py-12 text-center">
      <AlertTriangleIcon aria-hidden="true" className="mb-3 size-6 text-destructive" />
      <h2 className="font-semibold">{title}</h2>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">{description}</p>
      {onRetry && retryLabel ? (
        <Button className="mt-5" type="button" variant="outline" onClick={onRetry}>
          {retryLabel}
        </Button>
      ) : null}
    </section>
  );
}
