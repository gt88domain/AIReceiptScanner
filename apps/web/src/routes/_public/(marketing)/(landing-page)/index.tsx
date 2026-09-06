import { createFileRoute } from "@tanstack/react-router";
import { NovelHome } from "@/modules/novels/novel-home";
import { getPublicNovelHome } from "@/modules/novels/home-loader";
import { buildSeoHead } from "@/utils/seo";

export const Route = createFileRoute("/_public/(marketing)/(landing-page)/")({
  loader: () => getPublicNovelHome(),
  head: ({ loaderData }) =>
    buildSeoHead({
      title: "AINovel | AI-Powered Stories",
      description: "Read and discover public AI stories on AINovel.",
      canonicalPath: "/",
      type: "website",
      ldJson: {
        "@context": "https://schema.org",
        "@graph": [
          { "@type": "WebSite", name: "AINovel" },
          { "@type": "Organization", name: "AINovel" },
          {
            "@type": "CollectionPage",
            name: "AINovel public stories",
            mainEntity: {
              "@type": "ItemList",
              itemListElement: (loaderData?.featured ?? []).map((novel, index) => ({
                "@type": "ListItem",
                position: index + 1,
                name: novel.title,
              })),
            },
          },
        ],
      },
    }),
  component: HomeComponent,
});

function HomeComponent() {
  return <NovelHome data={Route.useLoaderData()} />;
}
