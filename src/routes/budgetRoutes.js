import { Router } from 'express';
import { budgetStatus, setBudget } from '../controllers/budgetController.js';
import { validate } from '../middleware/validate.js';
import { budgetMonthSchema, budgetSchema } from '../validators/schemas.js';

const router = Router();
router.put('/:month', validate(budgetSchema), setBudget);
router.get('/:month/status', validate(budgetMonthSchema), budgetStatus);
export default router;
