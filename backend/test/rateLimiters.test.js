import assert from 'node:assert/strict';
import test from 'node:test';
import express from 'express';
import {
  loginRateLimiter,
  publicResponseRateLimiter,
  registrationRateLimiter
} from '../src/middleware/rateLimiters.js';

async function listen(app) {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, '127.0.0.1', () => resolve(server));
    server.once('error', reject);
  });
}

async function close(server) {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

async function request(server, path = '/') {
  return fetch(`http://127.0.0.1:${server.address().port}${path}`);
}

test('rate limiters reject requests after their configured limits', async (t) => {
  const cases = [
    { limiter: publicResponseRateLimiter, limit: 10, status: 201 },
    { limiter: loginRateLimiter, limit: 10, status: 401 },
    { limiter: registrationRateLimiter, limit: 5, status: 201 }
  ];

  for (const { limiter, limit, status } of cases) {
    const app = express();
    app.all('/', limiter, (req, res) => res.sendStatus(req.query.success ? 200 : status));
    const server = await listen(app);

    try {
      if (limiter === loginRateLimiter) {
        for (let attempt = 0; attempt < 12; attempt += 1) {
          assert.equal((await request(server, '/?success=1')).status, 200);
        }
      }

      for (let attempt = 0; attempt < limit; attempt += 1) {
        assert.equal((await request(server)).status, status);
      }

      const blocked = await request(server);
      assert.equal(blocked.status, 429);
      assert.ok(blocked.headers.get('retry-after'));
      assert.match((await blocked.json()).message, /too many/i);
    } finally {
      await close(server);
    }
  }
});
