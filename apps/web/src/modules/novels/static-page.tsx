import { Link } from "@tanstack/react-router";
import type { StaticPageContent } from "./static-content";

const availableLinks = new Set([
  "/about",
  "/announcements",
  "/contact",
  "/community-guidelines",
  "/content-policy",
  "/download",
  "/help",
  "/novels",
  "/privacy",
  "/resources",
  "/terms",
]);

export function StaticPage({ content }: { content: StaticPageContent }) {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <header className="border-b border-slate-200 pb-8">
        <p className="text-xs font-bold tracking-[.18em] text-sky-600">{content.kicker}</p>
        <h1 className="mt-2 font-serif text-5xl text-slate-900">{content.title}</h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">{content.description}</p>
        <p className="mt-4 text-xs text-slate-500">Last updated {content.lastUpdated}</p>
      </header>
      <div className="space-y-9 py-9">
        {content.sections.map((section) => (
          <section key={section.heading}>
            <h2 className="font-serif text-3xl text-slate-900">{section.heading}</h2>
            {section.paragraphs?.map((paragraph) => (
              <p key={paragraph} className="mt-3 leading-7 text-slate-700">
                {paragraph}
              </p>
            ))}
            {section.bullets ? (
              <ul className="mt-3 list-disc space-y-2 pl-5 leading-7 text-slate-700">
                {section.bullets.map((bullet) => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>
            ) : null}
          </section>
        ))}
      </div>
      <nav
        className="flex flex-wrap gap-2 border-t border-slate-200 pt-6"
        aria-label="Related pages"
      >
        {content.quickLinks
          .filter((link) => availableLinks.has(link.href))
          .map((link) => (
            <Link
              key={link.href}
              to={link.href}
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:border-sky-400 hover:text-sky-700"
            >
              {link.label}
            </Link>
          ))}
      </nav>
    </main>
  );
}
