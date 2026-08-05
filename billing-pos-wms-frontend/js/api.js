/**
 * API Client Module
 * Handles all HTTP communication with the Spring Boot backend
 */
const API = (function() {
    'use strict';

    let baseUrl = localStorage.getItem('backendUrl') || 'http://localhost:8080';
    let healthCheckInterval = null;
    let isConnected = false;
    let authToken = localStorage.getItem('authToken') || null;
    let lastError = null;

    // ===== Configuration =====
    const CONFIG = {
        healthEndpoints: ['/api/v1/ping', '/api/health', '/actuator/health', '/health'],
        defaultHeaders: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        healthCheckIntervalMs: 8000,
        requestTimeoutMs: 10000
    };

    // ===== Event System =====
    const listeners = {};
    function on(event, callback) { if (!listeners[event]) listeners[event] = []; listeners[event].push(callback); }
    function off(event, callback) { if (!listeners[event]) return; listeners[event] = listeners[event].filter(cb => cb !== callback); }
    function emit(event, data) { if (!listeners[event]) return; listeners[event].forEach(cb => { try { cb(data); } catch (e) { console.error(e); } }); }

    // ===== Error Classification =====
    function classifyError(error, response) {
        const msg = error.message || '';
        if (msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('Network request failed')) {
            // Could be CORS or server down
            return { type: 'CORS_OR_DOWN', message: 'Cannot reach server. Either CORS is not configured, or the server is not running at this URL.' };
        }
        if (msg.includes('CORS') || msg.includes('cross-origin')) {
            return { type: 'CORS', message: 'CORS blocked the request. Add @CrossOrigin(origins="*") or a CorsConfig bean to your Spring Boot application.' };
        }
        if (response && response.status === 0) {
            return { type: 'CORS', message: 'Request blocked (status 0) — CORS is likely not configured on your Spring Boot backend.' };
        }
        if (msg.includes('timeout') || msg.includes('abort')) {
            return { type: 'TIMEOUT', message: 'Connection timed out. Server may be overloaded or unreachable.' };
        }
        if (response && response.status === 404) {
            return { type: 'NOT_FOUND', message: 'Server responded but health endpoint not found (404). Try a different URL or check your API prefix.' };
        }
        return { type: 'UNKNOWN', message: msg || 'Unknown error occurred' };
    }

    // ===== Core Request Handler =====
    async function request(endpoint, options = {}) {
        // Offline mode: return mock data
        if (offlineMode) {
            const mock = getMockResponse(endpoint, options.method || 'GET');
            if (mock) {
                console.log(`[MOCK] ${options.method || 'GET'} ${endpoint}`);
                return mock;
            }
        }

        // Normal fetch logic
        const url = `${baseUrl}${endpoint}`;
        const headers = { ...CONFIG.defaultHeaders };
        if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
        if (options.headers) Object.assign(headers, options.headers);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), CONFIG.requestTimeoutMs);

        try {
            console.log(`[API] ${options.method || 'GET'} ${url}`);
            const response = await fetch(url, { ...options, headers, signal: controller.signal, mode: 'cors' });
            clearTimeout(timeoutId);

            if (response.status === 401) {
                authToken = null; localStorage.removeItem('authToken'); emit('unauthorized');
                throw new Error('Session expired. Please login again.');
            }

            const contentType = response.headers.get('content-type');
            let data = null;
            if (contentType && contentType.includes('application/json')) { data = await response.json(); }
            else if (response.status !== 204) { const text = await response.text(); if (text) data = text; }

            if (!response.ok) {
                const errorMessage = data?.message || data?.error || `HTTP ${response.status}: ${response.statusText}`;
                throw new Error(errorMessage);
            }
            return { success: true, data, status: response.status };
        } catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') throw new Error('Request timed out. Please check your connection.');
            throw error;
        }
    }

    const get = (endpoint) => request(endpoint, { method: 'GET' });
    const post = (endpoint, body) => request(endpoint, { method: 'POST', body: JSON.stringify(body) });
    const put = (endpoint, body) => request(endpoint, { method: 'PUT', body: JSON.stringify(body) });
    const patch = (endpoint, body) => request(endpoint, { method: 'PATCH', body: JSON.stringify(body) });
    const del = (endpoint) => request(endpoint, { method: 'DELETE' });

    // ===== Multi-Endpoint Health Check =====
    async function checkHealth() {
        const errors = [];
        for (const endpoint of CONFIG.healthEndpoints) {
            try {
                const result = await request(endpoint, { method: 'GET' });
                console.log(`[Health] SUCCESS on ${endpoint}`);
                if (!isConnected) { isConnected = true; emit('connected', { endpoint, result }); }
                return { success: true, endpoint, data: result.data };
            } catch (error) {
                console.log(`[Health] FAILED on ${endpoint}: ${error.message}`);
                errors.push({ endpoint, error: error.message });
            }
        }
        // All endpoints failed
        const classified = classifyError(new Error(errors[0]?.error || 'All endpoints failed'), null);
        lastError = { errors, classified };
        if (isConnected) { isConnected = false; emit('disconnected', lastError); }
        return { success: false, ...lastError };
    }

    function startHealthCheck() {
        if (healthCheckInterval) clearInterval(healthCheckInterval);
        checkHealth();
        healthCheckInterval = setInterval(checkHealth, CONFIG.healthCheckIntervalMs);
    }

    function stopHealthCheck() {
        if (healthCheckInterval) { clearInterval(healthCheckInterval); healthCheckInterval = null; }
    }

    // ===== Auth Helpers =====
    function setToken(token) { authToken = token; if (token) localStorage.setItem('authToken', token); else localStorage.removeItem('authToken'); }
    function getToken() { return authToken; }
    function isAuthenticated() { return !!authToken; }

    // ===== Base URL =====
    function setBaseUrl(url) { baseUrl = url.replace(/\/$/, ''); localStorage.setItem('backendUrl', baseUrl); }
    function getBaseUrl() { return baseUrl; }
    function getLastError() { return lastError; }


    // ===== Offline Mock Data =====
    const MOCK_DATA = {
        '/api/v1/products/stats': { total: 42, lowStock: 3 },
        '/api/v1/bills/stats': { todaySales: 1250.50, totalBills: 18 },
        '/api/v1/inventory/stats': { totalValue: 15420.00 },
        '/api/v1/products': { content: [
            { id: 1, name: 'Wireless Mouse', sku: 'WM-001', eanCode: '1234567890123', itemCode: 'ITM-001', brandId: 1, color: 'Black', size: 'Standard', purchasePrice: 15.00, sellingPrice: 29.99, currentStock: 45, reorderQty: 10, expiryDate: null },
            { id: 2, name: 'Mechanical Keyboard', sku: 'KB-002', eanCode: '1234567890124', itemCode: 'ITM-002', brandId: 2, color: 'White', size: 'Full', purchasePrice: 45.00, sellingPrice: 89.99, currentStock: 8, reorderQty: 5, expiryDate: null },
            { id: 3, name: 'USB-C Cable', sku: 'CB-003', eanCode: '1234567890125', itemCode: 'ITM-003', brandId: null, color: 'Black', size: '2m', purchasePrice: 3.50, sellingPrice: 9.99, currentStock: 2, reorderQty: 20, expiryDate: null },
            { id: 4, name: 'Webcam 1080p', sku: 'WC-004', eanCode: '1234567890126', itemCode: 'ITM-004', brandId: 1, color: 'Black', size: 'Standard', purchasePrice: 25.00, sellingPrice: 49.99, currentStock: 0, reorderQty: 5, expiryDate: null }
        ], number: 0, totalPages: 1 },
        '/api/v1/brands': { content: [
            { id: 1, name: 'Logitech', logoUrl: '', description: 'Swiss computer peripherals manufacturer' },
            { id: 2, name: 'Keychron', logoUrl: '', description: 'Mechanical keyboard specialist' }
        ], number: 0, totalPages: 1 },
        '/api/v1/suppliers': { content: [
            { id: 1, name: 'Tech Distributors Inc', companyName: 'TechDist Ltd', email: 'orders@techdist.com', phone: '+1-555-0100', address: '123 Warehouse Ave, Industrial City', contactPersons: [{ name: 'John Smith', phone: '+1-555-0101', email: 'john@techdist.com', designation: 'Sales Manager' }] }
        ], number: 0, totalPages: 1 },
        '/api/v1/bills': { content: [
            { id: 1, invoiceNumber: 'INV-00001', customerName: 'Alice Cooper', customerPhone: '+1-555-0200', createdAt: new Date().toISOString(), grandTotal: 119.98, status: 'PAID', items: [{ productName: 'Wireless Mouse', quantity: 2, unitPrice: 29.99 }] },
            { id: 2, invoiceNumber: 'INV-00002', customerName: 'Bob Marley', customerPhone: '', createdAt: new Date(Date.now() - 86400000).toISOString(), grandTotal: 89.99, status: 'PAID', items: [{ productName: 'Mechanical Keyboard', quantity: 1, unitPrice: 89.99 }] }
        ], number: 0, totalPages: 1 },
        '/api/v1/stock-movements': { content: [
            { id: 1, productId: 1, productName: 'Wireless Mouse', type: 'INWARD', quantity: 50, reason: 'Initial stock', referenceId: 'PO-001', createdAt: new Date(Date.now() - 86400000 * 7).toISOString() },
            { id: 2, productId: 2, productName: 'Mechanical Keyboard', type: 'OUTWARD', quantity: 2, reason: 'Sale', referenceId: 'INV-00002', createdAt: new Date(Date.now() - 86400000).toISOString() }
        ], number: 0, totalPages: 1 },
        '/api/v1/returns': { content: [
            { id: 1, billId: 1, productId: 1, productName: 'Wireless Mouse', quantity: 1, reason: 'Defective unit', refundAmount: 29.99, createdAt: new Date(Date.now() - 3600000).toISOString() }
        ], number: 0, totalPages: 1 },
        '/api/v1/inventory': { content: [
            { id: 1, name: 'Wireless Mouse', sku: 'WM-001', currentStock: 45, reorderQty: 10 },
            { id: 2, name: 'Mechanical Keyboard', sku: 'KB-002', currentStock: 8, reorderQty: 5 },
            { id: 3, name: 'USB-C Cable', sku: 'CB-003', currentStock: 2, reorderQty: 20 },
            { id: 4, name: 'Webcam 1080p', sku: 'WC-004', currentStock: 0, reorderQty: 5 }
        ], number: 0, totalPages: 1 },
        '/api/v1/company': { id: 1, name: 'Demo Company Ltd', logoUrl: '', taxRegistration: 'GSTIN123456789', phone: '+1-555-0000', email: 'demo@company.com', address: '123 Business Street, Demo City' },
        '/api/v1/auth/login': { token: 'demo-jwt-token-12345', user: { id: 1, username: 'demo', email: 'demo@company.com' } },
        '/api/v1/auth/signup': { id: 2, username: 'newuser', email: 'new@user.com', organizationName: 'New Org' }
    };

    function getMockResponse(endpoint, method) {
        if (!offlineMode) return null;
        // Strip query params for matching
        const basePath = endpoint.split('?')[0];
        // Handle path variables by checking startsWith
        for (const [mockPath, data] of Object.entries(MOCK_DATA)) {
            if (basePath === mockPath || basePath.startsWith(mockPath + '/')) {
                return { success: true, data, status: 200 };
            }
        }
        // For POST/PUT/DELETE, return generic success
        if (method !== 'GET') {
            return { success: true, data: { id: Date.now(), message: 'Saved in demo mode (not persisted)' }, status: 200 };
        }
        return { success: true, data: { content: [], number: 0, totalPages: 0 }, status: 200 };
    }

    let offlineMode = localStorage.getItem('offlineMode') === 'true';
    function setOfflineMode(enabled) {
        offlineMode = enabled;
        localStorage.setItem('offlineMode', enabled ? 'true' : 'false');
    }

    // ===== Excel/CSV Export =====
    function exportToExcel(data, filename, sheetName = 'Data') {
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
        XLSX.writeFile(wb, `${filename}.xlsx`);
    }
    function exportToCSV(data, filename) {
        const ws = XLSX.utils.json_to_sheet(data);
        const csv = XLSX.utils.sheet_to_csv(ws);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${filename}.csv`;
        link.click();
        URL.revokeObjectURL(link.href);
    }

    return {
        get, post, put, patch, del, request,
        checkHealth, startHealthCheck, stopHealthCheck,
        setBaseUrl, getBaseUrl, getLastError,
        setToken, getToken, isAuthenticated, isConnected: () => isConnected,
        on, off, exportToExcel, exportToCSV, CONFIG, classifyError, setOfflineMode, getMockResponse
    };
})();
