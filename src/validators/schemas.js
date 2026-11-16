import { z } from 'zod';

const request = z.object({ body: z.unknown(), params: z.record(z.string(), z.string()), query: z.record(z.string(), z.unknown()) });
const amount = z.number().finite().positive().max(1000000000).refine((value) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-7, 'amount must have at most two decimal places.');
const dateValue = z.coerce.date();

export const createExpenseSchema = request.extend({
  body: z.object({
    amount,
    category: z.string().trim().min(1).max(50),
    date: dateValue,
    description: z.string().trim().max(500).optional().default(''),
    merchant: z.string().trim().max(120).optional().default(''),
  }).strict(),
});

export const updateExpenseSchema = request.extend({
  params: z.object({ id: z.string().regex(/^[a-f\d]{24}$/i) }),
  body: z.object({
    amount: amount.optional(),
    category: z.string().trim().min(1).max(50).optional(),
    date: dateValue.optional(),
    description: z.string().trim().max(500).optional(),
    merchant: z.string().trim().max(120).optional(),
  }).strict().refine((value) => Object.keys(value).length > 0, 'Provide at least one field to update.'),
});

export const expenseIdSchema = request.extend({
  params: z.object({ id: z.string().regex(/^[a-f\d]{24}$/i) }),
});

const optionalDateFilter = z.string().date().optional();
export const listExpensesSchema = request.extend({
  query: z.object({
    category: z.string().trim().min(1).max(50).optional(),
    from: optionalDateFilter,
    to: optionalDateFilter,
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    sortBy: z.enum(['date', 'amount', 'category', 'createdAt']).default('date'),
    order: z.enum(['asc', 'desc']).default('desc'),
  }).passthrough().refine((query) => !query.from || !query.to || query.from <= query.to, {
    path: ['to'], message: 'to must be the same day or later than from.',
  }),
});

export const yearQuerySchema = request.extend({
  query: z.object({ year: z.coerce.number().int().min(2000).max(2100).default(new Date().getUTCFullYear()) }).passthrough(),
});

export const reportRangeSchema = request.extend({
  query: z.object({ from: optionalDateFilter, to: optionalDateFilter }).passthrough().refine((query) => !query.from || !query.to || query.from <= query.to, {
    path: ['to'], message: 'to must be the same day or later than from.',
  }),
});

export const budgetSchema = request.extend({
  params: z.object({ month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/) }),
  body: z.object({
    amount: amount,
    alertThreshold: z.number().finite().min(1).max(1000).optional().default(100),
  }).strict(),
});

export const budgetMonthSchema = request.extend({
  params: z.object({ month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/) }),
});
