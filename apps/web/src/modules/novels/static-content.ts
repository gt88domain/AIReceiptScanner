export interface StaticPageLink {
  href: string;
  label: string;
}

export interface StaticPageSection {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
}

export interface StaticPageContent {
  kicker: string;
  title: string;
  description: string;
  lastUpdated: string;
  sections: StaticPageSection[];
  quickLinks: StaticPageLink[];
}

const LAST_UPDATED = "April 29, 2026";

export const ABOUT_CONTENT: StaticPageContent = {
  kicker: "Company",
  title: "About AINovel",
  description:
    "AINovel is a story platform focused on AI-native reading, open story worlds, and community-driven creativity.",
  lastUpdated: LAST_UPDATED,
  sections: [
    {
      heading: "Mission",
      paragraphs: [
        "Our mission is to make high-quality story creation and discovery more accessible.",
        "We combine AI assistance with open collaboration so readers and creators can build worlds together.",
      ],
    },
    {
      heading: "What AINovel Offers",
      bullets: [
        "A public library of AI novels and serialized stories.",
        "Open world templates that can be remixed and expanded.",
        "Community threads for discussion, feedback, and discovery.",
      ],
    },
    {
      heading: "Current Product Scope",
      paragraphs: [
        "Public visitors can read and discover stories.",
        "The AINovel desktop app is the home for private drafting, AI-assisted creation, and publishing preparation.",
      ],
    },
  ],
  quickLinks: [
    { href: "/novels", label: "Browse Novels" },
    { href: "/worlds", label: "Explore Worlds" },
    { href: "/help", label: "Help Center" },
    { href: "/contact", label: "Contact Us" },
  ],
};

export const DOWNLOAD_CONTENT: StaticPageContent = {
  kicker: "Desktop App",
  title: "Write with AINovel for Mac",
  description:
    "AINovel for Mac keeps your private drafts close to you while making it simple to prepare stories for publishing.",
  lastUpdated: LAST_UPDATED,
  sections: [
    {
      heading: "Local-first writing",
      paragraphs: [
        "Your private drafts and working notes stay in the desktop app by default.",
        "Cloud sync and public publishing are optional steps, never a requirement for writing.",
      ],
    },
    {
      heading: "What is coming",
      bullets: [
        "AI-assisted outlining, drafting, and revision workflows.",
        "One AINovel account across the reader community and desktop app.",
        "Review-first publishing to the public AINovel library.",
      ],
    },
  ],
  quickLinks: [
    { href: "/novels", label: "Explore stories" },
    { href: "/forums", label: "Join the community" },
    { href: "/about", label: "About AINovel" },
  ],
};

export const CONTACT_CONTENT: StaticPageContent = {
  kicker: "Company",
  title: "Contact AINovel",
  description: "Reach the AINovel team for support, legal requests, and partnership inquiries.",
  lastUpdated: LAST_UPDATED,
  sections: [
    {
      heading: "Support Channels",
      bullets: [
        "General support: support@ainovel.com",
        "Account and security: security@ainovel.com",
        "Legal and copyright: legal@ainovel.com",
      ],
    },
    {
      heading: "Social",
      bullets: ["Official X account: https://x.com/ainovelcom (@ainovelcom)"],
    },
    {
      heading: "Response Window",
      paragraphs: [
        "We target a first response within 2 business days for support and policy requests.",
        "Urgent abuse and security reports are prioritized.",
      ],
    },
  ],
  quickLinks: [
    { href: "/help", label: "Help Center" },
    { href: "/content-policy", label: "Content Policy" },
    { href: "/community-guidelines", label: "Community Guidelines" },
    { href: "/announcements", label: "Announcements" },
  ],
};

