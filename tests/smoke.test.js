const request = require('supertest');
process.env.ADMIN_SECRET = process.env.ADMIN_SECRET || 'TEST-ADMIN-SECRET';
const app = require('../server');

describe('Smoke', () => {
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
    expect(res.body.redirect).toBe('/admin.html');
    expect(res.headers['set-cookie']).toBeDefined();
  });
});
