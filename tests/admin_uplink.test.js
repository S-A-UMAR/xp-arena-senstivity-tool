const request = require('supertest');

jest.mock('../db', () => {
  const mockDb = {
    get: jest.fn(async (sql) => {
      if (sql.includes('FROM vendors) as vendors')) {
        return { vendors: 2, codes: 5, usage_total: 14, global_accuracy: 4.6 };
      }
      if (sql.includes('SELECT COUNT(*) as count FROM vendors')) return { count: 2 };
      if (sql.includes('SELECT COUNT(*) as count FROM sensitivity_keys')) return { count: 5 };
      return null;
    }),
    all: jest.fn(async (sql) => {
      if (sql.includes('FROM user_events')) {
        return [
          { event_type: 'landing_view', count: 20 },
          { event_type: 'calibration_start', count: 12 },
          { event_type: 'code_generated', count: 9 },
          { event_type: 'result_view', count: 7 }
        ];
      }
      if (sql.includes('FROM vendors v') && sql.includes('LIMIT 10')) {
        return [{ name: 'VNDR-ALPHA', keys: 3, clicks: 11 }];
      }
      if (sql.includes('FROM vendors v') && sql.includes('ORDER BY v.created_at DESC')) {
        return [{ vendor_id: 'VNDR-ALPHA', status: 'active', total_codes: 3, total_usage: 11 }];
      }
      if (sql.includes('FROM code_activity ca') && sql.includes('LIMIT 30')) {
        return [];
      }
      if (sql.includes('FROM security_logs')) {
        return [];
      }
      return [];
    }),
    run: jest.fn(async () => ({ changes: 1, lastID: 1 }))
  };

  return {
    db: mockDb,
    pool: { getConnection: jest.fn() }
  };
});

process.env.ADMIN_SECRET = process.env.ADMIN_SECRET || 'TEST-ADMIN-SECRET';
const app = require('../server');

describe('Admin uplink flows', () => {
  it('logs in, accesses admin dashboard endpoints, and logs out', async () => {
    const login = await request(app)
      .post('/api/vault/admin/login')
      .send({ password: process.env.ADMIN_SECRET });

    expect(login.status).toBe(200);
    expect(login.headers['set-cookie']).toBeDefined();
    const cookie = login.headers['set-cookie'][0].split(';')[0];

    const stats = await request(app)
      .get('/api/vault/admin/stats')
      .set('Cookie', cookie);
    expect(stats.status).toBe(200);
    expect(stats.body.vendors).toBe(2);

    const orgStats = await request(app)
      .get('/api/vault/org/stats')
      .set('Cookie', cookie);
    expect(orgStats.status).toBe(200);
    expect(Array.isArray(orgStats.body.funnel)).toBe(true);

    const creators = await request(app)
      .get('/api/vault/org/creators')
      .set('Cookie', cookie);
    expect(creators.status).toBe(200);

    const logout = await request(app)
      .post('/api/vault/admin/logout')
      .set('Cookie', cookie);
    expect(logout.status).toBe(200);
    expect(logout.body.success).toBe(true);
  });

  it('rejects org analytics without admin auth', async () => {
    const res = await request(app).get('/api/vault/org/stats');
    expect(res.status).toBe(401);
  });
});
