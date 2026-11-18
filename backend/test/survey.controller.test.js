import assert from 'node:assert/strict';
import test from 'node:test';
import Survey from '../src/models/Survey.js';
import Response from '../src/models/Response.js';
import { getSurvey, listSurveys, unpublishSurvey } from '../src/controllers/survey.controller.js';

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

test('lists surveys with their response availability', async (t) => {
  const surveys = [
    { _id: 'survey-with-responses', toObject: () => ({ _id: 'survey-with-responses' }) },
    { _id: 'survey-without-responses', toObject: () => ({ _id: 'survey-without-responses' }) }
  ];
  const originalFind = Survey.find;
  const originalDistinct = Response.distinct;
  Survey.find = () => ({ sort: async () => surveys });
  Response.distinct = async () => ['survey-with-responses'];

  t.after(() => {
    Survey.find = originalFind;
    Response.distinct = originalDistinct;
  });

  const res = createResponse();
  await listSurveys(
    { admin: { _id: 'admin-id' } },
    res,
    (error) => { throw error; }
  );

  assert.deepEqual(res.body.surveys.map((survey) => survey.hasResponses), [true, false]);
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
