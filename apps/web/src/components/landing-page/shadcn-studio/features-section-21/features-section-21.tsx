import {
  ArrowUpRightIcon,
  FramerIcon,
  LaptopIcon,
  MessageSquareMoreIcon,
  PaletteIcon,
  PenToolIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import BlurText from "@/components/ui/blur-text";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CraftButton, CraftButtonIcon, CraftButtonLabel } from "@/components/ui/craft-button";
import { Marquee } from "@/components/ui/marquee";
import { MotionPreset } from "@/components/ui/motion-preset";
import { Separator } from "@/components/ui/separator";
import type { ImageCard } from "./image-stack";
import ImageStack from "./image-stack";

const _uiImages = [
  {
    id: "1",
    img: "https://cdn.shadcnstudio.com/ss-assets/template/landing-page/craft/image-04.png",
    alt: "Image 1",
  },
  {
    id: "2",
    img: "https://cdn.shadcnstudio.com/ss-assets/template/landing-page/craft/image-05.png",
    alt: "Image 2",
  },
  {
    id: "3",
    img: "https://cdn.shadcnstudio.com/ss-assets/template/landing-page/craft/image-06.png",
    alt: "Image 3",
  },
];

const _framerImages = [
  {
    id: "1",
    img: "https://cdn.shadcnstudio.com/ss-assets/template/landing-page/craft/image-01.png",
    alt: "Modern UI Design",
  },
  {
    id: "2",
    img: "https://cdn.shadcnstudio.com/ss-assets/template/landing-page/craft/image-02.png",
    alt: "Creative Illustrations",
  },
  {
    id: "3",
    img: "https://cdn.shadcnstudio.com/ss-assets/template/landing-page/craft/image-03.png",
    alt: "Responsive Layouts",
  },
];

const _skills = [
  "Figma",
  "UI Design",
  "UX Design",
  "Canva",
  "Blender",
  "Photoshop",
  "Research",
  "Graphics",
  "Copywriting",
];

