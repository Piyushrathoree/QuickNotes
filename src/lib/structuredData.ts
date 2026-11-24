import { compareChecked, comparisons, type Comparison } from "@/lib/compare";
import { absoluteUrl, site } from "@/lib/site";

const websiteId = absoluteUrl("/#website");
const appId = absoluteUrl("/#app");
const authorId = absoluteUrl("/#author");

const author = {
  "@type": "Person",
  "@id": authorId,
  name: site.author.name,
  url: site.author.url,
};

/** Home page: the site and the web app itself. */
export function homeStructuredData() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": websiteId,
        url: absoluteUrl("/"),
        name: site.name,
        alternateName: [...site.alternateNames],
        description: site.description,
        inLanguage: site.language,
        publisher: { "@id": authorId },
      },
      {
        "@type": "WebApplication",
        "@id": appId,
        name: site.name,
        url: absoluteUrl("/write"),
        description: site.summary,
        applicationCategory: "ProductivityApplication",
        applicationSubCategory: "Note-taking",
        operatingSystem: "Any (runs in a web browser)",
        browserRequirements: "Requires JavaScript and a modern web browser.",
        isAccessibleForFree: true,
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        featureList: [...site.features],
        image: absoluteUrl("/opengraph-image"),
        inLanguage: site.language,
        license: site.license,
        sameAs: [site.repo],
        author: { "@id": authorId },
        isPartOf: { "@id": websiteId },
      },
      author,
    ],
  };
}

export interface Faq {
  question: string;
  answer: string;
}

/** MCP docs page: article, breadcrumb and the visible FAQ. */
export function mcpStructuredData(faqs: readonly Faq[], description: string) {
  const pageUrl = absoluteUrl("/mcp");
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "TechArticle",
        "@id": pageUrl + "#article",
        url: pageUrl,
        headline: "Connect an AI assistant to Quick Notes",
        description,
        inLanguage: site.language,
        dateModified: site.mcpUpdated,
        author: { "@id": authorId },
        publisher: { "@id": authorId },
        isPartOf: { "@id": websiteId },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: site.name, item: absoluteUrl("/") },
          { "@type": "ListItem", position: 2, name: "MCP server", item: pageUrl },
        ],
      },
      {
        "@type": "FAQPage",
        "@id": pageUrl + "#faq",
        mainEntity: faqs.map((faq) => ({
          "@type": "Question",
          name: faq.question,
          acceptedAnswer: { "@type": "Answer", text: faq.answer },
        })),
      },
    ],
  };
}

/** About page: breadcrumb, the page itself and the visible FAQ (must match the rendered text). */
export function aboutStructuredData(faqs: readonly Faq[]) {
  const pageUrl = absoluteUrl("/about");
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "AboutPage",
        "@id": `${pageUrl}#page`,
        url: pageUrl,
        name: `About ${site.name}`,
        description: site.summary,
        inLanguage: site.language,
        isPartOf: { "@id": websiteId },
        about: { "@id": appId },
        dateModified: site.updated,
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: site.name, item: absoluteUrl("/") },
          { "@type": "ListItem", position: 2, name: "About", item: pageUrl },
        ],
      },
      {
        "@type": "FAQPage",
        "@id": `${pageUrl}#faq`,
        mainEntity: faqs.map((faq) => ({
          "@type": "Question",
          name: faq.question,
          acceptedAnswer: { "@type": "Answer", text: faq.answer },
        })),
      },
    ],
  };
}

/** One comparison page: the page, its breadcrumb and the visible FAQ (the text must match what is on the page). */
export function compareStructuredData(comparison: Comparison) {
  const pageUrl = absoluteUrl(`/compare/${comparison.slug}`);
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${pageUrl}#page`,
        url: pageUrl,
        name: `Quick Notes vs ${comparison.name}`,
        description: comparison.description,
        inLanguage: site.language,
        dateModified: compareChecked,
        isPartOf: { "@id": websiteId },
        about: { "@id": appId },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: site.name, item: absoluteUrl("/") },
          { "@type": "ListItem", position: 2, name: "Compare", item: absoluteUrl("/compare") },
          { "@type": "ListItem", position: 3, name: comparison.name, item: pageUrl },
        ],
      },
      {
        "@type": "FAQPage",
        "@id": `${pageUrl}#faq`,
        mainEntity: comparison.faq.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: { "@type": "Answer", text: item.answer },
        })),
      },
    ],
  };
}

/** The comparison hub: the page, its breadcrumb and a list of every comparison. */
export function compareHubStructuredData() {
  const pageUrl = absoluteUrl("/compare");
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": `${pageUrl}#page`,
        url: pageUrl,
        name: "How Quick Notes compares",
        inLanguage: site.language,
        dateModified: compareChecked,
        isPartOf: { "@id": websiteId },
        mainEntity: {
          "@type": "ItemList",
          itemListElement: comparisons.map((comparison, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: `Quick Notes vs ${comparison.name}`,
            url: absoluteUrl(`/compare/${comparison.slug}`),
          })),
        },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: site.name, item: absoluteUrl("/") },
          { "@type": "ListItem", position: 2, name: "Compare", item: pageUrl },
        ],
      },
    ],
  };
}
