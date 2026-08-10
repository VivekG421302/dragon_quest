/**
 * Main Application Module
 */
const App = (function() {
    'use strict';

    let currentPage = 'dashboard';
    let sidebarOpen = false;
    let company = JSON.parse(localStorage.getItem('company') || 'null');
    let user = JSON.parse(localStorage.getItem('user') || 'null');
    let offlineMode = false;

    const NAV_ITEMS = [
        { id: 'dashboard', label: 'Dashboard', icon: 'layout-dashboard', module: null },
        { id: 'pos', label: 'POS Terminal', icon: 'scan-line', module: 'POS' },
        { id: 'bills', label: 'Past Bills', icon: 'receipt', module: 'Bills' },
        { id: 'inventory', label: 'Inventory', icon: 'package', module: 'Inventory' },
        { id: 'products', label: 'Products', icon: 'box', module: 'Products' },
        { id: 'brands', label: 'Brands', icon: 'tags', module: 'Brands' },
        { id: 'suppliers', label: 'Suppliers', icon: 'truck', module: 'Suppliers' },
        { id: 'stock-movement', label: 'Stock Movement', icon: 'arrow-left-right', module: 'StockMovement' },
        { id: 'returns', label: 'Returns', icon: 'rotate-ccw', module: 'Returns' },
        { id: 'ecommerce', label: 'E-Commerce', icon: 'shopping-bag', module: 'ECommerce' },
        { id: 'company', label: 'Company Setup', icon: 'building-2', module: 'Company' },
        { id: 'dev-lab', label: 'API Lab ⚡', icon: 'zap', module: 'DevLab' },
    ];

    function init() {
        UI.initTheme();
        const savedUrl = localStorage.getItem('backendUrl');
        if (savedUrl) document.getElementById('backendUrl').value = savedUrl;
        updateUserUI();
        API.on('connected', onBackendConnected);
        API.on('disconnected', onBackendDisconnected);
        API.on('unauthorized', () => { UI.toast('Session expired. Please login again.', 'warning'); navigateTo('auth'); });
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { UI.closeAllModals(); if (sidebarOpen) toggleSidebar(); } });
    }

    // ===== Backend Connection =====
    async function connectBackend() {
        const urlInput = document.getElementById('backendUrl');
        const url = urlInput.value.trim();
        const statusEl = document.getElementById('connectionStatus');
        const errorEl = document.getElementById('connectionError');
        const debugEl = document.getElementById('connectionDebug');
        const btn = document.getElementById('connectBtn');

        if (!url) { showError('Please enter a backend URL'); return; }

        btn.disabled = true;
        btn.innerHTML = `<div class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div><span>Probing...</span>`;
        statusEl.innerHTML = `<span class="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span><span class="text-blue-200">Trying endpoints...</span>`;
        errorEl.classList.add('hidden');
        if (debugEl) debugEl.classList.add('hidden');

        API.setBaseUrl(url);
        const healthInput = document.getElementById('healthUrl');
        const healthUrl = healthInput && healthInput.value.trim();
        if (healthUrl) API.setHealthUrl(healthUrl);
        else API.setHealthUrl(url); // default: same host

        try {
            const health = await API.checkHealth();

            if (health.success) {
                statusEl.innerHTML = `<span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span><span class="text-emerald-200">Connected via ${health.endpoint}!</span>`;
                const celebration = document.getElementById('celebrationOverlay');
                celebration.style.opacity = '1';
                setTimeout(() => {
                    document.getElementById('connectionOverlay').style.opacity = '0';
                    setTimeout(() => {
                        document.getElementById('connectionOverlay').classList.add('hidden');
                        document.getElementById('mainApp').classList.remove('hidden');
                        document.getElementById('mainApp').style.opacity = '1';
                        celebration.style.opacity = '0';
                        setTimeout(() => celebration.classList.add('hidden'), 1000);
                        API.startHealthCheck();
                        renderSidebar();
                        if (API.isAuthenticated()) navigateTo('dashboard');
                        else navigateTo('auth');
                        document.getElementById('connPillUrl').textContent = new URL(url).host;
                    }, 500);
                }, 1500);
            } else {
                throw health;
            }
        } catch (result) {
            btn.disabled = false;
            btn.innerHTML = `<i data-lucide="zap" class="w-5 h-5"></i><span>Connect</span>`;
            lucide.createIcons();

            const classified = result.classified || API.classifyError(new Error(result.errors?.[0]?.error || 'Unknown'), null);
            statusEl.innerHTML = `<span class="w-2 h-2 rounded-full bg-red-400"></span><span class="text-red-200">Connection failed</span>`;

            let errorHtml = `<strong>${classified.message}</strong>`;
            if (classified.type === 'CORS' || classified.type === 'CORS_OR_DOWN') {
                errorHtml += `<div class="mt-3 p-3 bg-slate-800/50 rounded-xl text-xs font-mono text-left overflow-x-auto"><p class="text-amber-300 mb-1">// Add this to your Spring Boot app:</p><pre>@Configuration
public class CorsConfig implements WebMvcConfigurer {
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
            .allowedOrigins("*")
            .allowedMethods("GET","POST","PUT","DELETE","PATCH")
            .allowedHeaders("*")
            .allowCredentials(false);
    }
}</pre></div>`;
            }

            errorEl.innerHTML = errorHtml;
            errorEl.classList.remove('hidden');

            // Show debug info
            if (debugEl && result.errors) {
                debugEl.innerHTML = `<p class="text-xs font-bold text-slate-400 mb-1">Tried endpoints:</p>` + 
                    result.errors.map(e => `<div class="text-xs font-mono ${e.error.includes('Failed') ? 'text-red-400' : 'text-orange-400'}">${e.endpoint} — ${e.error}</div>`).join('');
                debugEl.classList.remove('hidden');
            }
        }
    }

    function showError(msg) {
        const el = document.getElementById('connectionError');
        el.textContent = msg;
        el.classList.remove('hidden');
    }

    // ===== Offline Demo Mode =====
    function enterOfflineMode() {
        offlineMode = true;
        API.setOfflineMode(true);
        localStorage.setItem('offlineMode', 'true');
        document.getElementById('connectionOverlay').style.opacity = '0';
        setTimeout(() => {
            document.getElementById('connectionOverlay').classList.add('hidden');
            document.getElementById('mainApp').classList.remove('hidden');
            document.getElementById('mainApp').style.opacity = '1';
            document.getElementById('connPillUrl').textContent = 'OFFLINE';
            document.getElementById('connPillUrl').classList.add('text-amber-500');
            renderSidebar();
            navigateTo('dashboard');
            UI.toast('Running in offline demo mode. Data will not persist.', 'warning', 6000);
        }, 500);
    }

    function onBackendConnected() {
        document.getElementById('connPillUrl').classList.remove('text-red-400', 'text-amber-500');
        document.getElementById('connPillUrl').classList.add('text-emerald-700', 'dark:text-emerald-300');
    }
    function onBackendDisconnected() {
        if (!offlineMode) UI.toast('Lost connection to backend. Retrying...', 'warning');
    }

    // ===== Sidebar =====
    function renderSidebar() {
        const menu = document.getElementById('sidebarMenu');
        menu.innerHTML = NAV_ITEMS.map(item => `
            <button onclick="App.navigateTo('${item.id}')" data-page="${item.id}"
                class="w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-200 group ${item.id === currentPage 
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/20' 
                    : 'text-slate-600 dark:text-slate-300 hover:bg-amber-100 dark:hover:bg-slate-800 hover:translate-x-1'}">
                <i data-lucide="${item.icon}" class="w-5 h-5 ${item.id === currentPage ? 'text-white' : 'text-slate-400 group-hover:text-purple-500 dark:group-hover:text-purple-400'} transition-colors"></i>
                <span class="font-semibold text-sm">${item.label}</span>
                ${item.id === 'pos' ? '<span class="ml-auto text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-bold">NEW</span>' : ''}
                ${item.id === 'dev-lab' ? '<span class="ml-auto text-[10px] bg-violet-500/30 text-violet-300 px-2 py-0.5 rounded-full font-bold">DEV</span>' : ''}
            </button>
        `).join('');
        lucide.createIcons();
    }

    function toggleSidebar() {
        sidebarOpen = !sidebarOpen;
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebarOverlay');
        if (sidebarOpen) { sidebar.classList.remove('-translate-x-full'); overlay.classList.remove('hidden'); }
        else { sidebar.classList.add('-translate-x-full'); overlay.classList.add('hidden'); }
    }

    function toggleTheme() {
        UI.toggleTheme();
    }

    // ===== Navigation =====
    function navigateTo(pageId, params = {}) {
        currentPage = pageId;
        document.querySelectorAll('#sidebarMenu button').forEach(btn => {
            const isActive = btn.dataset.page === pageId;
            btn.className = `w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-200 group ${isActive 
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/20' 
                : 'text-slate-600 dark:text-slate-300 hover:bg-amber-100 dark:hover:bg-slate-800 hover:translate-x-1'}`;
            const icon = btn.querySelector('i');
            if (icon) icon.className = `w-5 h-5 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-purple-500 dark:group-hover:text-purple-400'} transition-colors`;
        });
        if (sidebarOpen) toggleSidebar();
        const content = document.getElementById('pageContent');
        content.innerHTML = '<div class="page-enter">' + renderPage(pageId, params) + '</div>';
        const navItem = NAV_ITEMS.find(n => n.id === pageId);
        if (navItem && navItem.module && window[navItem.module] && window[navItem.module].init) {
            setTimeout(() => window[navItem.module].init(params), 0);
        }
        if (pageId === 'auth' && typeof Auth !== 'undefined') setTimeout(() => Auth.init(), 0);
        if (pageId === 'dashboard') setTimeout(() => renderDashboard(), 0);
        lucide.createIcons();
        window.scrollTo(0, 0);
    }

    function renderPage(pageId, params) {
        switch (pageId) {
            case 'auth': return typeof Auth !== 'undefined' ? Auth.render() : authFallback();
            case 'dashboard': return dashboardTemplate();
            case 'pos': return typeof POS !== 'undefined' ? POS.render() : moduleFallback('POS Terminal');
            case 'bills': return typeof Bills !== 'undefined' ? Bills.render() : moduleFallback('Past Bills');
            case 'inventory': return typeof Inventory !== 'undefined' ? Inventory.render() : moduleFallback('Inventory');
            case 'products': return typeof Products !== 'undefined' ? Products.render() : moduleFallback('Products');
            case 'brands': return typeof Brands !== 'undefined' ? Brands.render() : moduleFallback('Brands');
            case 'suppliers': return typeof Suppliers !== 'undefined' ? Suppliers.render() : moduleFallback('Suppliers');
            case 'stock-movement': return typeof StockMovement !== 'undefined' ? StockMovement.render() : moduleFallback('Stock Movement');
            case 'returns': return typeof Returns !== 'undefined' ? Returns.render() : moduleFallback('Returns');
            case 'ecommerce': return typeof ECommerce !== 'undefined' ? ECommerce.render() : moduleFallback('E-Commerce');
            case 'company': return typeof Company !== 'undefined' ? Company.render() : moduleFallback('Company Setup');
            case 'dev-lab': return typeof DevLab !== 'undefined' ? DevLab.render() : moduleFallback('API Lab');
            default: return notFoundTemplate(pageId);
        }
    }


    // ===== 404 Not Found =====
    function notFoundTemplate(pageId) {
        return `
        <div class="flex flex-col items-center justify-center py-24 text-center px-4">
            <div class="relative w-48 h-48 mx-auto mb-8">
                <div class="absolute inset-0 bg-gradient-to-br from-purple-200 to-pink-200 dark:from-purple-900/30 dark:to-pink-900/30 rounded-full animate-pulse"></div>
                <div class="absolute inset-4 bg-gradient-to-br from-purple-100 to-pink-100 dark:from-slate-800 dark:to-slate-700 rounded-full flex items-center justify-center">
                    <svg viewBox="0 0 200 200" class="w-28 h-28">
                        <!-- Confused dragon -->
                        <ellipse cx="100" cy="130" rx="50" ry="38" fill="#a78bfa" opacity="0.4"/>
                        <circle cx="100" cy="90" r="32" fill="#a78bfa" opacity="0.6"/>
                        <!-- Eyes - one open squiggly one closed -->
                        <path d="M84 83 Q90 78 96 83" stroke="#4c1d95" stroke-width="2.5" fill="none"/>
                        <circle cx="112" cy="84" r="5" fill="#4c1d95" opacity="0.8"/>
                        <circle cx="113" cy="82" r="2" fill="white" opacity="0.9"/>
                        <!-- Question mark thought bubble -->
                        <text x="128" y="62" fill="#7c3aed" font-size="22" font-family="monospace" font-weight="900" opacity="0.9">?</text>
                        <!-- Snout -->
                        <ellipse cx="100" cy="102" rx="11" ry="7" fill="#a78bfa" opacity="0.5"/>
                        <!-- Horns -->
                        <path d="M78 68 Q73 50 68 44" stroke="#7c3aed" stroke-width="2.5" fill="none" stroke-linecap="round"/>
                        <path d="M122 68 Q127 50 132 44" stroke="#7c3aed" stroke-width="2.5" fill="none" stroke-linecap="round"/>
                    </svg>
                </div>
            </div>
            <div class="max-w-md">
                <h1 class="font-display text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600 mb-3">404</h1>
                <h2 class="font-display text-2xl font-bold text-slate-800 dark:text-slate-100 mb-3">The dragon is confused!</h2>
                <p class="text-slate-500 dark:text-slate-400 mb-2">
                    The page <code class="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-purple-600 dark:text-purple-400 font-mono text-sm">${pageId}</code> doesn't exist in this kingdom.
                </p>
                <p class="text-slate-400 dark:text-slate-500 text-sm mb-8">The dragon looked everywhere — behind the scrolls, under the anvil, even in the treasury — but found nothing.</p>
                <div class="flex flex-col sm:flex-row gap-3 justify-center">
                    <button onclick="App.navigateTo('dashboard')"
                        class="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold rounded-2xl shadow-lg shadow-purple-500/20 hover:scale-105 transition-transform">
                        <i data-lucide="home" class="w-4 h-4"></i> Back to Dashboard
                    </button>
                    <button onclick="history.back()"
                        class="flex items-center justify-center gap-2 px-6 py-3 border-2 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 font-bold rounded-2xl hover:border-purple-300 hover:text-purple-600 transition-colors">
                        <i data-lucide="arrow-left" class="w-4 h-4"></i> Go Back
                    </button>
                </div>
                <div class="mt-8 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-2xl border border-amber-200 dark:border-amber-800">
                    <p class="text-xs text-amber-700 dark:text-amber-300 font-semibold mb-2">Available pages in this kingdom:</p>
                    <div class="flex flex-wrap gap-2 justify-center">
                        ${App.getNavItems().map(n => '<button onclick="App.navigateTo(\'' + n.id + '\')" class="px-3 py-1 bg-white dark:bg-slate-800 border border-amber-200 dark:border-slate-600 rounded-lg text-xs text-slate-600 dark:text-slate-300 hover:border-purple-300 hover:text-purple-600 transition-colors font-medium">' + n.label + '</button>').join('')}
                    </div>
                </div>
            </div>
        </div>`;
    }

    // ===== Dashboard =====
    function dashboardTemplate() {
        return `
            <div class="space-y-6">
                <div class="bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400 rounded-3xl p-8 text-white shadow-xl shadow-purple-500/20 relative overflow-hidden">
                    <div class="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
                    <div class="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2"></div>
                    <div class="relative z-10">
                        <h1 class="font-display text-3xl sm:text-4xl font-bold mb-2">Welcome back, ${user?.username || 'Merchant'}! 👋</h1>
                        <p class="text-white/80 text-lg">Here's what's happening in your kingdom today.</p>
                        ${offlineMode ? '<p class="mt-2 text-amber-200 text-sm font-semibold"><i data-lucide="wifi-off" class="w-4 h-4 inline mr-1"></i>Offline Demo Mode — connect to a backend for real data</p>' : ''}
                    </div>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="dashboardStats">
                    ${[1,2,3,4].map(i => `<div class="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-amber-100 dark:border-slate-700 shadow-sm story-card"><div class="skeleton h-4 w-20 rounded mb-3"></div><div class="skeleton h-8 w-32 rounded"></div></div>`).join('')}
                </div>
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div class="lg:col-span-2 bg-white dark:bg-slate-800 rounded-3xl p-6 border border-amber-100 dark:border-slate-700 shadow-sm">
                        <div class="flex items-center justify-between mb-6">
                            <h2 class="font-display font-bold text-xl text-slate-800 dark:text-slate-100">Recent Activity</h2>
                            <button onclick="App.navigateTo('bills')" class="text-sm text-purple-500 hover:text-purple-600 font-semibold">View All</button>
                        </div>
                        <div id="recentActivity" class="space-y-3">${UI.skeleton(4, 1)}</div>
                    </div>
                    <div class="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-amber-100 dark:border-slate-700 shadow-sm">
                        <h2 class="font-display font-bold text-xl text-slate-800 dark:text-slate-100 mb-6">Quick Actions</h2>
                        <div class="space-y-3">
                            <button onclick="App.navigateTo('pos')" class="w-full flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border border-emerald-200 dark:border-emerald-800 hover:scale-[1.02] transition-transform text-left group">
                                <div class="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover:scale-110 transition-transform"><i data-lucide="plus" class="w-5 h-5 text-white"></i></div>
                                <div><p class="font-bold text-slate-800 dark:text-slate-100">New Sale</p><p class="text-xs text-slate-600 dark:text-slate-300 font-medium">Create a new bill</p></div>
                            </button>
                            <button onclick="App.navigateTo('products')" class="w-full flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border border-purple-200 dark:border-purple-800 hover:scale-[1.02] transition-transform text-left group">
                                <div class="w-10 h-10 bg-purple-500 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/20 group-hover:scale-110 transition-transform"><i data-lucide="box" class="w-5 h-5 text-white"></i></div>
                                <div><p class="font-bold text-slate-800 dark:text-slate-100">Add Product</p><p class="text-xs text-slate-600 dark:text-slate-300 font-medium">Register new inventory</p></div>
                            </button>
                            <button onclick="App.navigateTo('inventory')" class="w-full flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-800 hover:scale-[1.02] transition-transform text-left group">
                                <div class="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/20 group-hover:scale-110 transition-transform"><i data-lucide="package-check" class="w-5 h-5 text-white"></i></div>
                                <div><p class="font-bold text-slate-800 dark:text-slate-100">Check Stock</p><p class="text-xs text-slate-600 dark:text-slate-300 font-medium">View inventory levels</p></div>
                            </button>
                        </div>
                    </div>
                </div>
            </div>`;
    }

    async function renderDashboard() {
        if (offlineMode) {
            document.getElementById('dashboardStats').innerHTML = [0,1,2,3].map(() => `
                <div class="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-amber-100 dark:border-slate-700 shadow-sm story-card">
                    <div class="flex items-center justify-between mb-2"><span class="text-sm font-semibold text-slate-600 dark:text-slate-300">Demo Stat</span><div class="w-8 h-8 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center"><i data-lucide="bar-chart-3" class="w-4 h-4 text-slate-400"></i></div></div>
                    <p class="text-3xl font-bold text-slate-300 dark:text-slate-600">--</p>
                </div>`).join('');
            document.getElementById('recentActivity').innerHTML = `
                <div class="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-2xl border border-amber-200 dark:border-amber-800 text-center">
                    <i data-lucide="wifi-off" class="w-8 h-8 text-amber-400 mx-auto mb-2"></i>
                    <p class="text-sm text-amber-700 dark:text-amber-300 font-semibold">Offline Mode</p>
                    <p class="text-xs text-amber-600 dark:text-amber-400 mt-1">Connect to your Spring Boot backend to see real data</p>
                </div>`;
            lucide.createIcons();
            return;
        }
        try {
            const [productsRes, billsRes, stockRes] = await Promise.all([
                API.get('/api/v1/products/stats').catch(() => ({ data: { total: 0, lowStock: 0 } })),
                API.get('/api/v1/bills/stats').catch(() => ({ data: { todaySales: 0, totalBills: 0 } })),
                API.get('/api/v1/inventory/stats').catch(() => ({ data: { totalValue: 0 } }))
            ]);
            const stats = {
                products: productsRes.data?.total || 0, lowStock: productsRes.data?.lowStock || 0,
                todaySales: billsRes.data?.todaySales || 0, totalBills: billsRes.data?.totalBills || 0,
                stockValue: stockRes.data?.totalValue || 0
            };
            document.getElementById('dashboardStats').innerHTML = `
                <div class="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-amber-100 dark:border-slate-700 shadow-sm story-card"><div class="flex items-center justify-between mb-2"><span class="text-sm font-semibold text-slate-600 dark:text-slate-300">Total Products</span><div class="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center"><i data-lucide="box" class="w-4 h-4 text-purple-500"></i></div></div><p class="text-3xl font-bold text-slate-800 dark:text-slate-100">${UI.formatNumber(stats.products)}</p></div>
                <div class="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-amber-100 dark:border-slate-700 shadow-sm story-card"><div class="flex items-center justify-between mb-2"><span class="text-sm font-semibold text-slate-600 dark:text-slate-300">Today's Sales</span><div class="w-8 h-8 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center"><i data-lucide="trending-up" class="w-4 h-4 text-emerald-500"></i></div></div><p class="text-3xl font-bold text-slate-800 dark:text-slate-100">${UI.formatCurrency(stats.todaySales)}</p></div>
                <div class="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-amber-100 dark:border-slate-700 shadow-sm story-card"><div class="flex items-center justify-between mb-2"><span class="text-sm font-semibold text-slate-600 dark:text-slate-300">Low Stock Alerts</span><div class="w-8 h-8 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center"><i data-lucide="alert-triangle" class="w-4 h-4 text-red-500"></i></div></div><p class="text-3xl font-bold ${stats.lowStock > 0 ? 'text-red-500' : 'text-slate-800 dark:text-slate-100'}">${stats.lowStock}</p></div>
                <div class="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-amber-100 dark:border-slate-700 shadow-sm story-card"><div class="flex items-center justify-between mb-2"><span class="text-sm font-semibold text-slate-600 dark:text-slate-300">Stock Value</span><div class="w-8 h-8 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center"><i data-lucide="wallet" class="w-4 h-4 text-amber-500"></i></div></div><p class="text-3xl font-bold text-slate-800 dark:text-slate-100">${UI.formatCurrency(stats.stockValue)}</p></div>`;
            const recentRes = await API.get('/api/v1/bills?size=5&sort=createdAt,desc').catch(() => ({ data: { content: [] } }));
            const recent = recentRes.data?.content || [];
            if (recent.length === 0) {
                document.getElementById('recentActivity').innerHTML = UI.emptyState('No recent activity', 'clock', { label: 'Create First Bill', onclick: 'App.navigateTo("pos")' });
            } else {
                document.getElementById('recentActivity').innerHTML = recent.map(bill => `
                    <div class="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-700/50 hover:bg-amber-50 dark:hover:bg-slate-700 transition-colors cursor-pointer" onclick="Bills.viewBill('${bill.id}')">
                        <div class="w-10 h-10 bg-gradient-to-br from-purple-400 to-pink-400 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0">${bill.invoiceNumber?.slice(-2) || '##'}</div>
                        <div class="flex-1 min-w-0"><p class="font-semibold text-slate-800 dark:text-slate-200 truncate">Invoice #${bill.invoiceNumber || 'N/A'}</p><p class="text-xs text-slate-600 dark:text-slate-300">${bill.customerName || 'Walk-in Customer'} • ${UI.formatDateTime(bill.createdAt)}</p></div>
                        <div class="text-right flex-shrink-0"><p class="font-bold text-slate-800 dark:text-slate-100">${UI.formatCurrency(bill.grandTotal)}</p><span class="text-xs px-2 py-0.5 rounded-full ${bill.status === 'PAID' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'}">${bill.status || 'PENDING'}</span></div>
                    </div>`).join('');
            }
            lucide.createIcons();
        } catch (error) { console.error('Dashboard load error:', error); }
    }

    // ===== Auth & User =====
    function updateUserUI() {
        const userData = JSON.parse(localStorage.getItem('user') || 'null');
        const avatar = document.getElementById('userAvatar');
        const name = document.getElementById('userName');
        if (userData) { if (avatar) avatar.textContent = (userData.username || 'U').charAt(0).toUpperCase(); if (name) name.textContent = userData.username || 'User'; }
        else { if (avatar) avatar.textContent = 'G'; if (name) name.textContent = 'Guest'; }
    }
    function setUser(userData) { user = userData; localStorage.setItem('user', JSON.stringify(userData)); updateUserUI(); }
    function setCompany(companyData) { company = companyData; localStorage.setItem('company', JSON.stringify(companyData)); }
    function getCompany() { return company; }
    function logout() { API.setToken(null); localStorage.removeItem('user'); localStorage.removeItem('company'); user = null; company = null; updateUserUI(); UI.toast('Logged out successfully', 'info'); navigateTo('auth'); }

    // ===== Fallbacks =====
    function authFallback() {
        return `<div class="max-w-md mx-auto mt-12"><div class="bg-white dark:bg-slate-800 rounded-3xl p-8 border border-amber-100 dark:border-slate-700 shadow-xl">
            <div class="text-center mb-8"><div class="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-purple-500/20"><i data-lucide="castle" class="w-8 h-8 text-white"></i></div>
            <h2 class="font-display text-2xl font-bold text-slate-800 dark:text-slate-100">Authentication</h2><p class="text-slate-600 dark:text-slate-300 mt-1 font-medium">Please login to continue</p></div>
            <div class="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800 text-center"><p class="text-sm text-amber-800 dark:text-amber-200">Auth module loading...</p></div>
        </div></div>`;
    }
    function moduleFallback(name) {
        return `<div class="flex flex-col items-center justify-center py-20"><div class="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4 animate-pulse"><i data-lucide="loader" class="w-10 h-10 text-slate-400 animate-spin"></i></div><h2 class="font-display text-xl font-bold text-slate-700 dark:text-slate-300">Loading ${name}...</h2><p class="text-slate-600 dark:text-slate-300 mt-2">Please wait while the module initializes</p></div>`;
    }

    return {
        init, connectBackend, enterOfflineMode, toggleSidebar, toggleTheme, navigateTo, logout,
        setUser, setCompany, getCompany, updateUserUI,
        getCurrentPage: () => currentPage, getNavItems: () => NAV_ITEMS, isOffline: () => offlineMode
    };
})();

document.addEventListener('DOMContentLoaded', () => { App.init(); });
