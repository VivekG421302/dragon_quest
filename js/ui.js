/**
 * UI Utilities Module
 * Toast notifications, modals, theme management, shared components
 */
const UI = (function() {
    'use strict';

    // ===== Toast Notifications =====
    function toast(message, type = 'info', duration = 4000) {
        const container = document.getElementById('toastContainer');
        if (!container) return;

        const icons = {
            success: 'check-circle',
            error: 'x-circle',
            warning: 'alert-triangle',
            info: 'info'
        };

        const colors = {
            success: 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-900/30 dark:border-emerald-700 dark:text-emerald-200',
            error: 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/30 dark:border-red-700 dark:text-red-200',
            warning: 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-900/30 dark:border-amber-700 dark:text-amber-200',
            info: 'bg-sky-50 border-sky-200 text-sky-800 dark:bg-sky-900/30 dark:border-sky-700 dark:text-sky-200'
        };

        const iconColors = {
            success: 'text-emerald-500',
            error: 'text-red-500',
            warning: 'text-amber-500',
            info: 'text-sky-500'
        };

        const toastEl = document.createElement('div');
        toastEl.className = `toast-enter pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-2xl border shadow-lg max-w-sm ${colors[type]}`;
        toastEl.innerHTML = `
            <i data-lucide="${icons[type]}" class="w-5 h-5 mt-0.5 flex-shrink-0 ${iconColors[type]}"></i>
            <div class="flex-1 min-w-0">
                <p class="text-sm font-medium leading-relaxed">${message}</p>
            </div>
            <button onclick="this.parentElement.remove()" class="flex-shrink-0 p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
                <i data-lucide="x" class="w-4 h-4 opacity-60"></i>
            </button>
        `;

        container.appendChild(toastEl);
        lucide.createIcons({ nodes: [toastEl] });

        setTimeout(() => {
            toastEl.classList.remove('toast-enter');
            toastEl.classList.add('toast-exit');
            setTimeout(() => toastEl.remove(), 300);
        }, duration);
    }

    // ===== Modal System =====
    function openModal(options) {
        const { title, content, size = 'md', onClose, showClose = true, actions = [] } = options;

        const sizeClasses = {
            sm: 'max-w-md',
            md: 'max-w-lg',
            lg: 'max-w-2xl',
            xl: 'max-w-4xl',
            full: 'max-w-full mx-4'
        };

        const modalId = 'modal-' + Date.now();

        const modalHTML = `
            <div id="${modalId}" class="fixed inset-0 z-[9995] flex items-center justify-center p-4 modal-backdrop">
                <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" onclick="UI.closeModal('${modalId}')"></div>
                <div class="relative ${sizeClasses[size]} w-full bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-amber-100 dark:border-slate-700 modal-content max-h-[90vh] flex flex-col">
                    ${showClose ? `
                    <div class="flex items-center justify-between p-6 border-b border-amber-100 dark:border-slate-700 flex-shrink-0">
                        <h3 class="font-display font-bold text-xl text-slate-800 dark:text-slate-100">${title}</h3>
                        <button onclick="UI.closeModal('${modalId}')" class="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                            <i data-lucide="x" class="w-5 h-5 text-slate-400"></i>
                        </button>
                    </div>
                    ` : ''}
                    <div class="p-6 overflow-y-auto flex-1">
                        ${content}
                    </div>
                    ${actions.length > 0 ? `
                    <div class="flex items-center justify-end gap-3 p-6 border-t border-amber-100 dark:border-slate-700 flex-shrink-0">
                        ${actions.map(a => `
                            <button onclick="${a.onclick || ''}" class="${a.class || 'px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors font-medium'}">
                                ${a.label}
                            </button>
                        `).join('')}
                    </div>
                    ` : ''}
                </div>
            </div>
        `;

        const container = document.getElementById('modalContainer');
        container.insertAdjacentHTML('beforeend', modalHTML);
        lucide.createIcons();

        // Store onClose callback
        const modalEl = document.getElementById(modalId);
        if (onClose) modalEl.dataset.onClose = onClose.toString();

        return modalId;
    }

    function closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) return;

        modal.style.opacity = '0';
        modal.style.transition = 'opacity 0.2s ease';
        setTimeout(() => {
            if (modal.dataset.onClose) {
                try { eval(`(${modal.dataset.onClose})()`); } catch(e) {}
            }
            modal.remove();
        }, 200);
    }

    function closeAllModals() {
        document.querySelectorAll('#modalContainer > div').forEach(m => {
            m.style.opacity = '0';
            setTimeout(() => m.remove(), 200);
        });
    }

    // ===== Loading States =====
    function showLoading(element, message = 'Loading...') {
        if (typeof element === 'string') element = document.getElementById(element);
        if (!element) return;

        element.dataset.originalContent = element.innerHTML;
        element.innerHTML = `
            <div class="flex items-center justify-center gap-3 py-8">
                <div class="w-6 h-6 border-3 border-purple-200 border-t-purple-500 rounded-full animate-spin"></div>
                <span class="text-slate-500 dark:text-slate-400 font-medium">${message}</span>
            </div>
        `;
        element.dataset.isLoading = 'true';
    }

    function hideLoading(element) {
        if (typeof element === 'string') element = document.getElementById(element);
        if (!element || !element.dataset.isLoading) return;

        element.innerHTML = element.dataset.originalContent || '';
        delete element.dataset.originalContent;
        delete element.dataset.isLoading;
    }

    // ===== Skeleton Loading =====
    function skeleton(rows = 3, cols = 1) {
        let html = '<div class="space-y-3">';
        for (let i = 0; i < rows; i++) {
            html += '<div class="flex gap-3">';
            for (let j = 0; j < cols; j++) {
                html += '<div class="skeleton h-12 flex-1 rounded-xl"></div>';
            }
            html += '</div>';
        }
        html += '</div>';
        return html;
    }

    // ===== Empty State =====
    function emptyState(message, icon = 'package-x', action = null) {
        return `
            <div class="flex flex-col items-center justify-center py-16 text-center">
                <div class="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                    <i data-lucide="${icon}" class="w-10 h-10 text-slate-400"></i>
                </div>
                <h3 class="font-display font-bold text-lg text-slate-700 dark:text-slate-300 mb-2">${message}</h3>
                ${action ? `<button onclick="${action.onclick}" class="mt-4 px-6 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-xl shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30 transition-all hover:scale-105">${action.label}</button>` : ''}
            </div>
        `;
    }

    // ===== Theme Management =====
    function initTheme() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        applyTheme(savedTheme);
    }

    function applyTheme(theme) {
        const html = document.documentElement;
        if (theme === 'dark') {
            html.classList.add('dark');
            html.setAttribute('data-theme', 'dark');
        } else {
            html.classList.remove('dark');
            html.setAttribute('data-theme', 'light');
        }
        localStorage.setItem('theme', theme);
    }

    function toggleTheme() {
        const html = document.documentElement;
        const isDark = html.classList.contains('dark');
        applyTheme(isDark ? 'light' : 'dark');
    }

    // ===== Form Helpers =====
    function getFormData(formId) {
        const form = document.getElementById(formId);
        if (!form) return {};

        const data = {};
        const formData = new FormData(form);

        formData.forEach((value, key) => {
            // Handle arrays (e.g., contacts[0].name)
            if (key.includes('[')) {
                const match = key.match(/^(.+?)\[(\d+)\]\.(.+)$/);
                if (match) {
                    const [, arrName, index, field] = match;
                    if (!data[arrName]) data[arrName] = [];
                    if (!data[arrName][index]) data[arrName][index] = {};
                    data[arrName][index][field] = value;
                } else {
                    data[key] = value;
                }
            } else {
                data[key] = value;
            }
        });

        // Handle checkboxes
        form.querySelectorAll('input[type="checkbox"]').forEach(cb => {
            data[cb.name] = cb.checked;
        });

        return data;
    }

    function validateForm(formId, rules = {}) {
        const form = document.getElementById(formId);
        if (!form) return { valid: true };

        const errors = {};
        let valid = true;

        Object.entries(rules).forEach(([field, rule]) => {
            const input = form.querySelector(`[name="${field}"]`);
            if (!input) return;

            const value = input.value.trim();

            if (rule.required && !value) {
                errors[field] = rule.requiredMessage || `${field} is required`;
                valid = false;
            }

            if (rule.minLength && value.length < rule.minLength) {
                errors[field] = `Minimum ${rule.minLength} characters required`;
                valid = false;
            }

            if (rule.pattern && !rule.pattern.test(value)) {
                errors[field] = rule.patternMessage || `Invalid format`;
                valid = false;
            }

            if (rule.match) {
                const matchInput = form.querySelector(`[name="${rule.match}"]`);
                if (matchInput && value !== matchInput.value) {
                    errors[field] = rule.matchMessage || 'Fields do not match';
                    valid = false;
                }
            }
        });

        // Clear previous errors
        form.querySelectorAll('.error-message').forEach(el => el.remove());
        form.querySelectorAll('.story-input-error').forEach(el => {
            el.classList.remove('story-input-error');
            el.classList.remove('border-red-400');
        });

        // Show errors
        Object.entries(errors).forEach(([field, message]) => {
            const input = form.querySelector(`[name="${field}"]`);
            if (input) {
                input.classList.add('border-red-400');
                const errorEl = document.createElement('p');
                errorEl.className = 'error-message text-red-500 text-xs mt-1';
                errorEl.textContent = message;
                input.parentNode.appendChild(errorEl);
            }
        });

        return { valid, errors };
    }

    // ===== Pagination Component =====
    function pagination(currentPage, totalPages, onPageChange, totalItems = null) {
        if (totalPages <= 1) return '';

        let pages = [];
        const maxVisible = 5;

        if (totalPages <= maxVisible) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            if (currentPage <= 3) {
                pages = [1, 2, 3, 4, '...', totalPages];
            } else if (currentPage >= totalPages - 2) {
                pages = [1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
            } else {
                pages = [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
            }
        }

        const info = totalItems !== null ? `<span class="text-sm text-slate-500 dark:text-slate-400">Showing ${((currentPage - 1) * 10) + 1}-${Math.min(currentPage * 10, totalItems)} of ${totalItems}</span>` : '';

        return `
            <div class="flex items-center justify-between mt-6">
                ${info}
                <div class="flex items-center gap-1">
                    <button onclick="${onPageChange}(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''} 
                        class="pagination-btn p-2 rounded-xl hover:bg-amber-100 dark:hover:bg-slate-700 disabled:opacity-40 transition-colors">
                        <i data-lucide="chevron-left" class="w-5 h-5 text-slate-600 dark:text-slate-300"></i>
                    </button>
                    ${pages.map(p => {
                        if (p === '...') return `<span class="px-3 py-2 text-slate-400">...</span>`;
                        const active = p === currentPage;
                        return `<button onclick="${onPageChange}(${p})" 
                            class="pagination-btn px-3.5 py-2 rounded-xl font-semibold text-sm transition-all ${active 
                                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/20' 
                                : 'text-slate-600 dark:text-slate-300 hover:bg-amber-100 dark:hover:bg-slate-700'}">
                            ${p}
                        </button>`;
                    }).join('')}
                    <button onclick="${onPageChange}(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''} 
                        class="pagination-btn p-2 rounded-xl hover:bg-amber-100 dark:hover:bg-slate-700 disabled:opacity-40 transition-colors">
                        <i data-lucide="chevron-right" class="w-5 h-5 text-slate-600 dark:text-slate-300"></i>
                    </button>
                </div>
            </div>
        `;
    }

    // ===== Scroll-based Pagination =====
    function infiniteScroll(containerId, loadMoreCallback, threshold = 200) {
        const container = document.getElementById(containerId);
        if (!container) return;

        let isLoading = false;

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && !isLoading) {
                    isLoading = true;
                    loadMoreCallback().then(() => {
                        isLoading = false;
                    }).catch(() => {
                        isLoading = false;
                    });
                }
            });
        }, { rootMargin: `${threshold}px` });

        const sentinel = document.createElement('div');
        sentinel.id = `${containerId}-sentinel`;
        sentinel.className = 'h-4';
        container.appendChild(sentinel);
        observer.observe(sentinel);

        return () => {
            observer.disconnect();
            sentinel.remove();
        };
    }

    // ===== File Drop Zone =====
    function createDropZone(onFileSelect, accept = '.xlsx,.xls,.csv') {
        const id = 'dropzone-' + Date.now();

        setTimeout(() => {
            const zone = document.getElementById(id);
            if (!zone) return;

            const input = zone.querySelector('input[type="file"]');

            zone.addEventListener('dragover', (e) => {
                e.preventDefault();
                zone.classList.add('drag-over');
            });

            zone.addEventListener('dragleave', () => {
                zone.classList.remove('drag-over');
            });

            zone.addEventListener('drop', (e) => {
                e.preventDefault();
                zone.classList.remove('drag-over');
                const files = e.dataTransfer.files;
                if (files.length) onFileSelect(files[0]);
            });

            input.addEventListener('change', (e) => {
                if (e.target.files.length) onFileSelect(e.target.files[0]);
            });
        }, 0);

        return `
            <div id="${id}" class="drop-zone rounded-2xl p-8 text-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all">
                <input type="file" accept="${accept}" class="hidden">
                <div class="w-16 h-16 mx-auto mb-4 bg-purple-100 dark:bg-purple-900/30 rounded-2xl flex items-center justify-center">
                    <i data-lucide="upload-cloud" class="w-8 h-8 text-purple-500"></i>
                </div>
                <p class="font-semibold text-slate-700 dark:text-slate-300 mb-1">Drop your Excel file here</p>
                <p class="text-sm text-slate-500 dark:text-slate-400">or click to browse (.xlsx, .csv)</p>
            </div>
        `;
    }

    // ===== Number Formatting =====
    function formatCurrency(amount, currency = 'USD') {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency
        }).format(amount || 0);
    }

    function formatNumber(num) {
        return new Intl.NumberFormat('en-US').format(num || 0);
    }

    function formatDate(dateStr) {
        if (!dateStr) return '-';
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    }

    function formatDateTime(dateStr) {
        if (!dateStr) return '-';
        const date = new Date(dateStr);
        return date.toLocaleString('en-US', { 
            year: 'numeric', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    }

    // ===== Debounce/Throttle =====
    function debounce(fn, ms = 300) {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => fn(...args), ms);
        };
    }

    // ===== Search Highlight =====
    function highlightText(text, query) {
        if (!query) return text;
        const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        return text.replace(regex, '<mark class="bg-yellow-200 dark:bg-yellow-700 px-0.5 rounded">$1</mark>');
    }


    // ===== Rich API Error Banner =====
    // Called automatically by App when API.on('apierror') fires.
    // Shows a detailed, dismissible error panel — not just a raw message.
    function apiError(detail) {
        // detail: { endpoint, method, url, message, type, hint }

        // De-duplicate: don't stack identical errors within 3s
        const key = detail.type + detail.endpoint;
        if (apiError._lastKey === key && Date.now() - apiError._lastTime < 3000) return;
        apiError._lastKey = key;
        apiError._lastTime = Date.now();

        const container = document.getElementById('toastContainer');
        if (!container) return;

        const typeConfig = {
            CORS_OR_DOWN: {
                icon: 'wifi-off',
                label: 'Cannot reach server',
                color: 'border-red-400 dark:border-red-600',
                bg: 'bg-red-50 dark:bg-red-900/40',
                iconColor: 'text-red-500',
                badgeBg: 'bg-red-100 dark:bg-red-800/60',
                badgeText: 'text-red-700 dark:text-red-200',
                fix: 'Check that Spring Boot is running and CORS is configured.'
            },
            CORS: {
                icon: 'shield-x',
                label: 'CORS Blocked',
                color: 'border-orange-400 dark:border-orange-600',
                bg: 'bg-orange-50 dark:bg-orange-900/40',
                iconColor: 'text-orange-500',
                badgeBg: 'bg-orange-100 dark:bg-orange-800/60',
                badgeText: 'text-orange-700 dark:text-orange-200',
                fix: 'Add @CrossOrigin or WebMvcConfigurer.addCorsMappings() in Spring Boot.'
            },
            TIMEOUT: {
                icon: 'clock',
                label: 'Request timed out',
                color: 'border-amber-400 dark:border-amber-600',
                bg: 'bg-amber-50 dark:bg-amber-900/40',
                iconColor: 'text-amber-500',
                badgeBg: 'bg-amber-100 dark:bg-amber-800/60',
                badgeText: 'text-amber-700 dark:text-amber-200',
                fix: 'Server took too long. Check for slow queries or increase timeout.'
            },
            UNAUTHORIZED: {
                icon: 'lock',
                label: '401 Unauthorized',
                color: 'border-yellow-400 dark:border-yellow-600',
                bg: 'bg-yellow-50 dark:bg-yellow-900/40',
                iconColor: 'text-yellow-600',
                badgeBg: 'bg-yellow-100 dark:bg-yellow-800/60',
                badgeText: 'text-yellow-700 dark:text-yellow-200',
                fix: 'JWT token missing or expired. Login again.'
            },
            FORBIDDEN: {
                icon: 'shield-off',
                label: '403 Forbidden',
                color: 'border-rose-400 dark:border-rose-600',
                bg: 'bg-rose-50 dark:bg-rose-900/40',
                iconColor: 'text-rose-500',
                badgeBg: 'bg-rose-100 dark:bg-rose-800/60',
                badgeText: 'text-rose-700 dark:text-rose-200',
                fix: 'Your role lacks permission for this action. Check RBAC config.'
            },
            NOT_FOUND: {
                icon: 'map-pin-off',
                label: '404 Not Found',
                color: 'border-purple-400 dark:border-purple-600',
                bg: 'bg-purple-50 dark:bg-purple-900/40',
                iconColor: 'text-purple-500',
                badgeBg: 'bg-purple-100 dark:bg-purple-800/60',
                badgeText: 'text-purple-700 dark:text-purple-200',
                fix: 'Endpoint not mapped in the controller. Check URL and @RequestMapping.'
            },
            RATE_LIMITED: {
                icon: 'gauge',
                label: '429 Rate Limited',
                color: 'border-pink-400 dark:border-pink-600',
                bg: 'bg-pink-50 dark:bg-pink-900/40',
                iconColor: 'text-pink-500',
                badgeBg: 'bg-pink-100 dark:bg-pink-800/60',
                badgeText: 'text-pink-700 dark:text-pink-200',
                fix: 'Too many requests. Wait and retry, or raise your rate limit.'
            },
            UNKNOWN: {
                icon: 'alert-circle',
                label: 'API Error',
                color: 'border-slate-400 dark:border-slate-600',
                bg: 'bg-slate-50 dark:bg-slate-800/60',
                iconColor: 'text-slate-500',
                badgeBg: 'bg-slate-100 dark:bg-slate-700',
                badgeText: 'text-slate-700 dark:text-slate-200',
                fix: 'Check the server logs for more details.'
            }
        };

        const cfg = typeConfig[detail.type] || typeConfig.UNKNOWN;
        const method = detail.method || 'GET';
        const shortEndpoint = (detail.endpoint || '').length > 45
            ? '…' + (detail.endpoint || '').slice(-43)
            : (detail.endpoint || '');

        const methodColor = {
            GET: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300',
            POST: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
            PUT: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300',
            PATCH: 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300',
            DELETE: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300'
        }[method] || 'bg-slate-100 text-slate-700';

        const el = document.createElement('div');
        el.className = 'toast-enter pointer-events-auto w-full max-w-sm rounded-2xl border-2 shadow-xl overflow-hidden ' + cfg.color + ' ' + cfg.bg;
        el.innerHTML = `
            <div class="flex items-start gap-3 px-4 pt-4 pb-2">
                <div class="flex-shrink-0 w-8 h-8 rounded-xl ${cfg.badgeBg} flex items-center justify-center">
                    <i data-lucide="${cfg.icon}" class="w-4 h-4 ${cfg.iconColor}"></i>
                </div>
                <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 mb-1">
                        <span class="text-sm font-bold text-slate-800 dark:text-slate-100">${cfg.label}</span>
                        <span class="text-[10px] font-bold px-1.5 py-0.5 rounded ${cfg.badgeBg} ${cfg.badgeText}">${detail.type}</span>
                    </div>
                    <p class="text-xs text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-2">${detail.message || 'An API error occurred.'}</p>
                </div>
                <button onclick="this.closest('[class*=toast]').remove()"
                    class="flex-shrink-0 p-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-colors">
                    <i data-lucide="x" class="w-4 h-4 text-slate-400"></i>
                </button>
            </div>
            <div class="px-4 pb-3 space-y-1.5">
                <div class="flex items-center gap-2">
                    <span class="text-[10px] font-bold px-1.5 py-0.5 rounded ${methodColor}">${method}</span>
                    <code class="text-[10px] text-slate-500 dark:text-slate-400 font-mono truncate">${shortEndpoint}</code>
                </div>
                <div class="flex items-start gap-1.5 bg-white/50 dark:bg-black/20 rounded-xl px-2.5 py-1.5">
                    <i data-lucide="lightbulb" class="w-3 h-3 text-amber-500 flex-shrink-0 mt-0.5"></i>
                    <span class="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">${cfg.fix}</span>
                </div>
                <div class="flex gap-2 pt-0.5">
                    <button onclick="DevMonitor && DevMonitor.openTab('log')"
                        class="text-[10px] font-semibold text-slate-500 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors flex items-center gap-1">
                        <i data-lucide="activity" class="w-3 h-3"></i>Open Monitor
                    </button>
                </div>
            </div>
        `;

        container.appendChild(el);
        if (window.lucide) lucide.createIcons({ nodes: [el] });

        // Auto-dismiss after 8s (longer than normal toast — user needs to read the hint)
        setTimeout(() => {
            el.style.transition = 'opacity 0.3s, transform 0.3s';
            el.style.opacity = '0';
            el.style.transform = 'translateX(110%)';
            setTimeout(() => el.remove(), 300);
        }, 8000);
    }
    apiError._lastKey = '';
    apiError._lastTime = 0;

    // ===== Public API =====
    return {
        toast,
        openModal,
        closeModal,
        closeAllModals,
        showLoading,
        hideLoading,
        skeleton,
        emptyState,
        initTheme,
        applyTheme,
        toggleTheme,
        getFormData,
        validateForm,
        pagination,
        infiniteScroll,
        createDropZone,
        formatCurrency,
        formatNumber,
        formatDate,
        formatDateTime,
        debounce,
        highlightText,
        apiError
    };
})();
