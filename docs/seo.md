# Handoff SEO notes

## Search intent

The homepage targets `freelance project management software`. Related phrases used in headings and FAQ copy are:

- project management for freelancers
- client management software for freelancers
- freelance client portal
- project tracking for freelancers
- free, open-source project management for freelancers

These are phrased from current search results and product category language. They are not search-volume estimates. Use Google Search Console queries and impressions after launch to decide which terms deserve dedicated pages.

## Where to update things

- `lib/seo.ts` holds the public site origin, shared description, creator profiles, and metadata helper.
- `app/page.tsx` sets the homepage title, canonical URL, and homepage entity data.
- `components/landing-page/faq.tsx` contains the search-focused questions and answers. Keep these answers accurate to current product behavior.
- `app/sitemap.ts` lists public pages. Add new indexable marketing pages there.
- `app/robots.ts` publishes crawler rules and the sitemap URL.
- `app/opengraph-image.tsx` generates the social sharing image from the public logo.

Set `NEXT_PUBLIC_APP_URL` to the canonical production origin in the hosting environment. It currently falls back to the Handoff Vercel deployment URL. Update that fallback in `lib/seo.ts` if the production hostname changes.

Sign-in, sign-up, password recovery, verification, invitation, dashboard, and client portal pages are marked `noindex`. Keep private workspace pages out of the sitemap.

## After deployment

Add the canonical hostname to Google Search Console and Bing Webmaster Tools, submit `/sitemap.xml`, and inspect the homepage and key public pages. Review actual queries, clicks, and indexing status before changing the keyword focus. Google can rewrite titles and snippets and does not use the `meta keywords` tag.
