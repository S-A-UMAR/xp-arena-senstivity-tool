/**
 * XP ARENA - HARDENED SECURITY ENGINE
 * Implements AES-256 encryption for data integrity.
 */
const SecurityEngine = {
    // Master Salt (In a real enterprise app, this would be partially derived from the hardware signature)
    SALT: 'XP_ARENA_SECURE_VALUATION_2026',

    async encrypt(data) {
        try {
            const encoder = new TextEncoder();
            const keyMaterial = await crypto.subtle.importKey(
                'raw',
                encoder.encode(this.SALT),
                { name: 'PBKDF2' },
                false,
                ['deriveKey']
            );

            const key = await crypto.subtle.deriveKey(
                {
                    name: 'PBKDF2',
                    salt: encoder.encode('xp-static-salt'),
                    iterations: 100000,
                    hash: 'SHA-256'
                },
                keyMaterial,
                { name: 'AES-GCM', length: 256 },
                false,
                ['encrypt', 'decrypt']
            );

            const iv = crypto.getRandomValues(new Uint8Array(12));
            const encrypted = await crypto.subtle.encrypt(
                { name: 'AES-GCM', iv },
                key,
                encoder.encode(JSON.stringify(data))
            );

            // Combine IV and Encrypted Data
            const encryptedArray = new Uint8Array(encrypted);
            const combined = new Uint8Array(iv.length + encryptedArray.length);
            combined.set(iv);
            combined.set(encryptedArray, iv.length);

            return btoa(String.fromCharCode(...combined));
        } catch (e) {
            console.error('SEC_ERR_ENC:', e);
            return null;
        }
    },

    async decrypt(base64Data) {
        try {
            const combined = new Uint8Array(atob(base64Data).split('').map(c => c.charCodeAt(0)));
            const iv = combined.slice(0, 12);
            const data = combined.slice(12);

            const encoder = new TextEncoder();
            const keyMaterial = await crypto.subtle.importKey(
                'raw',
                encoder.encode(this.SALT),
                { name: 'PBKDF2' },
                false,
                ['deriveKey']
            );

            const key = await crypto.subtle.deriveKey(
                {
                    name: 'PBKDF2',
                    salt: encoder.encode('xp-static-salt'),
                    iterations: 100000,
                    hash: 'SHA-256'
                },
                keyMaterial,
                { name: 'AES-GCM', length: 256 },
                false,
                ['encrypt', 'decrypt']
            );

            const decrypted = await crypto.subtle.decrypt(
                { name: 'AES-GCM', iv },
                key,
                data
            );

            return JSON.parse(new TextDecoder().decode(decrypted));
        } catch (e) {
            console.error('SEC_ERR_DEC:', e);
            return null;
        }
    }
};

window.SecurityEngine = SecurityEngine;
