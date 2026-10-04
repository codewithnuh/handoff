import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/seo";

const publicPages = [
  "/",
  "/about",
  "/contact",
  "/security",
  "/privacy",
  "/terms",
  "/cookies",
  "/refund",
];

export default function sitemap(): MetadataRoute.Sitemap {
  return publicPages.map((path) => ({ url: new URL(path, siteUrl).toString() }));
}
