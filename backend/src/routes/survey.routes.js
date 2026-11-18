import { Router } from 'express';
import {
  createSurvey,
  deleteSurvey,
  getSurvey,
  listSurveys,
  publishSurvey,
  unpublishSurvey,
  updateSurvey
} from '../controllers/survey.controller.js';
import {
  createQuestion,
  deleteQuestion,
  getQuestion,
  listQuestions,
  reorderQuestions,
  updateQuestion
} from '../controllers/question.controller.js';
import { protect } from '../middleware/auth.js';

const router = Router();

router.use(protect);

router.route('/')
  .get(listSurveys)
  .post(createSurvey);

router.route('/:id')
  .get(getSurvey)
  .patch(updateSurvey)
  .delete(deleteSurvey);

router.post('/:id/publish', publishSurvey);
router.post('/:id/unpublish', unpublishSurvey);

router.route('/:id/questions')
  .get(listQuestions)
  .post(createQuestion);

router.patch('/:id/questions/reorder', reorderQuestions);
router.route('/:id/questions/:questionId')
  .get(getQuestion)
  .patch(updateQuestion)
  .delete(deleteQuestion);

export default router;
