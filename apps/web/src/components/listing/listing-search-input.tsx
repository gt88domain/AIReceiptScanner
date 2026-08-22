"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchIcon } from "lucide-react";
import type { FormEvent } from "react";

type ListingSearchInputProps = {
  label: string;
  onQueryChange: (query: string) => void;
  onSubmit: (query: string) => void;
  placeholder: string;
  query: string;
  submitLabel: string;
};

/** A controlled search form. The resource adapter controls route-search state. */
export function ListingSearchInput({
  label,
  onQueryChange,
  onSubmit,
  placeholder,
  query,
  submitLabel,
}: ListingSearchInputProps) {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit(query.trim());
  };

  return (
    <form
      role="search"
      className="flex min-h-11 items-center gap-2 rounded-control border border-line bg-surface-raised p-1.5 text-ink-muted"
      onSubmit={handleSubmit}
    >
      <label className="min-w-0 flex-1">
        <span className="sr-only">{label}</span>
        <Input
          className="border-0 bg-transparent shadow-none focus-visible:ring-0"
          placeholder={placeholder}
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
        />
      </label>
      <Button
        className="size-8 rounded-control bg-surface-active text-skin-accent-ink hover:bg-surface-hover"
        type="submit"
        size="icon"
        variant="ghost"
        aria-label={submitLabel}
        title={submitLabel}
      >
        <SearchIcon aria-hidden="true" className="size-4" />
      </Button>
    </form>
  );
}
