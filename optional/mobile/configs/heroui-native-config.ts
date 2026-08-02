import type { HeroUINativeConfig } from "heroui-native";

export const config: HeroUINativeConfig = {
  // Global text configuration
  textProps: {
    minimumFontScale: 0.5,
    maxFontSizeMultiplier: 1.5,
    allowFontScaling: true,
    adjustsFontSizeToFit: false,
  },
  // Developer information messages configuration
  devInfo: {
    stylingPrinciples: false, // Optional: disable styling principles message
  },
  // Global toast configuration
  toast: {
    defaultProps: {
      variant: "default",
      placement: "top",
    },
    maxVisibleToasts: 3,
  },
};
