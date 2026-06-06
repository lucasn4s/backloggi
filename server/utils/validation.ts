import { z } from 'zod'

export const backlogCreateSchema = z.object({
  igdbGameId: z.number().int().positive(),
  status: z.enum(['playing', 'backlog', 'completed', 'dropped']).optional(),
})

export const backlogUpdateSchema = z.object({
  status: z.enum(['playing', 'backlog', 'completed', 'dropped']).optional(),
  rating: z.number().int().min(1).max(10).optional(),
  notes: z.string().max(2000).optional(),
})

export const gameSearchQuerySchema = z.object({
  q: z.string().min(2).max(200),
  page: z.coerce.number().int().min(0).optional().default(0),
})

export const gameIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
})

export function validateBody<T>(schema: z.ZodSchema<T>, body: unknown): T {
  const result = schema.safeParse(body)
  if (!result.success) {
    throw createError({
      statusCode: 400,
      message: result.error.issues.map(i => i.message).join(', '),
    })
  }
  return result.data
}

export function validateQuery<T>(schema: z.ZodSchema<T>, query: unknown): T {
  const result = schema.safeParse(query)
  if (!result.success) {
    throw createError({
      statusCode: 400,
      message: result.error.issues.map(i => i.message).join(', '),
    })
  }
  return result.data
}
