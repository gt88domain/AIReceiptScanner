import { useNavigate } from "@tanstack/react-router";
import { ArrowRight, ChevronRight } from "lucide-react";
import React from "react";
import { useSearch } from "@/components/providers/search-provider";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { ScrollArea } from "@/components/ui/scroll-area";
import { sidebarData } from "@/configs/data/sidebar-data";
import { useTranslations } from "@/i18n";

export function CommandMenu() {
  const navigate = useNavigate();
  const { open, setOpen } = useSearch();
  const t = useTranslations();

  const runCommand = React.useCallback(
    (command: () => unknown) => {
      setOpen(false);
      command();
    },
    [setOpen],
  );

  return (
    <CommandDialog modal onOpenChange={setOpen} open={open}>
      <CommandInput placeholder={t("common.searchPlaceholder")} />
      <CommandList>
        <ScrollArea className="h-72 pe-1" type="hover">
          <CommandEmpty>{t("common.noResults")}</CommandEmpty>
          {sidebarData.navGroups.map((group) => (
            <CommandGroup heading={t(group.title)} key={group.title}>
              {group.items.map((navItem, i) => {
                if (navItem.url) {
                  return (
                    <CommandItem
                      key={`${navItem.url}-${i}`}
                      onSelect={() => {
                        runCommand(() => navigate({ to: navItem.url }));
                      }}
                      value={t(navItem.title)}
                    >
                      <div className="flex size-4 items-center justify-center">
                        <ArrowRight className="size-2 text-muted-foreground/80" />
                      </div>
                      {t(navItem.title)}
                    </CommandItem>
                  );
                }

                return navItem.items?.map((subItem, i) => (
                  <CommandItem
                    key={`${navItem.title}-${subItem.url}-${i}`}
                    onSelect={() => {
                      runCommand(() => navigate({ to: subItem.url }));
                    }}
                    value={`${t(navItem.title)} ${t(subItem.title)}`}
                  >
                    <div className="flex size-4 items-center justify-center">
                      <ArrowRight className="size-2 text-muted-foreground/80" />
                    </div>
                    {t(navItem.title)} <ChevronRight /> {t(subItem.title)}
                  </CommandItem>
                ));
              })}
            </CommandGroup>
          ))}
        </ScrollArea>
      </CommandList>
    </CommandDialog>
  );
}
