import Survey from '../models/Survey.js';
import Response from '../models/Response.js';

const choiceTypes = new Set(['single_choice', 'multi_choice']);

function isAnswered(question, value) {
  if (question.type === 'text') {
    return typeof value === 'string' && value.trim().length > 0;
  }
  if (question.type === 'multi_choice') {
    return Array.isArray(value) && value.length > 0;
  }
  return value !== undefined && value !== null && value !== '';
}

function isVisible(question, answersById, questionsById) {
  const dependsOn = question.dependsOn;
  if (!dependsOn?.questionId && !dependsOn?.optionId) {
    return true;
  }

  const parent = questionsById.get(dependsOn.questionId);
  const parentAnswer = answersById.get(dependsOn.questionId);
  if (!parent || !parentAnswer) {
    return false;
  }

  if (parent.type === 'multi_choice') {
    return parentAnswer.value.includes(dependsOn.optionId);
  }
  return parentAnswer.value === dependsOn.optionId;
}

function validateAnswer(question, value) {
  if (question.type === 'text') {
    if (typeof value !== 'string') return 'must be text';
    if (value.length > 10000) return 'must be 10000 characters or fewer';
    return null;
  }

  if (question.type === 'single_choice') {
    if (typeof value !== 'string') return 'must be one option ID';
    if (!question.options.some((option) => option.optionId === value)) {
      return 'contains an invalid option';
    }
    return null;
  }

  if (question.type === 'multi_choice') {
    if (!Array.isArray(value) || value.some((optionId) => typeof optionId !== 'string')) {
      return 'must be an array of option IDs';
    }
    if (new Set(value).size !== value.length) {
      return 'must not contain duplicate options';
    }
    if (value.some((optionId) => !question.options.some((option) => option.optionId === optionId))) {
      return 'contains an invalid option';
    }
    return null;
  }

  if (question.type === 'rating') {
    if (!Number.isInteger(value) || value < 1 || value > 5) {
      return 'must be a whole number from 1 to 5';
    }
    return null;
  }

  return 'has an unsupported question type';
}

export async function getPublicSurvey(req, res, next) {
  try {
    const survey = await Survey.findOne({
      slug: req.params.slug,
      status: 'published'
    }).select('title description slug questions');

    if (!survey) {
      return res.status(404).json({ message: 'Survey not found or no longer available' });
    }

    const questions = [...survey.questions]
      .sort((a, b) => a.position - b.position)
      .map((question) => ({
        questionId: question.questionId,
        type: question.type,
        label: question.label,
        required: question.required,
        options: choiceTypes.has(question.type) ? question.options : [],
        dependsOn: question.dependsOn
      }));

    res.json({
      survey: {
        title: survey.title,
        description: survey.description,
        slug: survey.slug,
        questions
      }
    });
  } catch (err) {
    next(err);
  }
}

export async function submitPublicResponse(req, res, next) {
  if (
    !req.body ||
    typeof req.body !== 'object' ||
    Array.isArray(req.body) ||
    Object.keys(req.body).some((key) => key !== 'answers') ||
    !Array.isArray(req.body.answers)
  ) {
    return res.status(400).json({ message: 'Request body must contain an answers array' });
  }

  try {
    const survey = await Survey.findOne({
      slug: req.params.slug,
      status: 'published'
    });

    if (!survey) {
      return res.status(404).json({ message: 'Survey not found or no longer available' });
    }

    const questions = [...survey.questions].sort((a, b) => a.position - b.position);
    const questionsById = new Map(questions.map((question) => [question.questionId, question]));
    const providedAnswers = new Map();
    const errors = [];

    for (const [index, answer] of req.body.answers.entries()) {
      if (
        !answer ||
        typeof answer !== 'object' ||
        Array.isArray(answer) ||
        typeof answer.questionId !== 'string' ||
        !Object.hasOwn(answer, 'value') ||
        Object.keys(answer).some((key) => !['questionId', 'value'].includes(key))
      ) {
        errors.push({ index, message: 'Each answer must contain only questionId and value' });
        continue;
      }

      if (!questionsById.has(answer.questionId)) {
        errors.push({ questionId: answer.questionId, message: 'Unknown question' });
        continue;
      }
      if (providedAnswers.has(answer.questionId)) {
        errors.push({ questionId: answer.questionId, message: 'Duplicate answer' });
        continue;
      }
      providedAnswers.set(answer.questionId, answer);
    }

    if (errors.length > 0) {
      return res.status(400).json({ message: 'Invalid answers', errors });
    }

    const validatedAnswers = [];
    for (const question of questions) {
      const answer = providedAnswers.get(question.questionId);
      const answersById = new Map(validatedAnswers.map((item) => [item.questionId, item]));
      const visible = isVisible(question, answersById, questionsById);

      if (!visible) {
        if (answer) {
          errors.push({
            questionId: question.questionId,
            message: 'Answer provided for a question that is not visible'
          });
        }
        continue;
      }

      if (!answer || !isAnswered(question, answer.value)) {
        if (question.required) {
          errors.push({ questionId: question.questionId, message: 'Answer is required' });
        }
        continue;
      }

      const validationMessage = validateAnswer(question, answer.value);
      if (validationMessage) {
        errors.push({ questionId: question.questionId, message: validationMessage });
        continue;
      }

      validatedAnswers.push({
        questionId: question.questionId,
        type: question.type,
        value: question.type === 'text' ? answer.value.trim() : answer.value
      });
    }

    if (errors.length > 0) {
      return res.status(400).json({ message: 'Invalid answers', errors });
    }

    const response = await Response.create({
      surveyId: survey._id,
      answers: validatedAnswers,
      status: 'complete',
      meta: {
        userAgent: req.get('user-agent')
      }
    });

    res.status(201).json({
      message: 'Response submitted successfully',
      responseId: response._id
    });
  } catch (err) {
    next(err);
  }
}