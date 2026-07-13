import type * as React from "react";
import { GiGemini, GiMagicPotion } from "react-icons/gi";
import { SiCloudflare, SiMockserviceworker, SiReplit, SiVercel } from "react-icons/si";
import { AnimatedGroup } from "@/components/ui/animated-group";
import { Card } from "@/components/ui/card";
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

export function Integrations() {
  return (
    <Section
      id="integrations"
      title="Integrate with your favorite tools"
      description="Connect seamlessly with popular platforms and services to enhance your workflow."
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
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        <IntegrationCard
          title="Google Gemini"
          description="Amet praesentium deserunt ex commodi tempore fuga voluptatem. Sit, sapiente."
        >
          <GiGemini />
        </IntegrationCard>

        <IntegrationCard
          title="Replit"
          description="Amet praesentium deserunt ex commodi tempore fuga voluptatem. Sit, sapiente."
        >
          <SiCloudflare />
        </IntegrationCard>

        <IntegrationCard
          title="GiMagicPotion"
          description="Amet praesentium deserunt ex commodi tempore fuga voluptatem. Sit, sapiente."
        >
          <GiMagicPotion />
        </IntegrationCard>

        <IntegrationCard
          title="Vercel"
          description="Amet praesentium deserunt ex commodi tempore fuga voluptatem. Sit, sapiente."
        >
          <SiVercel />
        </IntegrationCard>

        <IntegrationCard
          title="SiMockserviceworker"
          description="Amet praesentium deserunt ex commodi tempore fuga voluptatem. Sit, sapiente."
        >
          <SiMockserviceworker />
        </IntegrationCard>

        <IntegrationCard
          title="SiReplit"
          description="Amet praesentium deserunt ex commodi tempore fuga voluptatem. Sit, sapiente."
        >
          <SiReplit />
        </IntegrationCard>
      </AnimatedGroup>
    </Section>
  );
}

const IntegrationCard = ({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  link?: string;
}) => {
  return (
    <Card className="p-6">
      <div className="relative">
        <div className="*:size-10">{children}</div>

        <div className="mt-6 space-y-1.5">
          <h3 className="text-lg font-semibold">{title}</h3>
          <p className="text-muted-foreground line-clamp-2">{description}</p>
        </div>
      </div>
    </Card>
  );
};
