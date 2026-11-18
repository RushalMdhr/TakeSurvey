import { Router } from 'express';
import {
  getSurveyAnalytics,
  getTextAnswers
} from '../controllers/analytics.controller.js';
import { protect } from '../middleware/auth.js';

const router = Router();

router.use(protect);
router.get('/surveys/:id', getSurveyAnalytics);
router.get('/surveys/:id/questions/:questionId/text', getTextAnswers);

export default router;