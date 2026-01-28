/**
 * api-client.js - Centralized API wrapper with error handling and request cancellation
 */

const DEFAULT_TIMEOUT = 60000;

/**
 * Custom Error classes for better error handling
 */
class ApiError extends Error {
    constructor(message, status, data) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.data = data;
    }
}

class ApiClient {
    constructor(baseUrl = '') {
        this.baseUrl = baseUrl;
    }

    /**
     * Normalizes errors into a consistent format
     */
    _handleError(error) {
        if (error.name === 'AbortError') {
            return new Error('Request timed out or was cancelled');
        }
        return error;
    }

    /**
     * Safely parse response
     */
    async _safeData(response, responseType = 'json') {
        try {
            if (responseType === 'text') {
                return await response.text();
            }
            if (responseType === 'blob') {
                return await response.blob();
            }
            return await response.json();
        } catch (e) {
            if (responseType === 'json') {
                throw new ApiError('Invalid JSON response from server', response.status);
            }
            throw new ApiError(`Failed to parse response as ${responseType}`, response.status);
        }
    }

    /**
     * Generic fetch wrapper
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

            const { responseType = 'json' } = options;

            if (!response.ok) {
                let errorData;
                try {
                    // Try to get JSON for error message, fallback to text
                    const contentType = response.headers.get('content-type');
                    if (contentType && contentType.includes('application/json')) {
                        errorData = await response.json();
                    } else {
                        errorData = await response.text();
                    }
                } catch (e) {
                    errorData = await response.text().catch(() => null);
                }
                
                const message = (typeof errorData === 'object' && errorData !== null) ? errorData.message : null;
                throw new ApiError(message || `API Error: ${response.status}`, response.status, errorData);
            }

            const data = await this._safeData(response, responseType);
            return data;
        } catch (error) {
            clearTimeout(id);
            throw this._handleError(error);
        }
    }

    async get(endpoint, options = {}) {
        const data = await this.request(endpoint, { ...options, method: 'GET' });
        if (options.cacheKey) {
            this.setCache(options.cacheKey, data);
        }
        return data;
    }

    /**
     * Cache utility
     */
    setCache(key, data) {
        try {
            localStorage.setItem(`we_cache_${key}`, JSON.stringify({
                timestamp: Date.now(),
                data: data
            }));
        } catch (e) {
            console.warn("Failed to set cache:", e);
        }
    }

    getCache(key) {
        try {
            const cached = localStorage.getItem(`we_cache_${key}`);
            if (cached) {
                return JSON.parse(cached).data;
            }
        } catch (e) {
            console.warn("Failed to get cache:", e);
        }
        return null;
    }

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

// Protect the instance in the global scope
if (!window.apiClient) {
    window.apiClient = new ApiClient();
}
window.ApiClient = ApiClient;
