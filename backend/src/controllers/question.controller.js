import { randomUUID } from 'node:crypto';
import Survey from '../models/Survey.js';
import {
  createQuestionSchema,
  reorderQuestionsSchema,
  updateQuestionSchema
} from '../utils/validation.js';

const choiceTypes = new Set(['single_choice', 'multi_choice']);

function validationError(res, error) {
  return res.status(400).json({
    message: 'Invalid question data',
    errors: error.issues
  });
}

function errorResponse(err, res, next) {
  if (err.name === 'CastError') {
    return res.status(400).json({ message: 'Invalid survey id' });
  }

  if (err.name === 'ValidationError') {
    return res.status(400).json({ message: 'Invalid question data' });
  }

  return next(err);
}

async function findOwnedSurvey(req, res, requireDraft = false) {
  const survey = await Survey.findOne({
    _id: req.params.id,
    createdBy: req.admin._id
  });

  if (!survey) {
    res.status(404).json({ message: 'Survey not found' });
    return null;
  }

  if (requireDraft && survey.status !== 'draft') {
    res.status(409).json({ message: 'Questions can only be changed on draft surveys' });
    return null;
  }

  return survey;
}

function validateQuestionGraph(questions) {
  const questionIds = new Set();

  for (const [index, question] of questions.entries()) {
    if (questionIds.has(question.questionId)) {
      return 'Question IDs must be unique';
    }
    questionIds.add(question.questionId);

    const options = question.options || [];
    if (choiceTypes.has(question.type) && options.length < 2) {
      return `Question "${question.label}" requires at least two options`;
    }
    if (!choiceTypes.has(question.type) && options.length > 0) {
      return `Question "${question.label}" cannot have options`;
    }

    const optionIds = new Set();
    const optionLabels = new Set();
    for (const option of options) {
      const normalizedLabel = option.label.trim().toLowerCase();
      if (optionIds.has(option.optionId) || optionLabels.has(normalizedLabel)) {
        return `Question "${question.label}" has duplicate options`;
      }
      optionIds.add(option.optionId);
      optionLabels.add(normalizedLabel);
    }

    const dependsOn = question.dependsOn;
    if (!dependsOn?.questionId && !dependsOn?.optionId) {
      continue;
    }
    if (!dependsOn.questionId || !dependsOn.optionId) {
      return `Question "${question.label}" has an incomplete condition`;
    }

    const dependencyIndex = questions.findIndex(
      (candidate) => candidate.questionId === dependsOn.questionId
    );
    if (dependencyIndex < 0 || dependencyIndex >= index) {
      return `Question "${question.label}" must depend on an earlier question`;
    }

    const dependency = questions[dependencyIndex];
    if (
      !choiceTypes.has(dependency.type) ||
      !dependency.options.some((option) => option.optionId === dependsOn.optionId)
    ) {
      return `Question "${question.label}" depends on an invalid question option`;
    }
  }

  return null;
}

function buildOptions(inputOptions, currentOptions = []) {
  const options = [];

  for (const option of inputOptions || []) {
    if (option.optionId) {
      const existing = currentOptions.find(
        (current) => current.optionId === option.optionId
      );
      if (!existing) {
        return { error: 'Option IDs must belong to this question' };
      }
      options.push({ optionId: existing.optionId, label: option.label });
    } else {
      options.push({ optionId: `opt_${randomUUID()}`, label: option.label });
    }
  }

  return { options };
}

export async function listQuestions(req, res, next) {
  try {
    const survey = await findOwnedSurvey(req, res);
    if (!survey) return;

    const questions = [...survey.questions].sort((a, b) => a.position - b.position);
    res.json({ questions });
  } catch (err) {
    errorResponse(err, res, next);
  }
}

export async function getQuestion(req, res, next) {
  try {
    const survey = await findOwnedSurvey(req, res);
    if (!survey) return;

    const question = survey.questions.find(
      (item) => item.questionId === req.params.questionId
    );
    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }

    res.json({ question });
  } catch (err) {
    errorResponse(err, res, next);
  }
}

