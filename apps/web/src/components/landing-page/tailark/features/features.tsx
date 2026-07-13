import { Cpu, Fingerprint, Pencil, Settings2, Sparkles, Zap } from "lucide-react";
import { AnimatedGroup } from "@/components/ui/animated-group";
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

export function Features() {
  return (
    <Section
      id="features"
      title="The foundation for creative teams management"
      description="Lyra is evolving to be more than just the models. It supports an entire to the APIs and platforms helping developers and businesses innovate."
    >
      <AnimatedGroup
        variants={{
          container: {
            visible: {
              transition: {
                staggerChildren: 0.08,
                delayChildren: 0.2,
              },
            },
          },
          ...transitionVariants,
        }}
        className="relative mx-auto grid max-w-4xl divide-x divide-y border *:p-12 sm:grid-cols-2 lg:grid-cols-3"
      >
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Zap className="size-4" />
            <h3 className="text-sm font-medium">Faaast</h3>
          </div>
          <p className="text-sm">It supports an entire helping developers and innovate.</p>
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Cpu className="size-4" />
            <h3 className="text-sm font-medium">Powerful</h3>
          </div>
          <p className="text-sm">It supports an entire helping developers and businesses.</p>
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Fingerprint className="size-4" />

            <h3 className="text-sm font-medium">Security</h3>
          </div>
          <p className="text-sm">It supports an helping developers businesses.</p>
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Pencil className="size-4" />

            <h3 className="text-sm font-medium">Customization</h3>
          </div>
          <p className="text-sm">It supports helping developers and businesses innovate.</p>
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Settings2 className="size-4" />

            <h3 className="text-sm font-medium">Control</h3>
          </div>
          <p className="text-sm">It supports helping developers and businesses innovate.</p>
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4" />

            <h3 className="text-sm font-medium">Built for AI</h3>
          </div>
          <p className="text-sm">It supports helping developers and businesses innovate.</p>
        </div>
      </AnimatedGroup>
    </Section>
  );
}
