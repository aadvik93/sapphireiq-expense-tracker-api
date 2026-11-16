import { Budget } from '../models/Budget.js';
import { Expense } from '../models/Expense.js';
import { fromMinorUnits, monthRange } from '../utils.js';

export async function getBudgetStatus(month) {
  const budget = await Budget.findOne({ month }).lean();
  if (!budget) return null;

  const { start, end } = monthRange(month);
  const [result] = await Expense.aggregate([
    { $match: { date: { $gte: start, $lt: end } } },
    { $group: { _id: null, totalMinor: { $sum: '$amountMinor' }, expenseCount: { $sum: 1 } } },
  ]);
  const spentMinor = result?.totalMinor || 0;
  const thresholdMinor = Math.ceil(budget.limitMinor * (budget.alertThreshold / 100));

  return {
    month,
    budget: fromMinorUnits(budget.limitMinor),
    spent: fromMinorUnits(spentMinor),
    remaining: fromMinorUnits(budget.limitMinor - spentMinor),
    alertThreshold: budget.alertThreshold,
    thresholdReached: spentMinor >= thresholdMinor,
    overBudget: spentMinor > budget.limitMinor,
    expenseCount: result?.expenseCount || 0,
  };
}
