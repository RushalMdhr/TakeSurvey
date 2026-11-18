import Survey from '../models/Survey.js';
import Response from '../models/Response.js';
import { createSurveySchema, updateSurveySchema } from '../utils/validation.js';

function validationError(res, error) {
  return res.status(400).json({
    message: 'Invalid survey data',
    errors: error.issues
  });
}

function errorResponse(err, res, next) {
  if (err.name === 'CastError') {
    return res.status(400).json({ message: 'Invalid survey id' });
  }

  if (err.code === 11000) {
    return res.status(409).json({ message: 'A survey with this slug already exists' });
  }

  return next(err);
}

function slugBase(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'survey';
}

async function createUniqueSlug(title) {
  const base = slugBase(title);
  let slug = base;
  let suffix = 2;

  while (await Survey.exists({ slug })) {
    slug = `${base}-${suffix}`;
    suffix += 1;
  }

  return slug;
}

export async function listSurveys(req, res, next) {
  try {
    const surveys = await Survey.find({ createdBy: req.admin._id }).sort({ updatedAt: -1 });
    const responseCounts = surveys.length
      ? await Response.aggregate([
        {
          $match: {
            surveyId: { $in: surveys.map((survey) => survey._id) },
            status: 'complete'
          }
        },
        { $group: { _id: '$surveyId', totalResponses: { $sum: 1 } } }
      ])
      : [];
    const responseCountBySurveyId = new Map(
      responseCounts.map((item) => [item._id.toString(), item.totalResponses])
    );
    const statusOrder = { draft: 0, published: 1, closed: 2 };
    const surveyList = surveys.map((survey) => {
      const totalResponses = responseCountBySurveyId.get(survey._id.toString()) || 0;
      return {
        ...survey.toObject(),
        hasResponses: totalResponses > 0,
        totalResponses
      };
    });
    surveyList.sort((left, right) => (
      (statusOrder[left.status] ?? 3) - (statusOrder[right.status] ?? 3)
      || new Date(right.updatedAt) - new Date(left.updatedAt)
    ));

    res.json({ surveys: surveyList });
  } catch (err) {
    errorResponse(err, res, next);
  }
}

export async function getSurvey(req, res, next) {
  try {
    const survey = await Survey.findOne({
      _id: req.params.id,
      createdBy: req.admin._id
    });

    if (!survey) {
      return res.status(404).json({ message: 'Survey not found' });
    }

    const hasResponses = await Response.exists({ surveyId: survey._id });
    res.json({ survey: { ...survey.toObject(), hasResponses: Boolean(hasResponses) } });
  } catch (err) {
    errorResponse(err, res, next);
  }
}

export async function createSurvey(req, res, next) {
  const parsed = createSurveySchema.safeParse(req.body);
  if (!parsed.success) {
    return validationError(res, parsed.error);
  }

  try {
    const survey = await Survey.create({
      ...parsed.data,
      slug: await createUniqueSlug(parsed.data.title),
      createdBy: req.admin._id
    });

    res.status(201).json({ survey });
  } catch (err) {
    errorResponse(err, res, next);
  }
}

export async function updateSurvey(req, res, next) {
  const parsed = updateSurveySchema.safeParse(req.body);
  if (!parsed.success) {
    return validationError(res, parsed.error);
  }

  try {
    const survey = await Survey.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.admin._id },
      { $set: parsed.data },
      { new: true, runValidators: true }
    );

    if (!survey) {
      return res.status(404).json({ message: 'Survey not found' });
    }

    res.json({ survey });
  } catch (err) {
    errorResponse(err, res, next);
  }
}

export async function publishSurvey(req, res, next) {
  try {
    const survey = await Survey.findOne({
      _id: req.params.id,
      createdBy: req.admin._id
    });

    if (!survey) {
      return res.status(404).json({ message: 'Survey not found' });
    }

    if (survey.status === 'closed') {
      return res.status(409).json({ message: 'Closed surveys cannot be published' });
    }

    if (survey.questions.length === 0) {
      return res.status(400).json({ message: 'Add at least one question before publishing' });
    }

    if (survey.status !== 'published') {
      survey.status = 'published';
      survey.publishedAt = new Date();
      await survey.save();
    }

    const publicPath = `/s/${encodeURIComponent(survey.slug)}`;
    const baseUrl = process.env.CLIENT_URL || req.get('origin');
    const publicUrl = baseUrl
      ? new URL(publicPath, `${baseUrl.replace(/\/+$/, '')}/`).toString()
      : publicPath;

    res.json({ survey, publicPath, publicUrl });
  } catch (err) {
    errorResponse(err, res, next);
  }
}

export async function unpublishSurvey(req, res, next) {
  try {
    const survey = await Survey.findOne({
      _id: req.params.id,
      createdBy: req.admin._id
    });

    if (!survey) {
      return res.status(404).json({ message: 'Survey not found' });
    }

    if (survey.status !== 'published') {
      return res.status(409).json({ message: 'Only published surveys can be unpublished' });
    }

    if (await Response.exists({ surveyId: survey._id })) {
      return res.status(409).json({
        message: 'Cannot unpublish a survey that has responses'
      });
    }

    survey.status = 'draft';
    survey.publishedAt = undefined;
    await survey.save();

    res.json({ survey });
  } catch (err) {
    errorResponse(err, res, next);
  }
}

export async function closeSurvey(req, res, next) {
  try {
    const survey = await Survey.findOne({
      _id: req.params.id,
      createdBy: req.admin._id
    });

    if (!survey) {
      return res.status(404).json({ message: 'Survey not found' });
    }

    if (survey.status !== 'published') {
      return res.status(409).json({ message: 'Only published surveys can be closed' });
    }

    if (!(await Response.exists({ surveyId: survey._id }))) {
      return res.status(409).json({
        message: 'A survey must receive at least one response before it can be closed'
      });
    }

    survey.status = 'closed';
    await survey.save();

    res.json({
      survey: { ...survey.toObject(), hasResponses: true }
    });
  } catch (err) {
    errorResponse(err, res, next);
  }
}

export async function deleteSurvey(req, res, next) {
  try {
    const survey = await Survey.findOne({
      _id: req.params.id,
      createdBy: req.admin._id
    });

    if (!survey) {
      return res.status(404).json({ message: 'Survey not found' });
    }

    if (await Response.exists({ surveyId: survey._id })) {
      return res.status(409).json({
        message: 'Cannot delete a survey that has responses'
      });
    }

    await Survey.deleteOne({ _id: survey._id, createdBy: req.admin._id });
    res.json({ message: 'Survey deleted' });
  } catch (err) {
    errorResponse(err, res, next);
  }
}
