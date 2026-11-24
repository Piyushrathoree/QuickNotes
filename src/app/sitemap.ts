import type { MetadataRoute } from "next";

import { compareChecked, comparisons } from "@/lib/compare";
import { absoluteUrl, site } from "@/lib/site";

// Only public, indexable pages. Auth screens are noindex and the dashboard is private.
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date(`${site.updated}T00:00:00Z`);
  return [
    { url: absoluteUrl("/"), lastModified, changeFrequency: "weekly", priority: 1 },
    { url: absoluteUrl("/write"), lastModified, changeFrequency: "monthly" },
    { url: absoluteUrl("/about"), lastModified, changeFrequency: "monthly", priority: 0.8 },
    { url: absoluteUrl("/compare"), lastModified: new Date(`${compareChecked}T00:00:00Z`), changeFrequency: "monthly", priority: 0.7 },
    ...comparisons.map((comparison) => ({
      url: absoluteUrl(`/compare/${comparison.slug}`),
      lastModified: new Date(`${compareChecked}T00:00:00Z`),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    { url: absoluteUrl("/mcp"), lastModified: new Date(site.mcpUpdated), changeFrequency: "monthly", priority: 0.8 },
  ];
}
