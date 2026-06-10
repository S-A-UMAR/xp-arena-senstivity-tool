const request = require('supertest');
process.env.ADMIN_SECRET = process.env.ADMIN_SECRET || 'TEST-ADMIN-SECRET';
const app = require('../server');
const { db } = require('../db');

describe('Smoke', () => {
  beforeAll(async () => {
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
