import type { ReactNode } from "react";
import Link from "next/link";
import "./globals.css";
import ThemeToggle from "./theme-toggle";

export const metadata = {
  title: "Mentorque Ops Dashboard",
  description: "Track and manage candidate journeys end to end",
};

const NAV = [
  { href: "/",            label: "Home",        icon: "⌂" },
  { href: "/candidates",  label: "Candidates",  icon: "⊞" },
  { href: "/opted-out",   label: "Opted out",   icon: "⊝" },
  { href: "/templates",   label: "Templates",   icon: "✉" },
];

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-950 text-slate-50 antialiased">
        {/* Top nav */}
        <header className="mq-header sticky top-0 z-50 border-b">
          <div className="mx-auto flex max-w-screen-xl items-center gap-8 px-6 py-3">
            <span className="flex items-center gap-2 text-base font-bold tracking-tight text-white">
              <span className="rounded-md bg-white/20 px-2 py-1 text-xs font-black text-white">MQ</span>
              Ops Dashboard
            </span>
            <nav className="flex items-center gap-1">
              {NAV.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  className="rounded-lg px-3 py-1.5 text-sm font-medium text-white/75 transition hover:bg-white/10 hover:text-white"
                >
                  {n.label}
                </Link>
              ))}
            </nav>
            <div className="ml-auto">
              <ThemeToggle />
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="mx-auto max-w-screen-xl px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
