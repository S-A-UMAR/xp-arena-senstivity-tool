# axptool - Elite Neural Sensitivity Tool

![axptool](public/favicon.svg)

A professional-grade, mobile-first SaaS platform designed for high-precision hardware calibration in competitive mobile gaming.

## 💎 Features
- **Neural Engine V4**: Server-side sensitivity calculation to protect proprietary algorithms.
- **Glassmorphism UI**: Premium mobile-first design with fluid 60FPS animations.
- **Hot-Cache Acceleration**: Sub-10ms response times using in-memory data caching.
- **Enterprise Security**: Bcrypt hashing, secure HttpOnly cookies, and IP-based fraud protection.
- **Multi-Tenant Architecture**: Support for Organizations and Vendors with granular key management.
- **Viral Discovery**: Integrated Open Graph, JSON-LD, and dynamic social previews.

## 🛠 Tech Stack
- **Backend**: Node.js, Express, Socket.io
- **Database**: MySQL/TiDB Cloud (mysql2 connection pool)
- **Frontend**: Vanilla JS (ES6+), Three.js (3D Neural Hub)
- **Security**: JWT, Bcrypt, Helmet, Rate-Limit

## 🚀 Quick Start
1. **Initialize Environment**:
   ```bash
   cp .env.template .env
   # Edit .env with your secrets
   ```
2. **Setup Database**:
   ```bash
   node migrate.js
   ```
3. **Start Core**:
   ```bash
   npm start
   ```

## 🔒 Security Model
axptool uses a 3-layer security model:
1. **Master Admin**: Hardware-locked IP Access.
2. **Vendor**: Provider-Key authentication with audit logging.
3. **End-User**: Cryptographically hashed access codes.

## 🌐 Optimization
- **PWA**: Fully offline-capable via Service Workers.
- **Gzip**: 70% payload reduction enabled.
- **Edge-Ready**: Designed for deployment on Vercel/Netlify/Heroku.

---
**POWERED BY axptool GLOBAL CLOUD ARCHITECTURE**
