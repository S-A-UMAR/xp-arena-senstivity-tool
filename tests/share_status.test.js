process.env.JWT_SECRET = 'TEST-JWT-SECRET';
process.env.NODE_ENV = 'test';

jest.mock('../db', () => {
  const db = {
    getCache: jest.fn(),
    setCache: jest.fn(),
    clearExpiredCache: jest.fn(),
    get: jest.fn(),
    all: jest.fn(),
    run: jest.fn(async () => ({ changes: 1, lastID: 1 }))
  };
  return { db, pool: {} };
});

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const request = require('supertest');
const { db } = require('../db');
const app = require('../server');

describe('GET /api/vault/share/:token/status', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not expose the raw access code when hydrating a secure share link', async () => {
    const rawCode = 'XP-SHARE-2000';
    const shareToken = jwt.sign({ type: 'share', code: rawCode }, process.env.JWT_SECRET, { expiresIn: '1h' });

    db.get.mockImplementation(async (sql, params) => {
      if (sql.includes('FROM sensitivity_keys k')) {
        return {
          id: 17,
          entry_code: await bcrypt.hash(rawCode, 4),
          lookup_key: 'abc123xyz0',
          vendor_id: 'NNAYI',
          results_json: JSON.stringify({ general: '150-156', redDot: '145-151', scope2x: '140-146', scope4x: '138-144', ads: '149-155', sniperScope: '132-138', dpi: '600-640' }),
          creator_advice: 'Keep drag control relaxed.',
          current_usage: 4,
          usage_limit: null,
          expires_at: null,
          created_at: '2026-03-22 00:00:00',
          status: 'active',
          vendor_status: 'active',
          brand_config: JSON.stringify({ display_name: 'CreatorX' })
        };
      }
      if (sql.includes('SELECT usage_limit, active_until, webhook_url FROM vendors')) {
        return { usage_limit: null, active_until: null, webhook_url: null };
      }
      if (sql.includes('COUNT(*) as likes FROM code_activity')) {
        return { likes: 3 };
      }
      return null;
    });

    const res = await request(app).get(`/api/vault/share/${encodeURIComponent(shareToken)}/status`);

    expect(res.status).toBe(200);
    expect(res.body.entry_code).toBeNull();
    expect(res.body.share_token).toBe(shareToken);
    expect(res.body.redirect).toBe(`/result.html?share=${encodeURIComponent(shareToken)}`);
    expect(JSON.stringify(res.body)).not.toContain(rawCode);
  });
});
