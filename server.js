const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

const app = express();

// 🚀 PERFORMANCE & SECURITY LAYER
app.use(compression());
app.use(helmet({
    contentSecurityPolicy: process.env.NODE_ENV === 'production' ? {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"],
            scriptSrcAttr: ["'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdn.jsdelivr.net"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "https:*"],
            connectSrc: ["'self'", "https:*"],
        },
    } : false
}));

// Trust proxy for correct req.ip behind Vercel/Proxies
app.set('trust proxy', 1);

app.use(cors({
    origin: true,
    credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get('/health', (req, res) => res.json({ status: 'ok', tool: 'XP-SENSITIVITY-PRO', ts: Date.now() }));

// Static Handlers (local/dev; on Vercel, static is served by the platform)
app.use(express.static(path.join(__dirname, 'public'), {
    maxAge: '1d',
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html')) res.setHeader('Cache-Control', 'no-cache');
    }
}));

process.on('unhandledRejection', (error) => {
    console.error('⚠️ UNHANDLED_PROMISE_REJECTION:', error?.message || error);
});

process.on('uncaughtException', (error) => {
    console.error('🧨 UNCAUGHT_EXCEPTION:', error?.message || error);
});

const PORT = process.env.PORT || 3001;

// Rate Limiting
const apiLimiter = rateLimit({ windowMs: 60 * 1000, max: 120 });
const adminLimiter = rateLimit({ windowMs: 60 * 1000, max: 30 });
const diagnosticLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 5,
    message: { error: 'MAX_DIAGNOSTIC_ATTEMPTS_REACHED' }
});

app.use('/api', apiLimiter);
app.use('/api/vault/admin', adminLimiter);
app.use('/api/vault/diagnostics/submit', diagnosticLimiter);

// ⚡ SOCKET.IO: Only required in non-serverless environments at runtime
// For Vercel: io is null, live feed uses polling endpoints
app.set('io', null);

if (!process.env.VERCEL) {
    try {
        const http = require('http');
        const { Server } = require('socket.io');
        const server = http.createServer(app);
        const io = new Server(server, { cors: { origin: '*' } });
        io.on('connection', (socket) => {
            console.log('⚡ SOCKET_CONNECTED:', socket.id);
        });
        app.set('io', io);

        // Only listen when running directly
        if (require.main === module) {
            server.listen(PORT, () => {
                console.log(`
🚀 XP SENSITIVITY TOOL PRO
-------------------------
Mode: REALTIME_CORE
Port: ${PORT}
URL:  http://localhost:${PORT}
                `);
            });
        }
    } catch (err) {
        console.warn('⚠️ SOCKET_IO_UNAVAILABLE:', err.message);
    }
} else {
    console.log('ℹ️ VERCEL_ENV_DETECTED: live feed will use polling endpoints.');
}

// Routes
const vaultRoutes = require('./routes/vaultRoutes');
app.use('/api/vault', vaultRoutes);

// Auto-Migration (optional, only if flag set)
if (process.env.AUTO_MIGRATE === 'true') {
    require('./migrate');
}

// Global Error Handler
app.use((err, req, res, _next) => {
    console.error('SERVER_ERROR:', err.stack || err.message || err);
    const statusCode = err.status || 500;
    const message = process.env.NODE_ENV === 'production'
        ? 'INTERNAL_SERVER_ERROR'
        : err.message;
    res.status(statusCode).json({ error: message, status: 'CRITICAL', code: statusCode });
});

// Export for Vercel serverless
module.exports = app;
