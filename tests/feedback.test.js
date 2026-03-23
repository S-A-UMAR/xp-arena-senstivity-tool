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

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const request = require('supertest');
const { db } = require('../db');
const app = require('../server');

async function mockCodeLookup(code) {
  return {
    id: 12,
    entry_code: await bcrypt.hash(code, 4),
    lookup_key: 'abc123xyz0',
    vendor_status: 'active',
    status: 'active'
  };
}

describe('POST /api/vault/feedback', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    db.getCache.mockResolvedValue(null);
    db.run.mockResolvedValue({ changes: 1, lastID: 77 });
    db.setCache.mockResolvedValue({ changes: 1 });
  });

  it('accepts code payload and updates an existing viewer feedback row', async () => {
    db.get
      .mockResolvedValueOnce(await mockCodeLookup('XP-1234-5678'))
      .mockResolvedValueOnce({ id: 44, user_ign: 'Anon', user_region: 'Unknown' })
      .mockResolvedValueOnce({ likes_count: 48 });

    const res = await request(app)
      .post('/api/vault/feedback')
      .set('User-Agent', 'jest-browser')
      .send({ code: 'XP-1234-5678', rating: 5, feedback: 'Amazing settings!', feedback_tag: 'feels_good' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, likes_count: 48 });
    expect(db.run).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE code_activity SET feedback_rating = ?'),
      expect.arrayContaining([5, 'Amazing settings!', 'feels_good'])
    );
  });

  it('creates a feedback activity row when the code is valid but this viewer has no feedback row yet', async () => {
    db.get
      .mockResolvedValueOnce(await mockCodeLookup('XP-NEW-1000'))
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({ likes_count: 1 });

    const res = await request(app)
      .post('/api/vault/feedback')
      .set('User-Agent', 'jest-browser')
      .send({ code: 'XP-NEW-1000', rating: 5, feedback: 'Fresh like', feedback_tag: 'too_high' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, likes_count: 1 });
    expect(db.run).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO code_activity'),
      expect.arrayContaining(['XP-NEW-1000', 'too_high'])
    );
    expect(db.setCache).toHaveBeenCalled();
  });

  it('rate limits duplicate fresh feedback attempts for the same viewer fingerprint', async () => {
    db.get
      .mockResolvedValueOnce(await mockCodeLookup('XP-NEW-1000'))
      .mockResolvedValueOnce(undefined);
    db.getCache.mockResolvedValueOnce({ blocked: true });

    const res = await request(app)
      .post('/api/vault/feedback')
      .set('User-Agent', 'jest-browser')
      .send({ code: 'XP-NEW-1000', rating: 5, feedback_tag: 'too_low' });

    expect(res.status).toBe(429);
    expect(res.body.code).toBe('XP_RATE_LIMITED');
  });

  it('rejects unknown or invalid codes before inserting feedback', async () => {
    db.get.mockResolvedValueOnce(undefined);

    const res = await request(app)
      .post('/api/vault/feedback')
      .send({ code: 'XP-NOT-REAL', rating: 4, feedback: 'bad data' });

    expect(res.status).toBe(404);
    expect(res.body.code).toBe('XP_AUTH_INVALID');
    expect(db.run).not.toHaveBeenCalled();
  });

  it('rejects invalid feedback payload', async () => {
    const res = await request(app)
      .post('/api/vault/feedback')
      .send({ rating: 10 });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('XP_VAL_FAILED');
  });

  it('accepts share-token payloads without requiring the raw access code', async () => {
    const shareToken = jwt.sign({ type: 'share', sid: 'share-demo-7777', lookup_key: 'abc123xyz0' }, process.env.JWT_SECRET, { expiresIn: '1h' });

    db.get.mockImplementation(async (sql, params) => {
      if (sql.includes('FROM share_tokens WHERE share_id = ?')) {
        return { share_id: params[0], lookup_key: 'abc123xyz0', revoked_at: null, expires_at: '2099-01-01 00:00:00' };
      }
      if (sql.includes('FROM sensitivity_keys k')) {
        return mockCodeLookup('XP-SHARE-7777');
      }
      if (sql.includes('SELECT id, user_ign, user_region FROM code_activity')) {
        return undefined;
      }
      if (sql.includes('COUNT(*) as likes_count FROM code_activity')) {
        return { likes_count: 7 };
      }
      return null;
    });

    const res = await request(app)
      .post('/api/vault/feedback')
      .set('User-Agent', 'jest-browser')
      .send({ share_token: shareToken, rating: 4, feedback: 'Shared card worked well', feedback_tag: 'feels_good' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, likes_count: 7 });
    expect(db.run).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO code_activity'),
      expect.arrayContaining(['SHARED_LINK', 'feels_good'])
    );
  });
});
