require('dotenv').config(); // Load .env before anything else — Jest doesn't auto-load it

jest.mock('../db', () => {
  const db = {
    run: jest.fn().mockResolvedValue({ changes: 1, lastID: 1 }),
    get: jest.fn().mockImplementation(async (sql) => {
      if (sql.includes('system_settings')) {
        return { setting_key: 'admin_secret', setting_value: process.env.ADMIN_SECRET };
      }
      return null;
    }),
    all: jest.fn().mockResolvedValue([]),
    query: jest.fn().mockResolvedValue([]),
    getCache: jest.fn().mockResolvedValue(null),
    setCache: jest.fn().mockResolvedValue(undefined),
  };
  return { db, pool: {} };
});

const request = require('supertest');
if (!process.env.ADMIN_SECRET) throw new Error('ADMIN_SECRET not set in .env');
const app = require('../server');
const { db } = require('../db');

describe('Smoke', () => {
  beforeAll(async () => {
    // DB is mocked — seed the mock so admin verify resolves correctly
    await db.run(
      "REPLACE INTO system_settings (setting_key, setting_value) VALUES ('admin_secret', ?)",
      [process.env.ADMIN_SECRET]
    );
  });

  it('serves index', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.text).toMatch(/<!DOCTYPE html>/i);
  });

  it('admin verify with master code', async () => {
    const res = await request(app)
      .post('/api/vault/verify')
      .send({ input: process.env.ADMIN_SECRET });
    expect(res.status).toBe(200);
    expect(res.body.type).toBe('admin');
    expect(res.body.redirect).toBe('/admin/dashboard.html');
    expect(res.headers['set-cookie']).toBeDefined();
  });
});
