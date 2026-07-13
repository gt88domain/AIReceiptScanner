import { useEffect, useState } from "react";
import type { Navigation } from "@/components/shadcn-studio/components/hero-navigation-02";

import {
  HeroNavigation02,
  HeroNavigation02SmallScreen,
} from "@/components/shadcn-studio/components/hero-navigation-02";
import Logo from "@/components/shadcn-studio/logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type HeaderProps = {
  navigationData: Navigation[];
  className?: string;
};

const Header = ({ navigationData, className }: HeaderProps) => {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0);
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 h-16 w-full border-b transition-all duration-300",
        {
          "before:bg-card/75 before:absolute before:inset-0 before:-z-1 before:size-full before:backdrop-blur":
            isScrolled,
        },
        className,
      )}
    >
      <div className="mx-auto flex h-full max-w-7xl items-center justify-between gap-6 px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <a href="#">
          <Logo className="gap-3" />
        </a>

        {/* Navigation */}
        <HeroNavigation02 navigationData={navigationData} className="max-lg:hidden" />

        {/* Login Button */}

        <Button className="rounded-full max-lg:hidden" asChild>
          <a href="#">Login</a>
        </Button>

        {/* Navigation for small screens */}
        <div className="flex gap-4 lg:hidden">
          <Button className="rounded-full" asChild>
            <a href="#">Login</a>
          </Button>

          <HeroNavigation02SmallScreen navigationData={navigationData} logoName={"shadcn/studio"} />
        </div>
      </div>
    </header>
  );
};

export default Header;
