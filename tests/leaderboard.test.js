process.env.ADMIN_SECRET = 'TEST-ADMIN-SECRET';
process.env.JWT_SECRET = 'TEST-JWT-SECRET';
process.env.NODE_ENV = 'test';

jest.mock('../db', () => {
  const db = {
    getCache: jest.fn(),
    get: jest.fn(),
    all: jest.fn(),
    run: jest.fn(),
    clearExpiredCache: jest.fn(),
    setCache: jest.fn()
  };
  return { db, pool: {} };
});

const request = require('supertest');
const { db } = require('../db');
const app = require('../server');

describe('GET /api/vault/leaderboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns ranked vendor leaderboard rows', async () => {
    db.all.mockResolvedValue([
      { vendor_id: 'SKY-NET', display_name: 'SKY-NET', total_hits: 1256, total_likes: 489, youtube: '@skynet', tiktok: '', discord: 'discord.gg/skynet' },
      { vendor_id: 'AIM-LAB', display_name: 'AIM-LAB', total_hits: 900, total_likes: 300, youtube: '', tiktok: '@aimlab', discord: '' }
    ]);

    const res = await request(app).get('/api/vault/leaderboard?limit=20&sort=likes');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      expect.objectContaining({ vendor_id: 'SKY-NET', rank: 1, total_hits: 1256, total_likes: 489 }),
      expect.objectContaining({ vendor_id: 'AIM-LAB', rank: 2, total_hits: 900, total_likes: 300 })
    ]);
  });
});
