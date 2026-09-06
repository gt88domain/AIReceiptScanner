import { novelServerClient } from "./server-client";
import { novelCategories, novelCategoryAliases, novelTagCounts } from "./taxonomy";

const PERMANENT_REDIRECT = 301;

function redirectResponse(
  request: Request,
  path: string,
  search = new URL(request.url).search,
): Response {
  const target = new URL(path, request.url);
  target.search = search;
  return Response.redirect(target, PERMANENT_REDIRECT);
}
function canonicalCategorySlug(slug: string): keyof typeof novelCategories | undefined {
  const normalized = slug.toLowerCase();
  const canonical = novelCategoryAliases[normalized] ?? normalized;
  return canonical in novelCategories ? (canonical as keyof typeof novelCategories) : undefined;
}

export function redirectLegacyCategory(request: Request, slug: string): Response {
  const canonical = canonicalCategorySlug(slug);
  if (!canonical) return new Response("Not Found", { status: 404 });
  return redirectResponse(request, `/categories/${canonical}`);
}

export function redirectLegacyLibrary(request: Request): Response {
  const url = new URL(request.url);
  const genre = url.searchParams.get("genre");
  if (!genre) return redirectResponse(request, "/novels");

  const canonical = canonicalCategorySlug(genre);
  if (!canonical) return new Response("Not Found", { status: 404 });
  url.searchParams.delete("genre");
  return redirectResponse(request, `/categories/${canonical}`, url.search);
}

export async function redirectLegacyNovel(request: Request, slug: string): Promise<Response> {
  const novel = await novelServerClient.novels.bySlug({ slug });
  if (!novel) return new Response("Not Found", { status: 404 });
  return redirectResponse(request, `/novels/${novel.slug}`);
}

export async function redirectLegacyChapter(
  request: Request,
  slug: string,
  number: string,
): Promise<Response> {
  const parsedNumber = Number(number);
  if (!Number.isSafeInteger(parsedNumber) || parsedNumber < 1)
    return new Response("Not Found", { status: 404 });

  const chapter = await novelServerClient.novels.chapters.byNumber({ slug, number: parsedNumber });
  if (!chapter) return new Response("Not Found", { status: 404 });
  return redirectResponse(request, `/novels/${slug}/chapter/${chapter.number}`);
}

export function redirectLegacyTag(request: Request, slug: string): Response {
  const normalized = slug.toLowerCase();
  if (!(normalized in novelTagCounts)) return new Response("Not Found", { status: 404 });
  return redirectResponse(request, `/tags/novels/${normalized}`);
}
