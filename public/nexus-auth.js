/**
 * Nexus Auth Utility (v2.0)
 * Centralized authentication and API communication for AXP Neural Nexus.
 */
class NexusAuth {
    /**
     * Get the current authorization token.
     */
    static getToken() {
        return localStorage.getItem(NexusAuth.TOKEN_KEY);
    }

    /**
     * Save the authorization token and handle session cookie if needed.
     */
    static setToken(token) {
        if (!token) return NexusAuth.logout();
        localStorage.setItem(NexusAuth.TOKEN_KEY, token);
    }

    /**
     * Clear session and redirect to login.
     */
    static logout() {
        localStorage.removeItem(NexusAuth.TOKEN_KEY);
        // Optional: clear session cookie via server call if needed
        window.location.href = 'index.html?logout=true';
    }

    /**
     * Enhanced fetch with automatic authorization and error handling.
     */
    static async fetch(url, options = {}) {
        const token = NexusAuth.getToken();
        const headers = {
            'Content-Type': 'application/json',
            ...(options.headers || {})
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        // Merge options
        const fetchOptions = {
            ...options,
            headers,
            credentials: 'include' // Always include for cookie fallback
        };

        try {
            const response = await fetch(url, fetchOptions);
            
            if (response.status === 401) {
                console.error('NexusAuth: Unauthorized access detected. Redirecting...');
                this.logout();
                throw new Error('SESSION_EXPIRED');
            }

            return response;
        } catch (error) {
            console.error(`NexusAuth Error [${url}]:`, error);
            throw error;
        }
    }

    /**
     * Check if the user is authenticated.
     */
    static isAuthenticated() {
        return !!NexusAuth.getToken();
    }
}

NexusAuth.TOKEN_KEY = 'axp_vendor_token';
window.NexusAuth = NexusAuth;
