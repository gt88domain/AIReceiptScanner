import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";
import "./prose.css";

/**
 * A product-neutral reading surface for article, answer, and chapter bodies.
 * Content parsing and rich embeds remain product-owned.
 *
 * Rhythm contract: ~65ch measure, 1.75 body line-height, headings tighten as
 * they grow, block spacing collapses at the edges so the surface never adds
 * stray gaps inside its parent frame.
 */
export function Prose({ className, ...props }: ComponentProps<"article">) {
  return <article className={cn("public-prose", className)} {...props} />;
}
