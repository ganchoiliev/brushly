# Brushly SEO Playbook

Shipped on-site (2026-07-19): LocalBusiness (HousePainter) + WebSite + Service +
FAQPage + BreadcrumbList structured data, metadataBase + canonicals + Open Graph
/ Twitter cards + og.jpg, keyword-bearing titles, 10 location pages
(`/areas/*` — canonical 10, matching GBP), FAQ sections, sitemap (17 URLs),
robots hardening (`/api/`, `/q/`, `/i/` excluded), footer areas linking.

This file is the OFF-SITE half. On-site work compounds only if these land.

## Do immediately after deploy

1. **Google Search Console** — verify `brushly.uk` (DNS TXT via Hostinger),
   submit `https://brushly.uk/sitemap.xml`, then *URL Inspection → Request
   indexing* for `/`, `/services`, `/visualizer` and all 10 `/areas/*` pages.
   Without this, discovery of the new pages takes weeks instead of days.
2. **Rich Results Test** (search.google.com/test/rich-results) on `/`,
   `/services` and one area page — confirm HousePainter, Service, FAQPage and
   Breadcrumb all detect. Fix anything flagged before requesting indexing.
3. **Bing Webmaster Tools** — one-click import from GSC. Free traffic, zero
   maintenance.
4. **GBP website field** — confirm it points to `https://brushly.uk` (not a
   social page), and add `/visualizer` as an appointment/booking-style link if
   the category allows a secondary URL.

## Weekly cadence (fits the existing ads-scrub rhythm)

- **GBP posts**: keep the standing policy — weekly text posts with real photos
  only. Each finished job → one post, naming the town ("Full exterior in
  Banstead"). Towns named in posts reinforce the same geo entities as the new
  area pages.
- **Reviews**: continue the KMNS-style asks after every completed job. Ask the
  customer to *mention the town and the service* in their words — "wallpapering
  in Reigate" in a review is a local ranking signal money can't buy. Never
  incentivised, never scripted (Fabricated Proof doctrine).
- **GSC check** (60 seconds, alongside the ads scrub): Performance → filter
  query contains "decorator"/"painter" — watch impressions grow per town;
  Coverage → confirm the 10 area pages stay indexed.

## Citations (one-off batch, NAP must match GBP exactly)

Name **Brushly** · Phone **01737 479161** · Area **Reigate, Surrey** (hidden
address SAB). Same format everywhere:

- Yell.com, Thomson Local, Scoot, Cylex, Hotfrog (free tier only)
- Apple Business Connect + Bing Places (both free, both feed their maps)
- Houzz profile (premium-decorating audience fits the brand)
- Skip paid directory memberships (Checkatrade/MyBuilder/Bark) — doctrine is
  out-position, not join. Their value is leads, not links, and the leads race
  to the bottom on price.

## Never do

- No fabricated reviews. No aggregateRating schema mirroring Google reviews
  EVER — Google treats LocalBusiness review markup sourced from Google's own
  reviews as self-serving and ignores/penalizes it. aggregateRating only
  becomes an option if Brushly ever collects first-party reviews on-site.
- No new towns on the site without adding them to GBP in the same change
  (suspension history — site and profile must never diverge).
- No doorway pages: any future area page gets genuinely unique copy, like the
  existing 10.

## Next content moves (when there's capacity, highest ROI first)

1. **Cost guide**: "What does painting & decorating cost in Surrey?" — the
   money query. Honest ranges + what moves price + CTA to free quote. Ads
   search terms already show cost/how-much queries converting.
2. **Case studies**: one page per real completed job (photos, town, brief,
   colours used) — these become the gallery's long-tail engine and give GBP
   posts a link target.
3. **Visualizer content loop**: short guide pages per popular colour family
   ("Painting your living room in Hague Blue") linking into `/visualizer` —
   matches real render data you already collect.

## Measurement

North star stays **leads** (calls + forms + visualizer quote requests), not
rankings. Organic's job: impressions per town rising in GSC month over month,
and organic-attributed conversions appearing in the admin lead log. Review at
the monthly ads read.
