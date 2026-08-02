import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";
import { Pressable, View } from "react-native";

interface PressableCardProps extends ComponentProps<typeof View> {
  className?: string;
}

interface PressableCardItemProps extends ComponentProps<typeof Pressable> {
  activeClassName?: string;
  borderBottom?: boolean;
  className?: string;
}

export function PressableCard({ children, className, ...props }: PressableCardProps) {
  return (
    <View
      {...props}
      className={cn("overflow-hidden rounded-xl border border-border bg-surface", className)}
    >
      {children}
    </View>
  );
}

export function PressableCardItem({
  children,
  className,
  borderBottom = false,
  activeClassName = "active:bg-surface-secondary",
  ...props
}: PressableCardItemProps) {
  return (
    <Pressable
      {...props}
      className={cn(
        "flex-row items-center px-4 py-4",
        borderBottom ? "border-b border-border" : "",
        activeClassName,
        className,
      )}
    >
      {children}
    </Pressable>
  );
}
