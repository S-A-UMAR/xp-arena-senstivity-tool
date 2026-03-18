const request = require('supertest');
process.env.ADMIN_SECRET = process.env.ADMIN_SECRET || 'TEST-ADMIN-SECRET';
const app = require('../server');

describe('API', () => {
  it('health', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});
