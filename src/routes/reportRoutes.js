import { Router } from 'express';
import { categorySummary, monthlySummary } from '../controllers/reportController.js';
import { validate } from '../middleware/validate.js';
import { reportRangeSchema, yearQuerySchema } from '../validators/schemas.js';

const router = Router();
router.get('/monthly', validate(yearQuerySchema), monthlySummary);
router.get('/categories', validate(reportRangeSchema), categorySummary);
export default router;
