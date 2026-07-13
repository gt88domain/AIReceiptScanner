import { LayoutTemplate, RotateCcw } from "lucide-react";
import { useMemo } from "react";
import { useLandingPageComposer } from "@/components/providers/landing-page-composer-provider";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { LandingPageComponentKey } from "@/configs/landing-page-component/landing-page-component-config";

type LandingPageComposerProps = {
  onActionComplete?: () => void;
};

const formatTypeLabel = (type: string) =>
  type
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

export function LandingPageComposer({ onActionComplete }: LandingPageComposerProps = {}) {
  const { components, selectedComponents, toggleComponent, resetComponents } =
    useLandingPageComposer();

  const groupedComponents = useMemo(() => {
    const groups = new Map<string, Array<{ key: LandingPageComponentKey; label: string }>>();

    for (const [key, meta] of Object.entries(components) as Array<
      [LandingPageComponentKey, (typeof components)[LandingPageComponentKey]]
    >) {
      if (!groups.has(meta.type)) {
        groups.set(meta.type, []);
      }
      groups.get(meta.type)?.push({ key, label: meta.label });
    }

    return Array.from(groups.entries());
  }, [components]);

  const completeAction = () => {
    if (!onActionComplete) return;
    window.requestAnimationFrame(() => {
      onActionComplete();
    });
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon">
          <LayoutTemplate className="size-5" />
          <span className="sr-only">Customize landing page components</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[88vw] px-0 sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Landing Page Composer</SheetTitle>
          <SheetDescription>
            Select and combine sections to preview different landing page layouts.
          </SheetDescription>
        </SheetHeader>
        <div className="flex min-h-0 flex-1 flex-col gap-4 px-4 pb-4">
          <p className="text-muted-foreground text-xs">
            {selectedComponents.length} sections selected
          </p>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-2">
            {groupedComponents.map(([type, groupItems]) => (
              <div key={type} className="space-y-2">
                <h3 className="text-sm font-semibold">{formatTypeLabel(type)}</h3>
                <div className="space-y-1">
                  {groupItems.map((item) => (
                    <label
                      key={item.key}
                      htmlFor={item.key}
                      className="hover:bg-muted/50 flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2"
                    >
                      <Checkbox
                        id={item.key}
                        checked={selectedComponents.includes(item.key)}
                        onCheckedChange={() => toggleComponent(item.key)}
                      />
                      <span className="text-sm">{item.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => {
                resetComponents();
                completeAction();
              }}
            >
              <RotateCcw className="size-4" />
              Reset
            </Button>
            <SheetClose asChild>
              <Button type="button" className="flex-1" onClick={completeAction}>
                Done
              </Button>
            </SheetClose>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
