import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://www.virtujudge.dev";

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/pricing", "/about", "/company/"],
        disallow: [
          "/start",
          "/me",
          "/projects/",
          "/sessions/",
          "/teams/",
          "/settings/",
          "/invitations/",
          "/api/",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
