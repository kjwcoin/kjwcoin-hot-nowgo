# HOT store discovery (local implementation)

## Current release gate

All store-page metadata remains **noindex**, including public HOT hosts, and the active sitemap keeps only the existing home and suggestion URLs. `STORE_DISCOVERY_INDEXING_READY` is hard-coded false. The dynamic store enumeration below is implemented and unit-tested but is intentionally dormant. The current source DTO drops DISCOVERED/NOINDEX/PUBLISHED distinctions; a reviewed, explicit per-store publication/indexability contract is required before enabling discovery. The preview mode additionally blocks crawling and returns an empty sitemap. No current release claims indexing or new search visibility.

## Scope and factual boundaries

- HOT canonical store identities remain `https://hot.nowgo.space/p/<source-slug>` before and after an owner claim. Store UUID and original public-source reference are preserved. Legacy catalog identities retain `/place/<placeId>`; names are never used to merge or relocate stores.
- Source pages expose server-rendered name, original address, source link and source-date notice. Source `checkedAt` means the public source was checked, not the store's opening hours, menu availability or business freshness. Missing source dates remain explicitly unknown.
- `Restaurant` JSON-LD uses only known name, address, source identity, canonical URL and supplied coordinates. Unknown prices, images, ratings/reviews, opening hours, current menus, availability and fabricated freshness are omitted. The source citation belongs to the `WebPage`, not an endorsement or verification claim about the business.
- An owner-registered/gray catalog item is not relabeled as an owner-authored report. User-submitted price and heat retain the existing visible attribution; neither is a review rating.
- Inline JSON-LD serialization escapes script-breaking text. Store Open Graph copy is factual and uses the existing approved brand artwork rather than invented restaurant photos/ratings.
- Preview mode/hosts must remain noindex and excluded from sitemaps. Preview fixtures are not a production catalog. No Search Console or Naver account verification/submission is included.

## Dynamic coverage and failure policy

The request-time sitemap enumerates existing HOT catalog rows in 500-row, stable-ID-ordered batches, deduplicates exact place IDs, and validates the returned exact count on every page. A smaller upstream row cap is supported. Missing pages, duplicate rows, changing counts and unavailable data fail the sitemap rather than publishing a silently partial catalog. This is not a transactional snapshot, so a concurrent equal-count replacement remains an upstream consistency limitation.

When public source discovery is enabled, only a validated `complete: true` source feed is included. An unavailable/incomplete source feed fails the sitemap rather than pretending it represents every source store. The existing disabled flag excludes the source family intentionally. No static per-store build is needed for 4,000 source stores. The current source DTO rejects feeds above 5,000 items; expand to an explicitly paginated completeness contract before larger catalogs. A single XML sitemap is limited to 50,000 URLs; this implementation fails beyond that limit rather than silently truncating. Introduce a sitemap index with bounded chunks before that growth point.

Source-check and download timestamps are not emitted as `lastmod`; no verifiable page-modified timestamp currently exists. Crawling/indexing requires actual deployment, reachable live feed, HTTP success, crawl access and useful visible content. None of these local checks demonstrate live Google/Naver indexing or AI recommendations.

## Official guidance reviewed 2026-10-12

- [Google LocalBusiness / Restaurant](https://developers.google.com/search/docs/appearance/structured-data/local-business): specific type, accurate required facts; enhanced presentation is not guaranteed.
- [Google structured-data policies](https://developers.google.com/search/docs/appearance/structured-data/sd-policies): markup must represent visible, accurate page content.
- [Google canonical URLs](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls): align canonical links, internal links and sitemap URLs; canonicalization is a signal.
- [Google sitemap guidance](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap): absolute canonical URLs, 50,000-URL/50 MB limits, accurate meaningful lastmod only.
- [Google AI features](https://developers.google.com/search/docs/appearance/ai-features): normal SEO, crawl access, internal links, textual facts and matching schema apply. No special AI schema or AI text file is required; crawling, indexing and serving remain unguaranteed.
- [Naver structured data](https://searchadvisor.naver.com/guide/structured-data-intro) and [address markup](https://searchadvisor.naver.com/guide/structured-data-address): schema helps interpretation, without a display guarantee.
- [Naver site creation](https://searchadvisor.naver.com/guide/seo-basic-create), [robots](https://searchadvisor.naver.com/guide/seo-basic-robots) and [SEO basics](https://searchadvisor.naver.com/guide/seo-basic-intro): stable preferred URLs, accessible content/resources, sitemap discovery, unique useful text.
- [Next.js sitemap](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap), [metadata](https://nextjs.org/docs/app/api-reference/functions/generate-metadata), [JSON-LD](https://nextjs.org/docs/app/guides/json-ld): request-time routes, metadata merging and safe script serialization. Installed 16.3.4 documentation was also inspected.

## Deployment verification still required

Before authorizing release, inspect rendered production `/p/<slug>` and legacy `/place/<id>` HTML, compare visible facts to JSON-LD, verify one canonical, accurate title/description and expected robots, verify source feed completeness and source rights, and inspect full sitemap counts/URLs. Run schema validators and Search Console/Naver tools only with separate authorization. Do not claim ranking, rich results, traffic or GEO/AI citations are guaranteed.
