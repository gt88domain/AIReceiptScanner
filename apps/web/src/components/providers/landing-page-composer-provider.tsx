import { createClientOnlyFn } from "@tanstack/react-start";
import {
  createContext,
  type ReactNode,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  LANDING_PAGE_COMPONENTS,
  LANDING_PAGE_COMPOSER_CONFIG,
  type LandingPageComponentKey,
  LandingPageComponentsSchema,
} from "@/configs/landing-page-component/landing-page-component-config";

const getStoredLandingPageComponents = createClientOnlyFn((): LandingPageComponentKey[] => {
  const stored = localStorage.getItem(LANDING_PAGE_COMPOSER_CONFIG.storageKey);
  if (stored) {
    try {
      return LandingPageComponentsSchema.parse(JSON.parse(stored));
    } catch {
      return [...LANDING_PAGE_COMPOSER_CONFIG.defaultComponents];
    }
  }
  return [...LANDING_PAGE_COMPOSER_CONFIG.defaultComponents];
});

const setStoredLandingPageComponents = createClientOnlyFn(
  (components: LandingPageComponentKey[]) => {
    localStorage.setItem(LANDING_PAGE_COMPOSER_CONFIG.storageKey, JSON.stringify(components));
  },
);

type LandingPageComposerContextProps = {
  selectedComponents: LandingPageComponentKey[];
  components: typeof LANDING_PAGE_COMPONENTS;
  setSelectedComponents: (components: LandingPageComponentKey[]) => void;
  toggleComponent: (component: LandingPageComponentKey) => void;
  resetComponents: () => void;
};

const LandingPageComposerContext = createContext<LandingPageComposerContextProps | undefined>(
  undefined,
);

export function LandingPageComposerProvider({ children }: { children: ReactNode }) {
  const [selectedComponents, setSelectedComponentsState] = useState<LandingPageComponentKey[]>([
    ...LANDING_PAGE_COMPOSER_CONFIG.defaultComponents,
  ]);

  useEffect(() => {
    setSelectedComponentsState(getStoredLandingPageComponents());
  }, []);

  const setSelectedComponents = useCallback((nextComponents: LandingPageComponentKey[]) => {
    const validatedComponents = LandingPageComponentsSchema.parse(nextComponents);
    setSelectedComponentsState(validatedComponents);
    setStoredLandingPageComponents(validatedComponents);
  }, []);

  const toggleComponent = useCallback(
    (component: LandingPageComponentKey) => {
      const targetType = LANDING_PAGE_COMPONENTS[component].type;
      setSelectedComponents(
        selectedComponents.includes(component)
          ? selectedComponents.filter((key) => key !== component)
          : [
              ...selectedComponents.filter(
                (key) => LANDING_PAGE_COMPONENTS[key].type !== targetType,
              ),
              component,
            ],
      );
    },
    [selectedComponents, setSelectedComponents],
  );

  const resetComponents = useCallback(() => {
    setSelectedComponents([...LANDING_PAGE_COMPOSER_CONFIG.defaultComponents]);
  }, [setSelectedComponents]);

  const value = useMemo(
    () => ({
      selectedComponents,
      components: LANDING_PAGE_COMPONENTS,
      setSelectedComponents,
      toggleComponent,
      resetComponents,
    }),
    [selectedComponents, setSelectedComponents, toggleComponent, resetComponents],
  );

  return (
    <LandingPageComposerContext.Provider value={value}>
      {children}
    </LandingPageComposerContext.Provider>
  );
}

export const useLandingPageComposer = () => {
  const context = use(LandingPageComposerContext);
  if (!context) {
    throw new Error("useLandingPageComposer must be used within a LandingPageComposerProvider");
  }
  return context;
};
