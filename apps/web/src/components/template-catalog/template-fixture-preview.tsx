import {
  ArrowUpRightIcon,
  BriefcaseBusinessIcon,
  CheckCircle2Icon,
  CircleDollarSignIcon,
  Clock3Icon,
  FolderKanbanIcon,
  SearchIcon,
  SparklesIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import type { TemplatePattern } from "@/configs/template-catalog";
import { cn } from "@/lib/utils";

type TemplateFixturePreviewProps = {
  pattern: TemplatePattern;
};

/**
 * Compact, static product fixtures. They make each catalog entry inspectable
 * without pretending that the template bundle includes a second application.
 */
export function TemplateFixturePreview({ pattern }: TemplateFixturePreviewProps) {
  const Fixture = fixtureByPattern[pattern.id];

  return (
    <div className="overflow-hidden rounded-xl border bg-background text-[11px] shadow-sm">
      <FixtureChrome title={fixtureTitles[pattern.id]}>
        <Fixture />
      </FixtureChrome>
    </div>
  );
}

const fixtureTitles = {
  directory: "Atlas Directory",
  marketplace: "Maker Market",
  resources: "Field Notes",
  changelog: "Ship log",
  jobs: "Open roles",
  projects: "Studio Index",
} as const;

const fixtureByPattern = {
  directory: DirectoryFixture,
  marketplace: MarketplaceFixture,
  resources: ResourcesFixture,
  changelog: ChangelogFixture,
  jobs: JobsFixture,
  projects: ProjectsFixture,
} as const;

function FixtureChrome({ children, title }: { children: ReactNode; title: string }) {
  return (
    <div className="min-h-90 bg-muted/20 p-3 sm:p-4">
      <div className="mb-3 flex items-center justify-between border-b bg-background px-3 py-2.5">
        <div className="flex items-center gap-2 font-semibold tracking-tight text-foreground">
          <span className="size-2 rounded-full bg-emerald-500" />
          {title}
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <span className="hidden sm:inline">Explore</span>
          <span className="hidden sm:inline">About</span>
          <span className="rounded-full border px-2 py-1 text-[10px] font-medium text-foreground">
            Submit
          </span>
        </div>
      </div>
      {children}
    </div>
  );
}

function DirectoryFixture() {
  return (
    <div className="grid gap-3 md:grid-cols-[8.5rem_minmax(0,1fr)]">
      <aside className="hidden space-y-1 border-r pr-3 text-muted-foreground md:block">
        <FixtureLabel icon={<SparklesIcon />}>Discover</FixtureLabel>
        <FixtureNav active>All companies</FixtureNav>
        <FixtureNav>Climate</FixtureNav>
        <FixtureNav>Developer tools</FixtureNav>
        <FixtureNav>Consumer</FixtureNav>
      </aside>
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="font-semibold text-foreground">Independent teams</p>
            <p className="text-muted-foreground">126 carefully selected products</p>
          </div>
          <div className="flex items-center gap-1.5 border bg-background px-2 py-1.5 text-muted-foreground">
            <SearchIcon className="size-3" />
            Search the directory
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <DirectoryCard
            accent="bg-orange-200"
            name="Dwell"
            summary="Flexible workspaces for quiet teams"
          />
          <DirectoryCard
            accent="bg-sky-200"
            name="Threadline"
            summary="Research that stays connected"
          />
          <DirectoryCard accent="bg-emerald-200" name="Morrow" summary="A calmer climate journal" />
          <DirectoryCard
            accent="bg-rose-200"
            name="Rally"
            summary="Community tools for local clubs"
          />
        </div>
      </section>
    </div>
  );
}

function DirectoryCard({
  accent,
  name,
  summary,
}: {
  accent: string;
  name: string;
  summary: string;
}) {
  return (
    <article className="flex gap-2 border bg-background p-2.5">
      <span
        className={cn("mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md", accent)}
      >
        <ArrowUpRightIcon className="size-3 text-foreground/70" />
      </span>
      <div className="min-w-0">
        <p className="font-semibold text-foreground">{name}</p>
        <p className="line-clamp-2 leading-relaxed text-muted-foreground">{summary}</p>
      </div>
    </article>
  );
}

function MarketplaceFixture() {
  const products = [
    ["Stoneware mug", "$28", "bg-amber-100"],
    ["Desk light", "$84", "bg-sky-100"],
    ["Weekend bag", "$116", "bg-rose-100"],
  ] as const;

  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between border-b pb-3">
        <div>
          <p className="text-muted-foreground">New arrivals</p>
          <p className="text-base font-semibold text-foreground">Objects made to last</p>
        </div>
        <span className="flex items-center gap-1 text-muted-foreground">
          View all <ArrowUpRightIcon className="size-3" />
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {products.map(([name, price, color]) => (
          <article key={name} className="group space-y-2">
            <div className={cn("aspect-[4/3] border p-3", color)}>
              <div className="ml-auto flex size-8 items-center justify-center rounded-full bg-background/80 text-foreground">
                <CircleDollarSignIcon className="size-4" />
              </div>
            </div>
            <div className="flex items-start justify-between gap-2">
              <p className="font-medium text-foreground">{name}</p>
              <p className="font-semibold text-foreground">{price}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function ResourcesFixture() {
  return (
    <section className="grid gap-3 md:grid-cols-[1.15fr_0.85fr]">
      <article className="border bg-background p-4">
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-medium text-emerald-900">
          Editor's pick
        </span>
        <h3 className="mt-6 max-w-xs text-lg font-semibold tracking-tight text-foreground">
          Build a research habit your team can sustain
        </h3>
        <p className="mt-2 max-w-sm leading-relaxed text-muted-foreground">
          A practical reading system for small, fast-moving product teams.
        </p>
        <div className="mt-6 flex items-center justify-between border-t pt-3 text-muted-foreground">
          <span>8 min read</span>
          <span className="font-medium text-foreground">Read guide</span>
        </div>
      </article>
      <div className="space-y-2">
        <FixtureLabel icon={<FolderKanbanIcon />}>Latest library</FixtureLabel>
        <ResourceRow title="A better release checklist" tag="Playbook" />
        <ResourceRow title="The quiet onboarding guide" tag="Essay" />
        <ResourceRow title="Design critique prompts" tag="Toolkit" />
      </div>
    </section>
  );
}

function ResourceRow({ tag, title }: { tag: string; title: string }) {
  return (
    <article className="flex items-center justify-between gap-3 border bg-background p-2.5">
      <p className="font-medium text-foreground">{title}</p>
      <span className="shrink-0 text-muted-foreground">{tag}</span>
    </article>
  );
}

function ChangelogFixture() {
  const releases = [
    [
      "2.4",
      "Team workspaces",
      "Invite collaborators, assign ownership, and keep every launch in one place.",
    ],
    ["2.3", "Faster search", "Saved filters now open instantly from the command menu."],
    ["2.2", "Activity export", "Download the events your customers need for their audit trail."],
  ] as const;

  return (
    <section className="mx-auto max-w-xl space-y-0 border-l pl-4">
      {releases.map(([version, title, description], index) => (
        <article className="relative border-b py-3 last:border-b-0" key={version}>
          <span className="absolute -left-[1.3rem] top-4 size-2.5 rounded-full border-2 border-background bg-emerald-500" />
          <div className="flex items-center gap-2">
            <span className="rounded bg-foreground px-1.5 py-0.5 font-mono text-[10px] text-background">
              v{version}
            </span>
            <h3 className="font-semibold text-foreground">{title}</h3>
            {index === 0 ? <span className="text-emerald-700">New</span> : null}
          </div>
          <p className="mt-1 leading-relaxed text-muted-foreground">{description}</p>
        </article>
      ))}
    </section>
  );
}

function JobsFixture() {
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b pb-3">
        <div>
          <p className="text-base font-semibold text-foreground">Find work with thoughtful teams</p>
          <p className="text-muted-foreground">Remote-friendly roles from independent companies.</p>
        </div>
        <span className="border bg-background px-2 py-1.5 text-muted-foreground">
          Remote · All roles
        </span>
      </div>
      <div className="divide-y border bg-background">
        <JobRow company="Orbit House" role="Senior product designer" meta="Remote · $118k–$142k" />
        <JobRow
          company="Dawn Systems"
          role="Full-stack engineer"
          meta="New York or remote · $132k–$164k"
        />
        <JobRow company="Folio" role="Community lead" meta="London · £56k–£68k" />
      </div>
    </section>
  );
}

function JobRow({ company, meta, role }: { company: string; meta: string; role: string }) {
  return (
    <article className="grid gap-1 px-3 py-3 sm:grid-cols-[1.05fr_1.6fr_1.4fr_auto] sm:items-center sm:gap-3">
      <span className="flex items-center gap-1.5 font-medium text-foreground">
        <BriefcaseBusinessIcon className="size-3.5 text-muted-foreground" />
        {company}
      </span>
      <span className="font-semibold text-foreground">{role}</span>
      <span className="text-muted-foreground">{meta}</span>
      <ArrowUpRightIcon className="hidden size-3.5 text-muted-foreground sm:block" />
    </article>
  );
}

function ProjectsFixture() {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-semibold text-foreground">Projects in motion</p>
          <p className="text-muted-foreground">A focused view for a small studio.</p>
        </div>
        <span className="flex items-center gap-1 text-muted-foreground">
          <Clock3Icon className="size-3" /> Updated today
        </span>
      </div>
      <div className="grid gap-2 sm:grid-cols-[1.35fr_0.85fr_0.85fr]">
        <ProjectCard
          accent="border-l-emerald-500"
          name="Cedar redesign"
          progress="84%"
          status="Review"
        />
        <ProjectCard
          accent="border-l-amber-500"
          name="Field guide"
          progress="52%"
          status="In build"
        />
        <ProjectCard
          accent="border-l-sky-500"
          name="Signal launch"
          progress="28%"
          status="Research"
        />
      </div>
    </section>
  );
}

function ProjectCard({
  accent,
  name,
  progress,
  status,
}: {
  accent: string;
  name: string;
  progress: string;
  status: string;
}) {
  return (
    <article className={cn("border border-l-4 bg-background p-3", accent)}>
      <div className="flex items-start justify-between gap-2">
        <p className="font-semibold text-foreground">{name}</p>
        <CheckCircle2Icon className="size-3.5 text-muted-foreground" />
      </div>
      <p className="mt-5 text-muted-foreground">{status}</p>
      <div className="mt-2 h-1.5 overflow-hidden bg-muted">
        <div className="h-full bg-foreground" style={{ width: progress }} />
      </div>
      <p className="mt-1 text-right font-mono text-[10px] text-muted-foreground">{progress}</p>
    </article>
  );
}

function FixtureLabel({ children, icon }: { children: ReactNode; icon: ReactNode }) {
  return (
    <p className="flex items-center gap-1.5 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
      <span className="size-3">{icon}</span>
      {children}
    </p>
  );
}

function FixtureNav({ active, children }: { active?: boolean; children: ReactNode }) {
  return (
    <p
      className={cn(
        "px-2 py-1.5",
        active ? "bg-foreground font-medium text-background" : "text-muted-foreground",
      )}
    >
      {children}
    </p>
  );
}
