import { Fragment, type ReactElement } from "react";
import { useLandingPageComposer } from "@/components/providers/landing-page-composer-provider";
import { landingPageComponentMap } from "@/configs/landing-page-component/landing-page-component-registry";

const landingPageComponentFactories: Partial<Record<string, () => ReactElement>> =
  landingPageComponentMap;

export function DynamicLandingPage() {
  const { selectedComponents } = useLandingPageComposer();

  return <LandingPage sections={selectedComponents} />;
}

function LandingPage({ sections }: { sections: readonly string[] }) {
  if (sections.length === 0) {
    return (
      <div className="mx-auto w-full max-w-4xl px-6 py-24 text-center">
        <h2 className="text-2xl font-semibold">No section selected</h2>
        <p className="text-muted-foreground mt-3">
          Open the landing page composer and choose sections to preview.
        </p>
      </div>
    );
  }

  return (
    <>
      {sections.map((key) => {
        const renderComponent = landingPageComponentFactories[key];
        return renderComponent ? <Fragment key={key}>{renderComponent()}</Fragment> : null;
      })}
    </>
  );
}
