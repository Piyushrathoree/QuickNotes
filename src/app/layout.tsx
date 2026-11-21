import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, IBM_Plex_Sans, IBM_Plex_Serif, Shantell_Sans } from "next/font/google";
import type { ReactNode } from "react";
import { AppToaster } from "@/components/AppToaster";
import { site } from "@/lib/site";
import "./globals.css";

// UI chrome uses Geist, code uses Geist Mono. The three writing faces are picked by the font pref.
// Writing faces load the weights the editor and titles use (400 body, 600/700/800 for bold and headings), each with
// its italic, since *emphasis* is italic. The browser only downloads a face when text actually uses it.
const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

const shantellSans = Shantell_Sans({
  variable: "--font-shantell",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
  style: ["normal", "italic"],
  display: "swap",
});

const plexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

const plexSerif = IBM_Plex_Serif({
  variable: "--font-plex-serif",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: site.title, template: `%s · ${site.name}` },
  description: site.description,
  applicationName: site.name,
  keywords: [...site.keywords],
  authors: [site.author],
  creator: site.author.name,
  publisher: site.author.name,
  category: "productivity",
  openGraph: {
    type: "website",
    siteName: site.name,
    title: site.title,
    description: site.description,
    locale: site.locale,
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: site.title,
    description: site.description,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  appleWebApp: { capable: true, title: site.name, statusBarStyle: "default" },
  formatDetection: { telephone: false, email: false, address: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#efebdf" },
    { media: "(prefers-color-scheme: dark)", color: "#242423" },
  ],
};

// Applies the saved theme and font before first paint, so there is no flash.
const appearanceBootstrap = `
  try {
    const saved = window.localStorage.getItem("notes:ui:v1");
    const prefs = saved ? JSON.parse(saved) : undefined;
    // A stored light or dark choice wins. Otherwise (first visit, or a legacy "system" value) follow the OS once.
    const stored = prefs && prefs.theme;
    const dark = stored === "dark" || (stored !== "light" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    const font = prefs && prefs.font;
    document.documentElement.dataset.font = font === "sans" || font === "serif" ? font : "draw";
    // Desktop sidebar width is driven by this attribute (see .sb-aside in globals.css), so it is right before first paint.
    document.documentElement.dataset.sidebar = prefs && prefs.sidebarOpen === false ? "collapsed" : "open";
  } catch {}
`;

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${geist.variable} ${geistMono.variable} ${shantellSans.variable} ${plexSans.variable} ${plexSerif.variable}`}
      data-font="draw"
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: appearanceBootstrap }} />
      </head>
      <body>
        {children}
        <AppToaster />
      </body>
    </html>
  );
}
