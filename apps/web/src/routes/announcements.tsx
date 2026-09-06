import { createFileRoute } from "@tanstack/react-router";
import { NovelPublicShell } from "@/modules/novels/novel-public-shell";
import { ANNOUNCEMENTS } from "@/modules/novels/static-content";
import { buildSeoHead } from "@/utils/seo";

export const Route = createFileRoute("/announcements")({
  head: () =>
    buildSeoHead({
      canonicalPath: "/announcements",
      description: "Official AINovel product and policy updates.",
      title: "Announcements | AINovel",
    }),
  component: AnnouncementsRoute,
});

function AnnouncementsRoute() {
  return (
    <NovelPublicShell>
      <main className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <header className="border-b border-white/10 pb-8">
          <p className="text-sm font-medium text-[#c56cf0]">Updates</p>
          <h1 className="mt-2 text-4xl font-semibold text-zinc-100">AINovel Announcements</h1>
          <p className="mt-4 text-base leading-7 text-zinc-400">
            Official notes for product and policy changes.
          </p>
        </header>
        <div className="space-y-4 py-9">
          {ANNOUNCEMENTS.map((announcement) => (
            <article key={announcement.slug} className="border border-white/10 bg-white/[.02] p-5">
              <p className="text-xs text-zinc-500">{announcement.publishedAt}</p>
              <h2 className="mt-2 text-2xl font-semibold text-zinc-100">{announcement.title}</h2>
              <p className="mt-3 leading-7 text-zinc-300">{announcement.summary}</p>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm leading-6 text-zinc-400">
                {announcement.details.map((detail) => (
                  <li key={detail}>{detail}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </main>
    </NovelPublicShell>
  );
}
