import { MenuIcon } from "lucide-react";
import MenuDropdown from "@/components/shadcn-studio/components/menu-dropdown";
import type { NavigationSection } from "@/components/shadcn-studio/components/menu-navigation";
import MenuNavigation from "@/components/shadcn-studio/components/menu-navigation";
import Logo from "@/components/shadcn-studio/logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type HeaderProps = {
  navigationData: NavigationSection[];
  className?: string;
};

const Header = ({ navigationData, className }: HeaderProps) => {
  return (
    <header
      className={cn("bg-background fixed top-0 z-50 h-16 w-full rounded-b-xl shadow-md", className)}
    >
      <div className="mx-auto flex h-full max-w-7xl items-center justify-between gap-6 px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <a href="#">
          <Logo className="gap-3" />
        </a>

        {/* Navigation */}
        <MenuNavigation navigationData={navigationData} className="max-md:hidden" />

        {/* Theme Button */}
        <Button className="max-md:hidden" asChild>
          <a href="#">Theme</a>
        </Button>

        {/* Navigation for small screens */}
        <div className="flex gap-4 md:hidden">
          <Button asChild>
            <a href="#">Theme</a>
          </Button>

          <MenuDropdown
            align="end"
            navigationData={navigationData}
            trigger={
              <Button variant="outline" size="icon">
                <MenuIcon />
                <span className="sr-only">Menu</span>
              </Button>
            }
          />
        </div>
      </div>
    </header>
  );
};

export default Header;
