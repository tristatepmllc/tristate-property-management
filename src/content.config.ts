import { defineCollection } from 'astro:content';
import { z } from 'zod';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ base: './src/content/blog', pattern: '**/*.md' }),
  schema: z.object({
      title: z.string().max(70),          // keep SERP titles from truncating
      description: z.string().min(70).max(165),
      publishedAt: z.coerce.date(),
      updatedAt: z.coerce.date().optional(),
      author: z.string().default('Tristate Property Management'),
      category: z.string(),
      // path under /public/images, e.g. "/images/home-hvac.webp"
      cover: z.string(),
      coverAlt: z.string(),
      draft: z.boolean().default(false),
    }),
});

export const collections = { blog };
