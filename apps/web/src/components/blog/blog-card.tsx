import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

interface BlogCardProps {
  slug: string;
  title: string;
  description?: string;
  date: string;
  thumbnail?: string;
  categories: string[];
  authorName?: string;
  showRightBorder?: boolean;
}

export function BlogCard({
  slug,
  title,
  description,
  date,
  thumbnail,
  categories,
  authorName,
  showRightBorder = true,
}: BlogCardProps) {
  return (
    <Link
      to="/blog/$slug"
      params={{ slug }}
      className={cn(
        "group relative block before:absolute before:-left-0.5 before:top-0 before:z-10 before:h-screen before:w-px before:bg-border before:content-[''] after:absolute after:-top-0.5 after:left-0 after:z-0 after:h-px after:w-screen after:bg-border after:content-['']",
        showRightBorder ? "md:border-r border-border border-b-0" : "",
      )}
    >
      <div className="flex h-full flex-col">
        {thumbnail ? (
          <div className="relative h-48 w-full overflow-hidden">
            <img
              src={thumbnail}
              alt={title}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          </div>
        ) : null}
        <div className="flex flex-1 flex-col gap-2 p-6">
          {categories.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <span
                  className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                  key={category}
                >
                  {category}
                </span>
              ))}
            </div>
          ) : null}
          <h3 className="text-xl font-semibold text-card-foreground group-hover:underline underline-offset-4">
            {title}
          </h3>
          {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
          <div className="mt-auto flex items-center justify-between gap-3 pt-2 text-sm font-medium text-muted-foreground">
            {authorName ? <span className="truncate">{authorName}</span> : <span />}
            <time>{date}</time>
          </div>
        </div>
      </div>
    </Link>
  );
}
