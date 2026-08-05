/**
 * Dev Guide / API Documentation Module
 * Interactive spellbook showing all backend endpoints
 */
const DevGuide = (function() {
    'use strict';

    let isOpen = false;

    // ===== API Documentation Data =====
    const DOCS = {
        auth: {
            title: 'Authentication',
            icon: 'key',
            color: 'from-amber-400 to-orange-500',
            endpoints: [
                {
                    method: 'POST',
                    path: '/api/v1/auth/signup',
                    description: 'Register a new organization account',
                    body: {
                        organizationName: 'string (required)',
                        email: 'string (required, valid email)',
                        username: 'string (required, 3-50 chars)',
                        password: 'string (required, min 8 chars)',
                        confirmPassword: 'string (required, must match password)'
                    },
                    response: {
                        id: 'number',
                        username: 'string',
                        email: 'string',
                        organizationName: 'string',
                        createdAt: 'ISO datetime'
                    }
                },
                {
                    method: 'POST',
                    path: '/api/v1/auth/login',
                    description: 'Authenticate and receive JWT token',
                    body: {
                        username: 'string (required)',
                        password: 'string (required)'
                    },
                    response: {
                        token: 'JWT string',
                        type: 'Bearer',
                        user: {
                            id: 'number',
                            username: 'string',
                            email: 'string'
                        }
                    }
                }
            ]
        },
        company: {
            title: 'Company Setup',
            icon: 'building-2',
            color: 'from-blue-400 to-indigo-500',
            endpoints: [
                {
                    method: 'GET',
                    path: '/api/v1/company',
                    description: 'Get current company profile',
                    response: {
                        id: 'number',
                        name: 'string',
                        logoUrl: 'string (optional)',
                        taxRegistration: 'string (GSTIN/Tax ID)',
                        phone: 'string',
                        email: 'string',
                        address: 'string'
                    }
                },
                {
                    method: 'POST',
                    path: '/api/v1/company',
                    description: 'Create or update company profile',
                    body: {
                        name: 'string (required)',
                        logoUrl: 'string (optional)',
                        taxRegistration: 'string (optional)',
                        phone: 'string (optional)',
                        email: 'string (optional)',
                        address: 'string (optional)'
                    }
                }
            ]
        },
        brands: {
            title: 'Brand Management',
            icon: 'tags',
            color: 'from-pink-400 to-rose-500',
            endpoints: [
                {
                    method: 'GET',
                    path: '/api/v1/brands',
                    description: 'List all brands with pagination',
                    query: {
                        page: 'number (default: 0)',
                        size: 'number (default: 20)',
                        sort: 'string (e.g., name,asc)',
                        search: 'string (optional filter)'
                    },
                    response: {
                        content: [
                            { id: 'number', name: 'string', logoUrl: 'string', description: 'string' }
                        ],
                        totalElements: 'number',
                        totalPages: 'number'
                    }
                },
                {
                    method: 'POST',
                    path: '/api/v1/brands',
                    description: 'Create a new brand',
                    body: {
                        name: 'string (required)',
                        logoUrl: 'string (optional)',
                        description: 'string (optional)'
                    }
                },
                {
                    method: 'PUT',
                    path: '/api/v1/brands/{id}',
                    description: 'Update brand by ID',
                    pathVars: { id: 'number (brand ID)' },
                    body: {
                        name: 'string',
                        logoUrl: 'string',
                        description: 'string'
                    }
                },
                {
                    method: 'DELETE',
                    path: '/api/v1/brands/{id}',
                    description: 'Delete brand by ID',
                    pathVars: { id: 'number (brand ID)' }
                }
            ]
        },
        products: {
            title: 'Product / WMS Master',
            icon: 'box',
            color: 'from-purple-400 to-violet-500',
            endpoints: [
                {
                    method: 'GET',
                    path: '/api/v1/products',
                    description: 'List all products with pagination and filters',
                    query: {
                        page: 'number',
                        size: 'number',
                        sort: 'string',
                        search: 'string',
                        brandId: 'number (optional)',
                        lowStock: 'boolean (optional, filter low stock items)'
                    },
                    response: {
                        content: [
                            {
                                id: 'number',
                                eanCode: 'string',
                                sku: 'string',
                                itemCode: 'string',
                                name: 'string',
                                color: 'string',
                                size: 'string',
                                brandId: 'number',
                                purchasePrice: 'decimal',
                                sellingPrice: 'decimal',
                                currentStock: 'number',
                                reorderQty: 'number',
                                expiryDate: 'ISO date (optional)'
                            }
                        ],
                        totalElements: 'number'
                    }
                },
                {
                    method: 'POST',
                    path: '/api/v1/products',
                    description: 'Create new product',
                    body: {
                        eanCode: 'string (optional)',
                        sku: 'string (required, unique)',
                        itemCode: 'string (optional)',
                        name: 'string (required)',
                        color: 'string (optional)',
                        size: 'string (optional)',
                        brandId: 'number (optional)',
                        purchasePrice: 'decimal (required)',
                        sellingPrice: 'decimal (required)',
                        reorderQty: 'number (default: 10)',
                        expiryDate: 'ISO date (optional)'
                    }
                },
                {
                    method: 'PUT',
                    path: '/api/v1/products/{id}',
                    description: 'Update product by ID'
                },
                {
                    method: 'DELETE',
                    path: '/api/v1/products/{id}',
                    description: 'Delete product by ID'
                },
                {
                    method: 'GET',
                    path: '/api/v1/products/stats',
                    description: 'Get product statistics',
                    response: {
                        total: 'number',
                        lowStock: 'number',
                        outOfStock: 'number'
                    }
                }
            ]
        },
        suppliers: {
            title: 'Suppliers',
            icon: 'truck',
            color: 'from-emerald-400 to-teal-500',
            endpoints: [
                {
                    method: 'GET',
                    path: '/api/v1/suppliers',
                    description: 'List all suppliers'
                },
                {
                    method: 'POST',
                    path: '/api/v1/suppliers',
                    description: 'Create new supplier',
                    body: {
                        name: 'string (required)',
                        companyName: 'string (optional)',
                        email: 'string (optional)',
                        phone: 'string (optional)',
                        address: 'string (optional)',
                        contactPersons: [
                            { name: 'string', phone: 'string', email: 'string', designation: 'string' }
                        ]
                    }
                },
                {
                    method: 'PUT',
                    path: '/api/v1/suppliers/{id}',
                    description: 'Update supplier'
                },
                {
                    method: 'DELETE',
                    path: '/api/v1/suppliers/{id}',
                    description: 'Delete supplier'
                }
            ]
        },
        bills: {
            title: 'Bills & POS',
            icon: 'receipt',
            color: 'from-orange-400 to-amber-500',
            endpoints: [
                {
                    method: 'POST',
                    path: '/api/v1/bills',
                    description: 'Create new bill (immutable after creation)',
                    body: {
                        customerName: 'string (optional)',
                        customerPhone: 'string (optional)',
                        customerEmail: 'string (optional)',
                        items: [
                            {
                                productId: 'number (required)',
                                quantity: 'number (required, min 1)',
                                unitPrice: 'decimal (required)',
                                discount: 'decimal (default: 0)'
                            }
                        ],
                        taxRate: 'decimal (default: 0)',
                        notes: 'string (optional)'
                    },
                    response: {
                        id: 'number',
                        invoiceNumber: 'string (auto-generated)',
                        grandTotal: 'decimal',
                        status: 'PAID | PENDING'
                    }
                },
                {
                    method: 'GET',
                    path: '/api/v1/bills',
                    description: 'List bills with pagination',
                    query: {
                        page: 'number',
                        size: 'number',
                        sort: 'string',
                        search: 'string',
                        fromDate: 'ISO date',
                        toDate: 'ISO date'
                    }
                },
                {
                    method: 'GET',
                    path: '/api/v1/bills/{id}',
                    description: 'Get single bill by ID'
                },
                {
                    method: 'GET',
                    path: '/api/v1/bills/stats',
                    description: 'Get billing statistics'
                }
            ]
        },
        stock: {
            title: 'Stock Movement',
            icon: 'arrow-left-right',
            color: 'from-cyan-400 to-blue-500',
            endpoints: [
                {
                    method: 'GET',
                    path: '/api/v1/stock-movements',
                    description: 'Get stock movement audit log',
                    query: {
                        page: 'number',
                        size: 'number',
                        productId: 'number (optional)',
                        type: 'INWARD | OUTWARD (optional)',
                        fromDate: 'ISO date',
                        toDate: 'ISO date'
                    },
                    response: {
                        content: [
                            {
                                id: 'number',
                                productId: 'number',
                                productName: 'string',
                                type: 'INWARD | OUTWARD',
                                quantity: 'number',
                                reason: 'string',
                                referenceId: 'string (bill/supplier ID)',
                                userId: 'number',
                                createdAt: 'ISO datetime'
                            }
                        ]
                    }
                },
                {
                    method: 'POST',
                    path: '/api/v1/stock-movements',
                    description: 'Record stock adjustment (auto-logged)',
                    body: {
                        productId: 'number (required)',
                        type: 'INWARD | OUTWARD (required)',
                        quantity: 'number (required, positive)',
                        reason: 'string (required)',
                        referenceId: 'string (optional)'
                    }
                }
            ]
        },
        inventory: {
            title: 'Inventory Dashboard',
            icon: 'package',
            color: 'from-violet-400 to-purple-500',
            endpoints: [
                {
                    method: 'GET',
                    path: '/api/v1/inventory',
                    description: 'Get current inventory levels',
                    query: {
                        page: 'number',
                        size: 'number',
                        lowStock: 'boolean (optional)'
                    }
                },
                {
                    method: 'GET',
                    path: '/api/v1/inventory/stats',
                    description: 'Get inventory statistics',
                    response: {
                        totalValue: 'decimal',
                        totalItems: 'number',
                        lowStockCount: 'number'
                    }
                },
                {
                    method: 'POST',
                    path: '/api/v1/inventory/adjust',
                    description: 'Manual stock adjustment',
                    body: {
                        productId: 'number (required)',
                        adjustment: 'number (required, positive=add, negative=subtract)',
                        reason: 'string (required)'
                    }
                }
            ]
        },
        returns: {
            title: 'Returns Management',
            icon: 'rotate-ccw',
            color: 'from-red-400 to-pink-500',
            endpoints: [
                {
                    method: 'POST',
                    path: '/api/v1/returns',
                    description: 'Process a customer return',
                    body: {
                        billId: 'number (required, original bill)',
                        productId: 'number (required)',
                        quantity: 'number (required)',
                        reason: 'string (required)',
                        refundAmount: 'decimal (optional)'
                    }
                },
                {
                    method: 'GET',
                    path: '/api/v1/returns',
                    description: 'List all returns'
                }
            ]
        }
    };

    // ===== Toggle Drawer =====
    function toggle() {
        isOpen = !isOpen;
        const drawer = document.getElementById('devGuideDrawer');
        const overlay = document.getElementById('devGuideOverlay');

        if (isOpen) {
            drawer.classList.remove('translate-x-full');
            overlay.classList.remove('hidden');
            render();
        } else {
            drawer.classList.add('translate-x-full');
            overlay.classList.add('hidden');
        }
    }

    // ===== Render Documentation =====
    function render() {
        const content = document.getElementById('devGuideContent');

        content.innerHTML = `
            <div class="space-y-6">
                <div class="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-2xl p-4 border border-amber-200 dark:border-amber-800">
                    <div class="flex items-center gap-2 mb-2">
                        <i data-lucide="info" class="w-4 h-4 text-amber-600 dark:text-amber-400"></i>
                        <span class="font-bold text-sm text-amber-800 dark:text-amber-200">Backend URL</span>
                    </div>
                    <code class="text-xs bg-white dark:bg-slate-900 px-3 py-2 rounded-lg block border border-amber-200 dark:border-amber-800 font-mono text-amber-700 dark:text-amber-300">${API.getBaseUrl()}</code>
                </div>

                ${Object.entries(DOCS).map(([key, section]) => `
                    <div class="border border-amber-100 dark:border-slate-700 rounded-2xl overflow-hidden">
                        <button onclick="DevGuide.toggleSection('${key}')" class="w-full flex items-center gap-3 p-4 bg-gradient-to-r ${section.color} text-white">
                            <i data-lucide="${section.icon}" class="w-5 h-5"></i>
                            <span class="font-bold">${section.title}</span>
                            <i data-lucide="chevron-down" class="w-4 h-4 ml-auto transition-transform" id="devguide-icon-${key}"></i>
                        </button>
                        <div id="devguide-section-${key}" class="hidden">
                            <div class="divide-y divide-amber-100 dark:divide-slate-700">
                                ${section.endpoints.map(ep => renderEndpoint(ep)).join('')}
                            </div>
                        </div>
                    </div>
                `).join('')}

                <div class="bg-purple-50 dark:bg-purple-900/20 rounded-2xl p-4 border border-purple-200 dark:border-purple-800">
                    <h4 class="font-bold text-purple-800 dark:text-purple-200 mb-2 flex items-center gap-2">
                        <i data-lucide="shield" class="w-4 h-4"></i>
                        Authentication Header
                    </h4>
                    <code class="text-xs bg-white dark:bg-slate-900 px-3 py-2 rounded-lg block border border-purple-200 dark:border-purple-800 font-mono text-purple-700 dark:text-purple-300">
                        Authorization: Bearer &lt;your-jwt-token&gt;
                    </code>
                </div>

                <div class="bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl p-4 border border-emerald-200 dark:border-emerald-800">
                    <h4 class="font-bold text-emerald-800 dark:text-emerald-200 mb-2 flex items-center gap-2">
                        <i data-lucide="code-2" class="w-4 h-4"></i>
                        CORS Configuration (Spring Boot)
                    </h4>
                    <pre class="text-xs bg-white dark:bg-slate-900 px-3 py-2 rounded-lg border border-emerald-200 dark:border-emerald-800 font-mono text-emerald-700 dark:text-emerald-300 overflow-x-auto">@Configuration
public class CorsConfig implements WebMvcConfigurer {
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
            .allowedOrigins("*")
            .allowedMethods("GET","POST","PUT","DELETE","PATCH")
            .allowedHeaders("*")
            .allowCredentials(false);
    }
}</pre>
                </div>
            </div>
        `;

        lucide.createIcons();
    }

    function renderEndpoint(ep) {
        const methodColors = {
            GET: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
            POST: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
            PUT: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
            PATCH: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
            DELETE: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
        };

        return `
            <div class="p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                <div class="flex items-start gap-3 mb-2">
                    <span class="px-2 py-1 rounded-lg text-xs font-bold ${methodColors[ep.method] || 'bg-slate-100 text-slate-700'}">${ep.method}</span>
                    <code class="text-sm font-mono text-purple-600 dark:text-purple-400 font-semibold">${ep.path}</code>
                </div>
                <p class="text-sm text-slate-600 dark:text-slate-400 mb-3">${ep.description}</p>

                ${ep.pathVars ? `
                    <div class="mb-3">
                        <p class="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Path Variables</p>
                        <div class="bg-slate-50 dark:bg-slate-900 rounded-xl p-3 text-xs font-mono">
                            ${Object.entries(ep.pathVars).map(([k,v]) => `<div><span class="text-purple-500">${k}</span>: <span class="text-slate-600 dark:text-slate-400">${v}</span></div>`).join('')}
                        </div>
                    </div>
                ` : ''}

                ${ep.query ? `
                    <div class="mb-3">
                        <p class="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Query Parameters</p>
                        <div class="bg-slate-50 dark:bg-slate-900 rounded-xl p-3 text-xs font-mono">
                            ${Object.entries(ep.query).map(([k,v]) => `<div><span class="text-blue-500">${k}</span>: <span class="text-slate-600 dark:text-slate-400">${v}</span></div>`).join('')}
                        </div>
                    </div>
                ` : ''}

                ${ep.body ? `
                    <div class="mb-3">
                        <p class="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Request Body</p>
                        <pre class="bg-slate-50 dark:bg-slate-900 rounded-xl p-3 text-xs font-mono overflow-x-auto text-slate-700 dark:text-slate-300">${JSON.stringify(ep.body, null, 2)}</pre>
                    </div>
                ` : ''}

                ${ep.response ? `
                    <div>
                        <p class="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Response</p>
                        <pre class="bg-slate-50 dark:bg-slate-900 rounded-xl p-3 text-xs font-mono overflow-x-auto text-slate-700 dark:text-slate-300">${JSON.stringify(ep.response, null, 2)}</pre>
                    </div>
                ` : ''}
            </div>
        `;
    }

    function toggleSection(key) {
        const section = document.getElementById(`devguide-section-${key}`);
        const icon = document.getElementById(`devguide-icon-${key}`);

        if (section.classList.contains('hidden')) {
            section.classList.remove('hidden');
            icon.style.transform = 'rotate(180deg)';
        } else {
            section.classList.add('hidden');
            icon.style.transform = 'rotate(0deg)';
        }
    }

    // ===== Public API =====
    return {
        toggle,
        render,
        toggleSection
    };
})();
