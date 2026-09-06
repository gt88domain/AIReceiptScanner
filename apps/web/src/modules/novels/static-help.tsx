import { Link } from "@tanstack/react-router";

const helpItems = [
  [
    "What can visitors do?",
    "Visitors can browse public stories, rankings, categories, tags, and published chapters.",
  ],
  [
    "Can I create stories here?",
    "Creator workflows remain outside this public-read migration and are not represented as public pages yet.",
  ],
  [
    "Where can I report a problem?",
    "Use the support and policy contacts listed on the Contact page.",
  ],
] as const;

export function StaticHelp() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <header className="border-b border-slate-200 pb-8">
        <p className="text-xs font-bold tracking-[.18em] text-sky-600">HELP CENTER</p>
        <h1 className="mt-2 font-serif text-5xl text-slate-900">AINovel Support &amp; FAQ</h1>
        <p className="mt-4 text-base leading-7 text-slate-600">
          Help for the public AINovel reader experience.
        </p>
      </header>
      <div className="space-y-3 py-9">
        {helpItems.map(([question, answer], index) => (
          <details
            key={question}
            open={index === 0}
            className="rounded-xl border border-slate-200 bg-white p-4"
          >
            <summary className="cursor-pointer font-medium text-slate-900">{question}</summary>
            <p className="mt-3 leading-7 text-slate-700">{answer}</p>
          </details>
        ))}
      </div>
      <Link
        to="/contact"
        className="inline-flex min-h-10 items-center rounded-xl border border-slate-300 px-4 text-sm text-slate-700 hover:border-sky-400 hover:text-sky-700"
      >
        Contact AINovel
      </Link>
    </main>
  );
}
