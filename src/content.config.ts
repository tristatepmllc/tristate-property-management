import { defineCollection } from 'astro:content';
import { z } from 'zod';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ base: './src/content/blog', pattern: '**/*.md' }),
  schema: z.object({
      title: z.string().max(60),          // ~580px, the desktop SERP cut-off
      description: z.string().min(70).max(160),  // ~920px, the desktop snippet cut-off
      publishedAt: z.coerce.date(),
      updatedAt: z.coerce.date().optional(),
      author: z.string().default('Tristate Property Management'),
      category: z.string(),
      // path under /public/images, e.g. "/images/home-hvac.webp"
      cover: z.string(),
      coverAlt: z.string(),
      draft: z.boolean().default(false),
      // FAQ pairs become an FAQPage JSON-LD block on the post. Question-answer
      // pairs mapped to schema are the single highest-impact structure for
      // getting quoted by ChatGPT, Perplexity and AI Overviews.
      faqs: z.array(z.object({ q: z.string(), a: z.string() })).optional(),
    }),
});

export const collections = { blog };
