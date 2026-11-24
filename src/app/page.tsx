import type { Metadata } from "next";

import { Landing } from "@/components/home/Landing";
import { JsonLd } from "@/components/seo/JsonLd";
import { absoluteUrl } from "@/lib/site";
import { homeStructuredData } from "@/lib/structuredData";
import "@/components/home/home.css";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  openGraph: { url: "/" },
};

/** A signed APK on HTTPS enables the direct Android download. Without one the buttons show the install options. */
function androidDownload(): string | null {
  const url = URL.parse(process.env.QUICKNOTES_ANDROID_APK_URL?.trim() ?? "");
  return url?.protocol === "https:" && !url.username && !url.password && url.pathname.toLowerCase().endsWith(".apk")
    ? url.href
    : null;
}

export default function Home() {
  return (
    <>
      <JsonLd data={homeStructuredData()} />
      <Landing apkUrl={androidDownload()} mcpUrl={absoluteUrl("/api/mcp")} />
    </>
  );
}
