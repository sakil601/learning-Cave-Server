import { z } from 'zod';
const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid MongoDB ObjectId');
const access = z.object({
  type: z.enum(['lifetime','limited']).default('lifetime'),
  duration: z.coerce.number().int().positive().optional(),
  durationUnit: z.enum(['days','months','years']).optional(),
}).refine(v => v.type === 'lifetime' || (v.duration && v.durationUnit), { message: 'Limited access needs duration and durationUnit' });

export const createCourseSchema = z.object({
  body: z.object({
    title: z.string().trim().min(2).max(200),
    slug: z.string().trim().min(2).max(220).optional(),
    shortDescription: z.string().max(500).optional(),
    description: z.string().max(20000).optional(),
    thumbnail: z.string().max(1000).optional(),
    categories: z.array(objectId).default([]),
    tags: z.array(z.string().trim().min(1).max(50)).default([]),
    regularPrice: z.coerce.number().min(0).default(0),
    salePrice: z.coerce.number().min(0).nullable().optional(),
    isFree: z.boolean().default(false),
    access: access.optional(),
    level: z.enum(['beginner','intermediate','advanced']).default('beginner'),
    language: z.string().trim().min(2).max(20).default('bn'),
    estimatedDuration: z.coerce.number().min(0).optional(),
    autoCompleteVideoPercentage: z.coerce.number().min(1).max(100).default(90),
    certificateEnabled: z.boolean().default(false),
    certificateQuizPassPercentage: z.coerce.number().min(0).max(100).default(80),
    instructor: objectId.optional(),
    seo: z.object({ metaTitle: z.string().max(160).optional(), metaDescription: z.string().max(320).optional(), ogImage: z.string().max(1000).optional() }).optional(),
  }),
  params: z.object({}), query: z.object({}).passthrough()
});

export const updateCourseSchema = z.object({
  body: createCourseSchema.shape.body.partial().refine(v => Object.keys(v).length > 0, 'At least one field is required'),
  params: z.object({ id: objectId }), query: z.object({}).passthrough()
});

export const courseIdSchema = z.object({ body: z.object({}).passthrough(), params: z.object({ id: objectId }), query: z.object({}).passthrough() });
export const courseSlugSchema = z.object({ body: z.object({}).passthrough(), params: z.object({ slug: z.string().min(1) }), query: z.object({}).passthrough() });

export const createModuleSchema = z.object({ body: z.object({ title: z.string().trim().min(1).max(200), description: z.string().max(5000).optional(), order: z.coerce.number().int().min(0).optional(), required: z.boolean().optional() }), params: z.object({ courseId: objectId }), query: z.object({}).passthrough() });
export const updateModuleSchema = z.object({ body: createModuleSchema.shape.body.partial().refine(v => Object.keys(v).length > 0, 'At least one field is required'), params: z.object({ moduleId: objectId }), query: z.object({}).passthrough() });
export const moduleIdSchema = z.object({ body: z.object({}).passthrough(), params: z.object({ moduleId: objectId }), query: z.object({}).passthrough() });

export const createLessonSchema = z.object({ body: z.object({ title: z.string().trim().min(1).max(200), description: z.string().max(5000).optional(), order: z.coerce.number().int().min(0).optional(), video: z.object({ provider: z.enum(['youtube','bunny']), videoId: z.string().trim().min(1), duration: z.coerce.number().min(0).optional() }).optional(), isPreview: z.boolean().optional(), required: z.boolean().optional() }), params: z.object({ moduleId: objectId }), query: z.object({}).passthrough() });
export const updateLessonSchema = z.object({ body: createLessonSchema.shape.body.partial().refine(v => Object.keys(v).length > 0, 'At least one field is required'), params: z.object({ lessonId: objectId }), query: z.object({}).passthrough() });
export const lessonIdSchema = z.object({ body: z.object({}).passthrough(), params: z.object({ lessonId: objectId }), query: z.object({}).passthrough() });
