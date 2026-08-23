import { Bold, Calendar1, Ellipsis, Italic, Strikethrough, Underline } from "lucide-react";
import { AnimatedGroup } from "@/components/ui/animated-group";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import { Section } from "../section/section";

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

export function ContentSection() {
  return (
    <Section
      title="Edit anything"
      description="Effortlessly edit text, generate code snippets, format documents, create visualizations from data, and integrate with your existing workflow."
    >
      <AnimatedGroup
        variants={{
          container: {
            visible: {
              transition: {
                staggerChildren: 0.1,
                delayChildren: 0.2,
              },
            },
          },
          ...transitionVariants,
        }}
        className="border-foreground/5 space-y-6 [--color-border:color-mix(in_oklab,var(--color-foreground)10%,transparent)] sm:space-y-0 sm:divide-y"
      >
        <div className="grid sm:grid-cols-5 sm:divide-x">
          <CodeIllustration className="sm:col-span-2" />
          <div className="mt-6 sm:col-span-3 sm:mt-0 sm:border-l sm:pl-12">
            <h3 className="text-foreground text-xl font-semibold">Marketing Campaigns</h3>
            <p className="text-muted-foreground mt-4 text-lg">
              We'll put together your schedule on automatically. You'll keep app deadlines, and will
              work on the highest priority items first.
            </p>
          </div>
        </div>
        <div className="grid sm:grid-cols-5 sm:divide-x">
          <div className="pt-12 sm:col-span-3 sm:border-r sm:pr-12">
            <h3 className="text-foreground text-xl font-semibold">AI Meeting Scheduler</h3>
            <p className="text-muted-foreground mt-4 text-lg">
              Ask the chat to create or update your events. Ask it how much time you've spent on
              demo calls last week. Or have it prepare today's agendas.
            </p>
          </div>
          <div className="row-start-1 flex items-center justify-center pt-12 sm:col-span-2 sm:row-start-auto">
            <ScheduleIllustation className="pt-8" />
          </div>
        </div>
      </AnimatedGroup>
    </Section>
  );
}
type IllustrationProps = {
  className?: string;
  variant?: "elevated" | "outlined" | "mixed";
};

export const ScheduleIllustation = ({ className, variant = "elevated" }: IllustrationProps) => {
  return (
    <div className={cn("relative", className)}>
      <div
        className={cn(
          "bg-background -translate-x-1/8 absolute flex -translate-y-[110%] items-center gap-2 rounded-lg p-1",
          {
            "shadow-black-950/10 shadow-lg": variant === "elevated",
            "border-foreground/10 border": variant === "outlined",
            "border-foreground/10 border shadow-md shadow-black/5": variant === "mixed",
          },
        )}
      >
        <Button size="sm" className="rounded-sm">
          <Calendar1 className="size-3" />
          <span className="text-sm font-medium">Schedule</span>
        </Button>
        <span className="bg-border block h-4 w-px" />
        <ToggleGroup type="multiple" size="sm" className="gap-0.5 *:rounded-md">
          <ToggleGroupItem value="bold" aria-label="Toggle bold">
            <Bold className="size-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="italic" aria-label="Toggle italic">
            <Italic className="size-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="underline" aria-label="Toggle underline">
            <Underline className="size-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="strikethrough" aria-label="Toggle strikethrough">
            <Strikethrough className="size-4" />
          </ToggleGroupItem>
        </ToggleGroup>
        <span className="bg-border block h-4 w-px" />
        <Button size="icon" className="size-8" variant="ghost">
          <Ellipsis className="size-3" />
        </Button>
      </div>
      <span>
        <span className="bg-secondary text-secondary-foreground py-1">Tomorrow 8:30 pm</span> is our
        priority.
      </span>
    </div>
  );
};

export const CodeIllustration = ({ className }: { className?: string }) => {
  return (
    <div
      className={cn(
        "mask-[radial-gradient(ellipse_50%_50%_at_50%_50%,#000_50%,transparent_100%)]",
        className,
      )}
    >
      <ul className="text-muted-foreground mx-auto w-fit font-mono text-2xl font-medium">
        {["Images", "Variables", "Pages", "Components", "Styles"].map((item, index) => (
          <li
            key={index}
            className={cn(
              index === 2 &&
                "text-foreground before:absolute before:-translate-x-[110%] before:text-orange-500 before:content-['Import']",
            )}
          >
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
};
