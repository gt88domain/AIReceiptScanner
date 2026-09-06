import { Link } from "@tanstack/react-router";
import { BookOpenIcon, SearchIcon } from "lucide-react";
import type { ReactNode } from "react";

const nav = [
  { label: "Home", to: "/" as const },
  { label: "Novels", to: "/novels" as const },
  { label: "Universes", to: "/worlds" as const },
  { label: "Rankings", to: "/ranking" as const },
  { label: "Community", to: "/forums" as const },
];

export function NovelPublicShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f7f9fc] font-sans text-slate-700">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex min-h-16 w-full max-w-[1180px] items-center gap-4 px-4 lg:px-6">
          <Link
            to="/"
            className="flex shrink-0 items-center gap-2 font-serif text-[2rem] leading-none text-slate-900"
          >
            <span className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-sky-400 to-emerald-300 text-white">
              <BookOpenIcon className="size-4" />
            </span>
            AINovel
          </Link>
          <nav
            className="hidden min-w-0 items-center gap-1 md:flex"
            aria-label="Primary navigation"
          >
            {nav.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                activeProps={{ className: "border-sky-500 text-sky-600" }}
                className="border-b-2 border-transparent px-3 py-[21px] text-sm font-semibold text-slate-700 hover:text-sky-600"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <Link
            to="/novels"
            className="ml-auto flex h-10 min-w-0 max-w-[20rem] flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-400 hover:border-sky-300 hover:bg-white"
          >
            <SearchIcon className="size-4 shrink-0" />
            <span className="truncate">Search novels</span>
            <kbd className="ml-auto hidden rounded border bg-white px-1.5 py-0.5 text-xs text-slate-400 sm:block">
              /
            </kbd>
          </Link>
          <span className="hidden text-sm font-medium text-slate-700 lg:block">EN</span>
          <Link to="/auth/sign-in" className="hidden text-sm font-semibold text-slate-800 sm:block">
            Log in
          </Link>
          <a
            href="/download"
            className="hidden rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-700 lg:block"
          >
            Get the Mac app
          </a>
        </div>
      </header>
      <div className="mx-auto w-full max-w-[1180px]">{children}</div>
      <footer className="mt-12 border-t border-slate-200 bg-white">
        <div className="mx-auto grid w-full max-w-[1180px] gap-8 px-4 py-12 sm:grid-cols-[1.5fr_repeat(3,1fr)] lg:px-6">
          <div>
            <p className="font-serif text-2xl text-slate-900">AINovel</p>
            <p className="mt-3 max-w-xs text-sm leading-6 text-slate-500">
              AI-Powered Stories. Infinite Possibilities.
            </p>
          </div>
          <FooterColumn
            title="Platform"
            links={[
              { label: "Novels", to: "/novels" },
              { label: "Worlds", to: "/worlds" },
              { label: "Rankings", to: "/ranking" },
            ]}
          />
          <FooterColumn
            title="Resources"
            links={[
              { label: "Community", to: "/forums" },
              { label: "Writing Resources", to: "/resources" },
              { label: "Announcements", to: "/announcements" },
            ]}
          />
          <FooterColumn
            title="Company"
            links={[
              { label: "About Us", to: "/about" },
              { label: "Contact", to: "/contact" },
              { label: "Privacy", to: "/privacy" },
            ]}
          />
        </div>
        <p className="border-t border-slate-200 py-5 text-center text-xs text-slate-500">
          © 2026 AINovel. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: Array<{ label: string; to: string }>;
}) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
      <ul className="mt-3 space-y-2 text-sm text-slate-500">
        {links.map((link) => (
          <li key={link.to}>
            <a href={link.to} className="hover:text-sky-600">
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
