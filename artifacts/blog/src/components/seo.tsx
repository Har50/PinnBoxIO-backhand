import { Helmet } from "react-helmet-async";
import { useLocation } from "wouter";

const SITE_ORIGIN = "https://pinnboxio.net";
const BASE_PATH = "/blog";

interface SEOProps {
  title: string;
  description?: string;
  image?: string;
  url?: string;
  type?: string;
}

function toAbsolute(value: string): string {
  if (/^https?:\/\//i.test(value)) return value;
  return `${SITE_ORIGIN}${value.startsWith("/") ? "" : "/"}${value}`;
}

export function SEO({
  title,
  description = "Insights, news, and deep-dives on productivity, unified communications, and how to tame your inbox with PinnboxIO.",
  image = "/blog/og-fallback.png",
  url,
  type = "website",
}: SEOProps) {
  const [location] = useLocation();
  const path = location === "/" ? "" : location;
  const canonical = url ?? `${SITE_ORIGIN}${BASE_PATH}${path}`;
  const absoluteImage = toAbsolute(image);

  const siteName = "PinnboxIO Blog";
  const fullTitle = `${title} | ${siteName}`;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonical} />

      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={absoluteImage} />
      <meta property="og:url" content={canonical} />
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={siteName} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={absoluteImage} />
    </Helmet>
  );
}
