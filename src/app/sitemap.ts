import type { MetadataRoute } from "next";

import { absoluteUrl, site } from "@/lib/site";

// Only public, indexable pages. Auth screens are noindex and the dashboard is private.
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date(`${site.updated}T00:00:00Z`);
  return [
    { url: absoluteUrl("/"), lastModified, changeFrequency: "weekly", priority: 1 },
    { url: absoluteUrl("/about"), lastModified, changeFrequency: "monthly", priority: 0.8 },
  ];
}
