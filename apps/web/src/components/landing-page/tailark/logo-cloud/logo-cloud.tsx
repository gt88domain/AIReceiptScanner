import { AnimatedGroup } from "@/components/ui/animated-group";
import { Card, CardContent } from "@/components/ui/card";
import { Section } from "../section/section";

type Logos = {
  image: string;
  alt: string;
};

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

const logos = [
  {
    image: "https://cdn.shadcnstudio.com/ss-assets/brand-logo/amazon-logo-bw.png",
    alt: "Amazon",
  },
  {
    image: "https://cdn.shadcnstudio.com/ss-assets/brand-logo/hubspot-logo-bw.png",
    alt: "HubSpot",
  },
  {
    image: "https://cdn.shadcnstudio.com/ss-assets/brand-logo/walmart-logo-bw.png",
    alt: "Walmart",
  },
  {
    image: "https://cdn.shadcnstudio.com/ss-assets/brand-logo/microsoft-logo-bw.png",
    alt: "Microsoft",
  },
  {
    image: "https://cdn.shadcnstudio.com/ss-assets/brand-logo/evernote-icon-bw.png",
    alt: "Evernote",
  },
  {
    image: "https://cdn.shadcnstudio.com/ss-assets/brand-logo/paypal-logo-bw.png",
    alt: "PayPal",
  },
  {
    image: "https://cdn.shadcnstudio.com/ss-assets/brand-logo/airbnb-logo-bw.png",
    alt: "Airbnb",
  },
  {
    image: "https://cdn.shadcnstudio.com/ss-assets/brand-logo/adobe-logo-bw.png",
    alt: "Adobe",
  },
  {
    image: "https://cdn.shadcnstudio.com/ss-assets/brand-logo/shopify-logo-bw.png",
    alt: "Shopify",
  },
  {
    image: "https://cdn.shadcnstudio.com/ss-assets/brand-logo/huawei-logo-bw.png",
    alt: "Huawei",
  },
];

const LogoCloud = ({ logos }: { logos: Logos[] }) => {
  return (
    <Section
      title="A thriving community of businesses driving innovation"
      description="Proudly partnering with top brands to drive success."
    >
      <AnimatedGroup
        variants={{
          container: {
            visible: {
              transition: {
                staggerChildren: 0.05,
                delayChildren: 0.3,
              },
            },
          },
          ...transitionVariants,
        }}
      >
        <Card className="py-14 shadow-lg">
          <CardContent className="px-14">
            <div className="flex flex-wrap items-center justify-center gap-x-16 gap-y-8 max-sm:flex-col">
              {logos.map((logo, index) => (
                <img key={index} src={logo.image} alt={logo.alt} className="h-7" />
              ))}
            </div>
          </CardContent>
        </Card>
      </AnimatedGroup>
    </Section>
  );
};

export const LogoCloudPage = () => {
  return <LogoCloud logos={logos} />;
};
