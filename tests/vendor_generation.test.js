process.env.JWT_SECRET = 'TEST-JWT-SECRET';
process.env.NODE_ENV = 'test';

jest.mock('../db', () => {
  const db = {
    getCache: jest.fn(),
    setCache: jest.fn(),
    clearExpiredCache: jest.fn(),
    get: jest.fn(async (sql, params) => {
      if (sql.includes("global_sensitivity_offset")) return { setting_value: '1.0' };
      if (sql.includes('SELECT vendor_id, status, active_until FROM vendors WHERE vendor_id = ?')) {
        return { vendor_id: params[0], status: 'active', active_until: null };
      }
      return null;
    }),
    all: jest.fn(async () => []),
    run: jest.fn(async () => ({ changes: 1, lastID: 1 }))
  };
  return { db, pool: {} };
});

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../server');

const vendorCookie = `xp_vendor_token=${jwt.sign({ vendor_id: 'NNAYI' }, process.env.JWT_SECRET, { expiresIn: '1h' })}`;

describe('Vendor generation routes', () => {
  it('accepts auto-generation payloads and returns an access key', async () => {
    const res = await request(app)
      .post('/api/vault/generate')
      .set('Cookie', vendorCookie)
      .send({
        brand: 'Apple',
        series: 'iPhone Pro Max/Plus Series',
        model: 'iPhone 17 Plus',
        ram: '8',
        speed: 'fast',
        claw: '4'
      });

    expect(res.status).toBe(200);
    expect(res.body.accessKey).toMatch(/^XP-NNAYI-/);
  });

  it('accepts manual vendor payloads and returns an access key', async () => {
    const res = await request(app)
      .post('/api/vault/manual-entry')
      .set('Cookie', vendorCookie)
      .send({
        general: '100',
        redDot: '100',
        scope2x: '100',
        scope4x: '100',
        sniper: '100',
        freeLook: '100',
        advice: 'Best with DPI 600'
      });

    expect(res.status).toBe(200);
    expect(res.body.accessKey).toMatch(/^XP-NNAYI-/);
  });
});
