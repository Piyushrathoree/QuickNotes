import type { Metadata } from "next";
import Link from "next/link";

import { JsonLd } from "@/components/seo/JsonLd";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { compareChecked, comparisons } from "@/lib/compare";
import { compareHubStructuredData } from "@/lib/structuredData";
import "./compare.css";

const title = "Quick Notes vs Notion, Obsidian, Google Keep and More";
const description =
  "How Quick Notes compares with Notion, Obsidian, Google Keep, Apple Notes, Simplenote, Evernote, Notes.io and QuickNote.io, using what each product says about itself.";

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  alternates: { canonical: "/compare" },
  openGraph: { title, description, url: "/compare", type: "article" },
  twitter: { title, description },
};

const prettyDate = new Date(`${compareChecked}T00:00:00Z`).toLocaleDateString("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

const jobs: { job: string; pick: string; slug?: string }[] = [
  { job: "Write a note right now, no setup", pick: "Quick Notes" },
  { job: "Run projects and wikis with linked pages", pick: "Notion", slug: "notion" },
  { job: "Build a knowledge base on your own files", pick: "Obsidian", slug: "obsidian" },
  { job: "Keep reminders, photos and voice notes", pick: "Google Keep", slug: "google-keep" },
];

export default function ComparePage() {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <JsonLd data={compareHubStructuredData()} />
      <SiteHeader />

      <main className="mx-auto max-w-5xl px-4 pb-24 pt-10 sm:px-6 sm:pt-14">
        <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
          <ol className="flex gap-1.5">
            <li>
              <Link href="/" className="hover:text-foreground hover:underline">
                Quick Notes
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li aria-current="page" className="text-secondary-foreground">
              Compare
            </li>
          </ol>
        </nav>

        <h1 className="cmp-serif mt-6 max-w-3xl text-4xl leading-[1.08] sm:text-5xl">How Quick Notes compares</h1>
        <p className="mt-5 max-w-2xl text-[17px] leading-8 text-secondary-foreground">
          The right note app depends on the job. Here is how Quick Notes lines up against eight others, using only what each
          product says about itself. We say when they&apos;re the better choice, too.
        </p>

        <section aria-labelledby="jobs-heading" className="mt-12">
          <h2 id="jobs-heading" className="cmp-serif text-2xl sm:text-3xl">
            Start with the job
          </h2>
          <ul className="mt-6 grid gap-px overflow-hidden rounded-[14px] border border-border bg-border sm:grid-cols-2">
            {jobs.map(({ job, pick, slug }) => (
              <li key={job} className="bg-pad">
                {slug ? (
                  <Link
                    href={`/compare/${slug}`}
                    className="block px-5 py-4 transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
                  >
                    <span className="block text-[15px] leading-6">{job}</span>
                    <span className="mt-1 block text-sm font-semibold">{pick}</span>
                  </Link>
                ) : (
                  <Link
                    href="/write"
                    className="block px-5 py-4 transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
                  >
                    <span className="block text-[15px] leading-6">{job}</span>
                    <span className="mt-1 block text-sm font-semibold">{pick}</span>
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="all-heading" className="mt-14">
          <h2 id="all-heading" className="cmp-serif text-2xl sm:text-3xl">
            All comparisons
          </h2>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2">
            {comparisons.map((comparison) => (
              <li key={comparison.slug}>
                <Link href={`/compare/${comparison.slug}`} className="cmp-card">
                  <span className="cmp-serif text-xl">Quick Notes vs {comparison.name}</span>
                  <span className="text-sm leading-6 text-secondary-foreground">
                    {comparison.name} is best for: {comparison.best.charAt(0).toLowerCase() + comparison.best.slice(1)}.
                  </span>
                  <span className="mt-auto pt-2 text-sm font-medium text-brand">Read the comparison</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-14 max-w-2xl">
          <h2 className="text-base font-semibold">How we compare</h2>
          <p className="mt-2 text-[15px] leading-7 text-secondary-foreground">
            Everything we say about another product comes from that product&apos;s own pages, which every comparison lists as
            sources. We last checked them on {prettyDate}. When a product&apos;s pages don&apos;t say something, we leave it out
            instead of guessing. Products change, so check their sites for the latest.
          </p>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
