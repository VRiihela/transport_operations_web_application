import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import express, { RequestHandler } from 'express';
import { loginRateLimit, refreshRateLimit } from '../middleware/rateLimiter';

function buildApp(limiter: RequestHandler) {
  const app = express();
  app.use(express.json());
  app.post('/test', limiter, (_req, res) => {
    res.json({ success: true });
  });
  return app;
}

describe('loginRateLimit', () => {
  let app: ReturnType<typeof buildApp>;

  beforeEach(() => {
    // Fresh app per test so counters reset
    app = buildApp(loginRateLimit);
  });

  it('allows requests within the 10-request limit', async () => {
    for (let i = 0; i < 5; i++) {
      const res = await request(app).post('/test').send({});
      expect(res.status).toBe(200);
    }
  });

  it('returns 429 after exceeding 10 requests', async () => {
    for (let i = 0; i < 10; i++) {
      await request(app).post('/test').send({});
    }
    const res = await request(app).post('/test').send({});
    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
  });

  it('includes Retry-After header on 429 response', async () => {
    for (let i = 0; i < 10; i++) {
      await request(app).post('/test').send({});
    }
    const res = await request(app).post('/test').send({});
    expect(res.headers['retry-after']).toBeDefined();
    expect(Number(res.headers['retry-after'])).toBeGreaterThan(0);
  });

  it('includes RateLimit-Limit header on allowed requests', async () => {
    const res = await request(app).post('/test').send({});
    expect(res.status).toBe(200);
    expect(res.headers['ratelimit-limit']).toBeDefined();
  });

  it('includes descriptive error message on 429', async () => {
    for (let i = 0; i < 10; i++) {
      await request(app).post('/test').send({});
    }
    const res = await request(app).post('/test').send({});
    expect(res.body.error.message).toMatch(/login attempts/i);
  });
});

describe('refreshRateLimit', () => {
  let app: ReturnType<typeof buildApp>;

  beforeEach(() => {
    app = buildApp(refreshRateLimit);
  });

  it('allows up to 30 requests', async () => {
    for (let i = 0; i < 25; i++) {
      const res = await request(app).post('/test').send({});
      expect(res.status).toBe(200);
    }
  });

  it('returns 429 after exceeding 30 requests', async () => {
    for (let i = 0; i < 30; i++) {
      await request(app).post('/test').send({});
    }
    const res = await request(app).post('/test').send({});
    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
  });

  it('includes descriptive error message on 429', async () => {
    for (let i = 0; i < 30; i++) {
      await request(app).post('/test').send({});
    }
    const res = await request(app).post('/test').send({});
    expect(res.body.error.message).toMatch(/refresh/i);
  });

  it('includes Retry-After header on 429', async () => {
    for (let i = 0; i < 30; i++) {
      await request(app).post('/test').send({});
    }
    const res = await request(app).post('/test').send({});
    expect(res.headers['retry-after']).toBeDefined();
  });
});
