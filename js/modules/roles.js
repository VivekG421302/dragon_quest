/**
 * Roles & RBAC — Backend Practice page
 * Sequence: Company → Auth (ADMIN) → Roles → assign to Users
 * This page lets you practice RBAC concepts hands-on
 */
const Roles = (function () {
    'use strict';
    let roles = [], users = [], activeTab = 'roles';

    const PERMISSIONS = [
        'PRODUCTS_READ','PRODUCTS_WRITE','PRODUCTS_DELETE',
        'BILLS_READ','BILLS_WRITE',
        'CUSTOMERS_READ','CUSTOMERS_WRITE',
        'INVENTORY_READ','INVENTORY_WRITE',
        'EMPLOYEES_READ','EMPLOYEES_WRITE',
        'PAYROLL_READ','PAYROLL_WRITE',
        'REPORTS_READ',
        'ROLES_MANAGE',
        'SETTINGS_WRITE',
        'ADMIN_ALL'
    ];

    function render() { setTimeout(() => load(), 0); return `<div id="rolesContent">${UI.skeleton(2,1)}</div>`; }

    async function load() {
        try {
            const [rr, ur] = await Promise.allSettled([API.get('/api/v1/roles'), API.get('/api/v1/users')]);
            roles = rr.status==='fulfilled' ? (rr.value.data.content || rr.value.data || []) : [];
            users = ur.status==='fulfilled' ? (ur.value.data.content || ur.value.data || []) : [];
        } catch (_) {}
        renderContent();
    }

    function renderContent() {
        const c = document.getElementById('rolesContent');
        if (!c) return;
        c.innerHTML = `<div class="space-y-5">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 class="font-display text-2xl font-bold text-slate-800 dark:text-slate-100">Roles & RBAC</h1>
                    <p class="text-sm text-slate-600 dark:text-slate-300 mt-1">Practice Role-Based Access Control — create roles, assign permissions, map to users</p>
                </div>
                <button onclick="Roles.openRoleForm()"
                    class="px-4 py-2.5 bg-gradient-to-r from-rose-500 to-red-600 text-white rounded-xl font-semibold text-sm shadow-lg hover:scale-105 transition-all flex items-center gap-2">
                    <i data-lucide="shield-plus" class="w-4 h-4"></i>New Role
                </button>
            </div>

            <!-- Concept cards -->
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                ${[
                    { icon:'shield', color:'from-rose-400 to-red-500', title:'Roles', desc:'Named groups like ADMIN, MANAGER, CASHIER. A user can have multiple roles.' },
                    { icon:'key', color:'from-amber-400 to-orange-500', title:'Permissions', desc:'Granular rights like PRODUCTS_WRITE, BILLS_READ. Roles contain sets of permissions.' },
                    { icon:'users', color:'from-sky-400 to-blue-500', title:'Users → Roles', desc:'Assign one or more roles to each user. Spring Security reads roles from JWT on every request.' }
                ].map(card => `<div class="bg-gradient-to-br ${card.color} rounded-2xl p-4 text-white">
                    <i data-lucide="${card.icon}" class="w-6 h-6 mb-2 opacity-90"></i>
                    <h3 class="font-bold text-base mb-1">${card.title}</h3>
                    <p class="text-white/80 text-xs leading-relaxed">${card.desc}</p>
                </div>`).join('')}
            </div>

            <!-- Sequence -->
            <div class="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-2xl p-4 flex gap-3">
                <i data-lucide="git-branch" class="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5"></i>
                <div class="text-sm text-rose-700 dark:text-rose-300">
                    <strong>Sequence:</strong> Company → Auth (login as ADMIN) → <strong>Create Roles</strong> → Assign Permissions → Map Roles to Users →
                    Each API call checks: JWT → SecurityContext → @PreAuthorize → 403 if denied
                </div>
            </div>

            <!-- Tabs -->
            <div class="flex gap-2 border-b border-slate-200 dark:border-slate-700">
                ${['roles','users','permissions'].map(t => `<button onclick="Roles.setTab('${t}')"
                    class="px-4 py-2 text-sm font-semibold rounded-t-xl transition-colors ${activeTab===t
                        ? 'bg-gradient-to-r from-rose-500 to-red-600 text-white'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}">
                    ${t.charAt(0).toUpperCase()+t.slice(1)}
                </button>`).join('')}
            </div>

            <div id="rolesTabContent">${renderTab()}</div>
        </div>`;
        lucide.createIcons();
    }

    function renderTab() {
        if (activeTab === 'roles')       return renderRoles();
        if (activeTab === 'users')       return renderUsers();
        if (activeTab === 'permissions') return renderPermissions();
        return '';
    }

    function renderRoles() {
        if (!roles.length) return UI.emptyState('No roles yet', 'shield', { label: 'Create First Role', onclick: 'Roles.openRoleForm()' });
        return `<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            ${roles.map(r => {
                const perms = r.permissions || [];
                return `<div class="bg-white dark:bg-slate-800 rounded-2xl border border-amber-100 dark:border-slate-700 p-4 hover:shadow-md transition-shadow">
                    <div class="flex items-start justify-between mb-3">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-400 to-red-500 flex items-center justify-center flex-shrink-0">
                                <i data-lucide="shield" class="w-5 h-5 text-white"></i>
                            </div>
                            <div>
                                <p class="font-bold text-slate-800 dark:text-slate-100">${r.name}</p>
                                <p class="text-xs text-slate-500 dark:text-slate-400">${perms.length} permissions</p>
                            </div>
                        </div>
                        <div class="flex gap-1">
                            <button onclick="Roles.openRoleForm(${r.id})" class="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-700 text-slate-500 hover:text-purple-600 transition-colors"><i data-lucide="pencil" class="w-3.5 h-3.5"></i></button>
                            <button onclick="Roles.deleteRole(${r.id},'${r.name}')" class="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-700 text-slate-500 hover:text-red-500 transition-colors"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>
                        </div>
                    </div>
                    <div class="flex flex-wrap gap-1.5">
                        ${perms.slice(0,8).map(p => `<span class="px-2 py-0.5 bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 rounded-lg text-[10px] font-mono font-bold">${p}</span>`).join('')}
                        ${perms.length > 8 ? `<span class="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-500 rounded-lg text-[10px]">+${perms.length-8} more</span>` : ''}
                    </div>
                </div>`;
            }).join('')}
        </div>`;
    }

    function renderUsers() {
        if (!users.length) return `<div class="text-center py-12 text-slate-500 dark:text-slate-400">
            <i data-lucide="users" class="w-12 h-12 mx-auto mb-3 opacity-30"></i>
            <p>No users found. Users are created via the Auth signup flow.</p>
        </div>`;
        return `<div class="space-y-3">
            ${users.map(u => `<div class="bg-white dark:bg-slate-800 rounded-2xl border border-amber-100 dark:border-slate-700 p-4 flex items-center gap-4">
                <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-400 to-blue-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                    ${(u.username||u.email||'?')[0].toUpperCase()}
                </div>
                <div class="flex-1 min-w-0">
                    <p class="font-bold text-slate-800 dark:text-slate-100">${u.username||u.email}</p>
                    <p class="text-xs text-slate-500 dark:text-slate-400">${u.email||''}</p>
                    <div class="flex flex-wrap gap-1 mt-1.5">
                        ${(u.roles||[]).map(r => `<span class="px-2 py-0.5 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded text-[10px] font-bold">${r.name||r}</span>`).join('')}
                        ${!(u.roles||[]).length ? '<span class="text-[10px] text-slate-400">No roles assigned</span>' : ''}
                    </div>
                </div>
                <button onclick="Roles.openAssignRole(${u.id},'${u.username||u.email}')"
                    class="px-3 py-2 text-xs font-bold bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 hover:bg-rose-100 rounded-xl transition-colors flex-shrink-0">
                    Assign Roles
                </button>
            </div>`).join('')}
        </div>`;
    }

    function renderPermissions() {
        const groups = {
            'Products': PERMISSIONS.filter(p => p.startsWith('PRODUCTS')),
            'Bills / Sales': PERMISSIONS.filter(p => p.startsWith('BILLS')),
            'Customers': PERMISSIONS.filter(p => p.startsWith('CUSTOMERS')),
            'Inventory': PERMISSIONS.filter(p => p.startsWith('INVENTORY')),
            'HR / Payroll': PERMISSIONS.filter(p => p.startsWith('EMPLOYEES') || p.startsWith('PAYROLL')),
            'System': PERMISSIONS.filter(p => ['REPORTS_READ','ROLES_MANAGE','SETTINGS_WRITE','ADMIN_ALL'].includes(p)),
        };
        return `<div class="bg-white dark:bg-slate-800 rounded-2xl border border-amber-100 dark:border-slate-700 p-5">
            <p class="text-sm text-slate-600 dark:text-slate-300 mb-4">All permission constants used in <code class="bg-slate-100 dark:bg-slate-700 px-1 rounded text-xs">@PreAuthorize</code> annotations. Use these when creating roles.</p>
            <div class="space-y-4">
                ${Object.entries(groups).map(([group, perms]) => `
                <div>
                    <p class="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">${group}</p>
                    <div class="flex flex-wrap gap-2">
                        ${perms.map(p => `<div class="flex items-center gap-2 bg-slate-50 dark:bg-slate-700 rounded-xl px-3 py-2">
                            <span class="font-mono text-xs font-bold text-rose-600 dark:text-rose-400">${p}</span>
                            <button onclick="navigator.clipboard.writeText('${p}').then(()=>UI.toast('Copied!','success'))"
                                class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors" title="Copy">
                                <i data-lucide="copy" class="w-3 h-3"></i>
                            </button>
                        </div>`).join('')}
                    </div>
                </div>`).join('')}
            </div>
            <div class="mt-5 p-4 bg-slate-900 rounded-2xl">
                <p class="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wide">Spring Boot usage</p>
                <pre class="text-xs text-slate-300 font-mono">@PreAuthorize("hasAuthority('PRODUCTS_WRITE')")
public ResponseEntity&lt;Product&gt; create(@RequestBody ProductRequest req) { ... }

@PreAuthorize("hasRole('ADMIN') or hasAuthority('REPORTS_READ')")
public ResponseEntity&lt;Report&gt; getReport() { ... }</pre>
            </div>
        </div>`;
    }

    function setTab(t) { activeTab = t; document.getElementById('rolesTabContent').innerHTML = renderTab(); lucide.createIcons(); }

    function openRoleForm(id) {
        const role = id ? roles.find(r => r.id === id) : null;
        const currentPerms = role?.permissions || [];
        UI.openModal({ title: role ? 'Edit Role' : 'New Role', size: 'lg', content: `
            <div class="space-y-4">
                <div><label class="text-xs font-bold text-slate-600 dark:text-slate-300">Role Name *</label>
                    <input id="role-name" value="${role?.name||'ROLE_'}" class="story-input w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-700 text-sm font-mono"
                        placeholder="e.g. ROLE_MANAGER"></div>
                <div>
                    <label class="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-2">Permissions</label>
                    <div class="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                        ${PERMISSIONS.map(p => `<label class="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-700 rounded-lg cursor-pointer hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors">
                            <input type="checkbox" value="${p}" class="role-perm rounded" ${currentPerms.includes(p)?'checked':''}>
                            <span class="text-xs font-mono text-slate-700 dark:text-slate-300">${p}</span>
                        </label>`).join('')}
                    </div>
                </div>
            </div>`,
            actions: [
                { label: role ? 'Save Changes' : 'Create Role', class: 'px-4 py-2 bg-gradient-to-r from-rose-500 to-red-600 text-white rounded-xl font-bold', onclick: `Roles.saveRole(${role?.id||'null'})` },
                { label: 'Cancel', onclick: 'UI.closeAllModals()' }
            ]
        });
    }

    async function saveRole(id) {
        const name = document.getElementById('role-name').value.trim();
        const permissions = [...document.querySelectorAll('.role-perm:checked')].map(c => c.value);
        if (!name) { UI.toast('Role name required', 'warning'); return; }
        try {
            if (id) { await API.put(`/api/v1/roles/${id}`, { name, permissions }); UI.toast('Role updated!', 'success'); }
            else { await API.post('/api/v1/roles', { name, permissions }); UI.toast('Role created!', 'success'); }
            UI.closeAllModals(); await load();
        } catch (e) { UI.toast(e.message, 'error'); }
    }

    async function deleteRole(id, name) {
        if (!confirm(`Delete role "${name}"? Users with this role will lose access.`)) return;
        try { await API.del(`/api/v1/roles/${id}`); UI.toast('Role deleted', 'info'); await load(); }
        catch (e) { UI.toast(e.message, 'error'); }
    }

    function openAssignRole(userId, username) {
        UI.openModal({ title: `Assign Roles — ${username}`, size: 'sm', content: `
            <div class="space-y-2 max-h-72 overflow-y-auto">
                ${roles.map(r => `<label class="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700 rounded-xl cursor-pointer hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors">
                    <input type="checkbox" value="${r.id}" class="assign-role-cb rounded">
                    <div>
                        <p class="font-bold text-sm text-slate-800 dark:text-slate-100">${r.name}</p>
                        <p class="text-xs text-slate-500">${(r.permissions||[]).length} permissions</p>
                    </div>
                </label>`).join('')}
            </div>`,
            actions: [
                { label: 'Assign Roles', class: 'px-4 py-2 bg-gradient-to-r from-rose-500 to-red-600 text-white rounded-xl font-bold', onclick: `Roles.assignRoles(${userId})` },
                { label: 'Cancel', onclick: 'UI.closeAllModals()' }
            ]
        });
    }

    async function assignRoles(userId) {
        const roleIds = [...document.querySelectorAll('.assign-role-cb:checked')].map(c => parseInt(c.value));
        try {
            await API.post(`/api/v1/users/${userId}/roles`, { roleIds });
            UI.toast('Roles assigned!', 'success'); UI.closeAllModals(); await load();
        } catch (e) { UI.toast(e.message, 'error'); }
    }

    return { render, setTab, openRoleForm, saveRole, deleteRole, openAssignRole, assignRoles };
})();