export const TERMS_CONTENT: StaticPageContent = {
  kicker: "Policy",
  title: "Terms of Service",
  description:
    "These terms govern access to AINovel services, including reading, account use, and creator workflows.",
  lastUpdated: LAST_UPDATED,
  sections: [
    {
      heading: "Acceptance and Eligibility",
      bullets: [
        "By using AINovel, you agree to these terms and related policies.",
        "You must comply with applicable laws in your jurisdiction.",
        "You are responsible for activity under your account.",
      ],
    },
    {
      heading: "User Content and Rights",
      bullets: [
        "You retain rights to content you submit, subject to platform display and service operation rights.",
        "You grant AINovel a non-exclusive license to host, display, and distribute submitted content on the service.",
        "You must have rights to all content you upload or publish.",
      ],
    },
    {
      heading: "Prohibited Conduct",
      bullets: [
        "No illegal, abusive, deceptive, or infringing content.",
        "No attempts to disrupt platform operations or abuse APIs.",
        "No impersonation, fraud, or unauthorized account access.",
      ],
    },
    {
      heading: "Enforcement and Availability",
      paragraphs: [
        "AINovel may remove content, limit visibility, suspend accounts, or terminate access for policy violations.",
        "Service features may change over time, including creator tools and public access behavior.",
      ],
    },
    {
      heading: "Disclaimers and Liability",
      paragraphs: [
        "AINovel is provided on an as-is basis without warranty of uninterrupted availability.",
        "To the extent permitted by law, AINovel is not liable for indirect or consequential damages.",
      ],
    },
  ],
  quickLinks: [
    { href: "/privacy", label: "Privacy Policy" },
    { href: "/content-policy", label: "Content Policy" },
    { href: "/community-guidelines", label: "Community Guidelines" },
    { href: "/contact", label: "Contact Legal" },
  ],
};

export const PRIVACY_CONTENT: StaticPageContent = {
  kicker: "Policy",
  title: "Privacy Policy",
  description:
    "This policy explains what data AINovel collects, how it is used, and what controls are available.",
  lastUpdated: LAST_UPDATED,
  sections: [
    {
      heading: "Data We Collect",
      bullets: [
        "Account details such as email and profile fields.",
        "Usage information such as reading activity and feature interactions.",
        "Technical data such as browser, device, and request metadata.",
      ],
    },
    {
      heading: "How We Use Data",
      bullets: [
        "To provide core features and maintain account security.",
        "To improve product quality, reliability, and moderation outcomes.",
        "To communicate service updates and policy notices.",
      ],
    },
    {
      heading: "Sharing and Retention",
      paragraphs: [
        "We do not sell personal information.",
        "We may share limited data with infrastructure and analytics providers that support platform operations.",
        "Data is retained for operational, legal, and security needs, then deleted or anonymized when no longer necessary.",
      ],
    },
    {
      heading: "Your Controls",
      bullets: [
        "Request account support or policy information at support@ainovel.com.",
        "Request privacy inquiries at privacy@ainovel.com.",
      ],
    },
  ],
  quickLinks: [
    { href: "/terms", label: "Terms of Service" },
    { href: "/content-policy", label: "Content Policy" },
    { href: "/community-guidelines", label: "Community Guidelines" },
    { href: "/contact", label: "Contact Team" },
  ],
};

export const CONTENT_POLICY_CONTENT: StaticPageContent = {
  kicker: "Policy",
  title: "Content Policy",
  description:
    "AINovel content policy sets boundaries for published stories, comments, and profile content.",
  lastUpdated: LAST_UPDATED,
  sections: [
    {
      heading: "Not Allowed",
      bullets: [
        "Illegal, exploitative, or non-consensual sexual content.",
        "Severe harassment, targeted hate, or violent threats.",
        "Copyright infringement or unauthorized distribution of protected works.",
        "Malware, phishing, scams, or deceptive account behavior.",
      ],
    },
    {
      heading: "AI Content Responsibilities",
      bullets: [
        "Creators are responsible for AI-generated output they publish.",
        "You must review generated content before publishing.",
        "Do not use AI tools to bypass safety, rights, or moderation controls.",
      ],
    },
    {
      heading: "Moderation Actions",
      bullets: [
        "Content removal or visibility restrictions.",
        "Temporary account limits or suspensions.",
        "Permanent account termination for severe or repeated abuse.",
      ],
    },
    {
      heading: "Reporting",
      paragraphs: [
        "To report policy violations, send links and details to legal@ainovel.com.",
        "Security abuse reports can be sent to security@ainovel.com.",
      ],
    },
  ],
  quickLinks: [
    { href: "/community-guidelines", label: "Community Guidelines" },
    { href: "/terms", label: "Terms of Service" },
    { href: "/contact", label: "Report an Issue" },
    { href: "/help", label: "Help Center" },
  ],
};

