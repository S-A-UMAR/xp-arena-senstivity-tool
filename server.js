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
            scriptSrc: ["'self'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdn.jsdelivr.net"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "https:*"],
            connectSrc: ["'self'", "https:*"],
        },
    } : {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdn.jsdelivr.net"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "https:*"],
            connectSrc: ["'self'", "https:*"],
        },
    }
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

app.get('/health', (req, res) => res.json({ status: 'ok', tool: 'XP-SENSITIVITY-PRO' }));

// Static Handlers (local/dev; on Vercel, static is served by the platform)
app.use(express.static(path.join(__dirname, 'public'), {
    maxAge: '1d',
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html')) res.setHeader('Cache-Control', 'no-cache');
    }
}));

process.on('unhandledRejection', (error) => {
    console.error('⚠️ UNHANDLED_PROMISE_REJECTION:', error);
});

process.on('uncaughtException', (error) => {
    console.error('🧨 UNCAUGHT_EXCEPTION:', error);
    // process.exit(1); // Optional: reboot strategy
});

const PORT = process.env.PORT || 3000;

app.use(express.json());

// Rate Limiting
const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 120,
});
const adminLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
});
app.use('/api', apiLimiter);
app.use('/api/vault/admin', adminLimiter);

// Serve Frontend

// Server configuration
const http = require('http');
const server = http.createServer(app);
const { Server } = require('socket.io');
const io = new Server(server, {
    cors: { origin: "*" }
});

// Real-time integration
app.set('io', io);
io.on('connection', (socket) => {
    console.log('⚡ SOCKET_CONNECTED:', socket.id);
});

// Routes
const vaultRoutes = require('./routes/vaultRoutes');
app.use('/api/vault', vaultRoutes);

// Error Handling
app.use((err, req, res, next) => {
    console.error('SERVER_ERROR:', err.stack);
    
    const statusCode = err.status || 500;
    const message = process.env.NODE_ENV === 'production' 
        ? 'INTERNAL_SERVER_ERROR // ENCRYPTION_INTEGRITY_CHECK_FAILED' 
        : err.message;

    res.status(statusCode).json({ 
        error: message,
        status: 'CRITICAL',
        code: statusCode
    });
});

// Export for serverless
module.exports = app;

// Only listen if running directly
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
