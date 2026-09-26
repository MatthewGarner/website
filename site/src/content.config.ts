import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { obsidianNotes } from './lib/loader';

const notes = defineCollection({
  loader: obsidianNotes(),
  schema: z.object({
    title: z.string().trim().min(1), date: z.coerce.date().optional(), description: z.string().trim().optional(),
    draft: z.boolean().default(false), publish: z.boolean().optional(), unlisted: z.boolean().default(false),
    aliases: z.array(z.string()).default([]), type: z.string().trim().min(1).max(40).default('essay'),
    featured: z.boolean().default(false), featureOrder: z.number().int().positive().optional(),
    excerpt: z.string().trim().optional(),
  }),
});
export const collections = { notes };
