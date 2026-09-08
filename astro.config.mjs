// @ts-check
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import sitemap from '@astrojs/sitemap';
import { writeFile } from 'node:fs/promises';


/**
 * Emits the two files Cloudflare Pages needs in "advanced mode":
 *   _worker.js/index.js  – Pages looks for `index.js` inside a _worker.js
 *                          directory; the Astro adapter names its entry
 *                          `entry.mjs`, so we re-export it.
 *   _routes.json         – keeps static assets off the Worker so only the
 *                          routes listed in ROUTES_TO_WORKER are billed and
 *                          rendered on demand.
 * Harmless on a plain Workers deploy (wrangler uses `main` + .assetsignore).
 *
 * `include` here is an ALLOWLIST, not a description of what happens to be
 * dynamic today - Cloudflare Pages checks it BEFORE the Worker ever runs, so
 * a route missing from this list does not 500 or fall through to the Worker,
 * it 404s with no trace of why, because Pages looked for a static file,
 * found none (nothing here is prerendered), and stopped. That is exactly
 * what happened to /portal/ the first time it shipped as `prerender: false`
 * without being added here: `wrangler dev` (used for all local testing in
 * this repo) does not have a separate assets-vs-Worker split to get wrong,
 * so it rendered the page correctly locally right up until the real Pages
 * deploy 404'd it. ADD ANY NEW NON-/api/ ROUTE HERE THE MOMENT IT BECOMES
 * `export const prerender = false` - there is no build-time check that
 * catches a missing one, only this comment.
 */
const ROUTES_TO_WORKER = ['/api/*', '/portal', '/portal/*', '/admin', '/admin/*'];

function cloudflarePagesCompat() {
  return {
    name: 'cloudflare-pages-compat',
    hooks: {
      'astro:build:done': async ({ dir }) => {
        const out = new URL('./_worker.js/', dir);
        await writeFile(
          new URL('./index.js', out),
          "export * from './entry.mjs';\nexport { default } from './entry.mjs';\n"
        );
        await writeFile(
          new URL('./_routes.json', dir),
          JSON.stringify(
            { version: 1, include: ROUTES_TO_WORKER, exclude: ['/_astro/*', '/images/*'] },
            null,
            2
          )
        );
      },
    },
  };
}

export default defineConfig({
  site: 'https://tristatepropertymanagementllc.com', // custom domain connected 2026-09-08 - see src/data/site.ts SITE.url for why this matters beyond SEO
  // `output: 'hybrid'` was removed in Astro 5. The modern equivalent is
  // `output: 'static'` + an adapter; routes that need a server opt in with
  // `export const prerender = false` (see src/pages/api/*).
  output: 'static',

  // Flatten the build so index.html sits at the ROOT of dist/.
  // By default the Cloudflare adapter emits dist/client + dist/server, which is
  // why Pages pointed at `dist` returned 404 - there was no index.html there.
  outDir: './dist',
  build: {
    client: './',            // resolved relative to outDir -> dist/
    server: './_worker.js',  // -> dist/_worker.js/
    inlineStylesheets: 'auto',
  },

  adapter: cloudflare({ imageService: 'compile', session: false }),
  // 'always' would 301 a POST to /api/leads and drop the request body, breaking
  // the API and the future mobile app. Pages still build directory-style URLs
  // and every canonical tag is explicit, so nothing is lost for SEO.
  trailingSlash: 'ignore',
  integrations: [sitemap({ filter: (page) => !page.includes('/portal/') }), cloudflarePagesCompat()],
  compressHTML: true,
  prefetch: { prefetchAll: true, defaultStrategy: 'hover' },
});
