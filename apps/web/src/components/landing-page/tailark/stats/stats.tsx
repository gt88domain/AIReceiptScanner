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

export function StatsSection() {
  return (
    <Section
      title="Product in numbers"
      description="Our platform continues to grow with developers and businesses using our tools to create innovative solutions and enhance productivity."
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
        className="grid grid-cols-2 gap-4 md:grid-cols-4"
      >
        <div>
          <div className="text-foreground text-4xl font-bold">90+</div>
          <p className="text-muted-foreground">Integrations</p>
        </div>
        <div>
          <div className="text-foreground text-4xl font-bold">56%</div>
          <p className="text-muted-foreground">Productivity Boost</p>
        </div>
        <div>
          <div className="text-foreground text-4xl font-bold">24/7</div>
          <p className="text-muted-foreground">Customer Support</p>
        </div>
        <div>
          <div className="text-foreground text-4xl font-bold">10k+</div>
          <p className="text-muted-foreground">Active Users</p>
        </div>
      </AnimatedGroup>
    </Section>
  );
}
