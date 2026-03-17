const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3001;

// Security Middleware
app.use(helmet({
    contentSecurityPolicy: process.env.NODE_ENV === 'production' ? {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"],
            styleSrc: ["'self'", "https://fonts.googleapis.com", "https://cdn.jsdelivr.net"],
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
    },
}));
app.use(compression());
app.use(cors());
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
app.use(express.static(path.join(__dirname, 'public'), {
    extensions: ['html', 'htm'],
    setHeaders: (res, filePath) => {
        if (path.extname(filePath) === '.html') {
            res.setHeader('Cache-Control', 'no-cache');
        }
    }
}));

// Routes
const vaultRoutes = require('./routes/vaultRoutes');
app.use('/api/vault', vaultRoutes);

// Health Check
app.get('/health', (req, res) => res.json({ status: 'ok', tool: 'XP-SENSITIVITY-PRO' }));

// Error Handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Internal Server Error' });
});

// Export for serverless (Netlify)
module.exports = app;

// Only listen if running directly
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`
🚀 XP SENSITIVITY TOOL PRO
-------------------------
Mode: STANDALONE
Port: ${PORT}
URL:  http://localhost:${PORT}
        `);
    });
}
