import { Link } from "@tanstack/react-router";
import { BookOpenIcon, EyeIcon, FileTextIcon, SparklesIcon } from "lucide-react";
import type { ReactNode } from "react";
import type { getPublicNovelHome } from "./home-loader";
import { novelCategories } from "./taxonomy";

type Props = { data: Awaited<ReturnType<typeof getPublicNovelHome>> };

const features = [
  [
    "AI NOVEL",
    "Free AI Novel",
    "Explore a growing free AI novel library and discover high-quality AI stories across fantasy, romance, sci-fi, and beyond.",
  ],
  [
    "OPEN SOURCE NOVEL",
    "Open Source Story",
    "Create in shared story worlds where writers can fork lore, remix character arcs, and publish new branches together.",
  ],
  [
    "AI STORIES",
    "Remix Story Creation",
    "Turn prompts into cinematic chapters, refine scenes quickly, and shape AI stories with a visual-first creative workflow.",
  ],
  [
    "CREATIVE WRITING WITH AI",
    "AI Novel Generator",
    "Generate chapter-ready drafts from prompts, then iterate with structure, pacing, and character controls.",
  ],
  [
    "SHARE AI STORIES",
    "Community Idea Sharing",
    "Post concepts, drafts, and snippets to the community, gather feedback, and inspire the next wave of AI stories.",
  ],
  [
    "AI NOVEL PLATFORM",
    "Writing Resources",
    "Collect prompts, outlines, lore notes, and reusable writing assets in one place.",
  ],
] as const;

const faqs = [
  [
    "What is AINovel?",
    "AINovel is an AI novel platform where you can read AI stories, create chapters, and collaborate in shared story worlds.",
  ],
  [
    "Is AINovel free to use?",
    "You can read public AI stories and explore public story worlds at no cost.",
  ],
  [
    "How is this like open source or GitHub?",
    "Story worlds can be treated like open projects: creators build on shared lore and publish their own branches.",
  ],
  [
    "Can I create cinematic stories?",
    "AINovel focuses on prompt-based creation and visual storytelling flow.",
  ],
  [
    "How do I publish and share my AI novel?",
    "Create or fork a world, publish chapters, and share the story link.",
  ],
  [
    "Can readers interact and give feedback?",
    "Public discussion is available through the community read model.",
  ],
] as const;

const worldImages = [
  "/images/ainovel/genres/fantasy.webp",
  "/images/ainovel/genres/sci-fi.webp",
  "/images/ainovel/genres/mystery-thriller.webp",
];
const genreImages: Record<string, string> = {
  "action-adventure": "urban-fantasy.webp",
  cultivation: "cultivation.webp",
  fantasy: "fantasy.webp",
  historical: "historical.webp",
  "mystery-thriller": "mystery-thriller.webp",
  romance: "romance.webp",
  "sci-fi": "sci-fi.webp",
  "slice-of-life": "other.webp",
  "supernatural-horror": "supernatural-horror.webp",
};

