import { Router } from 'express';
import {
  getPublicSurvey,
  submitPublicResponse
} from '../controllers/public.controller.js';
import { publicResponseRateLimiter } from '../middleware/rateLimiters.js';

const router = Router();

router.get('/surveys/:slug', getPublicSurvey);
router.post('/surveys/:slug/responses', publicResponseRateLimiter, submitPublicResponse);

export default router;