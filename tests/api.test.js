import { afterAll, afterEach, beforeAll, describe, expect, test } from '@jest/globals';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import app from '../src/app.js';
import { Budget } from '../src/models/Budget.js';
import { Expense } from '../src/models/Expense.js';

let mongo;

async function createExpense(fields = {}) {
  return request(app).post('/api/expenses').send({
    amount: 12.34,
    category: 'food',
    date: '2026-05-15T12:00:00.000Z',
    description: 'Lunch',
    ...fields,
  });
}

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  await Promise.all([Expense.init(), Budget.init()]);
});

afterEach(async () => {
  await Promise.all([Expense.deleteMany({}), Budget.deleteMany({})]);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

describe('expense CRUD and validation', () => {
  test('creates and fetches an expense with a safe decimal amount', async () => {
    const created = await createExpense({ amount: 19.95, merchant: 'Cafe' });
    expect(created.status).toBe(201);
    expect(created.body.data.expense.amount).toBe(19.95);
    expect(created.body.data.expense.amountMinor).toBeUndefined();
    const fetched = await request(app).get(`/api/expenses/${created.body.data.expense._id}`);
    expect(fetched.status).toBe(200);
    expect(fetched.body.data.expense.merchant).toBe('Cafe');
    expect((await Expense.findById(created.body.data.expense._id)).amountMinor).toBe(1995);
  });

  test('updates supported fields and deletes an expense', async () => {
    const created = await createExpense();
    const id = created.body.data.expense._id;
    const updated = await request(app).patch(`/api/expenses/${id}`).send({ amount: 25.5, category: 'Travel' });
    expect(updated.status).toBe(200);
    expect(updated.body.data.expense.amount).toBe(25.5);
    expect(updated.body.data.expense.category).toBe('travel');
    expect((await request(app).delete(`/api/expenses/${id}`)).status).toBe(204);
    expect((await request(app).get(`/api/expenses/${id}`)).status).toBe(404);
  });

  test('rejects non-positive amounts, malformed dates, and empty updates', async () => {
    expect((await createExpense({ amount: 0 })).status).toBe(400);
    expect((await createExpense({ date: 'not-a-date' })).status).toBe(400);
    const created = await createExpense();
    expect((await request(app).patch(`/api/expenses/${created.body.data.expense._id}`).send({})).status).toBe(400);
  });

  test('filters by category and inclusive UTC date range, then paginates', async () => {
    await createExpense({ amount: 10, category: 'food', date: '2026-05-01T00:00:00.000Z' });
    await createExpense({ amount: 20, category: 'travel', date: '2026-05-31T23:59:59.000Z' });
    await createExpense({ amount: 30, category: 'food', date: '2026-06-01T00:00:00.000Z' });
    const response = await request(app).get('/api/expenses?category=food&from=2026-05-01&to=2026-05-31&page=1&limit=1');
    expect(response.status).toBe(200);
    expect(response.body.data.pagination).toMatchObject({ page: 1, limit: 1, total: 1, pages: 1 });
    expect(response.body.data.expenses[0].amount).toBe(10);
  });
});

describe('MongoDB aggregation reports', () => {
  test('returns a twelve-month summary and accurate annual total', async () => {
    await createExpense({ amount: 10.25, date: '2026-01-15T00:00:00.000Z' });
    await createExpense({ amount: 20.5, date: '2026-01-25T00:00:00.000Z' });
    await createExpense({ amount: 6, date: '2026-03-01T00:00:00.000Z' });
    const response = await request(app).get('/api/reports/monthly?year=2026');
    expect(response.status).toBe(200);
    expect(response.body.data.total).toBe(36.75);
    expect(response.body.data.months).toHaveLength(12);
    expect(response.body.data.months[0]).toMatchObject({ month: 1, total: 30.75, count: 2 });
    expect(response.body.data.months[1]).toMatchObject({ month: 2, total: 0, count: 0 });
  });

  test('returns category totals using the optional date range', async () => {
    await createExpense({ amount: 8.25, category: 'food', date: '2026-05-02T00:00:00.000Z' });
    await createExpense({ amount: 15, category: 'food', date: '2026-05-03T00:00:00.000Z' });
    await createExpense({ amount: 50, category: 'travel', date: '2026-06-02T00:00:00.000Z' });
    const response = await request(app).get('/api/reports/categories?from=2026-05-01&to=2026-05-31');
    expect(response.status).toBe(200);
    expect(response.body.data.categories).toEqual([{ category: 'food', total: 23.25, count: 2 }]);
  });
});

describe('monthly budget alerts', () => {
  test('flags a reached threshold and an exceeded budget', async () => {
    await createExpense({ amount: 81, date: '2026-05-20T12:00:00.000Z' });
    const saved = await request(app).put('/api/budgets/2026-05').send({ amount: 100, alertThreshold: 80 });
    expect(saved.status).toBe(200);
    expect(saved.body.data.status).toMatchObject({
      month: '2026-05', budget: 100, spent: 81, remaining: 19, thresholdReached: true, overBudget: false,
    });
    await createExpense({ amount: 25, date: '2026-05-22T12:00:00.000Z' });
    const status = await request(app).get('/api/budgets/2026-05/status');
    expect(status.body.data.status).toMatchObject({ spent: 106, remaining: -6, thresholdReached: true, overBudget: true });
  });

  test('upserts budget settings for the month and validates month and threshold', async () => {
    expect((await request(app).put('/api/budgets/2026-13').send({ amount: 500 })).status).toBe(400);
    expect((await request(app).put('/api/budgets/2026-05').send({ amount: 500, alertThreshold: 0 })).status).toBe(400);
    const first = await request(app).put('/api/budgets/2026-05').send({ amount: 500 });
    const second = await request(app).put('/api/budgets/2026-05').send({ amount: 600, alertThreshold: 90 });
    expect(first.body.data.budget.amount).toBe(500);
    expect(second.body.data.budget).toMatchObject({ month: '2026-05', amount: 600, alertThreshold: 90 });
    expect(await Budget.countDocuments({ month: '2026-05' })).toBe(1);
  });
});
