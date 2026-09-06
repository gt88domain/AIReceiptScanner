import { Link, createFileRoute, notFound, redirect } from "@tanstack/react-router";
import { z } from "zod";
import { getPublicForumThread, getPublicForumThreadById } from "@/modules/novels/forum-loader";
import { NovelPublicShell } from "@/modules/novels/novel-public-shell";
import { buildSeoHead } from "@/utils/seo";

export const Route = createFileRoute("/forums/$threadId")({
  params: {
    parse: (params) => ({ threadId: z.string().trim().min(1).max(240).parse(params.threadId) }),
  },
  loader: async ({ params }) => {
    const thread = await getPublicForumThread({ data: { slug: params.threadId } });
    if (thread) return thread;

    // Legacy UUID links were emitted by the first public migration. Preserve them without making UUIDs canonical.
    if (z.string().uuid().safeParse(params.threadId).success) {
      const legacyThread = await getPublicForumThreadById({ data: { id: params.threadId } });
      if (legacyThread?.slug) {
        throw redirect({ to: "/forums/$threadId", params: { threadId: legacyThread.slug } });
      }
    }
    throw notFound();
  },
  head: ({ loaderData }) =>
    buildSeoHead({
      title: loaderData ? `${loaderData.title} | AINovel Community` : "Community Thread | AINovel",
      description: loaderData?.excerpt ?? "Read a public AINovel community discussion.",
      canonicalPath: `/forums/${loaderData?.slug ?? "discussion"}`,
      robots: "noindex,follow",
    }),
  component: ForumThreadRoute,
});

function ForumThreadRoute() {
  const thread = Route.useLoaderData();
  return (
    <NovelPublicShell>
      <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        <nav className="mb-6 text-sm text-slate-500">
          <Link to="/forums" className="hover:text-sky-700">
            Community
          </Link>{" "}
          <span className="px-2">/</span> Discussion
        </nav>
        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-9">
          <p className="text-xs font-bold tracking-[.18em] text-sky-600">COMMUNITY DISCUSSION</p>
          <h1 className="mt-3 font-serif text-4xl leading-tight text-slate-900">{thread.title}</h1>
          <p className="mt-4 border-b border-slate-200 pb-5 text-sm text-slate-500">
            {thread.authorName} <span className="px-1">·</span>{" "}
            {new Intl.DateTimeFormat("en", { month: "long", year: "numeric" }).format(
              thread.createdAt,
            )}
          </p>
          <p className="mt-7 whitespace-pre-line text-base leading-8 text-slate-700">
            {thread.excerpt}
          </p>
          <p className="mt-8 text-sm text-slate-500">
            This public migration preserves the reviewed opening post only. Replies remain on the
            legacy moderation boundary.
          </p>
        </article>
      </main>
    </NovelPublicShell>
  );
}
