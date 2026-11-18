import { z } from 'zod';
import Response from '../models/Response.js';
import Survey from '../models/Survey.js';

const textPaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20)
}).strict();

const choiceTypes = new Set(['single_choice', 'multi_choice']);

async function findOwnedSurvey(req, res) {
  const survey = await Survey.findOne({
    _id: req.params.id,
    createdBy: req.admin._id
  });

  if (!survey) {
    res.status(404).json({ message: 'Survey not found' });
    return null;
  }

  return survey;
}

function questionCountsPipeline(survey) {
  const distinctRespondentAndAnswer = [
    {
      $group: {
        _id: {
          questionId: '$answers.questionId',
          responseId: '$_id',
          value: '$answers.value'
        }
      }
    },
    {
      $group: {
        _id: { questionId: '$_id.questionId', value: '$_id.value' },
        count: { $sum: 1 }
      }
    }
  ];

  return [
    { $match: { surveyId: survey._id, status: 'complete' } },
    { $unwind: '$answers' },
    {
      $facet: {
        answered: [
          {
            $group: {
              _id: {
                questionId: '$answers.questionId',
                responseId: '$_id'
              }
            }
          },
          {
            $group: {
              _id: '$_id.questionId',
              count: { $sum: 1 }
            }
          }
        ],
        singleChoice: [
          { $match: { 'answers.type': 'single_choice' } },
          ...distinctRespondentAndAnswer
        ],
        multiChoice: [
          { $match: { 'answers.type': 'multi_choice' } },
          { $unwind: '$answers.value' },
          ...distinctRespondentAndAnswer
        ],
        ratings: [
          { $match: { 'answers.type': 'rating' } },
          ...distinctRespondentAndAnswer
        ]
      }
    }
  ];
}

function mapDistribution(rows) {
  const counts = new Map();
  for (const row of rows || []) {
    if (!counts.has(row._id.questionId)) {
      counts.set(row._id.questionId, new Map());
    }
    counts.get(row._id.questionId).set(row._id.value, row.count);
  }
  return counts;
}

function buildQuestionAnalytics(questions, aggregate, totalResponses) {
  const answeredCounts = new Map(
    (aggregate?.answered || []).map((item) => [item._id, item.count])
  );
  const singleChoiceCounts = mapDistribution(aggregate?.singleChoice);
  const multiChoiceCounts = mapDistribution(aggregate?.multiChoice);
  const ratingCounts = mapDistribution(aggregate?.ratings);
  const questionById = new Map(questions.map((question) => [question.questionId, question]));
  const distributions = {
    single_choice: singleChoiceCounts,
    multi_choice: multiChoiceCounts
  };

  return questions.map((question) => {
    const answeredCount = answeredCounts.get(question.questionId) || 0;
    const condition = question.dependsOn;
    let shownCount = totalResponses;

    if (condition?.questionId || condition?.optionId) {
      if (!condition.questionId || !condition.optionId) {
        throw new Error(`Question "${question.label}" has an incomplete condition`);
      }

      const parent = questionById.get(condition.questionId);
      if (!parent || !choiceTypes.has(parent.type)) {
        throw new Error(`Question "${question.label}" has an invalid condition`);
      }

      shownCount = distributions[parent.type]
        .get(parent.questionId)
        ?.get(condition.optionId) || 0;
    }

    const stats = {
      questionId: question.questionId,
      label: question.label,
      type: question.type,
      required: question.required,
      shownCount,
      answeredCount,
      unansweredCount: Math.max(shownCount - answeredCount, 0)
    };

    if (choiceTypes.has(question.type)) {
      const counts = distributions[question.type].get(question.questionId) || new Map();
      stats.distribution = question.options.map((option) => {
        const count = counts.get(option.optionId) || 0;
        return {
          optionId: option.optionId,
          label: option.label,
          count,
          percentage: answeredCount ? Math.round((count / answeredCount) * 1000) / 10 : 0
        };
      });
    } else if (question.type === 'rating') {
      const counts = ratingCounts.get(question.questionId) || new Map();
      stats.distribution = [1, 2, 3, 4, 5].map((rating) => {
        const count = counts.get(rating) || 0;
        return {
          value: rating,
          count,
          percentage: answeredCount ? Math.round((count / answeredCount) * 1000) / 10 : 0
        };
      });
      stats.average = answeredCount
        ? Math.round(
            ([1, 2, 3, 4, 5].reduce((sum, rating) => (
              sum + rating * (counts.get(rating) || 0)
            ), 0) / answeredCount) * 100
          ) / 100
        : null;
    }

    return stats;
  });
}

function handleError(err, res, next) {
  if (err.name === 'CastError') {
    return res.status(400).json({ message: 'Invalid survey id' });
  }
  return next(err);
}

export async function getSurveyAnalytics(req, res, next) {
  try {
    const survey = await findOwnedSurvey(req, res);
    if (!survey) return;

    const [totalResponses, aggregateResult] = await Promise.all([
      Response.countDocuments({ surveyId: survey._id, status: 'complete' }),
      Response.aggregate(questionCountsPipeline(survey))
    ]);
    const questions = [...survey.questions].sort((a, b) => a.position - b.position);
    const questionAnalytics = buildQuestionAnalytics(
      questions,
      aggregateResult?.[0],
      totalResponses
    );

    res.json({
      survey: {
        id: survey._id,
        title: survey.title,
        slug: survey.slug,
        status: survey.status
      },
      totalResponses,
      questions: questionAnalytics
    });
  } catch (err) {
    handleError(err, res, next);
  }
}

export async function getTextAnswers(req, res, next) {
  const parsed = textPaginationSchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({
      message: 'Invalid pagination',
      errors: parsed.error.issues
    });
  }

  try {
    const survey = await findOwnedSurvey(req, res);
    if (!survey) return;

    const question = survey.questions.find(
      (item) => item.questionId === req.params.questionId
    );
    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }
    if (question.type !== 'text') {
      return res.status(400).json({ message: 'Text answers are only available for text questions' });
    }

    const { page, limit } = parsed.data;
    const [result] = await Response.aggregate([
      {
        $match: {
          surveyId: survey._id,
          status: 'complete',
          'answers.questionId': question.questionId
        }
      },
      { $unwind: '$answers' },
      { $match: { 'answers.questionId': question.questionId } },
      {
        $project: {
          submittedAt: 1,
          text: '$answers.value'
        }
      },
      { $sort: { submittedAt: -1, _id: -1 } },
      {
        $facet: {
          answers: [
            { $skip: (page - 1) * limit },
            { $limit: limit }
          ],
          total: [{ $count: 'count' }]
        }
      }
    ]);

    const totalAnswers = result?.total?.[0]?.count || 0;
    res.json({
      question: {
        questionId: question.questionId,
        label: question.label
      },
      answers: (result?.answers || []).map((answer) => ({
        responseId: answer._id,
        submittedAt: answer.submittedAt,
        text: answer.text
      })),
      page,
      limit,
      totalAnswers,
      totalPages: Math.ceil(totalAnswers / limit)
    });
  } catch (err) {
    handleError(err, res, next);
  }
}