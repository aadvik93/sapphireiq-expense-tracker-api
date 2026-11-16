import { Router } from 'express';
import { createExpense, deleteExpense, getExpense, listExpenses, updateExpense } from '../controllers/expenseController.js';
import { validate } from '../middleware/validate.js';
import { createExpenseSchema, expenseIdSchema, listExpensesSchema, updateExpenseSchema } from '../validators/schemas.js';

const router = Router();
router.route('/').get(validate(listExpensesSchema), listExpenses).post(validate(createExpenseSchema), createExpense);
router.route('/:id')
  .get(validate(expenseIdSchema), getExpense)
  .patch(validate(updateExpenseSchema), updateExpense)
  .delete(validate(expenseIdSchema), deleteExpense);
export default router;
