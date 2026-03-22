process.env.JWT_SECRET = 'TEST-JWT-SECRET';
process.env.NODE_ENV = 'test';

jest.mock('../db', () => {
  const db = {
    getCache: jest.fn(),
    setCache: jest.fn(),
    clearExpiredCache: jest.fn(),
    get: jest.fn(async (sql, params) => {
      if (sql.includes('SELECT vendor_id, status, active_until FROM vendors WHERE vendor_id = ?')) {
        return { vendor_id: params[0], status: 'active', active_until: null };
      }
      if (sql.includes('COUNT(DISTINCT sk.lookup_key) as total_profiles')) {
        return { total_profiles: 4, total_views: 20, total_feedback: 5, average_rating: 4.6 };
      }
      return null;
    }),
    all: jest.fn(async (sql) => {
      if (sql.includes('GROUP BY sk.lookup_key, sk.created_at')) {
        return [{ lookup_key: 'abc123', total_views: 10, feedback_count: 3, average_rating: 4.8, created_at: '2026-03-22 00:00:00' }];
      }
      if (sql.includes('GROUP BY ca.user_region')) {
        return [{ region: 'BR', count: 8 }];
      }
      if (sql.includes('COALESCE(ca.feedback_tag')) {
        return [{ tag: 'too_high', count: 2 }, { tag: 'feels_good', count: 3 }];
      }
      return [];
    }),
    run: jest.fn(async () => ({ changes: 1, lastID: 1 }))
  };
  return { db, pool: {} };
});

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../server');

const vendorCookie = `xp_vendor_token=${jwt.sign({ vendor_id: 'NNAYI' }, process.env.JWT_SECRET, { expiresIn: '1h' })}`;

describe('GET /api/vault/insights', () => {
  it('returns vendor insight aggregates for the dashboard', async () => {
    const res = await request(app)
      .get('/api/vault/insights')
      .set('Cookie', vendorCookie);

    expect(res.status).toBe(200);
    expect(res.body.feedback_conversion_pct).toBe(25);
    expect(res.body.top_profiles[0].lookup_key).toBe('abc123');
    expect(res.body.feedback_breakdown[0].tag).toBe('too_high');
  });
});
