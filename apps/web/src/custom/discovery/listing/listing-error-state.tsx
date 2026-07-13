import { Button } from "@/components/ui/button";
import { AlertTriangleIcon } from "lucide-react";

type ListingErrorStateProps = {
  description?: string;
  onRetry?: () => void;
  retryLabel?: string;
  title?: string;
};

export function ListingErrorState({
  description = "We could not load this list. Please try again.",
  onRetry,
  retryLabel = "Try again",
  title = "Something went wrong",
}: ListingErrorStateProps) {
  return (
    <section className="flex min-h-56 flex-col items-center justify-center border border-destructive/30 bg-destructive/5 px-6 py-10 text-center">
      <AlertTriangleIcon aria-hidden="true" className="mb-3 size-6 text-destructive" />
      <h2 className="font-semibold">{title}</h2>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">{description}</p>
      {onRetry ? (
        <Button type="button" variant="outline" className="mt-5" onClick={onRetry}>
          {retryLabel}
        </Button>
      ) : null}
    </section>
  );
}
