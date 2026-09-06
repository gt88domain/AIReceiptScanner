import { createFileRoute } from "@tanstack/react-router";
import { CommunityPage } from "@/modules/novels/community-page";
import { getPublicForumList } from "@/modules/novels/forum-loader";
import { NovelPublicShell } from "@/modules/novels/novel-public-shell";
import { getPublicWorldList } from "@/modules/novels/world-loader";
import { buildSeoHead } from "@/utils/seo";

export const Route = createFileRoute("/forums/")({
  loader: async () => {
    const [worlds, threads] = await Promise.all([
      getPublicWorldList({ data: { limit: 6, sort: "popular" } }),
      getPublicForumList({ data: { limit: 12 } }),
    ]);
    return { threads, worlds };
  },
  head: () =>
    buildSeoHead({
      title: "AI Novel Community | AINovel",
      description: "Join AI novel discussions about writing, worldbuilding, and publishing.",
      canonicalPath: "/forums",
    }),
  component: ForumsRoute,
});

function ForumsRoute() {
  const { threads, worlds } = Route.useLoaderData();
  return (
    <NovelPublicShell>
      <CommunityPage threads={threads.items} worlds={worlds.items} />
    </NovelPublicShell>
  );
}
