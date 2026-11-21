import { faqs } from "@/lib/faq";
import { absoluteUrl, site } from "@/lib/site";

// llms.txt (https://llmstxt.org): a plain Markdown summary that answer engines and AI assistants can read directly.
// Built from the same source as the page metadata and FAQ, so it can't drift from what the site says.
export function GET() {
  const body = [
    `# ${site.name}`,
    "",
    `> ${site.summary}`,
    "",
    "## Key facts",
    "",
    ...site.features.map((feature) => `- ${feature}`),
    "",
    "## Pages",
    "",
    `- [Notepad](${absoluteUrl("/")}): open it and start typing; no sign-up needed.`,
    `- [About, Markdown shortcuts and FAQ](${absoluteUrl("/about")}): how Quick Notes works, what Markdown it supports, keyboard shortcuts and answers to common questions.`,
    `- [Sign in or create an account](${absoluteUrl("/login")}): optional, to sync notes across devices.`,
    "",
    "## FAQ",
    "",
    ...faqs.flatMap((faq) => [`### ${faq.question}`, "", faq.answer, ""]),
    "## Source",
    "",
    `- [Source code on GitHub](${site.repo}) (MIT license)`,
    "",
  ].join("\n");

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
