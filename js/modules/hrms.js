/**
 * HRMS — HR & Employee Management
 * Sequence: Company → Auth (admin) → Employees → Attendance → Payroll → Leaves
 */
const HRMS = (function () {
    'use strict';
    let employees = [], currentPage = 0, totalPages = 0, activeTab = 'employees';

    function render() { setTimeout(() => load(), 0); return `<div id="hrmsContent">${UI.skeleton(3, 1)}</div>`; }

    async function load() {
        try {
            const r = await API.get(`/api/v1/employees?page=${currentPage}&size=15&sort=name,asc`);
            employees = r.data.content || [];
            totalPages = r.data.totalPages || 0;
        } catch (_) { employees = []; }
        renderContent();
    }

    function renderContent() {
        const c = document.getElementById('hrmsContent');
        if (!c) return;
        const tabs = ['employees','attendance','payroll','leaves'];
        c.innerHTML = `<div class="space-y-5">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 class="font-display text-2xl font-bold text-slate-800 dark:text-slate-100">HR & Employees</h1>
                    <p class="text-sm text-slate-600 dark:text-slate-300 mt-1">HRMS — employees, attendance, payroll, leaves</p>
                </div>
                <button onclick="HRMS.openEmployeeForm()"
                    class="px-4 py-2.5 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-xl font-semibold text-sm shadow-lg hover:scale-105 transition-all flex items-center gap-2">
                    <i data-lucide="user-plus" class="w-4 h-4"></i>Onboard Employee
                </button>
            </div>

            <!-- Sequence -->
            <div class="bg-pink-50 dark:bg-pink-900/20 border border-pink-200 dark:border-pink-800 rounded-2xl p-4 flex gap-3">
                <i data-lucide="git-branch" class="w-5 h-5 text-pink-600 flex-shrink-0 mt-0.5"></i>
                <div class="text-sm text-pink-700 dark:text-pink-300">
                    <strong>Sequence:</strong>
                    Company → Auth (ADMIN role) → <strong>Employees</strong> → Attendance punch → Payroll run → Leave approvals
                </div>
            </div>

            <!-- Tabs -->
            <div class="flex gap-2 flex-wrap border-b border-slate-200 dark:border-slate-700 pb-0">
                ${tabs.map(t => `<button onclick="HRMS.setTab('${t}')"
                    class="px-4 py-2 text-sm font-semibold rounded-t-xl transition-colors ${activeTab===t
                        ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}">
                    ${t.charAt(0).toUpperCase()+t.slice(1)}
                </button>`).join('')}
            </div>

            <div id="hrmsTabContent">${renderTab()}</div>
        </div>`;
        lucide.createIcons();
    }

    function renderTab() {
        if (activeTab === 'employees') return renderEmployees();
        if (activeTab === 'attendance') return renderAttendance();
        if (activeTab === 'payroll') return renderPayroll();
        if (activeTab === 'leaves') return renderLeaves();
        return '';
    }

    function renderEmployees() {
        if (!employees.length) return UI.emptyState('No employees', 'users', { label: 'Onboard First Employee', onclick: 'HRMS.openEmployeeForm()' });
        return `<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            ${employees.map(e => `
            <div class="bg-white dark:bg-slate-800 rounded-2xl border border-amber-100 dark:border-slate-700 p-4 hover:shadow-md transition-shadow">
                <div class="flex items-center gap-3 mb-3">
                    <div class="w-11 h-11 rounded-xl bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                        ${(e.name||'?')[0].toUpperCase()}
                    </div>
                    <div class="min-w-0">
                        <p class="font-bold text-slate-800 dark:text-slate-100 truncate">${e.name}</p>
                        <p class="text-xs text-slate-500 dark:text-slate-400 truncate">${e.designation||e.department||'—'}</p>
                    </div>
                </div>
                <div class="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                    <div class="flex items-center gap-2"><i data-lucide="mail" class="w-3 h-3 text-slate-400"></i>${e.email||'—'}</div>
                    <div class="flex items-center gap-2"><i data-lucide="phone" class="w-3 h-3 text-slate-400"></i>${e.phone||'—'}</div>
                    <div class="flex items-center gap-2"><i data-lucide="building" class="w-3 h-3 text-slate-400"></i>${e.department||'—'}</div>
                    <div class="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-700">
                        <span>Salary</span><strong class="text-slate-800 dark:text-slate-100">${UI.formatCurrency(e.salary||0)}</strong>
                    </div>
                </div>
                <div class="flex gap-2 mt-3">
                    <button onclick="HRMS.openEmployeeForm(${e.id})" class="flex-1 py-1.5 text-xs font-bold bg-pink-50 text-pink-600 hover:bg-pink-100 rounded-lg transition-colors text-center">Edit</button>
                    <button onclick="HRMS.punchAttendance(${e.id},'${e.name}')" class="flex-1 py-1.5 text-xs font-bold bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg transition-colors text-center">Punch</button>
                </div>
            </div>`).join('')}
        </div>
        ${UI.pagination(currentPage+1, totalPages, 'HRMS.goToPage')}`;
    }

    function renderAttendance() {
        const today = new Date().toISOString().slice(0,10);
        return `<div class="bg-white dark:bg-slate-800 rounded-2xl border border-amber-100 dark:border-slate-700 p-5 space-y-4">
            <div class="flex items-center gap-3 mb-4">
                <i data-lucide="clock" class="w-5 h-5 text-pink-500"></i>
                <h3 class="font-bold text-slate-800 dark:text-slate-100">Attendance Log</h3>
            </div>
            <div class="flex gap-3">
                <input type="month" id="att-month" value="${today.slice(0,7)}"
                    class="px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm focus:outline-none">
                <input type="number" id="att-empId" placeholder="Employee ID"
                    class="px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm w-40 focus:outline-none">
                <button onclick="HRMS.loadAttendance()" class="px-4 py-2 bg-pink-500 text-white rounded-xl text-sm font-bold hover:bg-pink-600 transition-colors">Load</button>
            </div>
            <div id="att-table" class="text-sm text-slate-500 dark:text-slate-400 text-center py-8">Enter employee ID and click Load</div>
        </div>`;
    }

    function renderPayroll() {
        const today = new Date().toISOString().slice(0,7);
        return `<div class="bg-white dark:bg-slate-800 rounded-2xl border border-amber-100 dark:border-slate-700 p-5 space-y-4">
            <div class="flex items-center gap-3 mb-4">
                <i data-lucide="indian-rupee" class="w-5 h-5 text-pink-500"></i>
                <h3 class="font-bold text-slate-800 dark:text-slate-100">Payroll</h3>
            </div>
            <div class="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3 text-sm text-amber-700 dark:text-amber-300">
                <strong>Flow:</strong> Select month → Run payroll (generates payslips for all employees) → Disburse (mark as paid)
            </div>
            <div class="flex gap-3 flex-wrap">
                <input type="month" id="pay-month" value="${today}"
                    class="px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm focus:outline-none">
                <label class="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                    <input type="checkbox" id="pay-bonus" class="rounded"> Include Bonus
                </label>
                <button onclick="HRMS.runPayroll()" class="px-4 py-2 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-xl text-sm font-bold hover:scale-105 transition-transform">Run Payroll</button>
                <button onclick="HRMS.loadPayroll()" class="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-bold hover:bg-slate-200 transition-colors">Load Runs</button>
            </div>
            <div id="pay-list" class="text-sm text-slate-500 dark:text-slate-400 text-center py-6">Click "Load Runs" to see payroll history</div>
        </div>`;
    }

    function renderLeaves() {
        return `<div class="bg-white dark:bg-slate-800 rounded-2xl border border-amber-100 dark:border-slate-700 p-5 space-y-4">
            <div class="flex items-center justify-between mb-2">
                <div class="flex items-center gap-3">
                    <i data-lucide="calendar-off" class="w-5 h-5 text-pink-500"></i>
                    <h3 class="font-bold text-slate-800 dark:text-slate-100">Leave Requests</h3>
                </div>
                <button onclick="HRMS.openLeaveForm()" class="px-3 py-1.5 text-sm font-bold bg-pink-50 text-pink-600 hover:bg-pink-100 rounded-xl transition-colors flex items-center gap-1">
                    <i data-lucide="plus" class="w-3 h-3"></i>Apply Leave
                </button>
            </div>
            <div class="flex gap-2 flex-wrap">
                ${['PENDING','APPROVED','REJECTED'].map(s => `
                <button onclick="HRMS.loadLeaves('${s}')"
                    class="px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-pink-300 hover:text-pink-600 transition-colors">${s}</button>
                `).join('')}
            </div>
            <div id="leave-list" class="text-sm text-slate-500 dark:text-slate-400 text-center py-6">Select a status to load leaves</div>
        </div>`;
    }

    function setTab(t) { activeTab = t; document.getElementById('hrmsTabContent').innerHTML = renderTab(); lucide.createIcons(); }

    function openEmployeeForm(id) {
        const e = id ? employees.find(x => x.id === id) : null;
        UI.openModal({ title: e ? 'Edit Employee' : 'Onboard Employee', size: 'lg', content: `
            <div class="grid grid-cols-2 gap-3">
                <div class="col-span-2"><label class="text-xs font-bold text-slate-600 dark:text-slate-300">Full Name *</label>
                    <input id="emp-name" value="${e?.name||''}" class="story-input w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-700 text-sm"></div>
                <div><label class="text-xs font-bold text-slate-600 dark:text-slate-300">Email</label>
                    <input id="emp-email" type="email" value="${e?.email||''}" class="story-input w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-700 text-sm"></div>
                <div><label class="text-xs font-bold text-slate-600 dark:text-slate-300">Phone</label>
                    <input id="emp-phone" value="${e?.phone||''}" class="story-input w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-700 text-sm"></div>
                <div><label class="text-xs font-bold text-slate-600 dark:text-slate-300">Department</label>
                    <input id="emp-dept" value="${e?.department||''}" class="story-input w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-700 text-sm" placeholder="e.g. Sales"></div>
                <div><label class="text-xs font-bold text-slate-600 dark:text-slate-300">Designation</label>
                    <input id="emp-desig" value="${e?.designation||''}" class="story-input w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-700 text-sm" placeholder="e.g. Sales Manager"></div>
                <div><label class="text-xs font-bold text-slate-600 dark:text-slate-300">Salary (₹/month)</label>
                    <input id="emp-salary" type="number" value="${e?.salary||''}" class="story-input w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-700 text-sm"></div>
                <div><label class="text-xs font-bold text-slate-600 dark:text-slate-300">Join Date</label>
                    <input id="emp-join" type="date" value="${e?.joinDate||''}" class="story-input w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-700 text-sm"></div>
                <div><label class="text-xs font-bold text-slate-600 dark:text-slate-300">PAN Number</label>
                    <input id="emp-pan" value="${e?.panNumber||''}" class="story-input w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-700 text-sm"></div>
                <div><label class="text-xs font-bold text-slate-600 dark:text-slate-300">Bank A/C</label>
                    <input id="emp-bank" value="${e?.bankAccount||''}" class="story-input w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-700 text-sm"></div>
                <div><label class="text-xs font-bold text-slate-600 dark:text-slate-300">Bank IFSC</label>
                    <input id="emp-ifsc" value="${e?.bankIfsc||''}" class="story-input w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-700 text-sm"></div>
            </div>`,
            actions: [
                { label: e ? 'Save Changes' : 'Onboard', class: 'px-4 py-2 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-xl font-bold', onclick: `HRMS.saveEmployee(${e?.id||'null'})` },
                { label: 'Cancel', onclick: 'UI.closeAllModals()' }
            ]
        });
    }

    async function saveEmployee(id) {
        const d = {
            name: document.getElementById('emp-name').value,
            email: document.getElementById('emp-email').value,
            phone: document.getElementById('emp-phone').value,
            department: document.getElementById('emp-dept').value,
            designation: document.getElementById('emp-desig').value,
            salary: parseFloat(document.getElementById('emp-salary').value) || 0,
            joinDate: document.getElementById('emp-join').value,
            panNumber: document.getElementById('emp-pan').value,
            bankAccount: document.getElementById('emp-bank').value,
            bankIfsc: document.getElementById('emp-ifsc').value,
        };
        try {
            if (id) { await API.put(`/api/v1/employees/${id}`, d); UI.toast('Updated!', 'success'); }
            else { await API.post('/api/v1/employees', d); UI.toast('Employee onboarded!', 'success'); }
            UI.closeAllModals(); await load();
        } catch (e) { UI.toast(e.message, 'error'); }
    }

    async function punchAttendance(empId, name) {
        UI.openModal({ title: `Attendance — ${name}`, size: 'sm', content: `
            <div class="space-y-3">
                <div class="flex gap-3">
                    <button onclick="HRMS.doPunch(${empId},'IN')" class="flex-1 py-3 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600 transition-colors text-sm">🟢 Punch IN</button>
                    <button onclick="HRMS.doPunch(${empId},'OUT')" class="flex-1 py-3 bg-rose-500 text-white font-bold rounded-xl hover:bg-rose-600 transition-colors text-sm">🔴 Punch OUT</button>
                </div>
                <p class="text-xs text-slate-500 text-center">Current time: ${new Date().toLocaleTimeString()}</p>
            </div>`, actions: [{ label: 'Close', onclick: 'UI.closeAllModals()' }]
        });
    }

    async function doPunch(empId, type) {
        try {
            await API.post('/api/v1/attendance/punch', { employeeId: empId, type, timestamp: new Date().toISOString() });
            UI.toast(`Punch ${type} recorded!`, 'success'); UI.closeAllModals();
        } catch (e) { UI.toast(e.message, 'error'); }
    }

    async function loadAttendance() {
        const month = document.getElementById('att-month').value;
        const empId = document.getElementById('att-empId').value;
        const el = document.getElementById('att-table');
        if (!empId) { UI.toast('Enter employee ID', 'warning'); return; }
        try {
            const r = await API.get(`/api/v1/attendance?employeeId=${empId}&month=${month}&page=0&size=50`);
            const rows = r.data.content || [];
            el.innerHTML = rows.length ? `<table class="w-full text-sm"><thead><tr class="border-b border-slate-200 dark:border-slate-700">
                <th class="px-3 py-2 text-left text-xs font-bold text-slate-500">Date/Time</th>
                <th class="px-3 py-2 text-left text-xs font-bold text-slate-500">Type</th>
                <th class="px-3 py-2 text-left text-xs font-bold text-slate-500">Location</th>
            </tr></thead><tbody>${rows.map(r => `<tr class="border-b border-slate-100 dark:border-slate-700">
                <td class="px-3 py-2 text-slate-700 dark:text-slate-200">${UI.formatDateTime(r.timestamp)}</td>
                <td class="px-3 py-2"><span class="px-2 py-0.5 rounded-full text-xs font-bold ${r.type==='IN'?'bg-emerald-100 text-emerald-700':'bg-rose-100 text-rose-600'}">${r.type}</span></td>
                <td class="px-3 py-2 text-slate-600 dark:text-slate-300">${r.location||'—'}</td>
            </tr>`).join('')}</tbody></table>` : '<p class="text-center py-4 text-slate-400">No attendance records</p>';
        } catch (e) { el.innerHTML = `<p class="text-center py-4 text-red-500">${e.message}</p>`; }
    }

    async function runPayroll() {
        const month = document.getElementById('pay-month').value;
        const includeBonus = document.getElementById('pay-bonus').checked;
        try {
            await API.post('/api/v1/payroll/run', { month, includeBonus });
            UI.toast(`Payroll run for ${month} initiated!`, 'success'); loadPayroll();
        } catch (e) { UI.toast(e.message, 'error'); }
    }

    async function loadPayroll() {
        const month = document.getElementById('pay-month').value;
        const el = document.getElementById('pay-list');
        try {
            const r = await API.get(`/api/v1/payroll?month=${month}`);
            const runs = r.data.content || r.data || [];
            el.innerHTML = runs.length ? runs.map(p => `<div class="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700 rounded-xl mb-2">
                <div><p class="font-bold text-sm text-slate-800 dark:text-slate-100">${p.month}</p><p class="text-xs text-slate-500">${p.employeeCount||0} employees</p></div>
                <div class="text-right">
                    <p class="font-bold text-slate-800 dark:text-slate-100">${UI.formatCurrency(p.totalAmount||0)}</p>
                    <span class="text-xs px-2 py-0.5 rounded-full font-bold ${p.status==='PAID'?'bg-emerald-100 text-emerald-700':'bg-amber-100 text-amber-700'}">${p.status}</span>
                </div>
                ${p.status!=='PAID'?`<button onclick="HRMS.disburse(${p.id})" class="ml-3 px-3 py-1.5 text-xs font-bold bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg">Disburse</button>`:''}
            </div>`).join('') : '<p class="text-center py-4 text-slate-400">No payroll runs for this month</p>';
        } catch (e) { el.innerHTML = `<p class="text-center py-4 text-red-500">${e.message}</p>`; }
    }

    async function disburse(id) {
        try { await API.post(`/api/v1/payroll/${id}/disburse`, {}); UI.toast('Payroll disbursed!', 'success'); loadPayroll(); }
        catch (e) { UI.toast(e.message, 'error'); }
    }

    function openLeaveForm() {
        UI.openModal({ title: 'Apply for Leave', size: 'sm', content: `
            <div class="space-y-3">
                <div><label class="text-xs font-bold text-slate-600 dark:text-slate-300">Employee ID</label>
                    <input id="lv-emp" type="number" class="story-input w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-700 text-sm"></div>
                <div><label class="text-xs font-bold text-slate-600 dark:text-slate-300">Leave Type</label>
                    <select id="lv-type" class="story-input w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-700 text-sm">
                        <option>SICK</option><option>CASUAL</option><option>EARNED</option>
                    </select></div>
                <div class="grid grid-cols-2 gap-2">
                    <div><label class="text-xs font-bold text-slate-600 dark:text-slate-300">From</label>
                        <input id="lv-from" type="date" class="story-input w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-700 text-sm"></div>
                    <div><label class="text-xs font-bold text-slate-600 dark:text-slate-300">To</label>
                        <input id="lv-to" type="date" class="story-input w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-700 text-sm"></div>
                </div>
                <div><label class="text-xs font-bold text-slate-600 dark:text-slate-300">Reason</label>
                    <textarea id="lv-reason" rows="2" class="story-input w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-700 text-sm"></textarea></div>
            </div>`,
            actions: [
                { label: 'Apply', class: 'px-4 py-2 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-xl font-bold', onclick: 'HRMS.applyLeave()' },
                { label: 'Cancel', onclick: 'UI.closeAllModals()' }
            ]
        });
    }

    async function applyLeave() {
        const d = { employeeId: parseInt(document.getElementById('lv-emp').value), type: document.getElementById('lv-type').value,
            fromDate: document.getElementById('lv-from').value, toDate: document.getElementById('lv-to').value,
            reason: document.getElementById('lv-reason').value };
        try { await API.post('/api/v1/leaves', d); UI.toast('Leave applied!', 'success'); UI.closeAllModals(); }
        catch (e) { UI.toast(e.message, 'error'); }
    }

    async function loadLeaves(status) {
        const el = document.getElementById('leave-list');
        try {
            const r = await API.get(`/api/v1/leaves?status=${status}&page=0&size=20`);
            const leaves = r.data.content || [];
            el.innerHTML = leaves.length ? leaves.map(l => `
                <div class="flex items-start justify-between p-3 bg-slate-50 dark:bg-slate-700 rounded-xl mb-2">
                    <div>
                        <p class="font-bold text-sm text-slate-800 dark:text-slate-100">Emp #${l.employeeId} — ${l.type}</p>
                        <p class="text-xs text-slate-500">${l.fromDate} to ${l.toDate}</p>
                        <p class="text-xs text-slate-600 dark:text-slate-300 mt-0.5">${l.reason||''}</p>
                    </div>
                    ${l.status==='PENDING'?`
                    <div class="flex gap-2 ml-3">
                        <button onclick="HRMS.approveLeave(${l.id},'APPROVED')" class="px-2 py-1 text-xs font-bold bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg">✓</button>
                        <button onclick="HRMS.approveLeave(${l.id},'REJECTED')" class="px-2 py-1 text-xs font-bold bg-red-50 text-red-500 hover:bg-red-100 rounded-lg">✗</button>
                    </div>`:''}
                </div>`).join('') : `<p class="text-center py-4 text-slate-400">No ${status.toLowerCase()} leaves</p>`;
        } catch (e) { el.innerHTML = `<p class="text-center py-4 text-red-500">${e.message}</p>`; }
    }

    async function approveLeave(id, status) {
        try {
            await API.patch(`/api/v1/leaves/${id}/approve`, { status });
            UI.toast(`Leave ${status.toLowerCase()}!`, status==='APPROVED'?'success':'info');
            loadLeaves('PENDING');
        } catch (e) { UI.toast(e.message, 'error'); }
    }

    function goToPage(p) { currentPage = p - 1; load(); }
    return { render, setTab, openEmployeeForm, saveEmployee, punchAttendance, doPunch, loadAttendance, runPayroll, loadPayroll, disburse, openLeaveForm, applyLeave, loadLeaves, approveLeave, goToPage };
})();
