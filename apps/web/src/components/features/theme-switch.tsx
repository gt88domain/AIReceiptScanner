import { Check, Moon, Palette, Search, Sun } from "lucide-react";
import { useState } from "react";
import { useTheme } from "@/components/providers/theme-provider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { USER_THEMES } from "@/configs/theme-config";
import type { ThemePresetKey } from "@/configs/theme-presets";
import { cn } from "@/lib/utils";

type ThemeSwitchProps = {
  onActionComplete?: () => void;
};

export function ThemeSwitch({ onActionComplete }: ThemeSwitchProps = {}) {
  const { userTheme, preset, presets, setTheme, setPreset } = useTheme();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const previewColorKeys = ["primary", "secondary", "accent", "background"] as const;
  const presetEntries = Object.entries(presets) as Array<
    [ThemePresetKey, (typeof presets)[ThemePresetKey]]
  >;

  const filteredPresets = presetEntries.filter(([_, { label }]) =>
    label.toLowerCase().includes(search.toLowerCase()),
  );

  const notifyActionComplete = () => {
    setOpen(false);
    if (!onActionComplete) return;
    window.requestAnimationFrame(() => {
      onActionComplete();
    });
  };

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button className="scale-95 rounded-full" size="icon" variant="ghost">
          <Sun className="size-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute size-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {Object.entries(USER_THEMES).map(([key, label]) => (
          <DropdownMenuItem
            key={key}
            onClick={() => {
              setTheme(key as keyof typeof USER_THEMES);
              notifyActionComplete();
            }}
          >
            {label}
            <Check className={cn("ms-auto", userTheme !== key && "hidden")} size={14} />
          </DropdownMenuItem>
        ))}

        <DropdownMenuSeparator />

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
              <Palette className="mr-2 h-4 w-4" />
              Theme: {presets[preset]?.label}
            </DropdownMenuItem>
          </SheetTrigger>
          <SheetContent side="right" className="flex flex-col">
            <SheetHeader>
              <SheetTitle>Select Theme</SheetTitle>
            </SheetHeader>
            <div className="relative px-4">
              <Search className="absolute left-6 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search themes..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            <ScrollArea className="flex-1 overflow-hidden px-4">
              <div className="space-y-1 pb-4">
                {filteredPresets.map(([key, { label, styles }]) => (
                  <Button
                    type="button"
                    variant="ghost"
                    key={key}
                    onClick={() => {
                      setPreset(key);
                      setSearch("");
                      notifyActionComplete();
                    }}
                    className={cn("flex w-full justify-start gap-3", preset === key && "bg-accent")}
                  >
                    <div className="flex gap-0.5">
                      {previewColorKeys.map((c) => (
                        <div
                          key={c}
                          className="h-4 w-4 rounded-sm border"
                          style={{ backgroundColor: styles.light[c as keyof typeof styles.light] }}
                        />
                      ))}
                    </div>
                    <span className="flex-1 text-left">{label}</span>
                    {preset === key && <Check size={14} />}
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </SheetContent>
        </Sheet>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
