export const novelCategories = {
  "action-adventure": "Action / Adventure",
  cultivation: "Cultivation",
  fantasy: "Fantasy",
  historical: "Historical",
  "mystery-thriller": "Mystery Thriller",
  romance: "Romance",
  "sci-fi": "Sci-Fi",
  "slice-of-life": "Slice of Life",
  "supernatural-horror": "Supernatural Horror",
} as const;

export const novelCategoryAliases: Record<string, keyof typeof novelCategories> = {
  action: "action-adventure",
  adventure: "action-adventure",
  horror: "supernatural-horror",
  mystery: "mystery-thriller",
  "science-fiction": "sci-fi",
  scifi: "sci-fi",
};

// Counts come from the reproducible 21-row public D1 seed. Replace this with
// a taxonomy read model when the imported catalog is no longer bounded.
export const novelTagCounts = {
  "alternate-history": 2,
  campus: 3,
  cultivation: 2,
  cyberpunk: 3,
  doctor: 1,
  fantasy: 3,
  genius: 6,
  horror: 1,
  "light-comedy": 2,
  "martial-arts": 2,
  rebirth: 3,
  romance: 3,
  "single-female-lead": 11,
  streamer: 1,
  survival: 14,
  suspense: 3,
  villain: 1,
} as const;

export const NOVEL_TAG_INDEX_THRESHOLD = 5;
