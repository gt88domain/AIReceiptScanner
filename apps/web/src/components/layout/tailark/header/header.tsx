import { ClientOnly, Link } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import React from "react";
import { ThemeSwitch } from "@/components/features/theme-switch";
import { LocaleSwitcher } from "@/components/i18n";
import { BrandLogo } from "@/components/logos/brand-logo";
import { webConfig } from "@/configs/web-config";
import UserMenu from "@/components/navigation/user-menu";
import { Button } from "@/components/ui/button";
import { useTranslations } from "@/i18n";
import { cn } from "@/lib/utils";

const MENU_CLOSE_ANIMATION_MS = 220;

type MenuItem = {
  name: string;
  to?: string;
  href?: string;
  hash?: string;
};

export const Header = () => {
  const t = useTranslations("landingPage.header");
  const [menuState, setMenuState] = React.useState(false);
  const [isClosing, setIsClosing] = React.useState(false);
  const [isScrolled, setIsScrolled] = React.useState(false);
  const closeTimerRef = React.useRef<number | null>(null);
  const mobileMenuId = "marketing-mobile-menu";

  const menuItems = React.useMemo<MenuItem[]>(
    () => [
      { name: t("menu.features"), to: "/", hash: "features" },
      { name: t("menu.integrations"), to: "/", hash: "integrations" },
      { name: t("menu.pricing"), to: "/", hash: "pricing" },
      { name: t("menu.faq"), to: "/", hash: "faq" },
      ...(webConfig.blogPublic ? [{ name: t("menu.blog"), to: "/blog" }] : []),
      ...(webConfig.contactFormEnabled ? [{ name: t("menu.contact"), to: "/contact" }] : []),
      ...(webConfig.docsPublic ? [{ name: t("menu.docs"), href: "/docs" }] : []),
    ],
    [t],
  );

  const clearCloseTimer = React.useCallback(() => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const openMobileMenu = React.useCallback(() => {
    clearCloseTimer();
    setIsClosing(false);
    setMenuState(true);
  }, [clearCloseTimer]);

  const closeMobileMenu = React.useCallback(() => {
    if (!menuState && !isClosing) return;

    clearCloseTimer();
    setMenuState(false);
    setIsClosing(true);
    closeTimerRef.current = window.setTimeout(() => {
      setIsClosing(false);
      closeTimerRef.current = null;
    }, MENU_CLOSE_ANIMATION_MS);
  }, [clearCloseTimer, isClosing, menuState]);

  const toggleMobileMenu = React.useCallback(() => {
    if (menuState) {
      closeMobileMenu();
      return;
    }
    openMobileMenu();
  }, [closeMobileMenu, menuState, openMobileMenu]);

  React.useEffect(() => {
    return () => {
      clearCloseTimer();
    };
  }, [clearCloseTimer]);

  React.useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  React.useEffect(() => {
    const shouldLockScroll = menuState || isClosing;
    if (!shouldLockScroll) return;

    const html = document.documentElement;
    const body = document.body;
    const previousHtmlOverflow = html.style.overflow;
    const previousBodyOverflow = body.style.overflow;
    const previousBodyTouchAction = body.style.touchAction;

    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    body.style.touchAction = "none";

    return () => {
      html.style.overflow = previousHtmlOverflow;
      body.style.overflow = previousBodyOverflow;
      body.style.touchAction = previousBodyTouchAction;
    };
  }, [isClosing, menuState]);

  return (
    <header className="relative z-50">
      <nav data-state={menuState && "active"} className="fixed inset-x-0 z-50 px-2">
        <div
          className={cn(
            "mx-auto mt-2 max-w-7xl px-6 transition-all duration-300 lg:px-12",
            isScrolled && "bg-background/50 max-w-6xl rounded-2xl border backdrop-blur-lg lg:px-5",
          )}
        >
          <div className="relative flex flex-wrap items-center justify-between gap-6 py-3 lg:flex-nowrap lg:gap-4 lg:py-4">
            <div className="flex w-full items-center justify-between lg:w-auto lg:shrink-0">
              <Link to="/" aria-label="home" className="flex items-center">
                <BrandLogo />
              </Link>
              <Button
                onClick={toggleMobileMenu}
                aria-label={menuState === true ? t("actions.closeMenu") : t("actions.openMenu")}
                aria-controls={mobileMenuId}
                aria-expanded={menuState}
                variant="ghost"
                className="relative z-20 block cursor-pointer rounded-full border border-transparent p-2.5 lg:hidden"
              >
                <Menu className="in-data-[state=active]:rotate-180 in-data-[state=active]:scale-0 in-data-[state=active]:opacity-0 m-auto size-4 duration-200" />
                <X className="in-data-[state=active]:rotate-0 in-data-[state=active]:scale-100 in-data-[state=active]:opacity-100 absolute inset-0 m-auto size-4 -rotate-180 scale-0 opacity-0 duration-200" />
              </Button>
            </div>

            <div className="hidden min-w-0 lg:flex lg:flex-1 lg:justify-center">
              <ul className="flex gap-5 text-sm xl:gap-8">
                {menuItems.map((item, index) => (
                  <li key={index}>
                    {item.href ? (
                      <a
                        href={item.href}
                        className="text-muted-foreground hover:text-accent-foreground block duration-150"
                      >
                        <span>{item.name}</span>
                      </a>
                    ) : (
                      <Link
                        to={item.to!}
                        hash={item.hash}
                        onClick={closeMobileMenu}
                        className="text-muted-foreground hover:text-accent-foreground block duration-150"
                      >
                        <span>{item.name}</span>
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            <div
              id={mobileMenuId}
              data-state={menuState ? "active" : "inactive"}
              className="bg-background fixed top-22 left-2 right-2 z-50 flex flex-col space-y-6 rounded-[28px] border border-white/55 p-6 shadow-[0_30px_80px_-38px_rgba(30,22,16,0.45)] transition-[opacity,transform,visibility] duration-220 ease-out max-lg:origin-top max-lg:invisible max-lg:pointer-events-none max-lg:translate-y-1 max-lg:scale-[0.98] max-lg:opacity-0 max-lg:will-change-transform data-[state=active]:max-lg:visible data-[state=active]:max-lg:pointer-events-auto data-[state=active]:max-lg:translate-y-0 data-[state=active]:max-lg:scale-100 data-[state=active]:max-lg:opacity-100 lg:relative lg:top-auto lg:left-auto lg:right-auto lg:z-auto lg:m-0 lg:w-fit lg:shrink-0 lg:flex-row lg:items-center lg:gap-6 lg:space-y-0 lg:border-transparent lg:bg-transparent lg:p-0 lg:shadow-none dark:shadow-none dark:lg:bg-transparent"
            >
              <div className="lg:hidden">
                <ul className="space-y-6 text-base">
                  {menuItems.map((item, index) => (
                    <li key={index}>
                      {item.href ? (
                        <a
                          href={item.href}
                          onClick={closeMobileMenu}
                          className="text-muted-foreground hover:text-accent-foreground block duration-150"
                        >
                          <span>{item.name}</span>
                        </a>
                      ) : (
                        <Link
                          to={item.to!}
                          hash={item.hash}
                          onClick={closeMobileMenu}
                          className="text-muted-foreground hover:text-accent-foreground block duration-150"
                        >
                          <span>{item.name}</span>
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex w-full flex-col space-y-3 lg:w-fit lg:flex-row lg:gap-3 lg:space-y-0">
                <div className="flex flex-wrap gap-2 justify-start lg:space-x-4 lg:gap-0">
                  <ThemeSwitch onActionComplete={closeMobileMenu} />
                  <LocaleSwitcher onActionComplete={closeMobileMenu} />
                  <ClientOnly fallback={<div aria-hidden="true" className="h-9 w-24" />}>
                    <UserMenu onActionComplete={closeMobileMenu} />
                  </ClientOnly>
                </div>
              </div>
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
};
