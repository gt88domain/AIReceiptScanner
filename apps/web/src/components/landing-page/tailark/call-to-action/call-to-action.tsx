import { Link } from "@tanstack/react-router";
import { AnimatedGroup } from "@/components/ui/animated-group";
import { Button } from "@/components/ui/button";
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

export const CallToAction = () => {
  return (
    <Section showHeader={false}>
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
        className="space-y-6 text-center"
      >
        <h2 className="text-foreground text-balance text-3xl font-semibold lg:text-4xl">
          Build 10x Faster with Mist
        </h2>
        <div className="flex justify-center gap-3">
          <Button asChild size="lg">
            <Link to="/">Get Started</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link to="/">Get a Demo</Link>
          </Button>
        </div>
      </AnimatedGroup>
    </Section>
  );
};