export async function createQuestion(req, res, next) {
  const parsed = createQuestionSchema.safeParse(req.body);
  console.log('okay')
  if (!parsed.success) {
    return validationError(res, parsed.error);
  }
  
  try {
    const survey = await findOwnedSurvey(req, res, true);
    if (!survey) return;
    // console.log('existing positions:', survey.questions.map(q => ({ id: q.questionId, pos: q.position })));
    // console.log('new question:', { id: question.questionId, pos: question.position, dependsOn: question.dependsOn });
    // console.log('graph input:', [...survey.questions, question].map(q => ({ id: q.questionId, pos: q.position })));

    const optionResult = buildOptions(parsed.data.options);
    const question = {
      questionId: `q_${randomUUID()}`,
      ...parsed.data,
      options: optionResult.options,
      position: survey.questions.length
    };

    const validationMessage = validateQuestionGraph([...survey.questions, question]);
    if (validationMessage) {
      return res.status(400).json({ message: validationMessage });
    }

    survey.questions.push(question);
    await survey.save();
    res.status(201).json({ question: survey.questions[survey.questions.length - 1] });
  } catch (err) {
    errorResponse(err, res, next);
  }
}

export async function updateQuestion(req, res, next) {
  const parsed = updateQuestionSchema.safeParse(req.body);
  if (!parsed.success) {
    return validationError(res, parsed.error);
  }

  try {
    const survey = await findOwnedSurvey(req, res, true);
    if (!survey) return;

    const index = survey.questions.findIndex(
      (question) => question.questionId === req.params.questionId
    );
    if (index < 0) {
      return res.status(404).json({ message: 'Question not found' });
    }

    const question = survey.questions[index];
    const data = parsed.data;
    const nextType = data.type || question.type;
    const nextOptions = data.options === undefined
      ? question.options
      : buildOptions(data.options, question.options);

    if (nextOptions.error) {
      return res.status(400).json({ message: nextOptions.error });
    }

    if (!choiceTypes.has(nextType) && data.type && data.options === undefined) {
      question.options = [];
    } else if (data.options !== undefined) {
      question.options = nextOptions.options;
    }

    if (data.type !== undefined) question.type = data.type;
    if (data.label !== undefined) question.label = data.label;
    if (data.required !== undefined) question.required = data.required;
    if (Object.hasOwn(data, 'dependsOn')) {
      question.dependsOn = data.dependsOn || undefined;
    }

    const validationMessage = validateQuestionGraph(survey.questions);
    if (validationMessage) {
      return res.status(400).json({ message: validationMessage });
    }

    await survey.save();
    res.json({ question });
  } catch (err) {
    errorResponse(err, res, next);
  }
}

export async function reorderQuestions(req, res, next) {
  const parsed = reorderQuestionsSchema.safeParse(req.body);
  if (!parsed.success) {
    return validationError(res, parsed.error);
  }

  try {
    const survey = await findOwnedSurvey(req, res, true);
    if (!survey) return;

    const { questionIds } = parsed.data;
    const currentIds = survey.questions.map((question) => question.questionId);
    if (
      questionIds.length !== currentIds.length ||
      new Set(questionIds).size !== questionIds.length ||
      questionIds.some((questionId) => !currentIds.includes(questionId))
    ) {
      return res.status(400).json({
        message: 'questionIds must contain every survey question exactly once'
      });
    }

    const questionsById = new Map(
      survey.questions.map((question) => [question.questionId, question])
    );
    survey.questions = questionIds.map((questionId) => questionsById.get(questionId));
    survey.questions.forEach((question, position) => {
      question.position = position;
    });

    const validationMessage = validateQuestionGraph(survey.questions);
    if (validationMessage) {
      return res.status(400).json({ message: validationMessage });
    }

    await survey.save();
    res.json({ questions: survey.questions });
  } catch (err) {
    errorResponse(err, res, next);
  }
}

export async function deleteQuestion(req, res, next) {
  try {
    const survey = await findOwnedSurvey(req, res, true);
    if (!survey) return;

    const index = survey.questions.findIndex(
      (question) => question.questionId === req.params.questionId
    );
    if (index < 0) {
      return res.status(404).json({ message: 'Question not found' });
    }

    if (survey.questions.some(
      (question) => question.dependsOn?.questionId === req.params.questionId
    )) {
      return res.status(409).json({
        message: 'Cannot delete a question used by another question condition'
      });
    }

    survey.questions.splice(index, 1);
    survey.questions.forEach((question, position) => {
      question.position = position;
    });

    await survey.save();
    res.json({ message: 'Question deleted' });
  } catch (err) {
    errorResponse(err, res, next);
  }
}
