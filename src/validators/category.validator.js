import { z } from 'zod';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid MongoDB ObjectId');
const categoryBody = z.object({
  name: z.string().trim().min(2).max(120),
  slug: z.string().trim().min(2).max(160).optional(),
  parent: objectId.nullable().optional(),
  description: z.string().max(3000).optional(),
  image: z.string().max(1000).optional(),
  active: z.boolean().optional(),
  sortOrder: z.coerce.number().int().min(0).optional(),
});

export const createCategorySchema = z.object({ body: categoryBody, params: z.object({}), query: z.object({}).passthrough() });
export const updateCategorySchema = z.object({ body: categoryBody.partial().refine(v => Object.keys(v).length > 0, 'At least one field is required'), params: z.object({ id: objectId }), query: z.object({}).passthrough() });
export const categoryIdSchema = z.object({ body: z.object({}).passthrough(), params: z.object({ id: objectId }), query: z.object({}).passthrough() });
