import assert from 'node:assert/strict';
import test from 'node:test';
import Survey from '../src/models/Survey.js';
import { getPublicSurvey, submitPublicResponse } from '../src/controllers/public.controller.js';

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

test('shows a closed message when loading a closed survey', async (t) => {
  const originalFindOne = Survey.findOne;
  Survey.findOne = () => ({
    select: async () => ({ status: 'closed' })
  });
  t.after(() => {
    Survey.findOne = originalFindOne;
  });

  const res = createResponse();
  await getPublicSurvey(
    { params: { slug: 'closed-survey' } },
    res,
    (error) => { throw error; }
  );

  assert.equal(res.statusCode, 410);
  assert.match(res.body.message, /survey is closed/i);
});

test('rejects a response submitted to a closed survey', async (t) => {
  const originalFindOne = Survey.findOne;
  Survey.findOne = async () => ({ status: 'closed' });
  t.after(() => {
    Survey.findOne = originalFindOne;
  });

  const res = createResponse();
  await submitPublicResponse(
    { params: { slug: 'closed-survey' }, body: { answers: [] } },
    res,
    (error) => { throw error; }
  );

  assert.equal(res.statusCode, 410);
  assert.match(res.body.message, /survey is closed/i);
});
