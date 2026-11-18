import assert from 'node:assert/strict';
import test from 'node:test';
import Survey from '../src/models/Survey.js';
import Response from '../src/models/Response.js';
import {
  closeSurvey,
  getSurvey,
  listSurveys,
  unpublishSurvey
} from '../src/controllers/survey.controller.js';

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

function stubModels(t, survey, hasResponses) {
  const originalFindOne = Survey.findOne;
  const originalExists = Response.exists;
  Survey.findOne = async () => survey;
  Response.exists = async () => hasResponses;

  t.after(() => {
    Survey.findOne = originalFindOne;
    Response.exists = originalExists;
  });
}

function createSurvey() {
  return {
    _id: 'survey-id',
    status: 'published',
    publishedAt: new Date('2026-01-01T00:00:00.000Z'),
    saveCalled: false,
    toObject() {
      return { _id: this._id, status: this.status };
    },
    async save() {
      this.saveCalled = true;
    }
  };
}

test('exposes whether a survey has responses', async (t) => {
  const survey = createSurvey();
  stubModels(t, survey, true);

  const res = createResponse();
  await getSurvey(
    { params: { id: survey._id }, admin: { _id: 'admin-id' } },
    res,
    (error) => { throw error; }
  );

  assert.equal(res.body.survey.hasResponses, true);
});

test('lists surveys with completed response totals in status order', async (t) => {
  const surveys = [
    {
      _id: 'closed-survey',
      status: 'closed',
      updatedAt: new Date('2026-03-01T00:00:00.000Z'),
      toObject() {
        return { _id: this._id, status: this.status, updatedAt: this.updatedAt };
      }
    },
    {
      _id: 'published-survey',
      status: 'published',
      updatedAt: new Date('2026-02-01T00:00:00.000Z'),
      toObject() {
        return { _id: this._id, status: this.status, updatedAt: this.updatedAt };
      }
    },
    {
      _id: 'draft-survey',
      status: 'draft',
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      toObject() {
        return { _id: this._id, status: this.status, updatedAt: this.updatedAt };
      }
    }
  ];
  const originalFind = Survey.find;
  const originalAggregate = Response.aggregate;
  Survey.find = () => ({ sort: async () => surveys });
  let pipeline;
  Response.aggregate = async (value) => {
    pipeline = value;
    return [
      { _id: 'published-survey', totalResponses: 3 },
      { _id: 'closed-survey', totalResponses: 5 }
    ];
  };

  t.after(() => {
    Survey.find = originalFind;
    Response.aggregate = originalAggregate;
  });

  const res = createResponse();
  await listSurveys(
    { admin: { _id: 'admin-id' } },
    res,
    (error) => { throw error; }
  );

  assert.deepEqual(res.body.surveys.map((survey) => survey.status), ['draft', 'published', 'closed']);
  assert.deepEqual(res.body.surveys.map((survey) => survey.totalResponses), [0, 3, 5]);
  assert.deepEqual(res.body.surveys.map((survey) => survey.hasResponses), [false, true, true]);
  assert.equal(pipeline[0].$match.status, 'complete');
});

test('unpublishes a survey with no responses', async (t) => {
  const survey = createSurvey();
  stubModels(t, survey, false);

  const res = createResponse();
  await unpublishSurvey(
    { params: { id: survey._id }, admin: { _id: 'admin-id' } },
    res,
    (error) => { throw error; }
  );

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.survey.status, 'draft');
  assert.equal(survey.publishedAt, undefined);
  assert.equal(survey.saveCalled, true);
});

test('rejects unpublishing a survey that has responses', async (t) => {
  const survey = createSurvey();
  stubModels(t, survey, true);

  const res = createResponse();
  await unpublishSurvey(
    { params: { id: survey._id }, admin: { _id: 'admin-id' } },
    res,
    (error) => { throw error; }
  );

  assert.equal(res.statusCode, 409);
  assert.match(res.body.message, /has responses/);
  assert.equal(survey.status, 'published');
  assert.equal(survey.saveCalled, false);
});

test('closes a published survey after it has received responses', async (t) => {
  const survey = createSurvey();
  stubModels(t, survey, true);

  const res = createResponse();
  await closeSurvey(
    { params: { id: survey._id }, admin: { _id: 'admin-id' } },
    res,
    (error) => { throw error; }
  );

  assert.equal(res.statusCode, 200);
  assert.equal(survey.status, 'closed');
  assert.equal(res.body.survey.status, 'closed');
  assert.equal(res.body.survey.hasResponses, true);
  assert.equal(survey.saveCalled, true);
});

test('rejects closing a survey that has no responses', async (t) => {
  const survey = createSurvey();
  stubModels(t, survey, false);

  const res = createResponse();
  await closeSurvey(
    { params: { id: survey._id }, admin: { _id: 'admin-id' } },
    res,
    (error) => { throw error; }
  );

  assert.equal(res.statusCode, 409);
  assert.match(res.body.message, /at least one response/i);
  assert.equal(survey.status, 'published');
  assert.equal(survey.saveCalled, false);
});
