import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SITE, siteUrl } from "@/lib/content";

const FONTS =
  "https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,500;0,9..144,600;1,9..144,500;1,9..144,600&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500;600&display=swap";

// Runs before first paint so there is no light/dark flash.
const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem("theme");if(!t)t=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";document.documentElement.setAttribute("data-theme",t);}catch(e){}})();`;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: SITE.title,
  description: SITE.description,
  keywords: [
    "Hasnain",
    "Hasnain Zainulabdin",
    "AI developer in Hyderabad",
    "AI developer Hyderabad Sindh",
    "Software Engineer",
    "Software Engineer in Hyderabad",
    "Hyderabad Sindh",
    "AI Engineer",
    "Machine Learning Engineer",
    "RAG chatbot developer",
    "LLM developer",
    "FastAPI developer",
    "Python developer",
    "Pakistan",
  ],
  authors: [{ name: SITE.name }],
  applicationName: SITE.name,
  appleWebApp: { title: SITE.name },
  robots: {
    index: true,
    follow: true,
    "max-image-preview": "large",
    "max-snippet": -1,
    "max-video-preview": -1,
  },
  alternates: { canonical: "/", languages: { en: "/", "x-default": "/" } },
  icons: { icon: { url: "/favicon.svg", type: "image/svg+xml" } },
  openGraph: {
    type: "profile",
    siteName: SITE.name,
    locale: "en_US",
    url: "/",
    title: SITE.title,
    description:
      "AI developer and software engineer in Hyderabad, Sindh, building RAG chatbots, LLM apps, NLP pipelines and FastAPI backends.",
    images: [{ url: SITE.portrait, alt: SITE.portraitAlt }],
    firstName: "Hasnain",
    lastName: "Zainulabdin",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE.title,
    description:
      "AI developer & software engineer in Hyderabad, Sindh. RAG chatbots, LLM apps and FastAPI backends.",
    images: [{ url: SITE.portrait, alt: SITE.portraitAlt }],
  },
  other: {
    "geo.region": "PK-SD",
    "geo.placename": "Hyderabad, Sindh",
    "geo.position": "25.3960;68.3578",
    ICBM: "25.3960, 68.3578",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf7f1" },
    { media: "(prefers-color-scheme: dark)", color: "#131210" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href={FONTS} />
        <link rel="me" href={SITE.linkedin} />
        <link rel="me" href={SITE.github} />
      </head>
      <body>{children}</body>
    </html>
  );
}
