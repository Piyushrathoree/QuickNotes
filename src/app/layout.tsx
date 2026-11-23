import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import type { ReactNode } from "react";
import { AppToaster } from "@/components/AppToaster";
import { WebAnalytics } from "@/components/WebAnalytics";
import { site } from "@/lib/site";
import "./globals.css";

// Bundle these faces with the repo so a production build needs no font downloads.
const geist = localFont({
  src: "../../assets/fonts/geist/Geist.woff2",
  variable: "--font-geist-sans",
  weight: "100 900",
  display: "swap",
});
const geistMono = localFont({
  src: "../../assets/fonts/geistmono/GeistMono.woff2",
  variable: "--font-geist-mono",
  weight: "100 900",
  display: "swap",
  preload: false,
});
const patrickHand = localFont({
  src: "../../assets/fonts/patrickhand/PatrickHand-Regular.woff2",
  variable: "--font-patrick-hand",
  weight: "400",
  display: "swap",
});
const plexMono = localFont({
  src: [
    { path: "../../assets/fonts/ibmplexmono/IBMPlexMono-Regular.woff2", weight: "400", style: "normal" },
    { path: "../../assets/fonts/ibmplexmono/IBMPlexMono-Italic.woff2", weight: "400", style: "italic" },
    { path: "../../assets/fonts/ibmplexmono/IBMPlexMono-Medium.woff2", weight: "500", style: "normal" },
    { path: "../../assets/fonts/ibmplexmono/IBMPlexMono-MediumItalic.woff2", weight: "500", style: "italic" },
  ],
  variable: "--font-plex-mono",
  display: "swap",
  preload: false,
});
const plexSans = localFont({
  src: [
    { path: "../../assets/fonts/ibmplexsans/IBMPlexSans.woff2", weight: "100 700", style: "normal" },
    { path: "../../assets/fonts/ibmplexsans/IBMPlexSans-Italic.woff2", weight: "100 700", style: "italic" },
  ],
  variable: "--font-plex-sans",
  display: "swap",
  preload: false,
});
const plexSerif = localFont({
  src: [
    { path: "../../assets/fonts/ibmplexserif/IBMPlexSerif-Regular.woff2", weight: "400", style: "normal" },
    { path: "../../assets/fonts/ibmplexserif/IBMPlexSerif-Italic.woff2", weight: "400", style: "italic" },
    { path: "../../assets/fonts/ibmplexserif/IBMPlexSerif-SemiBold.woff2", weight: "600", style: "normal" },
    { path: "../../assets/fonts/ibmplexserif/IBMPlexSerif-SemiBoldItalic.woff2", weight: "600", style: "italic" },
    { path: "../../assets/fonts/ibmplexserif/IBMPlexSerif-Bold.woff2", weight: "700", style: "normal" },
    { path: "../../assets/fonts/ibmplexserif/IBMPlexSerif-BoldItalic.woff2", weight: "700", style: "italic" },
  ],
  variable: "--font-plex-serif",
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: site.title, template: `%s · ${site.name}` },
  description: site.description,
  applicationName: site.name,
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

// Zoom stays enabled (no maximumScale or userScalable=no). "cover" lets the shell use the notch and home-indicator
// areas, which it pads with env(safe-area-inset-*). "resizes-content" makes the on-screen keyboard shrink the layout
// viewport (100dvh follows it), so the caret stays in view.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
  themeColor: "#efebdf",
};

// Applies the saved theme and font before first paint, so there is no flash.
const appearanceBootstrap = `
  try {
    const saved = window.localStorage.getItem("notes:ui:v1");
    const prefs = saved ? JSON.parse(saved) : undefined;
    // Only an explicit stored "dark" makes the app dark. Everything else (first visit, "light", "system", invalid) is light.
    const dark = prefs && prefs.theme === "dark";
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    // Pages without the app shell (about, login) keep the light theme-color unless it is set here.
    if (dark) document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => { meta.content = "#242423"; });
    const font = prefs && prefs.font;
    document.documentElement.dataset.font =
      font === "sans" || font === "serif" || font === "mono" ? font : "hand";
    const size = prefs && prefs.size;
    document.documentElement.dataset.size =
      size === "small" || size === "large" || size === "xlarge" ? size : "medium";
    // Desktop sidebar width is driven by this attribute (see .sb-aside in globals.css), so it is right before first paint.
    document.documentElement.dataset.sidebar = prefs && prefs.sidebarOpen === false ? "collapsed" : "open";
  } catch {}
`;

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${geist.variable} ${geistMono.variable} ${patrickHand.variable} ${plexMono.variable} ${plexSans.variable} ${plexSerif.variable}`}
      data-font="hand"
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: appearanceBootstrap }} />
      </head>
      <body>
        {children}
        <AppToaster />
        <WebAnalytics />
      </body>
    </html>
  );
}
