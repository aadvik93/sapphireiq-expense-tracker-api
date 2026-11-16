import { Budget } from '../models/Budget.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { fromMinorUnits, toMinorUnits } from '../utils.js';
import { getBudgetStatus } from '../services/budgetService.js';

export const setBudget = asyncHandler(async (req, res) => {
  const { month } = req.validated.params;
  const { amount, alertThreshold } = req.validated.body;
  const budget = await Budget.findOneAndUpdate(
    { month },
    { month, limitMinor: toMinorUnits(amount), alertThreshold },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
  ).lean();
  const status = await getBudgetStatus(month);
  res.json({ success: true, data: { budget: { month: budget.month, amount: fromMinorUnits(budget.limitMinor), alertThreshold: budget.alertThreshold }, status } });
});

export const budgetStatus = asyncHandler(async (req, res) => {
  const status = await getBudgetStatus(req.validated.params.month);
  if (!status) return res.status(404).json({ success: false, error: { message: 'No budget is set for this month.' } });
  res.json({ success: true, data: { status } });
});
