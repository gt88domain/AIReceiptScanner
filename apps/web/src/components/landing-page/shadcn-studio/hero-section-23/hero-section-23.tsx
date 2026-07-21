import { MotionPreset } from "@/components/ui/motion-preset";

/** A claim-free starting point for product and company pages. */
function HeroSection23() {
  return (
    <section className="overflow-hidden border-b">
      <div className="mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:px-8">
        <div className="max-w-3xl space-y-6">
          <MotionPreset
            fade
            slide
            transition={{ duration: 0.5 }}
            className="text-muted-foreground text-sm font-medium"
          >
            Product overview
          </MotionPreset>
          <MotionPreset fade slide={{ offset: 32 }} blur transition={{ duration: 0.5 }} delay={0.15}>
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
              Tell the story behind your product.
            </h1>
          </MotionPreset>
          <MotionPreset fade slide={{ offset: 32 }} blur transition={{ duration: 0.5 }} delay={0.3}>
            <p className="max-w-2xl text-lg leading-8 text-muted-foreground">
              Start with the problem you solve, the people you serve, and the work that makes your
              product useful. Replace this copy with your own introduction before publishing.
            </p>
          </MotionPreset>
        </div>
      </div>
    </section>
  );
}

export default HeroSection23;
