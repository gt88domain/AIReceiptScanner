"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchIcon } from "lucide-react";
import type { FormEvent } from "react";

type ListingSearchInputProps = {
  label?: string;
  onQueryChange: (query: string) => void;
  onSubmit: (query: string) => void;
  placeholder?: string;
  query: string;
  submitLabel?: string;
};

/**
 * A controlled search form. The resource adapter decides how draft input is
 * stored and when submitted search state updates the route.
 */
export function ListingSearchInput({
  label = "Search",
  onQueryChange,
  onSubmit,
  placeholder = "Search",
  query,
  submitLabel = "Submit search",
}: ListingSearchInputProps) {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit(query.trim());
  };

  return (
    <form role="search" className="flex items-center gap-2" onSubmit={handleSubmit}>
      <label className="min-w-0 flex-1">
        <span className="sr-only">{label}</span>
        <Input
          placeholder={placeholder}
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
        />
      </label>
      <Button type="submit" size="icon" aria-label={submitLabel} title={submitLabel}>
        <SearchIcon className="size-4" />
      </Button>
    </form>
  );
}
