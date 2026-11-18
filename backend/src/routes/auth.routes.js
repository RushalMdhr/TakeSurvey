import { Router } from 'express';
import { register, login, me } from '../controllers/auth.controller.js';
import { protect } from '../middleware/auth.js';
import {
  loginRateLimiter,
  registrationRateLimiter
} from '../middleware/rateLimiters.js';

const router = Router();

router.post('/register', registrationRateLimiter, register);
router.post('/login', loginRateLimiter, login);
router.get('/me', protect, me);

export default router;