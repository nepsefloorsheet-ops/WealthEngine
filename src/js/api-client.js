/**
 * api-client.js - Centralized API wrapper with error handling and request cancellation
 */

const DEFAULT_TIMEOUT = 30000; // 30 seconds

class ApiClient {
    constructor(baseUrl = '') {
        this.baseUrl = baseUrl;
    }

    /**
     * Generic fetch wrapper
     * @param {string} endpoint 
     * @param {Object} options 
     * @returns {Promise<any>}
     */
    async request(endpoint, options = {}) {
        const { timeout = DEFAULT_TIMEOUT, ...fetchOptions } = options;

        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeout);

        try {
            const url = this.baseUrl + endpoint;
            const response = await fetch(url, {
                ...fetchOptions,
                signal: controller.signal
            });

            clearTimeout(id);

            if (!response.ok) {
                throw new Error(`API Error: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            clearTimeout(id);
            if (error.name === 'AbortError') {
                throw new Error('Request timed out or cancelled');
            }
            throw error;
        }
    }

    /**
     * GET request
     */
    get(endpoint, options = {}) {
        return this.request(endpoint, { ...options, method: 'GET' });
    }

    /**
     * POST request
     */
    post(endpoint, body, options = {}) {
        return this.request(endpoint, {
            ...options,
            method: 'POST',
            body: JSON.stringify(body),
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        });
    }
}

// Global instance
window.apiClient = new ApiClient();
window.ApiClient = ApiClient;
