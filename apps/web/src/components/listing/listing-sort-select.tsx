"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { ListingSortOption } from "./listing-types";

type ListingSortSelectProps = {
  className?: string;
  label: string;
  onValueChange: (value: string) => void;
  options: readonly ListingSortOption[];
  value: string;
};

/** Resource-controlled sort selector. Values map to the route's validated allowlist. */
export function ListingSortSelect({
  className,
  label,
  onValueChange,
  options,
  value,
}: ListingSortSelectProps) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger
        aria-label={label}
        className={cn(
          "h-11 min-w-40 rounded-full border-line bg-surface-raised px-4 text-ink shadow-none transition-colors duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:border-line-strong",
          className,
        )}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
