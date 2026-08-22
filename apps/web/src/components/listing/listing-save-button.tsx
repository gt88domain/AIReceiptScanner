import { cn } from "@/lib/utils";
import { HeartIcon } from "lucide-react";
import type { ButtonHTMLAttributes } from "react";

type ListingSaveButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  saved: boolean;
};

/**
 * A controlled save affordance. The product decides guest sign-in behavior and
 * server persistence; this component only renders the accessible button state.
 */
export function ListingSaveButton({
  className,
  label,
  saved,
  type = "button",
  ...props
}: ListingSaveButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      aria-pressed={saved}
      className={cn(
        "inline-flex size-9 items-center justify-center rounded-full border border-line bg-surface-raised text-ink-muted shadow-sm transition-[transform,color,background] hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-skin-accent/40 active:translate-y-px",
        saved && "bg-surface-active text-skin-accent",
        className,
      )}
      {...props}
    >
      <HeartIcon aria-hidden="true" className={cn("size-4", saved && "fill-current")} />
    </button>
  );
}
