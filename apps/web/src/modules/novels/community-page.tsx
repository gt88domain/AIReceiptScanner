import { MessageSquareIcon } from "lucide-react";
import { Link } from "@tanstack/react-router";
import type { PublicForumListResult } from "./forum-loader";
import type { getPublicWorldList } from "./world-loader";

const sections = [
  "Announcements and Updates",
  "Free AI Novel Generator",
  "Writers Group",
  "AI Writing Prompts",
  "AI Writing Coach",
  "AI Collaborative Writing",
  "AI Story Choices",
  "AI Text Adventures",
  "AI Short Stories",
  "Web Novel Discussion",
];
const tags = [
  "Review",
  "Writing",
  "Writing Techniques",
  "Translation",
  "LLM",
  "Amazon",
  "Tool Review",
  "Books",
];

type CommunityPageProps = {
  threads: PublicForumListResult["items"];
  worlds: Awaited<ReturnType<typeof getPublicWorldList>>["items"];
};

export function CommunityPage({ threads, worlds }: CommunityPageProps) {
  return (
    <main className="mx-auto w-full max-w-[1280px] px-4 py-4 lg:px-6">
      <div className="mb-4 text-sm text-slate-500">
        <Link to="/" className="hover:text-sky-600">
          Home
        </Link>{" "}
        <span className="px-2">/</span> Forums
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
        <p className="text-xs font-bold tracking-[.2em] text-sky-600">COMMUNITY</p>
        <h1 className="mt-3 font-serif text-5xl text-slate-900">AI Novel Community</h1>
        <p className="mt-3 max-w-3xl text-slate-600">
          Connect with readers and creators to discuss writing craft, worldbuilding systems, and
          publishing strategy.
        </p>
        <div className="mt-5 flex gap-3">
          <span className="inline-flex min-h-11 items-center rounded-xl bg-slate-200 px-4 text-sm font-semibold text-slate-500">
            Posting opens soon
          </span>
          <a
            href="#forum-tags"
            className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-700"
          >
            Browse Forum Tags
          </a>
        </div>
      </section>

      <div className="mt-4 grid gap-4 lg:grid-cols-[250px_minmax(0,1fr)_300px]">
        <aside className="h-fit rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex justify-between">
            <h2 className="font-serif text-2xl text-slate-900">Filters</h2>
            <a href="/forums" className="text-sm font-semibold text-sky-600">
              Reset
            </a>
          </div>
          <h3 className="mt-7 text-xs font-bold tracking-[.12em] text-slate-500">SECTIONS</h3>
          <nav className="mt-3 space-y-1">
            {["All Discussions", ...sections].map((section, index) => (
              <span
                key={section}
                className={`block rounded-lg px-3 py-2.5 text-sm ${index === 0 ? "bg-sky-100 text-sky-600" : "text-slate-500"}`}
              >
                {section}
              </span>
            ))}
          </nav>
        </aside>

        <section className="min-w-0">
          <div className="rounded-xl border border-slate-200 bg-white px-5 py-4">
            <div className="flex items-center gap-6 text-sm font-semibold">
              <span className="border-b-2 border-sky-500 pb-3 text-sky-600">Latest</span>
              <span className="text-slate-500">Popular</span>
            </div>
          </div>
          <div className="mt-4 space-y-3">
            {threads.map((thread) => (
              <Link
                key={thread.id}
                to="/forums/$threadId"
                params={{ threadId: thread.slug }}
                className="block rounded-xl border border-slate-200 bg-white p-5 transition-colors hover:border-sky-300 hover:bg-sky-50/30"
              >
                <div className="flex items-start gap-3">
                  <MessageSquareIcon
                    className="mt-1 size-4 shrink-0 text-sky-600"
                    aria-hidden="true"
                  />
                  <div className="min-w-0 flex-1">
                    <h2 className="font-serif text-xl leading-6 text-slate-900">{thread.title}</h2>
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">
                      {thread.excerpt}
                    </p>
                    <p className="mt-3 text-xs text-slate-500">
                      {thread.authorName} <span className="px-1">·</span>{" "}
                      {new Intl.DateTimeFormat("en", { month: "short", year: "numeric" }).format(
                        thread.createdAt,
                      )}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs font-semibold text-slate-500">
                    {thread.replyCount} replies
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <aside className="space-y-4">
          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="font-serif text-2xl text-slate-900">Active Universes</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Popular worlds anchor shared discussions.
            </p>
            <Link to="/worlds" className="mt-4 inline-block text-sm font-semibold text-sky-600">
              View all
            </Link>
            <div className="mt-3 space-y-2">
              {worlds.slice(0, 3).map((world) => (
                <Link
                  key={world.slug}
                  to="/worlds"
                  search={{ q: world.title }}
                  className="block rounded-xl border border-slate-200 p-3 hover:border-sky-300"
                >
                  <p className="truncate font-semibold text-slate-800">{world.title}</p>
                  <p className="mt-1 text-xs text-slate-500">{world.novelsCount} novels</p>
                </Link>
              ))}
            </div>
          </section>
          <section id="forum-tags" className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="font-serif text-2xl text-slate-900">Forum Tags</h2>
            <div className="mt-4 space-y-2">
              {tags.map((tag, index) => (
                <span key={tag} className="block text-sm text-slate-600">
                  <span className="mr-2 text-slate-400">{index + 1}.</span>
                  {tag}
                  <span className="ml-1 text-slate-400">topic</span>
                </span>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}
