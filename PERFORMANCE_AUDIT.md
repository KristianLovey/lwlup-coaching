# Performance Audit and Optimization

Date: 2026-09-15

## Scope and Constraints

Reviewed route structure and shared imports across public pages, training,
admin/trainer panels, images, global styles, fonts, configuration, and SEO.
This is a source audit, not an exhaustive runtime profile or a security audit.
API queries, authorization, writes, calculations, cache formats, translations,
and existing animation behavior were intentionally preserved.

Project instructions prohibit installing dependencies without approval. No
approval was received, so no Next production build, browser regression suite,
Lighthouse run, authenticated workflow test, or field CWV measurement was run.
Esbuild checks do not establish TypeScript or Next build correctness.

## Findings by Impact

| Impact | Problem / root cause | Fix applied or remaining work | Expected gain |
| --- | --- | --- | --- |
| Critical | Homepage headline is invisible until hydration and then fades in over 1.2 seconds. | Not changed: preserve existing animation behavior. | Removing the gate could reduce LCP render delay, but requires approval for that visual change. |
| High | All six hero slides overlap in the viewport; opacity does not prevent image fetches. | Not changed: progressive loading needs browser verification to preserve crossfades and autoplay. | Potentially fewer competing image requests; not measured. |
| High | Training eagerly imports Hub and Meet Day even when the program tab is selected. | Dynamic imports with the existing TrainingLoader. Component props and data prefetch are unchanged. | Removes inactive feature code from the static entry graph. First visit to a tab can show a loader while its chunk downloads. |
| High | Admin/trainer shell imports dashboard analytics for its small settings model. | Extracted settings model and drawer; dynamically imported AthleteDashboard. Drawer stays mounted to preserve transitions. | Other sections do not statically pull in dashboard analytics. Opening the dashboard still requires that code. |
| High | Athlete panels eagerly import Meet Day and priority administration. | Conditional subsections use dynamic imports and the established section loader. | Less code in the initial athlete-panel dependency graph. |
| High | Team uses raw portrait images; local originals include a 3.15 MB photo. | Responsive Next Image for local `/slike/` URLs; external URLs retain unoptimized compatibility. | Smaller mobile transfers via existing AVIF/WebP optimizer; exact savings need network measurements. |
| High | Team/competition canvas loops continuously calculate particle connections. Homepage already has some pause logic. | Not changed: animation behavior preserved. | CPU/INP opportunity remains; requires profiling and visual regression checks. |
| Medium | Navbar stores every scroll offset although styling only depends on `scrollY > 80`. | Stores a boolean threshold using the same listener and threshold. | Avoids committed navigation renders for each new scroll position. |
| Medium | Four mono font weights are preloaded globally. | Use variable JetBrains Mono without preload; body/display font strategy unchanged. | Fewer critical font preload requests; verify font timing and CLS in browser. |
| Medium | Navbar logo competes with critical images through priority preloading. | Eager loading without priority preload. | Less preload competition while keeping the logo eager. |
| Medium | Public routes inherit generic metadata; sitemap and robots were absent. | Added route titles, descriptions, canonical/Open Graph/Twitter metadata, sitemap, robots. | Better crawl discovery and page identity; no numeric Lighthouse claim. |
| Medium | Nested link/button controls, clickable carousel divs, and low-contrast text remain. | Not changed in this functionality-preserving pass. | Accessibility targets remain unverified and may require UI changes. |
| Low | Global CSS contains legacy selectors with no source consumers. | Removed verified unused selectors, preserving active rules. | Modest reduction of shared CSS. |

## Already Configured

- Next Image negotiates AVIF/WebP with responsive widths and lazy loading.
- Fonts are self-hosted by next/font with font-display: swap.
- Next route splitting and package import optimization already exist.
- Admin subsection dynamic imports and several parallel data loads already exist.
- Supabase preconnect and DNS-prefetch are present and unchanged.
- `/slike/` and production hashed assets already specify one-year immutable caching.
- Root Organization JSON-LD and Open Graph metadata already exist.
- The script scan found root JSON-LD, not an executable third-party analytics tag.
- Existing client components still get Next server prerendering where supported;
  `use client` alone does not imply a blank server response.

## Deliberately Not Changed

- Original assets are retained: database-stored paths may reference them. The
  largest source photo is 6,944,727 bytes, not necessarily its delivered size.
- No broad CSS purge or extra critical-CSS inliner: active inline/scoped styles
  and Next CSS handling require production coverage before such changes.
