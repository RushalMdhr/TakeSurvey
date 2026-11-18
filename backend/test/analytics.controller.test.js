import assert from 'node:assert/strict';
import express from 'express';
import test from 'node:test';
import mongoose from 'mongoose';
import Response from '../src/models/Response.js';
import Survey from '../src/models/Survey.js';
import {
  getSurveyAnalytics,
  getTextAnswers
} from '../src/controllers/analytics.controller.js';
import analyticsRoutes from '../src/routes/analytics.routes.js';

function createResponse() {
  return {
    statusCode: 200,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    }
  };
}

function stubModels(t, survey, aggregate) {
  const originalFindOne = Survey.findOne;
  const originalCountDocuments = Response.countDocuments;
  const originalAggregate = Response.aggregate;

  Survey.findOne = async () => survey;
  Response.countDocuments = async () => 4;
  Response.aggregate = aggregate;

  t.after(() => {
    Survey.findOne = originalFindOne;
    Response.countDocuments = originalCountDocuments;
    Response.aggregate = originalAggregate;
  });
}

function createSurvey() {
  return {
    _id: new mongoose.Types.ObjectId(),
    title: 'Customer feedback',
    slug: 'customer-feedback',
    status: 'published',
    questions: [
      {
        questionId: 'choice',
        type: 'single_choice',
        label: 'Would recommend?',
        required: true,
        options: [
          { optionId: 'yes', label: 'Yes' },
          { optionId: 'no', label: 'No' },
          { optionId: 'maybe', label: 'Maybe' }
        ],
        position: 0
      },
      {
        questionId: 'multi',
        type: 'multi_choice',
        label: 'What did you like?',
        required: false,
        options: [
          { optionId: 'food', label: 'Food' },
          { optionId: 'service', label: 'Service' }
        ],
        dependsOn: { questionId: 'choice', optionId: 'yes' },
        position: 1
      },
      {
        questionId: 'rating',
        type: 'rating',
        label: 'Rate us',
        required: true,
        position: 2
      },
      {
        questionId: 'text',
        type: 'text',
        label: 'Any notes?',
        required: false,
        position: 3
      }
    ]
  };
}

test('aggregates question distributions and conditional visibility', async (t) => {
  const survey = createSurvey();
  stubModels(t, survey, async (pipeline) => {
    assert.deepEqual(pipeline[0].$match.status, 'complete');
    assert.ok(pipeline[2].$facet.answered);
    assert.ok(pipeline[2].$facet.multiChoice);
    return [{
      answered: [
        { _id: 'choice', count: 3 },
        { _id: 'multi', count: 1 },
        { _id: 'rating', count: 3 },
        { _id: 'text', count: 2 }
      ],
      singleChoice: [
        { _id: { questionId: 'choice', value: 'yes' }, count: 2 },
        { _id: { questionId: 'choice', value: 'no' }, count: 1 }
      ],
      multiChoice: [
        { _id: { questionId: 'multi', value: 'food' }, count: 1 },
        { _id: { questionId: 'multi', value: 'service' }, count: 1 }
      ],
      ratings: [
        { _id: { questionId: 'rating', value: 5 }, count: 2 },
        { _id: { questionId: 'rating', value: 3 }, count: 1 }
      ]
    }];
  });

  const res = createResponse();
  await getSurveyAnalytics(
    { params: { id: String(survey._id) }, admin: { _id: 'admin-id' } },
    res,
    (error) => { throw error; }
  );

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.totalResponses, 4);
  const questions = Object.fromEntries(
    res.body.questions.map((question) => [question.questionId, question])
  );
  assert.equal(questions.choice.distribution[2].count, 0);
  assert.equal(questions.choice.distribution[0].percentage, 66.7);
  assert.equal(questions.multi.shownCount, 2);
  assert.equal(questions.multi.unansweredCount, 1);
  assert.equal(questions.multi.distribution[0].percentage, 100);
  assert.equal(questions.rating.average, 4.33);
  assert.deepEqual(
    questions.rating.distribution.map((item) => item.count),
    [0, 0, 1, 0, 2]
  );
  assert.equal(questions.text.answeredCount, 2);
  assert.equal(questions.text.unansweredCount, 2);
  assert.equal('distribution' in questions.text, false);
});

test('paginates text answers and rejects invalid page values', async (t) => {
  const survey = createSurvey();
  let pipeline;
  stubModels(t, survey, async (stages) => {
    pipeline = stages;
    return [{
      answers: [{
        _id: new mongoose.Types.ObjectId(),
        submittedAt: new Date('2026-01-01T00:00:00.000Z'),
        text: 'Helpful staff'
      }],
      total: [{ count: 35 }]
    }];
  });

  const invalidRes = createResponse();
  await getTextAnswers(
    {
      params: { id: String(survey._id), questionId: 'text' },
      query: { page: '0' },
      admin: { _id: 'admin-id' }
    },
    invalidRes,
    (error) => { throw error; }
  );
  assert.equal(invalidRes.statusCode, 400);
  assert.equal(pipeline, undefined);

  const res = createResponse();
  await getTextAnswers(
    {
      params: { id: String(survey._id), questionId: 'text' },
      query: { page: '2', limit: '10' },
      admin: { _id: 'admin-id' }
    },
    res,
    (error) => { throw error; }
  );

  assert.equal(pipeline.at(-1).$facet.answers[0].$skip, 10);
  assert.equal(pipeline.at(-1).$facet.answers[1].$limit, 10);
  assert.equal(res.body.totalAnswers, 35);
  assert.equal(res.body.totalPages, 4);
  assert.equal(res.body.answers[0].text, 'Helpful staff');
});

test('requires admin authentication for analytics routes', async (t) => {
  const app = express();
  app.use('/api/analytics', analyticsRoutes);
  const server = app.listen(0);
  t.after(() => new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  }));
  await new Promise((resolve) => server.once('listening', resolve));

  const response = await fetch(
    `http://127.0.0.1:${server.address().port}/api/analytics/surveys/507f1f77bcf86cd799439011`
  );
  assert.equal(response.status, 401);
});
