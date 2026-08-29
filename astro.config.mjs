// @ts-check
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://bedrockfacility.com', // TODO: real domain — sitemap + canonicals depend on it
  // NOTE: `output: 'hybrid'` was REMOVED in Astro 5. The modern equivalent is
  // `output: 'static'` + an adapter; any route that needs a server marks itself
  // with `export const prerender = false` (see src/pages/api/*).
  output: 'static',
  adapter: cloudflare({ imageService: 'compile', session: false }),
  trailingSlash: 'always',
  integrations: [sitemap({ filter: (page) => !page.includes('/portal/') })],
  build: { inlineStylesheets: 'auto' },
  compressHTML: true,
  prefetch: { prefetchAll: true, defaultStrategy: 'hover' },
});