- No dependencies removed solely because they appear unused in frontend code;
  Capacitor and Resend belong to native/backend workflows.
- No cache policy changes for authenticated HTML, API responses, or mutable data.
  Existing immutable `/slike/` URLs must be renamed when image content changes.
- No broad server-component conversion: language state and interactive forms
  must keep their current behavior. Public metadata now runs on the server.
- No proxy/auth changes. The broad proxy matcher still covers public pages and
  the new SEO endpoints; the Supabase session-refresh cost needs runtime review.
- Homepage canonical metadata, private-route noindex policies, full contrast and
  keyboard testing, and production social-image checks remain follow-up work.

## Verification

Passed:

- Esbuild syntax checks for touched TS/TSX and CSS files.
- VS Code diagnostics: no reported errors in checked edited files.
- Local esbuild splitting with dependencies externalized: Hub and Meet Day are
  absent from training's static entry graph; analytics dashboard is absent from
  admin's static entry graph; settings drawer remains in the eager graph.
- Node assertions: all nine dashboard defaults unchanged, new settings instances
  independent, canonical/social metadata consistent, seven unique public sitemap
  URLs, no private application routes in sitemap, robots links to sitemap.
- `git diff --check` produced no errors at verification time.

The externalized, minified esbuild check produced approximately 125.2 KiB for
the Hub feature chunk, 37.8 KiB for Meet Day, and 34.1 KiB for the dashboard
feature chunk. These are diagnostic local chunks, NOT measured Next bundles,
compressed transfer savings, total route payloads, or before/after comparisons.

## Lighthouse and Core Web Vitals

| Metric | Target | Result / estimate |
| --- | --- | --- |
| Performance | 95+ | Unmeasured; a numeric improvement estimate is not defensible without a baseline. |
| Accessibility | 95+ | Unmeasured; known UI issues remain. |
| Best Practices | 100 | Unmeasured. |
| SEO | 100 | Discovery/metadata improved; score unmeasured. |
| LCP | < 2.5 s | Portrait transfer and font contention should improve; homepage hydration gate remains. |
| INP | < 200 ms | Less initial parsing and navbar rendering; interaction latency unmeasured. |
| CLS | < 0.1 | Existing portrait frame preserved; font/chunk loading still needs browser measurement. |

Lighthouse lab scores do not establish field INP. Final acceptance requires a
production build, mobile and desktop browser checks, authenticated training/admin
regressions, repeated Lighthouse runs, and field or RUM interaction measurements.

## Changed Files

- `src/app/components/Navbar.tsx`: scroll state and logo resource priority.
- `src/app/training/page.tsx`: Hub and Meet Day splitting.
- `src/app/admin/athlete-panels.tsx`: Meet Day and priority splitting.
- `src/app/admin/admin-os.tsx`: dashboard splitting; shared by trainer route.
- `src/app/admin/admin-os-dashboard.tsx`: settings extraction and compatible re-exports.
- `src/app/admin/dashboard-settings.ts`: shared settings model.
- `src/app/admin/dashboard-settings-drawer.tsx`: unchanged drawer UI isolated from analytics.
- `src/app/team/page.tsx`: responsive local portraits.
- `src/app/globals.css`: unused selector removal.
- `src/app/layout.tsx`: mono font loading, metadata base, Twitter metadata.
- `src/lib/page-metadata.ts`: shared public metadata helper.
- `src/app/{team,competitions,records,treneri,survey}/layout.tsx`: route metadata.
- `src/app/pravila/page.tsx`: legal-page metadata.
- `src/app/sitemap.ts`, `src/app/robots.ts`: crawl discovery.
- `PERFORMANCE_AUDIT.md`: findings, verification, and remaining gates.

## Representative Diffs

```diff
- const [scrollY, setScrollY] = useState(0)
- const fn = () => setScrollY(window.scrollY)
+ const [pastScrollThreshold, setPastScrollThreshold] = useState(false)
+ const fn = () => setPastScrollThreshold(window.scrollY > 80)
```

```diff
- import { HubTab } from './training-hub'
+ const HubTab = dynamic(() => import('./training-hub').then(module => module.HubTab),
+   { ssr: false, loading: TrainingLoader })
```

```diff
- <img src={member.img} alt={member.name} loading="lazy" ... />
+ <Image src={member.img} alt={member.name} fill loading="lazy"
+   sizes="(max-width: 768px) calc(100vw - 40px), (max-width: 1200px) 50vw, 500px"
+   unoptimized={!member.img.startsWith('/slike/')} ... />
```