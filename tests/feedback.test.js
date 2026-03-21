process.env.ADMIN_SECRET = 'TEST-ADMIN-SECRET';
process.env.JWT_SECRET = 'TEST-JWT-SECRET';
process.env.NODE_ENV = 'test';

jest.mock('../db', () => {
  const db = {
    getCache: jest.fn(),
    get: jest.fn(),
    all: jest.fn(),
    run: jest.fn(),
    clearExpiredCache: jest.fn(),
    setCache: jest.fn()
  };
  return { db, pool: {} };
});

const request = require('supertest');
const { db } = require('../db');
const app = require('../server');

describe('POST /api/vault/feedback', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('accepts code payload and returns likes_count', async () => {
    db.get
      .mockResolvedValueOnce({ id: 44 })
      .mockResolvedValueOnce({ likes_count: 48 });
    db.run.mockResolvedValue({ changes: 1 });

    const res = await request(app)
      .post('/api/vault/feedback')
      .send({ code: 'XP-1234-5678', rating: 5, feedback: 'Amazing settings!' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, likes_count: 48 });
    expect(db.run).toHaveBeenCalled();
  });


  it('creates a feedback activity row when none exists yet', async () => {
    db.get
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({ likes_count: 1 });
    db.run
      .mockResolvedValueOnce({ lastID: 77, changes: 1 })
      .mockResolvedValueOnce({ changes: 1 });

    const res = await request(app)
      .post('/api/vault/feedback')
      .send({ code: 'XP-NEW-1000', rating: 5, feedback: 'Fresh like' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, likes_count: 1 });
    expect(db.run).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO code_activity'),
      expect.arrayContaining(['XP-NEW-1000'])
    );
  });

  it('rejects invalid feedback payload', async () => {
    const res = await request(app)
      .post('/api/vault/feedback')
      .send({ rating: 10 });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('XP_VAL_FAILED');
  });
});
