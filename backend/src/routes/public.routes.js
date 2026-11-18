import { Router } from 'express';
import {
  getPublicSurvey,
  submitPublicResponse
} from '../controllers/public.controller.js';

const router = Router();

router.get('/surveys/:slug', getPublicSurvey);
router.post('/surveys/:slug/responses', submitPublicResponse);

export default router;