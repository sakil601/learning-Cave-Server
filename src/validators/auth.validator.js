import { z } from 'zod';

export const registerSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(100),
    email: z.string().email(),
    phone: z.string().min(6).max(30),
    password: z.string().min(8).max(128),
    confirmPassword: z.string().min(8).max(128),
    role: z.enum(['student', 'instructor']).default('student'),
  }).refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

export const loginSchema = z.object({
  body: z.object({
    login: z.string().min(3),
    password: z.string().min(1),
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});