export const COMMUNITY_GUIDELINES_CONTENT: StaticPageContent = {
  kicker: "Policy",
  title: "Community Guidelines",
  description:
    "These guidelines define expected behavior for creators, readers, and community contributors.",
  lastUpdated: LAST_UPDATED,
  sections: [
    {
      heading: "Respect the Community",
      bullets: [
        "Debate ideas, not people.",
        "No harassment, intimidation, or targeted abuse.",
        "Keep feedback constructive and specific.",
      ],
    },
    {
      heading: "Share Responsibly",
      bullets: [
        "Publish content you have rights to use.",
        "Avoid spam, engagement manipulation, and repetitive low-value posting.",
        "Use clear titles and metadata so readers can find relevant content.",
      ],
    },
    {
      heading: "Collaborate in Good Faith",
      bullets: [
        "Credit sources and collaborators when appropriate.",
        "Do not impersonate other creators or staff.",
        "Respect moderation decisions and escalation processes.",
      ],
    },
    {
      heading: "Enforcement",
      paragraphs: [
        "Violations may result in content removal, account restrictions, or suspension based on severity.",
        "Repeated violations can result in permanent loss of platform access.",
      ],
    },
  ],
  quickLinks: [
    { href: "/content-policy", label: "Content Policy" },
    { href: "/terms", label: "Terms of Service" },
    { href: "/forums", label: "Community Forums" },
    { href: "/contact", label: "Contact Moderation" },
  ],
};

export const RESOURCES_CONTENT: StaticPageContent = {
  kicker: "Resources",
  title: "Writing Resources",
  description:
    "A lightweight resource hub for prompts, outlining workflows, worldbuilding templates, and publishing checklists.",
  lastUpdated: LAST_UPDATED,
  sections: [
    {
      heading: "Prompt Starter Pack",
      bullets: [
        "Genre-specific prompt skeletons for fast chapter drafting.",
        "Character consistency prompts for long-form stories.",
        "Scene escalation prompts for tension and pacing.",
      ],
    },
    {
      heading: "Story Architecture",
      bullets: [
        "Three-act and serial arc templates for AI novel workflows.",
        "Chapter-level beat sheets for weekly publishing cadence.",
        "Revision checklists for plot continuity and voice consistency.",
      ],
    },
    {
      heading: "Worldbuilding Assets",
      bullets: [
        "Faction and relationship matrix templates.",
        "Power-system balancing checklists.",
        "Lore timeline sheets for multi-book planning.",
      ],
    },
    {
      heading: "Publishing Ops",
      bullets: [
        "Metadata and blurb checklist before release.",
        "Forum launch thread template for reader feedback.",
        "Announcement template for chapter drops and changelogs.",
      ],
    },
  ],
  quickLinks: [
    { href: "/novels", label: "Browse Novels" },
    { href: "/forums", label: "Community Forums" },
    { href: "/tags", label: "Tags Hub" },
    { href: "/help", label: "Help Center" },
  ],
};

export interface AnnouncementItem {
  slug: string;
  title: string;
  publishedAt: string;
  summary: string;
  details: string[];
}

export const ANNOUNCEMENTS: readonly AnnouncementItem[] = [
  {
    slug: "homepage-and-faq-refresh",
    title: "Homepage and FAQ Refresh",
    publishedAt: "April 29, 2026",
    summary:
      "Updated homepage information architecture with clearer feature framing and expanded FAQ coverage.",
    details: [
      "Refined Features and FAQ sections for stronger scannability.",
      "Improved internal linking between homepage and help center.",
      "Updated visual treatment for tag and genre discovery modules.",
    ],
  },
  {
    slug: "genre-landing-upgrades",
    title: "Genre Landing Upgrades",
    publishedAt: "April 29, 2026",
    summary:
      "Added hero visuals and metadata improvements across genre landing pages for better discovery.",
    details: [
      "Added static hero artwork to /novels/categories routes.",
      "Improved page metadata and social sharing previews.",
      "Expanded static route coverage for genre pages.",
    ],
  },
  {
    slug: "policy-and-company-pages",
    title: "Policy and Company Pages",
    publishedAt: "April 29, 2026",
    summary: "Published core company and policy pages to improve transparency and trust.",
    details: [
      "Added About, Contact, Terms, Privacy, Content Policy, and Community Guidelines.",
      "Updated footer links to remove placeholder destinations.",
      "Standardized support and reporting contact channels.",
    ],
  },
];

export const staticPages = {
  about: ABOUT_CONTENT,
  download: DOWNLOAD_CONTENT,
  contact: CONTACT_CONTENT,
  terms: TERMS_CONTENT,
  privacy: PRIVACY_CONTENT,
  "content-policy": CONTENT_POLICY_CONTENT,
  "community-guidelines": COMMUNITY_GUIDELINES_CONTENT,
  resources: RESOURCES_CONTENT,
} as const;

export type StaticPageSlug = keyof typeof staticPages;