export function NovelHome({ data }: Props) {
  const tags = [
    ...new Set(
      data.featured.flatMap((novel) => novel.tags.filter((tag) => !tag.startsWith("for-"))),
    ),
  ].slice(0, 12);

  return (
    <main className="mx-auto w-full max-w-[1540px] px-4 py-4">
      <section className="relative isolate overflow-hidden rounded-2xl border border-slate-200 bg-white px-6 py-14 sm:min-h-[460px] sm:px-12 sm:py-14">
        <img
          src="/images/ainovel/generated/hero-main-1920x1080.webp"
          alt="Fantasy floating city hero visual"
          width={1920}
          height={1080}
          fetchPriority="high"
          className="absolute inset-0 -z-10 size-full object-cover object-right"
        />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(255,255,255,1)_0%,rgba(255,255,255,.94)_43%,rgba(255,255,255,.22)_73%,rgba(255,255,255,.04)_100%)]" />
        <div className="max-w-[38rem]">
          <h1 className="font-serif text-5xl leading-[.95] text-slate-900 sm:text-7xl">
            AI-Powered Stories.
            <br />
            <em className="text-[#4c7ee0]">Infinite Possibilities.</em>
          </h1>
          <p className="mt-7 max-w-xl text-base leading-7 text-slate-600">
            AINovel is where AI and imagination meet. Explore limitless worlds, co-create stories,
            and shape adventures that are uniquely yours.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              to="/novels"
              className="inline-flex min-h-11 items-center rounded-xl bg-[#087df4] px-5 text-sm font-semibold text-white hover:bg-[#076eda]"
            >
              Start Reading
            </Link>
            <Link
              to="/worlds"
              className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 bg-white/80 px-5 text-sm font-semibold text-slate-700 hover:border-sky-400"
            >
              Browse Worlds
            </Link>
          </div>
        </div>
      </section>

      <section className="rounded-b-2xl border-x border-b border-slate-200 bg-white p-4 sm:p-5">
        <h2 className="font-serif text-3xl text-slate-900">Trending Worlds</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {data.worlds.slice(0, 3).map((world, index) => (
            <Link
              key={world.slug}
              to="/worlds"
              search={{ q: world.title }}
              className="group relative min-h-28 overflow-hidden rounded-xl border border-slate-200"
            >
              <img
                src={worldImages[index % worldImages.length]}
                alt=""
                width={1672}
                height={941}
                loading="lazy"
                className="absolute inset-0 size-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <span className="absolute inset-0 bg-gradient-to-t from-slate-950/80 to-transparent" />
              <span className="absolute bottom-3 left-3 right-3 truncate font-serif text-xl text-white">
                {world.title}
              </span>
              <span className="absolute bottom-3 right-3 rounded-full bg-white/20 px-2 py-0.5 text-xs text-white">
                Trending
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-3 grid gap-3 lg:grid-cols-[1.55fr_1fr]">
        <Panel
          title="AI Stories Library"
          action={
            <Link to="/novels" className="text-sm font-semibold text-sky-600">
              View all
            </Link>
          }
        >
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {data.featured.slice(0, 4).map((novel) => (
              <StoryCard key={novel.slug} novel={novel} />
            ))}
          </div>
        </Panel>
        <Panel
          title="Ranking Preview"
          action={
            <Link to="/ranking" className="text-sm font-semibold text-sky-600">
              View full rankings
            </Link>
          }
        >
          <ol className="space-y-2">
            {data.ranking.map((novel, index) => (
              <li key={novel.slug}>
                <Link
                  to="/novels/$slug"
                  params={{ slug: novel.slug }}
                  className="flex items-center gap-3 rounded-lg px-1 py-1.5 hover:bg-slate-50"
                >
                  <span className="grid size-6 place-content-center rounded-full bg-slate-100 text-xs font-semibold text-slate-700">
                    {index + 1}
                  </span>
                  {novel.coverUrl ? (
                    <img
                      src={novel.coverUrl}
                      alt=""
                      className="h-10 w-16 rounded-md border border-slate-200 object-cover"
                    />
                  ) : (
                    <span className="grid h-10 w-16 place-content-center rounded-md border border-slate-200 text-slate-400">
                      <BookOpenIcon className="size-4" />
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-slate-800">
                      {novel.title}
                    </span>
                    <span className="block truncate text-xs text-slate-500">
                      {novel.genre} · {novel.tags[0] ?? "story"}
                    </span>
                  </span>
                  <span className="text-xs text-slate-500">{novel.viewsCount} views</span>
                </Link>
              </li>
            ))}
          </ol>
        </Panel>
      </section>

      <section className="relative mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <img
          src="/images/ainovel/generated/features-bg-1920x860.webp"
          alt=""
          width={1920}
          height={860}
          loading="lazy"
          className="absolute inset-0 size-full object-cover"
        />
        <div className="absolute inset-0 bg-white/92" />
        <div className="relative">
          <div className="mb-6 text-center">
            <p className="text-sm font-semibold tracking-[.32em] text-sky-600">AINOVEL</p>
            <h2 className="mt-2 font-serif text-4xl text-slate-900 sm:text-5xl">
              Why Readers & Creators Choose AINovel
            </h2>
            <p className="mt-3 text-slate-600">Powerful AI. Open community. Limitless stories.</p>
          </div>
          <div className="grid gap-3 lg:grid-cols-[1.55fr_1fr]">
            <div className="grid gap-3 md:grid-cols-2">
              {features.map(([eyebrow, title, description]) => (
                <article key={title} className="rounded-xl border border-slate-200 bg-white/95 p-4">
                  <div className="flex gap-3">
                    <span className="grid size-9 place-content-center rounded-full bg-sky-100 text-sky-700">
                      <SparklesIcon className="size-4" />
                    </span>
                    <div>
                      <p className="text-[10px] font-bold tracking-[.14em] text-sky-600">
                        {eyebrow}
                      </p>
                      <h3 className="mt-1 font-serif text-xl text-slate-900">{title}</h3>
                    </div>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
                </article>
              ))}
            </div>
            <section className="flex min-h-[540px] flex-col rounded-xl border border-slate-200 bg-white/95 p-4">
              <h3 className="font-serif text-2xl text-slate-900">FAQ</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Quick answers about reading, creating, and publishing AI stories on AINovel.
              </p>
              <div className="mt-4 flex-1 space-y-2">
                {faqs.map(([question, answer]) => (
                  <details
                    key={question}
                    className="group rounded-lg border border-slate-200 bg-white px-3 py-2"
                  >
                    <summary className="flex cursor-pointer list-none justify-between gap-3 text-sm font-semibold text-slate-800">
                      {question}
                      <span className="transition-transform group-open:rotate-45">+</span>
                    </summary>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{answer}</p>
                  </details>
                ))}
              </div>
              <Link
                to="/$page"
                params={{ page: "help" }}
                className="mt-4 inline-flex h-10 items-center justify-center rounded-lg bg-[#087df4] px-4 text-sm font-semibold text-white"
              >
                More in Help Center
              </Link>
            </section>
          </div>
          <div className="mt-4 space-y-3 border-t border-slate-200 pt-4">
            <section className="rounded-xl border border-slate-200 bg-white/95 p-4">
              <div className="flex flex-wrap items-center gap-3">
                <h3 className="mr-1 font-serif text-2xl text-slate-900">Explore by Tags</h3>
                {tags.map((tag) => (
                  <Link
                    key={tag}
                    to="/tags/novels/$slug"
                    params={{ slug: tag }}
                    className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-700"
                  >
                    {tag.replaceAll("-", " ")}
                  </Link>
                ))}
              </div>
            </section>
            <section className="rounded-xl border border-slate-200 bg-white/95 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-serif text-2xl text-slate-900">Browse by Category</h3>
                <Link to="/novels" className="text-sm font-semibold text-sky-600">
                  Open library
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-9">
                {Object.entries(novelCategories).map(([slug, label]) => (
                  <Link
                    key={slug}
                    to="/categories/$slug"
                    params={{ slug }}
                    className="group relative min-h-32 overflow-hidden rounded-xl border border-slate-200 bg-slate-900"
                  >
                    <img
                      src={`/images/ainovel/genres/${genreImages[slug]}`}
                      alt={`${label} AI stories`}
                      className="absolute inset-0 size-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <span className="absolute inset-0 bg-gradient-to-t from-slate-950/85 to-transparent" />
                    <span className="absolute inset-x-1 bottom-3 text-center font-serif text-2xl leading-none text-white">
                      {label}
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          </div>
        </div>
      </section>
    </main>
  );
}

function Panel({
  action,
  children,
  title,
}: {
  action: ReactNode;
  children: ReactNode;
  title: string;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="font-serif text-3xl text-slate-900">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}
function StoryCard({ novel }: { novel: Props["data"]["featured"][number] }) {
  return (
    <Link
      to="/novels/$slug"
      params={{ slug: novel.slug }}
      className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50/80 hover:border-sky-300"
    >
      {novel.coverUrl ? (
        <img
          src={novel.coverUrl}
          alt={novel.title}
          width={832}
          height={1248}
          loading="lazy"
          className="aspect-[4/3] w-full object-cover"
        />
      ) : (
        <span className="grid aspect-[4/3] place-content-center text-slate-400">
          <BookOpenIcon />
        </span>
      )}
      <div className="p-3">
        <span className="rounded-full bg-sky-100 px-2 py-1 text-[10px] font-semibold text-sky-700">
          New Chapter
        </span>
        <h3 className="mt-2 line-clamp-2 font-serif text-xl text-slate-900">{novel.title}</h3>
        <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">{novel.summary}</p>
        <p className="mt-3 flex gap-3 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1">
            <EyeIcon className="size-3" />
            {novel.viewsCount}
          </span>
          <span className="inline-flex items-center gap-1">
            <FileTextIcon className="size-3" />
            {novel.totalWords.toLocaleString()} words
          </span>
        </p>
      </div>
    </Link>
  );
}
