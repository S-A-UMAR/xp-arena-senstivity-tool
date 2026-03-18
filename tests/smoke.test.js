const request = require('supertest');
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
      .send({ input: process.env.ADMIN_SECRET || 'XP-2008' });
    expect(res.status).toBe(200);
    expect(res.body.type).toBe('admin');
    expect(res.body.redirect).toBe('/admin.html');
    expect(res.headers['set-cookie']).toBeDefined();
  });
});
