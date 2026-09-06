"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ListingSortOption } from "./listing-types";

type ListingSortSelectProps = {
  label?: string;
  onValueChange: (value: string) => void;
  options: readonly ListingSortOption[];
  value: string;
};

/**
 * A resource-controlled sort selector. The option values map directly to the
 * resource's validated sort allowlist.
 */
export function ListingSortSelect({
  label = "Sort results",
  onValueChange,
  options,
  value,
}: ListingSortSelectProps) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger aria-label={label} className="min-w-40">
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
