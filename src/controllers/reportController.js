import { Expense } from '../models/Expense.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { expenseDateFilter, expenseTotal } from './expenseController.js';

export const monthlySummary = asyncHandler(async (req, res) => {
  const year = req.validated.query.year;
  const start = new Date(Date.UTC(year, 0, 1));
  const end = new Date(Date.UTC(year + 1, 0, 1));
  const rows = await Expense.aggregate([
    { $match: { date: { $gte: start, $lt: end } } },
    { $group: { _id: { month: { $month: '$date' } }, totalMinor: { $sum: '$amountMinor' }, count: { $sum: 1 } } },
    { $sort: { '_id.month': 1 } },
  ]);
  const byMonth = new Map(rows.map((row) => [row._id.month, row]));
  const months = Array.from({ length: 12 }, (_, index) => {
    const month = index + 1;
    const row = byMonth.get(month);
    return { month, total: expenseTotal(row?.totalMinor || 0), count: row?.count || 0 };
  });
  res.json({ success: true, data: { year, total: expenseTotal(rows.reduce((sum, row) => sum + row.totalMinor, 0)), months } });
});

export const categorySummary = asyncHandler(async (req, res) => {
  const date = expenseDateFilter(req.validated.query);
  const match = date ? { date } : {};
  const categories = await Expense.aggregate([
    { $match: match },
    { $group: { _id: '$category', totalMinor: { $sum: '$amountMinor' }, count: { $sum: 1 } } },
    { $sort: { totalMinor: -1, _id: 1 } },
    { $project: { _id: 0, category: '$_id', totalMinor: 1, count: 1 } },
  ]);
  res.json({
    success: true,
    data: { categories: categories.map(({ category, totalMinor, count }) => ({ category, total: expenseTotal(totalMinor), count })) },
  });
});
