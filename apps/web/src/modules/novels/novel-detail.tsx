import { Link } from "@tanstack/react-router";
import { BookOpenIcon, EyeIcon, FileTextIcon, HeartIcon, Share2Icon } from "lucide-react";
import type {
  getPublicNovelBySlug,
  getPublicNovelChapters,
  getPublicRelatedNovels,
} from "./detail-loader";
import { novelCategories } from "./taxonomy";

type NovelDetailProps = {
  novel: NonNullable<Awaited<ReturnType<typeof getPublicNovelBySlug>>>;
  chapters: Awaited<ReturnType<typeof getPublicNovelChapters>>["items"];
  related: Awaited<ReturnType<typeof getPublicRelatedNovels>>["items"];
};

export function NovelDetail({ novel, chapters, related }: NovelDetailProps) {
  const genre = novelCategories[novel.genre as keyof typeof novelCategories] ?? novel.genre;
  const firstChapter = chapters.at(0);
  const tags = novel.tags.filter((tag) => !tag.startsWith("for-"));

  return (
    <main className="w-full px-4 py-4 lg:px-6">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_28px_rgba(15,23,42,.08)]">
        <div className="grid gap-5 p-4 lg:grid-cols-[300px_1fr] lg:p-7">
          <div className="overflow-hidden rounded-2xl border border-white/60 bg-slate-100 shadow-[0_8px_22px_rgba(30,64,175,.2)]">
            {novel.coverUrl ? (
              <img
                alt={`${novel.title} cover`}
                className="h-[420px] w-full object-cover"
                src={novel.coverUrl}
              />
            ) : (
              <div className="flex h-[420px] items-end bg-[radial-gradient(circle_at_50%_10%,#6b5a45,#1d1510_72%)] p-5">
                <p className="font-serif text-2xl text-amber-100">{novel.title}</p>
              </div>
            )}
          </div>
          <article className="relative flex min-h-[420px] flex-col overflow-hidden rounded-2xl border border-slate-100 bg-[linear-gradient(180deg,#edf4ff,#f8fbff_50%,#fff)] p-5 lg:p-6">
            <img
              src="/images/ainovel/generated/hero-main-1440x810.webp"
              alt=""
              className="pointer-events-none absolute inset-0 size-full object-cover opacity-25"
            />
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,.56),rgba(255,255,255,.96))]" />
            <div className="relative space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="font-serif text-4xl leading-tight text-slate-900 sm:text-5xl">
                  {novel.title}
                </h1>
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold capitalize text-emerald-700">
                  {novel.status}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  to="/categories/$slug"
                  params={{ slug: novel.genre }}
                  className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700"
                >
                  {genre}
                </Link>
                {tags.slice(0, 6).map((tag) => (
                  <Link
                    key={tag}
                    to="/tags/novels/$slug"
                    params={{ slug: tag }}
                    className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600"
                  >
                    {tag.replaceAll("-", " ")}
                  </Link>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2 rounded-2xl border border-slate-200 bg-white/95 p-4 text-sm sm:grid-cols-4">
                <Metric
                  icon={<FileTextIcon className="size-4" />}
                  label="Book Words"
                  value={novel.totalWords.toLocaleString()}
                />
                <Metric
                  icon={<EyeIcon className="size-4" />}
                  label="Reads"
                  value={novel.viewsCount.toLocaleString()}
                />
                <Metric
                  icon={<BookOpenIcon className="size-4" />}
                  label="Chapters"
                  value={String(novel.totalChapters)}
                />
                <Metric
                  icon={<HeartIcon className="size-4" />}
                  label="Status"
                  value={novel.status}
                />
              </div>
              <div className="rounded-xl border border-slate-200 bg-white/95 p-3 text-sm text-slate-600">
                <p>
                  Updated:{" "}
                  <span className="font-medium text-slate-900">
                    {new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(novel.updatedAt)}
                  </span>
                </p>
                <p className="mt-1">
                  Latest public chapter:{" "}
                  {firstChapter ? (
                    <Link
                      to="/novels/$slug/chapter/$number"
                      params={{ slug: novel.slug, number: String(firstChapter.number) }}
                      className="font-medium text-sky-700 hover:underline"
                    >
                      Chapter {firstChapter.number} {firstChapter.title}
                    </Link>
                  ) : (
                    <span className="font-medium text-slate-900">not imported yet</span>
                  )}
                </p>
              </div>
            </div>
            <div className="relative mt-auto flex flex-wrap gap-2 border-t border-slate-200 pt-4">
              {firstChapter ? (
                <Link
                  to="/novels/$slug/chapter/$number"
                  params={{ slug: novel.slug, number: String(firstChapter.number) }}
                  className="inline-flex h-11 min-w-40 items-center justify-center rounded-xl bg-[#087df4] px-4 text-sm font-semibold text-white"
                >
                  Read Now
                </Link>
              ) : (
                <span className="inline-flex h-11 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-500">
                  Chapter import pending
                </span>
              )}
              <button
                type="button"
                disabled
                className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-400"
                title="Bookmarks require an authenticated reader module"
              >
                <BookOpenIcon className="size-4" />
                Bookmark
              </button>
              <button
                type="button"
                disabled
                className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-400"
                title="Sharing is not yet configured"
              >
                <Share2Icon className="size-4" />
                Share
              </button>
            </div>
          </article>
        </div>
      </section>
      <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-4">
          <Facet label="Audience" value={novel.audience?.replace("for-", "For ") ?? "All"} />
          <Facet label="Category" value={genre} />
          <Facet label="Format" value="AI serial novel" />
          <Facet label="Tags" value={tags.slice(0, 2).join(" · ") || "None"} />
        </div>
      </section>
      <section className="mt-5 grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-4">
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="font-serif text-3xl text-slate-900">About this story</h2>
            <p className="mt-4 whitespace-pre-line text-base leading-8 text-slate-600">
              {novel.summary}
            </p>
          </section>
          {related.length > 0 ? (
            <section className="rounded-2xl border border-slate-200 bg-white p-5">
              <h2 className="font-serif text-3xl text-slate-900">You Might Also Like</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {related.map((item) => (
                  <Link
                    key={item.slug}
                    to="/novels/$slug"
                    params={{ slug: item.slug }}
                    className="rounded-xl border border-slate-200 p-3 hover:border-sky-300"
                  >
                    <p className="line-clamp-2 font-medium text-slate-900">{item.title}</p>
                    <p className="mt-2 text-xs capitalize text-slate-500">
                      {item.genre.replaceAll("-", " ")}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}
        </div>
        <aside className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="font-serif text-3xl text-slate-900">Chapter Navigator</h2>
          {chapters.length > 0 ? (
            <ol className="mt-4 divide-y divide-slate-200 border-y border-slate-200">
              {chapters.map((chapter) => (
                <li key={chapter.number}>
                  <Link
                    to="/novels/$slug/chapter/$number"
                    params={{ slug: novel.slug, number: String(chapter.number) }}
                    className="flex items-center justify-between gap-3 py-3 text-sm hover:text-sky-700"
                  >
                    <span className="truncate">
                      Chapter {chapter.number}: {chapter.title}
                    </span>
                    <span className="text-xs text-slate-500">
                      {chapter.wordCount.toLocaleString()} words
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-4 text-sm leading-6 text-slate-500">
              No public chapters are currently available for this story.
            </p>
          )}
        </aside>
      </section>
    </main>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div>
      <dt className="flex items-center gap-1.5 text-xs text-slate-500">
        {icon}
        {label}
      </dt>
      <dd className="mt-1 truncate font-semibold capitalize text-slate-900">{value}</dd>
    </div>
  );
}
function Facet({ label, value }: { label: string; value: string }) {
  return (
    <details className="rounded-xl border border-slate-100 bg-slate-50/70 px-4 py-3">
      <summary className="cursor-pointer list-none">
        <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
        <p className="mt-1 truncate font-medium text-slate-900">{value}</p>
      </summary>
    </details>
  );
}
