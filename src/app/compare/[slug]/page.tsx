import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { JsonLd } from "@/components/seo/JsonLd";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { compareChecked, comparisons, getComparison } from "@/lib/compare";
import { compareStructuredData } from "@/lib/structuredData";
import "../compare.css";

type PageProps = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return comparisons.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const comparison = getComparison(slug);
  if (!comparison) return {};
  const title = `Quick Notes vs ${comparison.name}: Which Note App Fits?`;
  const url = `/compare/${comparison.slug}`;
  return {
    title: { absolute: title },
    description: comparison.description,
    alternates: { canonical: url },
    openGraph: { title, description: comparison.description, url, type: "article" },
    twitter: { title, description: comparison.description },
  };
}

const prettyDate = new Date(`${compareChecked}T00:00:00Z`).toLocaleDateString("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

export default async function ComparisonPage({ params }: PageProps) {
  const { slug } = await params;
  const comparison = getComparison(slug);
  if (!comparison) notFound();

  const others = comparisons.filter((item) => item.slug !== comparison.slug);

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <JsonLd data={compareStructuredData(comparison)} />
      <SiteHeader />

      <main className="mx-auto max-w-4xl px-4 pb-24 pt-10 sm:px-6 sm:pt-14">
        <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
          <ol className="flex flex-wrap gap-1.5">
            <li>
              <Link href="/" className="hover:text-foreground hover:underline">
                Quick Notes
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link href="/compare" className="hover:text-foreground hover:underline">
                Compare
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li aria-current="page" className="text-secondary-foreground">
              {comparison.name}
            </li>
          </ol>
        </nav>

        <h1 className="cmp-serif mt-6 text-4xl leading-[1.08] sm:text-5xl">Quick Notes vs {comparison.name}</h1>
        <p className="mt-5 max-w-2xl text-[17px] leading-8 text-secondary-foreground">{comparison.summary}</p>
        <p className="mt-3 max-w-2xl text-[17px] leading-8 text-secondary-foreground">
          Quick Notes is a free notepad that opens to a blank page. It formats Markdown as you type, saves guest notes in your
          browser, and needs no sign-up. Here is where each one fits.
        </p>

        <section aria-labelledby="pick-heading" className="mt-12">
          <h2 id="pick-heading" className="cmp-serif text-2xl sm:text-3xl">
            Which one should you pick?
          </h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="cmp-pick cmp-pick-quick">
              <h3>Pick Quick Notes if</h3>
              <ul>
                {comparison.quickPick.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            </div>
            <div className="cmp-pick">
              <h3>Pick {comparison.name} if</h3>
              <ul>
                {comparison.otherPick.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section aria-labelledby="side-heading" className="mt-14">
          <h2 id="side-heading" className="cmp-serif text-2xl sm:text-3xl">
            Side by side
          </h2>
          <div className="mt-6">
            <table className="cmp-table">
              <caption>Quick Notes compared with {comparison.name}</caption>
              <thead>
                <tr>
                  <th scope="col">
                    <span className="sr-only">Feature</span>
                  </th>
                  <th scope="col">Quick Notes</th>
                  <th scope="col">{comparison.name}</th>
                </tr>
              </thead>
              <tbody>
                {comparison.rows.map((row) => (
                  <tr key={row.label}>
                    <th scope="row">{row.label}</th>
                    <td className="cmp-quick" data-label="Quick Notes">
                      {row.quick}
                    </td>
                    <td data-label={comparison.name}>{row.other}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            What we say about {comparison.name} comes from its own pages, listed below, as last checked on {prettyDate}. Products
            change, so check {comparison.name}&apos;s site for the latest. Where its pages don&apos;t say, we haven&apos;t guessed.
          </p>
        </section>

        <section aria-labelledby="faq-heading" className="mt-14">
          <h2 id="faq-heading" className="cmp-serif text-2xl sm:text-3xl">
            Common questions
          </h2>
          <div className="mt-4">
            {comparison.faq.map((item) => (
              <section key={item.question} className="border-b border-border py-5">
                <h3 className="text-base font-semibold">{item.question}</h3>
                <p className="mt-2 text-[15px] leading-7 text-secondary-foreground">{item.answer}</p>
              </section>
            ))}
          </div>
        </section>

        <section aria-labelledby="sources-heading" className="mt-12">
          <h2 id="sources-heading" className="text-base font-semibold">
            Sources
          </h2>
          <ul className="mt-3 flex flex-col gap-1.5 text-sm">
            {comparison.sources.map((source) => (
              <li key={source.url}>
                <a href={source.url} rel="noopener noreferrer" className="font-medium text-brand underline-offset-4 hover:underline">
                  {comparison.name}: {source.label}
                </a>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-16 rounded-2xl border border-border bg-pad px-6 py-8 sm:px-10">
          <h2 className="cmp-serif text-2xl sm:text-3xl">Try it in a few seconds</h2>
          <p className="mt-3 max-w-xl text-[15px] leading-7 text-secondary-foreground">
            Open the notepad and start typing. Nothing to install, no account to make.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <Link
              href="/write"
              className="inline-flex h-11 items-center rounded-[10px] bg-primary px-5 text-[15px] font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              Open the notepad
            </Link>
            <Link href="/compare" className="text-sm font-medium text-brand underline-offset-4 hover:underline">
              See all comparisons
            </Link>
          </div>
        </section>

        <nav aria-label="Other comparisons" className="mt-12">
          <h2 className="text-base font-semibold">Compare with another app</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {others.map((item) => (
              <li key={item.slug}>
                <Link
                  href={`/compare/${item.slug}`}
                  className="inline-flex h-9 items-center rounded-lg border border-border bg-pad px-3 text-sm text-secondary-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
                >
                  vs {item.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </main>

      <SiteFooter />
    </div>
  );
}
