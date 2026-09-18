import { cn } from "@/lib/utils";
import { forwardRef } from "react";
import { Text as RNText, type TextProps as RNTextProps } from "react-native";

export type TextProps = RNTextProps & {
  className?: string;
};

export const Text = forwardRef<RNText, TextProps>(function Text({ className, ...props }, ref) {
  return <RNText ref={ref} className={cn("text-foreground text-lg", className)} {...props} />;
});
