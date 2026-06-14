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
      if (sql.includes('vendor_purchases')) {
        return { purchase_id: 'PUR-123', vendor_id: 'VND-TEST-123456', buyer_name: 'Test Buyer', package_type: '1day', duration_days: 1, price_naira: 500, activated: 1, access_key_plain: 'AXP-TEST-KEY', purchased_at: new Date().toISOString() };
      }
      if (sql.includes('vendor_packages')) {
        return { package_type: params[0] || '1day', duration_days: 1, price_naira: 500 };
      }
      if (sql.includes('SELECT * FROM vendors WHERE vendor_id = ?')) {
        return { vendor_id: params[0], status: 'active', active_until: new Date().toISOString(), brand_config: '{}' };
      }
      return null;
    }),
    all: jest.fn(async (sql) => {
      if (sql.includes('vendor_packages')) {
        return [{ package_type: '1day', duration_days: 1, price_naira: 500, description: '1-Day Pack' }];
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
    expect(res.body.accessKey).toMatch(/^AXP-NNAYI-/);
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
    expect(res.body.accessKey).toMatch(/^AXP-NNAYI-/);
  });

  describe('Vendor purchase and payment integration', () => {
    let originalFetch;

    beforeAll(() => {
      originalFetch = global.fetch;
      global.fetch = jest.fn().mockImplementation(async (url) => {
        if (url.includes('transaction/verify')) {
          return {
            ok: true,
            json: async () => ({
              status: true,
              data: {
                status: 'success',
                amount: 50000,
                reference: 'PAYSTACK-REF-123',
                customer: { email: 'buyer@test.com' }
              }
            })
          };
        }
        return { ok: false };
      });
    });

    afterAll(() => {
      global.fetch = originalFetch;
    });

    it('GET /api/vault/public/packages returns available package tiers', async () => {
      const res = await request(app).get('/api/vault/public/packages');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body[0].package_type).toBe('1day');
    });

    it('POST /api/vault/purchase/create creates a pending purchase record', async () => {
      const res = await request(app)
        .post('/api/vault/purchase/create')
        .send({
          buyerName: 'John Doe',
          packageType: '1day',
          price: 500
        });
      expect(res.status).toBe(200);
      expect(res.body.purchase_id).toMatch(/^PUR-/);
      expect(res.body.vendor_id).toMatch(/^VND-JOHN-DOE-/);
    });

    it('POST /api/vault/purchase/verify verifies Paystack payment and provisions vendor', async () => {
      const res = await request(app)
        .post('/api/vault/purchase/verify')
        .send({
          purchaseId: 'PUR-123',
          reference: 'PAYSTACK-REF-123'
        });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.accessKey).toMatch(/^AXP-/);
    });

    it('GET /api/vault/purchase/card/:purchaseId generates a premium vendor identity card', async () => {
      const res = await request(app).get('/api/vault/purchase/card/PUR-123');
      expect(res.status).toBe(200);
      expect(res.text).toContain('VENDOR_ID_CARD');
      expect(res.text).toContain('SECURE_ACCESS_PHRASE');
      expect(res.text).toContain('AXP-TEST-KEY');
    });
  });
});
