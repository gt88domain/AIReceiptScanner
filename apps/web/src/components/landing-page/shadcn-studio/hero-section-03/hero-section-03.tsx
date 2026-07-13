import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Marquee } from "@/components/ui/marquee";
import { MotionPreset } from "@/components/ui/motion-preset";
import { Rating } from "@/components/ui/rating";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export type AvatarItem = {
  src: string;
  name: string;
  fallback: string;
};

const hero03Avatars: AvatarItem[] = [
  {
    src: "https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-3.png",
    fallback: "OS",
    name: "Olivia Sparks",
  },
  {
    src: "https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-6.png",
    fallback: "HL",
    name: "Howard Lloyd",
  },
  {
    src: "https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-5.png",
    fallback: "HR",
    name: "Hallie Richards",
  },
  {
    src: "https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-16.png",
    fallback: "JW",
    name: "Jenny Wilson",
  },
];

const HeroSection = ({ avatars }: { avatars?: AvatarItem[] }) => {
  if (!avatars) {
    avatars = hero03Avatars;
  }

  return (
    <section className="from-primary/20 to-background flex min-h-screen flex-1 flex-col bg-linear-to-bl to-50%">
      <div className="mx-auto grid w-full max-w-7xl flex-1 gap-19 px-4 sm:px-6 lg:grid-cols-2 lg:px-8 py-24">
        {/* Left Content */}
        <div className="flex max-w-2xl flex-col justify-center gap-10">
          <div className="flex flex-col items-start gap-8">
            <MotionPreset
              fade
              slide
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="bg-muted flex items-center gap-2.5 rounded-full border px-3 py-2"
            >
              <Badge>AI-Powered</Badge>
              <span className="text-muted-foreground">Solution for client-facing businesses</span>
            </MotionPreset>

            <MotionPreset
              component="h1"
              fade
              slide
              delay={0.3}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="text-3xl leading-[1.29167] font-bold text-balance sm:text-4xl lg:text-5xl"
            >
              Transforming Client Engagement in Professional Services
            </MotionPreset>

            <MotionPreset
              component="p"
              fade
              slide
              delay={0.6}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="text-muted-foreground"
            >
              In today&apos;s fast-paced business landscape, effective client engagement is vital
              for success in professional services. Our innovative approach redefines how
              professionals connect with their clients.
            </MotionPreset>

            <MotionPreset
              fade
              slide
              delay={0.9}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="flex flex-wrap items-center gap-4"
            >
              <Button size="lg" asChild>
                <a href="#">Get Started for Free</a>
              </Button>
              <Button size="lg" asChild className="bg-primary/10 hover:bg-primary/20 text-primary">
                <a href="#">Live Demo</a>
              </Button>
            </MotionPreset>
          </div>

          <hr className="border-dashed" />

          <MotionPreset
            fade
            slide
            delay={1.5}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="flex items-center gap-3"
          >
            {/* Avatar Group */}
            <div className="flex -space-x-4">
              {avatars.map((avatar, index) => (
                <Tooltip key={index}>
                  <TooltipTrigger asChild>
                    <Avatar className="ring-background size-12 ring-2 transition-all duration-300 ease-in-out hover:z-1 hover:-translate-y-1 hover:shadow-md">
                      <AvatarImage src={avatar.src} alt={avatar.name} />
                      <AvatarFallback className="text-xs">{avatar.fallback}</AvatarFallback>
                    </Avatar>
                  </TooltipTrigger>
                  <TooltipContent>{avatar.name}</TooltipContent>
                </Tooltip>
              ))}

              <Tooltip>
                <TooltipTrigger asChild>
                  <Avatar className="ring-background size-12 ring-2 transition-all duration-300 ease-in-out hover:z-1 hover:-translate-y-1 hover:shadow-md">
                    <AvatarFallback className="text-xs">+39k</AvatarFallback>
                  </Avatar>
                </TooltipTrigger>
                <TooltipContent>39k more</TooltipContent>
              </Tooltip>
            </div>

            <div className="space-y-1">
              {/* Ratings */}
              <div className="flex gap-0.5">
                <Rating readOnly variant="yellow" size={24} value={4.5} precision={0.5} />
              </div>

              <span className="text-sm">From 4000+ Reviews</span>
            </div>
          </MotionPreset>
        </div>

        {/* Right Content */}
        <MotionPreset
          fade
          blur
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="grid grid-cols-2 max-lg:hidden"
        >
          <Marquee
            vertical
            pauseOnHover
            duration={20}
            gap={1.5}
            className="h-screen min-h-182 overflow-hidden"
          >
            <img
              src="https://cdn.shadcnstudio.com/ss-assets/blocks/marketing/hero/image-11.png"
              alt="Sales Growth"
              className="dark:invert"
            />
            <img
              src="https://cdn.shadcnstudio.com/ss-assets/blocks/marketing/hero/image-10.png"
              alt="Statistics"
              className="dark:invert"
            />
            <img
              src="https://cdn.shadcnstudio.com/ss-assets/blocks/marketing/hero/image-2.png"
              alt="Total Profit"
              className="dark:invert"
            />
            <img
              src="https://cdn.shadcnstudio.com/ss-assets/blocks/marketing/hero/image-8.png"
              alt="Profit"
              className="dark:invert"
            />
          </Marquee>

          <Marquee
            vertical
            pauseOnHover
            duration={22}
            gap={1.5}
            reverse
            className="h-screen min-h-182 overflow-hidden"
          >
            <img
              src="https://cdn.shadcnstudio.com/ss-assets/blocks/marketing/hero/image-6.png"
              alt="Order"
              className="dark:invert"
            />
            <img
              src="https://cdn.shadcnstudio.com/ss-assets/blocks/marketing/hero/image-5.png"
              alt="Total Revenue"
              className="dark:invert"
            />
            <img
              src="https://cdn.shadcnstudio.com/ss-assets/blocks/marketing/hero/image-4.png"
              alt="Impression"
              className="dark:invert"
            />
            <img
              src="https://cdn.shadcnstudio.com/ss-assets/blocks/marketing/hero/image-3.png"
              alt="Total Income"
              className="dark:invert"
            />
            <img
              src="https://cdn.shadcnstudio.com/ss-assets/blocks/marketing/hero/image-7.png"
              alt="Total Sales"
              className="dark:invert"
            />
          </Marquee>
        </MotionPreset>
      </div>
    </section>
  );
};

export default HeroSection;
