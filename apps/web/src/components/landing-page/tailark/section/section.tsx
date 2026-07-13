import type * as React from "react";
import { AnimatedGroup } from "@/components/ui/animated-group";
import { cn } from "@/lib/utils";

const transitionVariants = {
  item: {
    hidden: {
      opacity: 0,
    },
    visible: {
      opacity: 1,
      transition: {
        type: "tween",
        ease: "easeOut",
        duration: 1.5,
      },
    },
  },
} as const;

interface SectionHeaderProps {
  title: string;
  description?: string;
  className?: string;
}

/**
 * Animated section header with title and optional description
 */
export function SectionHeader({ title, description, className }: SectionHeaderProps) {
  return (
    <AnimatedGroup
      variants={{
        container: {
          visible: {
            transition: {
              staggerChildren: 0.05,
              delayChildren: 0.1,
            },
          },
        },
        ...transitionVariants,
      }}
      className={cn(
        "relative z-10 mx-auto max-w-4xl space-y-6 text-center md:space-y-8",
        className,
      )}
    >
      <h2 className="text-balance text-4xl font-medium lg:text-5xl">{title}</h2>
      {description ? <p className="text-muted-foreground text-lg">{description}</p> : null}
    </AnimatedGroup>
  );
}

interface SectionProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  headerClassName?: string;
  /**
   * Section ID for anchor navigation
   */
  id?: string;
  /**
   * Whether to show the header. Defaults to true when title is provided.
   */
  showHeader?: boolean;
}

/**
 * Reusable section wrapper with consistent padding and optional animated header
 */
export function Section({
  title,
  description,
  children,
  className,
  headerClassName,
  id,
  showHeader = true,
}: SectionProps) {
  const hasHeader = showHeader && title;

  return (
    <section id={id} className={cn("py-16 md:py-24", className)}>
      <div className="mx-auto max-w-7xl space-y-8 px-6 md:space-y-16">
        {hasHeader ? (
          <SectionHeader title={title} description={description} className={headerClassName} />
        ) : null}
        {children}
      </div>
    </section>
  );
}