const Features = ({
  uiImages,
  skills,
  framerImages,
}: {
  uiImages?: ImageCard[];
  framerImages?: ImageCard[];
  skills?: string[];
}) => {
  if (!uiImages) {
    uiImages = _uiImages;
  }
  if (!skills) {
    skills = _skills;
  }

  if (!framerImages) {
    framerImages = _framerImages;
  }

  return (
    <section className="py-8 sm:py-16">
      <div className="mx-auto max-w-6xl space-y-8 px-4 sm:space-y-16 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="space-y-2.5">
          <MotionPreset
            fade
            blur
            slide={{ direction: "down", offset: 50 }}
            transition={{ duration: 0.5 }}
          >
            <Badge variant="outline" className="rounded-none">
              Services
            </Badge>
          </MotionPreset>
          <div className="flex justify-between gap-4 max-md:flex-col">
            <MotionPreset delay={0.3} transition={{ duration: 0.5 }} className="max-w-100">
              <h2 className="text-2xl font-semibold sm:text-3xl lg:text-4xl">
                <BlurText
                  text="Design services that make an impact. 🎨"
                  delay={50}
                  animateBy="words"
                  direction="bottom"
                />
              </h2>
            </MotionPreset>
            <MotionPreset
              delay={0.3}
              fade
              blur
              slide={{ direction: "down", offset: 50 }}
              transition={{ duration: 0.5 }}
            >
              <p className="text-muted-foreground max-w-xl text-lg">
                Whether you need a complete brand identity or a conversion-focused website, I create
                designs that deliver. With a keen eye for detail, I ensure every element serves both
                form and function.
              </p>
            </MotionPreset>
          </div>
        </div>

        <MotionPreset delay={0.45} fade blur transition={{ duration: 0.6 }}>
          <Separator />
        </MotionPreset>

        {/* Grid */}
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="flex flex-col gap-6">
            {/* UI/UX Design */}
            <MotionPreset
              fade
              blur
              slide={{ offset: 50 }}
              delay={0.8}
              transition={{ duration: 0.6 }}
            >
              <Card className="bg-muted rounded-3xl border-0 shadow-none">
                <CardHeader className="gap-3">
                  <CardTitle className="flex items-center gap-2.5 text-xl">
                    <PaletteIcon className="size-5" />
                    <span>UI/UX Design</span>
                  </CardTitle>
                  <CardDescription className="text-lg">
                    I craft intuitive UIs and seamless UXs that solve real problems and deliver
                    results with a user-centric approach.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ImageStack images={uiImages} />
                </CardContent>
              </Card>
            </MotionPreset>

            {/* Web Design */}
            <MotionPreset
              fade
              blur
              slide={{ offset: 50 }}
              delay={1.2}
              transition={{ duration: 0.6 }}
            >
              <Card className="rounded-3xl shadow-none">
                <CardHeader className="gap-3">
                  <CardTitle className="flex items-center gap-2.5 text-xl">
                    <LaptopIcon className="size-5" />
                    <span>Web Design</span>
                  </CardTitle>
                  <CardDescription className="text-lg">
                    I craft modern, responsive web designs that tell your brand&apos;s story.
                    Optimized for performance, usability, and seamless navigation.
                  </CardDescription>
                </CardHeader>
              </Card>
            </MotionPreset>
          </div>

          <div className="flex flex-col gap-6">
            {/* Logo Design */}
            <MotionPreset
              fade
              blur
              delay={0.6}
              slide={{ direction: "right", offset: 50 }}
              transition={{ duration: 0.6 }}
            >
              <Card className="rounded-3xl shadow-none">
                <CardHeader className="gap-3">
                  <CardTitle className="flex items-center gap-2.5 text-xl">
                    <PenToolIcon className="size-5" />
                    <span>Logo Design</span>
                  </CardTitle>
                  <CardDescription className="text-lg">
                    Crafting distinctive, scalable, and impactful logos that embody your
                    brand&apos;s identity and vision.
                  </CardDescription>
                </CardHeader>
              </Card>
            </MotionPreset>

            {/* Framer Design */}
            <MotionPreset
              fade
              blur
              slide={{ direction: "right", offset: 50 }}
              delay={1}
              transition={{ duration: 0.6 }}
              className="flex-1"
            >
              <Card className="bg-muted h-full rounded-3xl border-0 shadow-none">
                <CardHeader className="gap-3">
                  <CardTitle className="flex items-center gap-2.5 text-xl">
                    <FramerIcon className="size-5" />
                    <span>Framer Design</span>
                  </CardTitle>
                  <CardDescription className="text-lg">
                    I create high-quality designs using Framer that are interactive and engaging.
                    Bringing ideas to life with smooth animations .
                  </CardDescription>
                </CardHeader>
                <Marquee pauseOnHover duration={20} gap={1} className="flex-1 items-center py-0">
                  {framerImages.map((image, index) => (
                    <img
                      key={index}
                      src={image.img}
                      alt={image.alt}
                      className="h-60 w-full max-w-73 rounded-md"
                    />
                  ))}
                </Marquee>
              </Card>
            </MotionPreset>
          </div>
        </div>

        {/* Skills */}
        <MotionPreset
          className="relative"
          fade
          blur
          slide={{ direction: "down", offset: 50 }}
          delay={1.35}
          transition={{ duration: 0.6 }}
        >
          <div className="from-background pointer-events-none absolute inset-y-0 left-0 z-1 w-35 bg-linear-to-r to-transparent max-sm:hidden" />
          <div className="from-background pointer-events-none absolute inset-y-0 right-0 z-1 w-35 bg-linear-to-l to-transparent max-sm:hidden" />
          <div className="w-full overflow-hidden">
            <Marquee pauseOnHover duration={30} gap={1}>
              {skills.map((skill, index) => (
                <Badge variant="outline" key={index} className="px-4 py-1 text-sm">
                  {skill}
                </Badge>
              ))}
            </Marquee>
          </div>
          <div className="w-full overflow-hidden">
            <Marquee pauseOnHover duration={30} gap={1} reverse>
              {skills.map((skill, index) => (
                <Badge variant="outline" key={index} className="px-4 py-1 text-sm">
                  {skill}
                </Badge>
              ))}
            </Marquee>
          </div>
        </MotionPreset>

        <MotionPreset delay={1.5} fade blur transition={{ duration: 0.6 }}>
          <Separator />
        </MotionPreset>

        {/* Action Button */}
        <MotionPreset
          className="flex items-center justify-center gap-4"
          fade
          blur
          slide={{ direction: "down", offset: 50 }}
          delay={1.65}
          transition={{ duration: 0.6 }}
        >
          <CraftButton asChild>
            <a href="#">
              <CraftButtonLabel>Hire me</CraftButtonLabel>
              <CraftButtonIcon>
                <ArrowUpRightIcon className="size-3 stroke-2 transition-transform duration-500 group-hover:rotate-45" />
              </CraftButtonIcon>
            </a>
          </CraftButton>
          <Separator className="h-9!" orientation="vertical" />
          <Button variant="outline" className="rounded-full" asChild>
            <a href="#">
              Let&apos; talk <MessageSquareMoreIcon className="size-4" />
            </a>
          </Button>
        </MotionPreset>
      </div>
    </section>
  );
};

export default Features;
