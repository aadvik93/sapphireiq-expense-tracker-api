import { Expense } from '../models/Expense.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { fromMinorUnits, serializeExpense, toMinorUnits } from '../utils.js';

function makeDateFilter({ from, to }) {
  if (!from && !to) return undefined;
  const date = {};
  if (from) date.$gte = new Date(`${from}T00:00:00.000Z`);
  if (to) {
    const endExclusive = new Date(`${to}T00:00:00.000Z`);
    endExclusive.setUTCDate(endExclusive.getUTCDate() + 1);
    date.$lt = endExclusive;
  }
  return date;
}

export const listExpenses = asyncHandler(async (req, res) => {
  const { category, from, to, page, limit, sortBy, order } = req.validated.query;
  const filter = {};
  if (category) filter.category = category.toLowerCase();
  const date = makeDateFilter({ from, to });
  if (date) filter.date = date;

  const [expenses, total] = await Promise.all([
    Expense.find(filter).sort({ [sortBy]: order === 'asc' ? 1 : -1, _id: 1 }).skip((page - 1) * limit).limit(limit).lean(),
    Expense.countDocuments(filter),
  ]);
  res.json({
    success: true,
    data: { expenses: expenses.map(serializeExpense), pagination: { page, limit, total, pages: Math.ceil(total / limit) } },
  });
});

export const getExpense = asyncHandler(async (req, res) => {
  const expense = await Expense.findById(req.validated.params.id).lean();
  if (!expense) return res.status(404).json({ success: false, error: { message: 'Expense not found.' } });
  res.json({ success: true, data: { expense: serializeExpense(expense) } });
});

export const createExpense = asyncHandler(async (req, res) => {
  const { amount, ...fields } = req.validated.body;
  const expense = await Expense.create({ ...fields, amountMinor: toMinorUnits(amount) });
  res.status(201).json({ success: true, data: { expense: serializeExpense(expense) } });
});

export const updateExpense = asyncHandler(async (req, res) => {
  const { amount, ...fields } = req.validated.body;
  if (amount !== undefined) fields.amountMinor = toMinorUnits(amount);
  const expense = await Expense.findByIdAndUpdate(req.validated.params.id, fields, { new: true, runValidators: true });
  if (!expense) return res.status(404).json({ success: false, error: { message: 'Expense not found.' } });
  res.json({ success: true, data: { expense: serializeExpense(expense) } });
});

export const deleteExpense = asyncHandler(async (req, res) => {
  const expense = await Expense.findByIdAndDelete(req.validated.params.id);
  if (!expense) return res.status(404).json({ success: false, error: { message: 'Expense not found.' } });
  res.status(204).send();
});

export const expenseDateFilter = makeDateFilter;
export const expenseTotal = fromMinorUnits;
