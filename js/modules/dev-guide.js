/**
 * Dev Guide — Magic Spellbook
 * API docs for all business domains + backend concept practice notes
 */
const DevGuide = (function() {
    'use strict';

    let isOpen = false;
    let activeCategory = 'business';   // 'business' | 'backend'
    let activeSection  = null;

    // ======================================================
    //  BUSINESS API DOCS
    // ======================================================
    // Standard Spring Data Page<T> envelope — every "list" endpoint returns this
    // shape, never a raw array. `items` is an array of example row objects.
    function pageResponse(items, opts) {
        opts = opts || {};
        const size = opts.size || 20;
        const totalElements = opts.totalElements != null ? opts.totalElements : items.length;
        const totalPages = opts.totalPages || Math.max(1, Math.ceil(totalElements / size));
        return {
            content: items,
            pageable: {
                pageNumber: 0, pageSize: size,
                sort: { sorted: true, unsorted: false, empty: false },
                offset: 0, paged: true, unpaged: false
            },
            totalElements: totalElements,
            totalPages: totalPages,
            number: 0,
            size: size,
            numberOfElements: items.length,
            sort: { sorted: true, unsorted: false, empty: false },
            first: true,
            last: totalPages <= 1,
            empty: items.length === 0
        };
    }

    const BUSINESS_DOCS = {
        auth: {
            title: 'Auth & Session', icon: 'key', color: 'from-amber-400 to-orange-500',
            endpoints: [
                { method:'POST', path:'/api/v1/auth/signup', description:'Register a new organisation account',
                  body:{ organizationName:'string (req)', email:'string (req)', username:'string (req, 3–50)', password:'string (req, min 8)', confirmPassword:'string (must match)' },
                  response:{ id:1, username:'jdoe', email:'jdoe@acme.com', organizationName:'Acme Retail Pvt Ltd', createdAt:'2025-01-10T09:15:00Z' } },
                { method:'POST', path:'/api/v1/auth/login', description:'Authenticate and receive JWT',
                  body:{ username:'jdoe', password:'Sup3rSecret!' },
                  response:{ token:'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJqZG9lIn0.xxx', type:'Bearer', expiresIn:3600, user:{ id:1, username:'jdoe', email:'jdoe@acme.com', roles:['ROLE_ADMIN'] } } },
                { method:'POST', path:'/api/v1/auth/refresh', description:'Refresh an expiring JWT token',
                  body:{ refreshToken:'8b1f2e3c-....-refresh-token' },
                  response:{ token:'eyJhbGciOiJIUzI1NiJ9....(new JWT)', type:'Bearer', expiresIn:3600 } },
                { method:'POST', path:'/api/v1/auth/logout', description:'Invalidate session / blacklist token',
                  body:{ }, response:{ message:'Logged out successfully' } },
                { method:'GET',  path:'/api/v1/auth/me',     description:'Get current authenticated user profile',
                  response:{ id:1, username:'jdoe', email:'jdoe@acme.com', organizationName:'Acme Retail Pvt Ltd', roles:['ROLE_ADMIN'], permissions:['PRODUCTS_READ','PRODUCTS_WRITE','BILLS_READ'] } }
            ]
        },
        rbac: {
            title: 'RBAC & Permissions', icon: 'shield', color: 'from-rose-400 to-red-500',
            endpoints: [
                { method:'GET',  path:'/api/v1/roles',            description:'List all roles (not paginated — small, bounded set)',
                  response:{ content:[
                      { id:1, name:'ROLE_ADMIN',   permissions:['PRODUCTS_READ','PRODUCTS_WRITE','BILLS_READ','BILLS_WRITE','USERS_MANAGE'] },
                      { id:2, name:'ROLE_MANAGER', permissions:['PRODUCTS_READ','PRODUCTS_WRITE','BILLS_READ'] },
                      { id:3, name:'ROLE_CASHIER', permissions:['PRODUCTS_READ','BILLS_READ','BILLS_WRITE'] }
                  ] } },
                { method:'POST', path:'/api/v1/roles',            description:'Create a custom role',
                  body:{ name:'ROLE_ACCOUNTANT', permissions:['ACCOUNTING_READ','ACCOUNTING_WRITE'] },
                  response:{ id:4, name:'ROLE_ACCOUNTANT', permissions:['ACCOUNTING_READ','ACCOUNTING_WRITE'], createdAt:'2025-06-01T10:00:00Z' } },
                { method:'PUT',  path:'/api/v1/roles/{id}',       description:'Update role permissions',
                  body:{ name:'ROLE_ACCOUNTANT', permissions:['ACCOUNTING_READ','ACCOUNTING_WRITE','BANKING_READ'] },
                  response:{ id:4, name:'ROLE_ACCOUNTANT', permissions:['ACCOUNTING_READ','ACCOUNTING_WRITE','BANKING_READ'], updatedAt:'2025-06-02T08:30:00Z' } },
                { method:'DELETE',path:'/api/v1/roles/{id}',      description:'Delete a role',
                  response:{ message:'Role deleted', id:4 } },
                { method:'GET',  path:'/api/v1/users',            description:'List all users in org (ADMIN only)',
                  query:{ page:'0 (default)', size:'20 (default)', sort:'username,asc (optional)', search:'string (optional, matches username/email)' },
                  response: pageResponse([{ id:1, username:"jdoe", email:"jdoe@acme.com", roles:["ROLE_ADMIN"], active:true, lastLoginAt:"2025-08-12T07:02:00Z" }]) },
                { method:'POST', path:'/api/v1/users/{id}/roles', description:'Assign roles to user',
                  body:{ roleIds:[1,2] },
                  response:{ id:1, username:'jdoe', roles:['ROLE_ADMIN','ROLE_MANAGER'] } },
                { method:'DELETE',path:'/api/v1/users/{id}/roles/{roleId}', description:'Remove a role from user',
                  response:{ id:1, username:'jdoe', roles:['ROLE_ADMIN'] } },
                { method:'GET',  path:'/api/v1/permissions',      description:'List all available permissions (static catalog, not paginated)',
                  response:{ content:['PRODUCTS_READ','PRODUCTS_WRITE','BILLS_READ','BILLS_WRITE','USERS_MANAGE','ACCOUNTING_READ','ACCOUNTING_WRITE','BANKING_READ','HRMS_READ','HRMS_WRITE'] } }
            ]
        },
        crm: {
            title: 'CRM — Customers', icon: 'users', color: 'from-sky-400 to-blue-500',
            endpoints: [
                { method:'GET',  path:'/api/v1/customers',        description:'List customers with pagination & search',
                  query:{ page:'0 (default)', size:'20 (default, max 100)', sort:'createdAt,desc (default)', search:'string (optional, matches name/email/phone)', segment:'REGULAR|VIP|WHOLESALE (optional)' },
                  response: pageResponse([{ id:1, name:"Priya Sharma", email:"priya@example.com", phone:"+91-98765-43210", gstIn:null, address:"Andheri, Mumbai", segment:"REGULAR", totalPurchases:4599.50, lastPurchaseDate:"2025-08-10", creditLimit:0 }]) },
                { method:'POST', path:'/api/v1/customers',        description:'Create new customer',
                  body:{ name:'Priya Sharma (req)', email:'priya@example.com', phone:'+91-98765-43210', gstIn:'', address:'Andheri, Mumbai', segment:'REGULAR', creditLimit:0 },
                  response:{ id:1, name:'Priya Sharma', email:'priya@example.com', phone:'+91-98765-43210', segment:'REGULAR', creditLimit:0, createdAt:'2025-08-13T05:12:00Z' } },
                { method:'GET',  path:'/api/v1/customers/{id}',   description:'Get customer by ID with purchase history',
                  response:{ id:1, name:'Priya Sharma', email:'priya@example.com', phone:'+91-98765-43210', segment:'REGULAR', totalPurchases:4599.50, creditLimit:0,
                    recentBills:[{ id:1, invoiceNumber:'INV-00001', grandTotal:119.98, createdAt:'2025-08-10T11:20:00Z' }] } },
                { method:'PUT',  path:'/api/v1/customers/{id}',   description:'Update customer details',
                  body:{ name:'Priya Sharma', email:'priya@example.com', phone:'+91-98765-43210', gstIn:'', address:'Andheri, Mumbai', segment:'VIP', creditLimit:5000 },
                  response:{ id:1, name:'Priya Sharma', segment:'VIP', creditLimit:5000, updatedAt:'2025-08-13T05:20:00Z' } },
                { method:'DELETE',path:'/api/v1/customers/{id}',  description:'Soft-delete customer',
                  response:{ message:'Customer deactivated', id:1 } },
                { method:'GET',  path:'/api/v1/customers/{id}/bills',     description:'All bills for a customer',
                  query:{ page:'0 (default)', size:'20 (default)' },
                  response: pageResponse([{ id:1, invoiceNumber:"INV-00001", grandTotal:119.98, status:"PAID", createdAt:"2025-08-10T11:20:00Z" }]) },
                { method:'GET',  path:'/api/v1/customers/{id}/ledger',    description:'Customer debit/credit ledger',
                  query:{ page:'0 (default)', size:'20 (default)', fromDate:'ISO date (optional)', toDate:'ISO date (optional)' },
                  response: pageResponse([{ id:1, type:"DEBIT", amount:119.98, balance:119.98, reference:"INV-00001", date:"2025-08-10" }]) },
                { method:'POST', path:'/api/v1/customers/{id}/credit',    description:'Add credit to customer account',
                  body:{ amount:1000, note:'Advance received for bulk order' },
                  response:{ customerId:1, creditLimit:6000, note:'Advance received for bulk order', updatedAt:'2025-08-13T05:25:00Z' } },
                { method:'GET',  path:'/api/v1/customers/stats',  description:'CRM analytics: LTV, churn, top buyers (not paginated — single aggregate object)',
                  response:{ totalCustomers:128, newThisMonth:9, avgLifetimeValue:3421.75, churnRate:0.04, topBuyers:[{ customerId:1, name:'Priya Sharma', totalPurchases:4599.50 }] } }
            ]
        },
        sales: {
            title: 'Sales & Billing', icon: 'receipt', color: 'from-emerald-400 to-teal-500',
            endpoints: [
                { method:'POST', path:'/api/v1/bills',            description:'Create a new sale bill (immutable after creation)',
                  body:{ customerId:1, customerName:'Priya Sharma', customerPhone:'+91-98765-43210', items:[{ productId:1, quantity:2, unitPrice:29.99, discount:0 }], taxRate:18, paymentMode:'UPI', notes:'' },
                  response:{ id:1, invoiceNumber:'INV-00001', subTotal:59.98, taxAmount:10.80, grandTotal:70.78, status:'PAID', paymentMode:'UPI', qrCode:'upi://pay?pa=merchant@upi&am=70.78', createdAt:'2025-08-13T05:30:00Z' } },
                { method:'GET',  path:'/api/v1/bills',            description:'List bills with filters',
                  query:{ page:'0 (default)', size:'20 (default)', sort:'createdAt,desc (default)', search:'string (optional, invoice # / customer)', fromDate:'ISO date (optional)', toDate:'ISO date (optional)', status:'PAID|PENDING (optional)', paymentMode:'CASH|CARD|UPI (optional)' },
                  response: pageResponse([{ id:1, invoiceNumber:"INV-00001", customerName:"Priya Sharma", grandTotal:70.78, status:"PAID", paymentMode:"UPI", createdAt:"2025-08-13T05:30:00Z" }]) },
                { method:'GET',  path:'/api/v1/bills/{id}',       description:'Get single bill with full line items',
                  response:{ id:1, invoiceNumber:'INV-00001', customerName:'Priya Sharma', status:'PAID', paymentMode:'UPI', subTotal:59.98, taxAmount:10.80, grandTotal:70.78,
                    items:[{ productId:1, productName:'Wireless Mouse', quantity:2, unitPrice:29.99, discount:0, lineTotal:59.98 }], createdAt:'2025-08-13T05:30:00Z' } },
                { method:'PATCH',path:'/api/v1/bills/{id}/status',description:'Update bill payment status',
                  body:{ status:'PAID', paymentMode:'UPI' },
                  response:{ id:1, invoiceNumber:'INV-00001', status:'PAID', paymentMode:'UPI', updatedAt:'2025-08-13T05:40:00Z' } },
                { method:'GET',  path:'/api/v1/bills/stats',      description:'Sales analytics (not paginated — single aggregate object)',
                  response:{ todaySales:1250.50, weekSales:8420.00, monthSales:32100.75, totalBills:18, avgOrderValue:69.47, topProduct:'Wireless Mouse' } },
                { method:'POST', path:'/api/v1/quotes',           description:'Create a sales quotation (not a bill)',
                  body:{ customerId:1, items:[{ productId:1, quantity:2, unitPrice:29.99 }], validTill:'2025-08-31' },
                  response:{ id:1, quoteNumber:'QT-00001', customerId:1, grandTotal:70.78, status:'OPEN', validTill:'2025-08-31', createdAt:'2025-08-13T05:45:00Z' } },
                { method:'POST', path:'/api/v1/quotes/{id}/convert', description:'Convert quote to bill',
                  response:{ quoteId:1, billId:2, invoiceNumber:'INV-00002', status:'CONVERTED' } },
                { method:'GET',  path:'/api/v1/sales/report',    description:'Monthly/yearly sales report with trends (not paginated)',
                  query:{ period:'monthly|yearly (default monthly)', year:'2025 (default current year)' },
                  response:{ period:'monthly', year:2025, series:[{ month:'2025-06', sales:28400.00 }, { month:'2025-07', sales:31250.50 }, { month:'2025-08', sales:32100.75 }], growthRate:0.027 } }
            ]
        },
        pos: {
            title: 'POS Terminal', icon: 'scan-line', color: 'from-violet-400 to-purple-500',
            endpoints: [
                { method:'GET',  path:'/api/v1/pos/session',       description:'Get current open POS session',
                  response:{ sessionId:1, openedAt:'2025-08-13T09:00:00Z', openingCash:2000.00, salesCount:14, cashIn:3420.50, status:'OPEN' } },
                { method:'POST', path:'/api/v1/pos/session/open',  description:'Open a new POS shift session',
                  body:{ openingCash:2000.00, notes:'Morning shift' },
                  response:{ sessionId:1, openedAt:'2025-08-13T09:00:00Z', openingCash:2000.00, status:'OPEN' } },
                { method:'POST', path:'/api/v1/pos/session/close', description:'Close POS session & reconcile cash',
                  body:{ closingCash:5420.50, notes:'End of day' },
                  response:{ sessionId:1, closedAt:'2025-08-13T21:00:00Z', expectedCash:5420.50, actualCash:5420.50, discrepancy:0, status:'CLOSED' } },
                { method:'GET',  path:'/api/v1/pos/products/search',description:'Fast product search by barcode or name (flat array, capped by limit — not a Page)',
                  query:{ q:'barcode or name (req)', limit:'20 (default, max 50)' },
                  response:{ results:[{ id:1, name:'Wireless Mouse', sku:'WM-001', sellingPrice:29.99, currentStock:45 }] } },
                { method:'POST', path:'/api/v1/pos/bill',          description:'Quick checkout (same as /bills but session-aware)',
                  body:{ sessionId:1, items:[{ productId:1, quantity:2, unitPrice:29.99 }], paymentMode:'CASH', cashTendered:100 },
                  response:{ bill:{ id:1, invoiceNumber:'INV-00001', grandTotal:70.78, status:'PAID' }, changeDue:29.22, receiptUrl:'/receipts/INV-00001.pdf' } },
                { method:'GET',  path:'/api/v1/pos/cash-drawer',   description:'Current cash-in-drawer amount',
                  response:{ sessionId:1, openingCash:2000.00, cashSales:3420.50, currentCash:5420.50, asOf:'2025-08-13T15:00:00Z' } }
            ]
        },
        purchase: {
            title: 'Purchase & Procurement', icon: 'shopping-cart', color: 'from-orange-400 to-amber-500',
            endpoints: [
                { method:'GET',  path:'/api/v1/purchase-orders',   description:'List purchase orders',
                  query:{ page:'0 (default)', size:'20 (default)', sort:'createdAt,desc (default)', status:'DRAFT|SENT|RECEIVED|CANCELLED (optional)', supplierId:'number (optional)' },
                  response: pageResponse([{ id:1, poNumber:"PO-00001", supplierId:1, supplierName:"Tech Distributors", status:"SENT", totalAmount:2250.00, expectedDate:"2025-08-20", createdAt:"2025-08-13T06:00:00Z" }]) },
                { method:'POST', path:'/api/v1/purchase-orders',   description:'Create purchase order (PO)',
                  body:{ supplierId:1, expectedDate:'2025-08-20', items:[{ productId:1, quantity:50, unitCost:15.00 }], notes:'Urgent restock' },
                  response:{ id:1, poNumber:'PO-00001', status:'DRAFT', totalAmount:750.00, createdAt:'2025-08-13T06:00:00Z' } },
                { method:'GET',  path:'/api/v1/purchase-orders/{id}', description:'Get PO details',
                  response:{ id:1, poNumber:'PO-00001', supplierId:1, supplierName:'Tech Distributors', status:'SENT', totalAmount:750.00,
                    items:[{ productId:1, productName:'Wireless Mouse', quantity:50, unitCost:15.00, lineTotal:750.00 }], expectedDate:'2025-08-20' } },
                { method:'PUT',  path:'/api/v1/purchase-orders/{id}', description:'Update PO (only if DRAFT)',
                  body:{ expectedDate:'2025-08-22', items:[{ productId:1, quantity:60, unitCost:14.50 }], notes:'Increased qty' },
                  response:{ id:1, poNumber:'PO-00001', status:'DRAFT', totalAmount:870.00, updatedAt:'2025-08-13T06:10:00Z' } },
                { method:'PATCH',path:'/api/v1/purchase-orders/{id}/send',    description:'Mark PO as sent to supplier',
                  response:{ id:1, poNumber:'PO-00001', status:'SENT', sentAt:'2025-08-13T06:15:00Z' } },
                { method:'POST', path:'/api/v1/purchase-orders/{id}/receive', description:'Receive goods against PO (updates stock)',
                  body:{ items:[{ productId:1, receivedQty:60, condition:'GOOD' }], invoiceNumber:'SUP-INV-4521' },
                  response:{ id:1, poNumber:'PO-00001', status:'RECEIVED', receivedAt:'2025-08-15T10:00:00Z', stockMovementIds:[7] } },
                { method:'DELETE',path:'/api/v1/purchase-orders/{id}',        description:'Cancel PO (only if DRAFT or SENT)',
                  response:{ id:1, poNumber:'PO-00001', status:'CANCELLED' } },
                { method:'GET',  path:'/api/v1/purchase-orders/stats',        description:'Procurement analytics: spend, pending deliveries (not paginated)',
                  response:{ totalSpendThisMonth:12400.00, openPOs:5, pendingDeliveries:3, avgLeadTimeDays:6.2 } }
            ]
        },
        wms: {
            title: 'WMS — Warehouse', icon: 'warehouse', color: 'from-cyan-400 to-sky-500',
            endpoints: [
                { method:'GET',  path:'/api/v1/products',          description:'Product master list',
                  query:{ page:'0 (default)', size:'20 (default)', sort:'name,asc (default)', search:'string (optional)', brandId:'number (optional)', lowStock:'boolean (optional)', outOfStock:'boolean (optional)' },
                  response: pageResponse([{ id:1, name:"Wireless Mouse", sku:"WM-001", eanCode:"1234567890123", itemCode:"ITM-001", brandId:1, color:"Black", size:"Standard", purchasePrice:15.00, sellingPrice:29.99, currentStock:45, reorderQty:10, expiryDate:null }], { totalElements:42, size:20 }) },
                { method:'POST', path:'/api/v1/products',          description:'Create product',
                  body:{ sku:'WM-005 (req, unique)', name:'Wireless Trackpad (req)', eanCode:'1234567890199', itemCode:'ITM-005', brandId:1, color:'Black', size:'Standard', purchasePrice:22.00, sellingPrice:39.99, reorderQty:10, expiryDate:null, hsnCode:'847160', gstRate:18 },
                  response:{ id:5, sku:'WM-005', name:'Wireless Trackpad', purchasePrice:22.00, sellingPrice:39.99, currentStock:0, reorderQty:10, createdAt:'2025-08-13T06:20:00Z' } },
                { method:'PUT',  path:'/api/v1/products/{id}',     description:'Update product',
                  body:{ name:'Wireless Mouse Pro', sellingPrice:34.99, reorderQty:15 },
                  response:{ id:1, name:'Wireless Mouse Pro', sellingPrice:34.99, reorderQty:15, updatedAt:'2025-08-13T06:25:00Z' } },
                { method:'DELETE',path:'/api/v1/products/{id}',    description:'Soft-delete product',
                  response:{ message:'Product deactivated', id:1 } },
                { method:'GET',  path:'/api/v1/inventory',         description:'Current stock levels per product',
                  query:{ page:'0 (default)', size:'20 (default)', lowStock:'boolean (optional)', outOfStock:'boolean (optional)' },
                  response: pageResponse([{ id:1, name:"Wireless Mouse", sku:"WM-001", currentStock:45, reorderQty:10, stockValue:675.00 }]) },
                { method:'POST', path:'/api/v1/inventory/adjust',  description:'Manual stock adjustment',
                  body:{ productId:1, adjustment:-5, reason:'Damaged in warehouse (req)' },
                  response:{ productId:1, previousStock:45, adjustment:-5, currentStock:40, movementId:8 } },
                { method:'GET',  path:'/api/v1/stock-movements',   description:'Full stock movement audit log',
                  query:{ page:'0 (default)', size:'50 (default, max here is larger since audit logs are read-heavy)', productId:'number (optional)', type:'INWARD|OUTWARD (optional)', fromDate:'ISO (optional)', toDate:'ISO (optional)' },
                  response: pageResponse([{ id:1, productId:1, productName:"Wireless Mouse", type:"INWARD", quantity:50, reason:"Initial stock", referenceId:"PO-00001", createdAt:"2025-08-06T09:00:00Z" }], { size:50 }) },
                { method:'POST', path:'/api/v1/stock-movements',   description:'Record stock movement manually',
                  body:{ productId:1, type:'INWARD', quantity:20, reason:'Found in cycle count', referenceId:'CC-2025-08' },
                  response:{ id:9, productId:1, type:'INWARD', quantity:20, currentStockAfter:60, createdAt:'2025-08-13T06:35:00Z' } },
                { method:'GET',  path:'/api/v1/inventory/stats',   description:'Total stock value, low-stock count (not paginated)',
                  response:{ totalStockValue:15420.00, totalSkus:42, lowStockCount:3, outOfStockCount:1 } },
                { method:'GET',  path:'/api/v1/brands',            description:'List brands',
                  query:{ page:'0 (default)', size:'20 (default)', search:'string (optional)' },
                  response: pageResponse([{ id:1, name:"Logitech", logoUrl:"", description:"Swiss peripherals" }]) },
                { method:'POST', path:'/api/v1/brands',            description:'Create brand',
                  body:{ name:'Keychron (req)', logoUrl:'', description:'Mechanical keyboards' },
                  response:{ id:2, name:'Keychron', logoUrl:'', description:'Mechanical keyboards', createdAt:'2025-08-13T06:40:00Z' } },
                { method:'PUT',  path:'/api/v1/brands/{id}',       description:'Update brand',
                  body:{ name:'Keychron Inc.', description:'Mechanical keyboards & accessories' },
                  response:{ id:2, name:'Keychron Inc.', description:'Mechanical keyboards & accessories', updatedAt:'2025-08-13T06:42:00Z' } },
                { method:'DELETE',path:'/api/v1/brands/{id}',      description:'Delete brand',
                  response:{ message:'Brand deleted', id:2 } }
            ]
        },
        hrms: {
            title: 'HRMS — Employees', icon: 'user-check', color: 'from-pink-400 to-rose-500',
            endpoints: [
                { method:'GET',  path:'/api/v1/employees',         description:'List all employees',
                  query:{ page:'0 (default)', size:'20 (default)', department:'string (optional)', status:'ACTIVE|INACTIVE (optional)', role:'string (optional)' },
                  response: pageResponse([{ id:1, name:"Rahul Verma", email:"rahul@acme.com", phone:"+91-90000-00001", department:"Sales", designation:"Store Executive", status:"ACTIVE", joinDate:"2024-02-01" }]) },
                { method:'POST', path:'/api/v1/employees',         description:'Onboard new employee',
                  body:{ name:'Rahul Verma', email:'rahul@acme.com', phone:'+91-90000-00001', department:'Sales', designation:'Store Executive', salary:32000, joinDate:'2024-02-01', panNumber:'ABCDE1234F', bankAccount:'XXXXXXXX1234', bankIfsc:'HDFC0001234' },
                  response:{ id:1, name:'Rahul Verma', department:'Sales', status:'ACTIVE', createdAt:'2025-08-13T06:45:00Z' } },
                { method:'GET',  path:'/api/v1/employees/{id}',    description:'Get employee profile with attendance',
                  response:{ id:1, name:'Rahul Verma', department:'Sales', designation:'Store Executive', salary:32000, status:'ACTIVE',
                    recentAttendance:[{ date:'2025-08-13', inTime:'09:02', outTime:'18:05', status:'PRESENT' }] } },
                { method:'PUT',  path:'/api/v1/employees/{id}',    description:'Update employee details',
                  body:{ designation:'Senior Store Executive', salary:38000 },
                  response:{ id:1, name:'Rahul Verma', designation:'Senior Store Executive', salary:38000, updatedAt:'2025-08-13T06:50:00Z' } },
                { method:'DELETE',path:'/api/v1/employees/{id}',   description:'Offboard / deactivate employee',
                  response:{ message:'Employee deactivated', id:1 } },
                { method:'GET',  path:'/api/v1/attendance',        description:'Attendance log',
                  query:{ page:'0 (default)', size:'20 (default)', employeeId:'number (optional)', month:'2025-08 (optional)' },
                  response: pageResponse([{ id:1, employeeId:1, employeeName:"Rahul Verma", date:"2025-08-13", inTime:"09:02", outTime:"18:05", status:"PRESENT" }]) },
                { method:'POST', path:'/api/v1/attendance/punch',  description:'Punch in/out',
                  body:{ employeeId:1, type:'IN', timestamp:'2025-08-13T09:02:00Z', location:'Store Front' },
                  response:{ id:11, employeeId:1, type:'IN', timestamp:'2025-08-13T09:02:00Z' } },
                { method:'GET',  path:'/api/v1/payroll',           description:'Payroll runs list',
                  query:{ page:'0 (default)', size:'20 (default)', month:'2025-08 (optional)', status:'PENDING|PROCESSED|PAID (optional)' },
                  response: pageResponse([{ id:1, month:"2025-07", totalEmployees:8, totalAmount:256000, status:"PAID", processedAt:"2025-08-01T10:00:00Z" }]) },
                { method:'POST', path:'/api/v1/payroll/run',       description:'Generate payroll for a month',
                  body:{ month:'2025-08', includeBonus:false },
                  response:{ id:2, month:'2025-08', totalEmployees:8, totalAmount:264000, status:'PENDING' } },
                { method:'POST', path:'/api/v1/payroll/{id}/disburse', description:'Mark payroll as disbursed',
                  response:{ id:2, month:'2025-08', status:'PAID', disbursedAt:'2025-08-13T07:00:00Z' } },
                { method:'GET',  path:'/api/v1/leaves',            description:'Leave requests',
                  query:{ page:'0 (default)', size:'20 (default)', employeeId:'number (optional)', status:'PENDING|APPROVED|REJECTED (optional)', fromDate:'ISO (optional)' },
                  response: pageResponse([{ id:1, employeeId:1, employeeName:"Rahul Verma", type:"SICK", fromDate:"2025-08-14", toDate:"2025-08-15", status:"PENDING", reason:"Fever" }]) },
                { method:'POST', path:'/api/v1/leaves',            description:'Apply for leave',
                  body:{ employeeId:1, type:'SICK', fromDate:'2025-08-14', toDate:'2025-08-15', reason:'Fever' },
                  response:{ id:1, employeeId:1, type:'SICK', status:'PENDING', createdAt:'2025-08-13T07:05:00Z' } },
                { method:'PATCH',path:'/api/v1/leaves/{id}/approve', description:'Approve/reject leave request',
                  body:{ status:'APPROVED', remarks:'Get well soon' },
                  response:{ id:1, employeeId:1, status:'APPROVED', remarks:'Get well soon', approvedAt:'2025-08-13T07:10:00Z' } }
            ]
        },
        accounting: {
            title: 'Accounting & Ledger', icon: 'book-open', color: 'from-indigo-400 to-violet-500',
            endpoints: [
                { method:'GET',  path:'/api/v1/accounts',          description:'Chart of accounts (COA)',
                  query:{ page:'0 (default)', size:'50 (default — COA lists are usually read in full)', type:'ASSET|LIABILITY|EQUITY|INCOME|EXPENSE (optional)' },
                  response: pageResponse([{ id:1, name:"Cash in Hand", code:"1000", type:"ASSET", parentId:null, balance:5420.50 }], { size:50 }) },
                { method:'POST', path:'/api/v1/accounts',          description:'Create GL account',
                  body:{ name:'Petty Cash', code:'1010', type:'ASSET', parentId:1 },
                  response:{ id:2, name:'Petty Cash', code:'1010', type:'ASSET', parentId:1, balance:0, createdAt:'2025-08-13T07:15:00Z' } },
                { method:'GET',  path:'/api/v1/journal-entries',   description:'Journal entries (double-entry)',
                  query:{ page:'0 (default)', size:'20 (default)', fromDate:'ISO (optional)', toDate:'ISO (optional)', accountId:'number (optional)' },
                  response: pageResponse([{ id:1, date:"2025-08-13", description:"Cash sale INV-00001", reference:"INV-00001", lines:[{ accountId:1, accountName:"Cash in Hand", debit:70.78, credit:0 }, { accountId:5, accountName:"Sales Revenue", debit:0, credit:70.78 }] }]) },
                { method:'POST', path:'/api/v1/journal-entries',   description:'Post journal entry',
                  body:{ date:'2025-08-13', description:'Owner capital infusion', lines:[{ accountId:1, debit:10000, credit:0 }, { accountId:6, debit:0, credit:10000 }], reference:'CAP-001' },
                  response:{ id:2, date:'2025-08-13', description:'Owner capital infusion', totalDebit:10000, totalCredit:10000, createdAt:'2025-08-13T07:20:00Z' } },
                { method:'GET',  path:'/api/v1/reports/trial-balance',   description:'Trial balance report (not paginated — full snapshot as of a date)',
                  query:{ asOf:'2025-08-13 (ISO date, default today)' },
                  response:{ asOf:'2025-08-13', rows:[{ accountCode:'1000', accountName:'Cash in Hand', debit:5420.50, credit:0 }], totalDebit:15420.00, totalCredit:15420.00 } },
                { method:'GET',  path:'/api/v1/reports/profit-loss',     description:'P&L statement (not paginated)',
                  query:{ fromDate:'2025-08-01 (req)', toDate:'2025-08-13 (req)' },
                  response:{ fromDate:'2025-08-01', toDate:'2025-08-13', totalIncome:32100.75, totalExpense:18400.00, netProfit:13700.75 } },
                { method:'GET',  path:'/api/v1/reports/balance-sheet',   description:'Balance sheet (not paginated)',
                  query:{ asOf:'2025-08-13 (ISO date, default today)' },
                  response:{ asOf:'2025-08-13', totalAssets:54200.00, totalLiabilities:12000.00, totalEquity:42200.00 } },
                { method:'GET',  path:'/api/v1/reports/cash-flow',       description:'Cash flow statement (not paginated)',
                  query:{ fromDate:'2025-08-01 (req)', toDate:'2025-08-13 (req)' },
                  response:{ fromDate:'2025-08-01', toDate:'2025-08-13', operating:9200.00, investing:-1500.00, financing:0, netChange:7700.00 } },
                { method:'GET',  path:'/api/v1/gst/returns',      description:'GST return filing status',
                  query:{ page:'0 (default)', size:'12 (default — one per month)', period:'2025-01 (optional, filters to a single period)' },
                  response: pageResponse([{ id:1, period:"2025-07", type:"GSTR3B", status:"FILED", filedAt:"2025-08-05T10:00:00Z" }], { size:12 }) },
                { method:'POST', path:'/api/v1/gst/returns/generate', description:'Generate GSTR-1 / GSTR-3B',
                  body:{ period:'2025-08', type:'GSTR3B' },
                  response:{ id:2, period:'2025-08', type:'GSTR3B', status:'DRAFT', taxableValue:32100.75, taxPayable:5778.14, generatedAt:'2025-08-13T07:30:00Z' } }
            ]
        },
        banking: {
            title: 'Banking & Payments', icon: 'landmark', color: 'from-teal-400 to-emerald-500',
            endpoints: [
                { method:'GET',  path:'/api/v1/bank-accounts',     description:'List company bank accounts (not paginated — small, bounded set)',
                  response:{ content:[{ id:1, bankName:'HDFC Bank', accountNumber:'XXXXXXXX1234', ifsc:'HDFC0001234', accountType:'CURRENT', currentBalance:245000.00 }] } },
                { method:'POST', path:'/api/v1/bank-accounts',     description:'Link a bank account',
                  body:{ bankName:'ICICI Bank', accountNumber:'XXXXXXXX5678', ifsc:'ICIC0005678', accountType:'CURRENT', openingBalance:50000.00 },
                  response:{ id:2, bankName:'ICICI Bank', accountNumber:'XXXXXXXX5678', accountType:'CURRENT', currentBalance:50000.00, createdAt:'2025-08-13T07:35:00Z' } },
                { method:'GET',  path:'/api/v1/bank-accounts/{id}/transactions', description:'Bank transactions list',
                  query:{ page:'0 (default)', size:'20 (default)', fromDate:'ISO (optional)', toDate:'ISO (optional)', type:'CREDIT|DEBIT (optional)' },
                  response: pageResponse([{ id:1, type:"CREDIT", amount:70.78, date:"2025-08-13", description:"POS settlement INV-00001", reference:"UPI-8891" }]) },
                { method:'POST', path:'/api/v1/bank-accounts/{id}/transactions', description:'Record a bank transaction manually',
                  body:{ type:'DEBIT', amount:5000.00, date:'2025-08-13', description:'Rent payment', reference:'CHQ-000112' },
                  response:{ id:2, type:'DEBIT', amount:5000.00, balanceAfter:240000.00, createdAt:'2025-08-13T07:40:00Z' } },
                { method:'POST', path:'/api/v1/bank-accounts/{id}/reconcile', description:'Bank reconciliation — match statement with ledger',
                  body:{ statementDate:'2025-08-13', statementBalance:245000.00, matchedTxnIds:[1,2,3] },
                  response:{ accountId:1, matched:3, unmatched:0, statementBalance:245000.00, ledgerBalance:245000.00, discrepancy:0 } },
                { method:'GET',  path:'/api/v1/payments',          description:'All payment records (inward/outward)',
                  query:{ page:'0 (default)', size:'20 (default)', mode:'CASH|CARD|UPI|NEFT|RTGS (optional)', status:'PENDING|CLEARED|FAILED (optional)' },
                  response: pageResponse([{ id:1, type:"INWARD", amount:70.78, mode:"UPI", status:"CLEARED", entityType:"CUSTOMER", entityId:1, date:"2025-08-13" }]) },
                { method:'POST', path:'/api/v1/payments',          description:'Record a payment',
                  body:{ type:'OUTWARD', amount:750.00, mode:'NEFT', reference:'UTR8823910012', entityType:'SUPPLIER', entityId:1, date:'2025-08-13' },
                  response:{ id:2, type:'OUTWARD', amount:750.00, mode:'NEFT', status:'PENDING', createdAt:'2025-08-13T07:45:00Z' } }
            ]
        },
        returns: {
            title: 'Returns & Refunds', icon: 'rotate-ccw', color: 'from-red-400 to-pink-500',
            endpoints: [
                { method:'GET',  path:'/api/v1/returns',           description:'List all returns',
                  query:{ page:'0 (default)', size:'20 (default)', fromDate:'ISO (optional)', toDate:'ISO (optional)', reason:'string (optional)' },
                  response: pageResponse([{ id:1, billId:1, productId:1, productName:"Wireless Mouse", quantity:1, reason:"Defective unit", refundAmount:29.99, status:"PENDING", createdAt:"2025-08-13T04:30:00Z" }]) },
                { method:'POST', path:'/api/v1/returns',           description:'Process a customer return',
                  body:{ billId:1, productId:1, quantity:1, reason:'Defective unit', refundMode:'ORIGINAL_PAYMENT', refundAmount:29.99 },
                  response:{ id:1, billId:1, productId:1, quantity:1, refundAmount:29.99, status:'PENDING', createdAt:'2025-08-13T04:30:00Z' } },
                { method:'GET',  path:'/api/v1/returns/{id}',      description:'Get return details',
                  response:{ id:1, billId:1, invoiceNumber:'INV-00001', productId:1, productName:'Wireless Mouse', quantity:1, reason:'Defective unit', refundMode:'ORIGINAL_PAYMENT', refundAmount:29.99, status:'PENDING' } },
                { method:'PATCH',path:'/api/v1/returns/{id}/approve', description:'Approve return and trigger stock update + refund',
                  body:{ }, response:{ id:1, status:'APPROVED', stockMovementId:10, refundTransactionId:5, approvedAt:'2025-08-13T04:35:00Z' } }
            ]
        },
        suppliers: {
            title: 'Suppliers', icon: 'truck', color: 'from-slate-400 to-zinc-500',
            endpoints: [
                { method:'GET',  path:'/api/v1/suppliers',         description:'List suppliers',
                  query:{ page:'0 (default)', size:'20 (default)', search:'string (optional)', status:'ACTIVE|INACTIVE (optional)' },
                  response: pageResponse([{ id:1, name:"Tech Distributors", companyName:"TechDist Ltd", email:"orders@techdist.com", phone:"+91-99999-00001", gstIn:"27AAAAA0000A1Z5", status:"ACTIVE" }]) },
                { method:'POST', path:'/api/v1/suppliers',         description:'Create supplier',
                  body:{ name:'Tech Distributors (req)', companyName:'TechDist Ltd', email:'orders@techdist.com', phone:'+91-99999-00001', gstIn:'27AAAAA0000A1Z5', address:'Andheri East, Mumbai', paymentTerms:'Net 30', contactPersons:[{ name:'Rajesh Kumar', phone:'+91-99999-00002', email:'rk@techdist.com', designation:'Sales Head' }] },
                  response:{ id:1, name:'Tech Distributors', status:'ACTIVE', createdAt:'2025-08-13T07:50:00Z' } },
                { method:'PUT',  path:'/api/v1/suppliers/{id}',    description:'Update supplier',
                  body:{ paymentTerms:'Net 45' },
                  response:{ id:1, name:'Tech Distributors', paymentTerms:'Net 45', updatedAt:'2025-08-13T07:55:00Z' } },
                { method:'DELETE',path:'/api/v1/suppliers/{id}',   description:'Deactivate supplier',
                  response:{ message:'Supplier deactivated', id:1 } },
                { method:'GET',  path:'/api/v1/suppliers/{id}/ledger', description:'Supplier payment ledger',
                  query:{ page:'0 (default)', size:'20 (default)' },
                  response: pageResponse([{ id:1, type:"CREDIT", amount:750.00, balance:750.00, reference:"PO-00001", date:"2025-08-13" }]) }
            ]
        },
        ecommerce: {
            title: 'E-Commerce', icon: 'shopping-bag', color: 'from-fuchsia-400 to-purple-500',
            endpoints: [
                { method:'GET',  path:'/api/v1/ecommerce/orders',  description:'Online orders list',
                  query:{ page:'0 (default)', size:'20 (default)', status:'NEW|PROCESSING|SHIPPED|DELIVERED|CANCELLED (optional)', platform:'SHOPIFY|WOOCOMMERCE|OWN (optional)' },
                  response: pageResponse([{ id:1, platformOrderId:"SHOP-10023", platform:"SHOPIFY", customerId:1, status:"NEW", grandTotal:129.98, createdAt:"2025-08-13T04:00:00Z" }]) },
                { method:'POST', path:'/api/v1/ecommerce/orders',  description:'Create order from online platform',
                  body:{ platformOrderId:'SHOP-10023', platform:'SHOPIFY', customerId:1, items:[{ productId:1, quantity:2, unitPrice:29.99 }], shippingAddress:{ line1:'12 MG Road', city:'Mumbai', pincode:'400001' }, paymentStatus:'PAID' },
                  response:{ id:1, platformOrderId:'SHOP-10023', status:'NEW', grandTotal:59.98, createdAt:'2025-08-13T04:00:00Z' } },
                { method:'PATCH',path:'/api/v1/ecommerce/orders/{id}/ship',   description:'Mark order as shipped',
                  body:{ courierName:'Delhivery', trackingNumber:'DL2025081300123' },
                  response:{ id:1, status:'SHIPPED', courierName:'Delhivery', trackingNumber:'DL2025081300123', shippedAt:'2025-08-13T08:00:00Z' } },
                { method:'PATCH',path:'/api/v1/ecommerce/orders/{id}/deliver', description:'Mark order as delivered',
                  response:{ id:1, status:'DELIVERED', deliveredAt:'2025-08-15T12:30:00Z' } },
                { method:'POST', path:'/api/v1/ecommerce/webhook', description:'Receive platform webhooks (Shopify / WooCommerce)',
                  body:{ topic:'orders/updated', shop:'acme-retail.myshopify.com', payload:'{ ...raw platform event JSON... }' },
                  response:{ received:true, processedAt:'2025-08-13T08:05:00Z' } }
            ]
        },
        trading: {
            title: 'Trading & Distribution', icon: 'arrow-left-right', color: 'from-lime-400 to-green-500',
            endpoints: [
                { method:'GET',  path:'/api/v1/price-lists',       description:'Price lists per customer segment / market',
                  query:{ page:'0 (default)', size:'20 (default)', segment:'RETAIL|WHOLESALE|VIP (optional)' },
                  response: pageResponse([{ id:1, name:"Wholesale Q3", segment:"WHOLESALE", active:true, effectiveFrom:"2025-07-01" }]) },
                { method:'POST', path:'/api/v1/price-lists',       description:'Create a price list',
                  body:{ name:'Wholesale Q3', segment:'WHOLESALE', effectiveFrom:'2025-07-01', items:[{ productId:1, price:24.99, minQty:10 }] },
                  response:{ id:1, name:'Wholesale Q3', segment:'WHOLESALE', active:false, createdAt:'2025-08-13T08:10:00Z' } },
                { method:'POST', path:'/api/v1/price-lists/{id}/activate', description:'Activate a price list',
                  response:{ id:1, name:'Wholesale Q3', active:true, activatedAt:'2025-08-13T08:12:00Z' } },
                { method:'GET',  path:'/api/v1/promotions',        description:'Active discounts and promotions',
                  query:{ page:'0 (default)', size:'20 (default)', active:'boolean (optional)' },
                  response: pageResponse([{ id:1, name:"Independence Day Sale", type:"PERCENT", value:15, fromDate:"2025-08-10", toDate:"2025-08-15", usesCount:34, maxUses:100 }]) },
                { method:'POST', path:'/api/v1/promotions',        description:'Create promotion',
                  body:{ name:'Independence Day Sale', type:'PERCENT', value:15, minOrderValue:0, productIds:[1,2], fromDate:'2025-08-10', toDate:'2025-08-15', maxUses:100 },
                  response:{ id:1, name:'Independence Day Sale', usesCount:0, createdAt:'2025-08-13T08:15:00Z' } },
                { method:'GET',  path:'/api/v1/trading/margins',   description:'Margin report — purchase vs selling price per product (not paginated)',
                  response:{ generatedAt:'2025-08-13T08:20:00Z', rows:[{ productId:1, productName:'Wireless Mouse', purchasePrice:15.00, sellingPrice:29.99, marginPct:49.98 }], avgMarginPct:44.6 } }
            ]
        },
        company: {
            title: 'Company Setup', icon: 'building-2', color: 'from-blue-400 to-indigo-500',
            endpoints: [
                { method:'GET',  path:'/api/v1/company',           description:'Get company profile',
                  response:{ id:1, name:'Acme Retail Pvt Ltd', logoUrl:'', taxRegistration:'27AAAAA0000A1Z5', phone:'+91-22-1234-5678', email:'demo@acme.com', address:'BKC, Mumbai, Maharashtra', gstType:'REGULAR', financialYear:'2025-26' } },
                { method:'POST', path:'/api/v1/company',           description:'Create/update company profile',
                  body:{ name:'Acme Retail Pvt Ltd', logoUrl:'', taxRegistration:'27AAAAA0000A1Z5', phone:'+91-22-1234-5678', email:'demo@acme.com', address:'BKC, Mumbai, Maharashtra', gstType:'REGULAR', financialYear:'2025-26' },
                  response:{ id:1, name:'Acme Retail Pvt Ltd', financialYear:'2025-26', updatedAt:'2025-08-13T08:25:00Z' } },
                { method:'GET',  path:'/api/v1/settings',          description:'Application settings (invoice prefix, tax defaults, etc.) — not paginated, single object',
                  response:{ invoicePrefix:'INV', invoiceStartNumber:1, defaultTaxRate:18, currency:'INR', timezone:'Asia/Kolkata', dateFormat:'DD/MM/YYYY' } },
                { method:'PUT',  path:'/api/v1/settings',          description:'Update settings',
                  body:{ invoicePrefix:'INV', invoiceStartNumber:1, defaultTaxRate:18, currency:'INR', timezone:'Asia/Kolkata', dateFormat:'DD/MM/YYYY' },
                  response:{ invoicePrefix:'INV', defaultTaxRate:18, updatedAt:'2025-08-13T08:30:00Z' } }
            ]
        }
    };

    // ======================================================
    //  BACKEND CONCEPT TOPICS
    // ======================================================
    const BACKEND_TOPICS = {
        jwt: {
            title: 'JWT — JSON Web Tokens', icon: 'key-round', color: 'from-amber-400 to-yellow-500',
            summary: 'Stateless authentication. Server signs a token; client sends it on every request.',
            concepts: [
                { term: 'Structure', detail: 'header.payload.signature — all base64url encoded. Header: alg + typ. Payload: claims (sub, iat, exp, roles). Signature: HMAC-SHA256(secret) or RS256.' },
                { term: 'iat / exp', detail: 'Issued-at and expiry timestamps (Unix epoch). exp - iat = token lifetime. Typical: access=15min, refresh=7days.' },
                { term: 'Claims', detail: 'Registered: sub, iss, aud, exp, iat. Private: userId, orgId, roles. Keep payload small — it travels on every request.' },
                { term: 'Signing algorithms', detail: 'HS256 — symmetric (same secret to sign & verify, fine for monolith). RS256 — asymmetric (private key signs, public key verifies — needed for microservices).' },
                { term: 'Refresh token flow', detail: '1) Login → server returns access (15min) + refresh (7d). 2) Client stores refresh in httpOnly cookie. 3) When access expires, call /auth/refresh with refresh token. 4) Server validates, returns new access token.' },
                { term: 'Token blacklisting', detail: 'JWT is stateless so logout cannot truly invalidate it. Solutions: (1) Short expiry. (2) Maintain a blacklist in Redis (jti claim → revoked set). (3) Rotate secrets per user.' },
                { term: 'Spring Security + JWT', detail: 'JwtAuthFilter extends OncePerRequestFilter → extracts token → JwtService.validateToken() → sets UsernamePasswordAuthenticationToken in SecurityContext.' }
            ],
            code: `// JwtService.java
@Service
public class JwtService {
    @Value("\${jwt.secret}") private String SECRET;
    @Value("\${jwt.expiry:900000}") private long EXPIRY; // 15 min

    public String generateToken(UserDetails user) {
        Map<String,Object> claims = new HashMap<>();
        claims.put("roles", user.getAuthorities().stream()
            .map(GrantedAuthority::getAuthority).toList());
        return Jwts.builder()
            .setClaims(claims)
            .setSubject(user.getUsername())
            .setIssuedAt(new Date())
            .setExpiration(new Date(System.currentTimeMillis() + EXPIRY))
            .signWith(getKey(), SignatureAlgorithm.HS256)
            .compact();
    }

    public boolean validateToken(String token, UserDetails user) {
        String username = extractUsername(token);
        return username.equals(user.getUsername()) && !isExpired(token);
    }

    private SecretKey getKey() {
        return Keys.hmacShaKeyFor(Decoders.BASE64.decode(SECRET));
    }
}`
        },
        rbac: {
            title: 'RBAC — Role-Based Access Control', icon: 'shield-check', color: 'from-rose-400 to-red-500',
            summary: 'Users have Roles; Roles have Permissions. Spring Security enforces at method or URL level.',
            concepts: [
                { term: 'Roles vs Permissions', detail: 'Role = named group (ADMIN, MANAGER, CASHIER). Permission = granular right (PRODUCTS_WRITE, BILLS_READ). Roles hold sets of permissions.' },
                { term: '@PreAuthorize', detail: 'Method-level security. @PreAuthorize("hasRole(\'ADMIN\')") or @PreAuthorize("hasAuthority(\'BILLS_WRITE\')").' },
                { term: 'SecurityContext', detail: 'After JwtAuthFilter authenticates the user, it stores Authentication in SecurityContextHolder.getContext(). Spring reads it for @PreAuthorize.' },
                { term: 'Hierarchy', detail: 'ROLE_ADMIN > ROLE_MANAGER > ROLE_CASHIER. Use RoleHierarchyImpl. ADMIN inherits all MANAGER permissions automatically.' },
                { term: 'Row-level security', detail: 'Each org only sees its own data. Achieved with @Query("...WHERE b.orgId = :#{principal.orgId}") or using Hibernate @Filter.' },
                { term: 'Forbidden vs Unauthorized', detail: '401 Unauthorized = not authenticated (no/bad token). 403 Forbidden = authenticated but lacks permission.' }
            ],
            code: `// SecurityConfig.java
@Configuration @EnableMethodSecurity
public class SecurityConfig {
    @Bean
    SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        return http
            .csrf(csrf -> csrf.disable())
            .sessionManagement(s -> s.sessionCreationPolicy(STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/v1/auth/**").permitAll()
                .requestMatchers("/health/**", "/actuator/health").permitAll()
                .requestMatchers(HttpMethod.DELETE, "/api/v1/**").hasRole("ADMIN")
                .anyRequest().authenticated()
            )
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class)
            .build();
    }
}

// On a controller method:
@DeleteMapping("/{id}")
@PreAuthorize("hasAuthority('PRODUCTS_DELETE')")
public ResponseEntity<Void> delete(@PathVariable Long id) { ... }`
        },
        rest: {
            title: 'REST API Design', icon: 'network', color: 'from-blue-400 to-indigo-500',
            summary: 'Uniform interface, stateless, resource-oriented. HTTP verbs map to CRUD operations.',
            concepts: [
                { term: 'HTTP verbs', detail: 'GET — read (safe, idempotent). POST — create (not idempotent). PUT — full replace (idempotent). PATCH — partial update. DELETE — remove (idempotent). OPTIONS — CORS preflight.' },
                { term: 'Status codes', detail: '200 OK, 201 Created, 204 No Content, 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 409 Conflict, 422 Unprocessable Entity, 429 Too Many Requests, 500 Internal Server Error.' },
                { term: 'Resource naming', detail: 'Nouns not verbs. Plural: /customers, /products. Hierarchy: /customers/{id}/orders. Query params for filters: /products?lowStock=true&page=0.' },
                { term: 'Versioning', detail: 'URL: /api/v1/... (most common). Header: Accept: application/vnd.myapp.v1+json. Param: /api/products?version=1.' },
                { term: 'HATEOAS', detail: 'Responses include _links to related resources. Spring provides spring-hateoas. Adds self, next, prev, related links to JSON.' },
                { term: 'GlobalExceptionHandler', detail: '@RestControllerAdvice. @ExceptionHandler(MethodArgumentNotValidException.class) → 400 with field errors. @ExceptionHandler(EntityNotFoundException.class) → 404.' },
                { term: 'Request validation', detail: '@Valid on @RequestBody. Use @NotNull, @NotBlank, @Min, @Size, @Email on DTO fields. Validation errors trigger MethodArgumentNotValidException.' }
            ],
            code: `// ErrorResponse standard shape
{
  "timestamp": "2025-01-15T10:30:00Z",
  "status": 400,
  "error": "Bad Request",
  "message": "Validation failed",
  "path": "/api/v1/products",
  "fieldErrors": [
    { "field": "sku", "message": "must not be blank" },
    { "field": "sellingPrice", "message": "must be > 0" }
  ]
}

// GlobalExceptionHandler.java
@RestControllerAdvice
public class GlobalExceptionHandler {
    @ExceptionHandler(MethodArgumentNotValidException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ErrorResponse handleValidation(MethodArgumentNotValidException ex) {
        List<FieldError> errors = ex.getBindingResult().getFieldErrors()
            .stream().map(e -> new FieldError(e.getField(), e.getDefaultMessage()))
            .toList();
        return new ErrorResponse(400, "Validation failed", errors);
    }
}`
        },
        pagination: {
            title: 'Pagination & Sorting', icon: 'list-ordered', color: 'from-teal-400 to-cyan-500',
            summary: 'Never return unbounded lists. Use Spring Pageable for consistent, sortable, filterable pages.',
            concepts: [
                { term: 'Pageable', detail: 'Spring interface: page (0-based), size, sort. Injected directly: getProducts(Pageable pageable). Use @PageableDefault(size=20) to set defaults.' },
                { term: 'Page<T> response', detail: 'content[], totalElements, totalPages, number (current page), size, first, last, empty. Always return this shape — never a raw List.' },
                { term: 'Cursor vs offset', detail: 'Offset (LIMIT/OFFSET) is simple but slow on large data. Cursor-based (WHERE id > lastId LIMIT 20) is fast but no random page access. Offset fine up to ~1M rows.' },
                { term: 'Sorting', detail: '?sort=createdAt,desc&sort=name,asc. Multiple sort params. In JPA: Sort.by("createdAt").descending(). Validate sort fields to prevent SQL injection.' },
                { term: 'Filtering', detail: 'Use JPA Specifications or QueryDSL for dynamic filters. Never build query strings manually. Example: Specification.where(hasName(name)).and(hasBrand(brandId)).' },
                { term: 'Performance', detail: 'Add @Index on columns used in WHERE/ORDER BY. Use JPQL projections (interfaces or DTOs) instead of full entity. Avoid N+1 with JOIN FETCH or @EntityGraph.' }
            ],
            code: `// Controller
@GetMapping
public ResponseEntity<Page<ProductDto>> list(
    @RequestParam(required=false) String search,
    @RequestParam(required=false) Long brandId,
    @RequestParam(required=false) Boolean lowStock,
    @PageableDefault(size=20, sort="name") Pageable pageable
) {
    return ResponseEntity.ok(productService.search(search, brandId, lowStock, pageable));
}

// Service with Specification
public Page<ProductDto> search(String search, Long brandId, Boolean lowStock, Pageable p) {
    Specification<Product> spec = Specification.where(null);
    if (search  != null) spec = spec.and((r,q,cb) -> cb.like(cb.lower(r.get("name")), "%"+search.toLowerCase()+"%"));
    if (brandId != null) spec = spec.and((r,q,cb) -> cb.equal(r.get("brandId"), brandId));
    if (Boolean.TRUE.equals(lowStock)) spec = spec.and((r,q,cb) -> cb.le(r.get("currentStock"), r.get("reorderQty")));
    return repo.findAll(spec, p).map(mapper::toDto);
}`
        },
        hibernate: {
            title: 'Hibernate & JPA', icon: 'database', color: 'from-green-400 to-emerald-500',
            summary: 'ORM that maps Java entities to DB tables. Know the traps before they bite in production.',
            concepts: [
                { term: 'Entity mapping', detail: '@Entity @Table(name="products"). @Id @GeneratedValue(strategy=IDENTITY). @Column(nullable=false, unique=true, length=100). @CreatedDate @LastModifiedDate (with @EnableJpaAuditing).' },
                { term: 'Relationships', detail: '@ManyToOne (most common — owns FK). @OneToMany(mappedBy="parent", cascade=ALL) — never put cascade on @ManyToOne. @ManyToMany — use a junction entity, not the annotation directly.' },
                { term: 'N+1 problem', detail: 'Lazy loading inside a loop fires 1 query per child. Fix: JOIN FETCH in JPQL or @EntityGraph(attributePaths={"items"}) on repository method.' },
                { term: 'FetchType', detail: 'LAZY (default for collections) — loads on access. EAGER — loads always with parent. Prefer LAZY everywhere; use JOIN FETCH only when you need the data.' },
                { term: 'Transactions', detail: '@Transactional on service methods. READ operations: @Transactional(readOnly=true) — Hibernate skips dirty-checking, faster. Checked exceptions do NOT rollback by default — use rollbackFor=Exception.class.' },
                { term: 'Soft delete', detail: '@SQLDelete(sql="UPDATE products SET deleted=true WHERE id=?") + @Where(clause="deleted=false"). Hibernate transparently filters deleted records.' },
                { term: 'Optimistic locking', detail: '@Version field (Long). On concurrent update, Hibernate throws OptimisticLockException. Best for low-contention data (vs pessimistic: SELECT FOR UPDATE).' }
            ],
            code: `@Entity @Table(name="products")
@SQLDelete(sql="UPDATE products SET deleted=true WHERE id=?")
@Where(clause="deleted=false")
@EntityListeners(AuditingEntityListener.class)
public class Product {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY)
    private Long id;

    @Column(nullable=false, unique=true, length=50)
    private String sku;

    @ManyToOne(fetch=FetchType.LAZY)
    @JoinColumn(name="brand_id")
    private Brand brand;

    @Version private Long version; // optimistic lock

    @CreatedDate @Column(updatable=false)
    private LocalDateTime createdAt;
    @LastModifiedDate private LocalDateTime updatedAt;

    private boolean deleted = false;
}`
        },
        caching: {
            title: 'Caching — Redis & Caffeine', icon: 'zap', color: 'from-yellow-400 to-amber-500',
            summary: 'Cache expensive reads. Invalidate on writes. Choose Redis (distributed) or Caffeine (in-process).',
            concepts: [
                { term: '@Cacheable', detail: '@Cacheable("products") on service method — Spring checks cache first, runs method only on miss, stores result. Key defaults to method args.' },
                { term: '@CacheEvict', detail: '@CacheEvict(value="products", allEntries=true) — clears cache on writes/deletes. Put on save/update/delete methods.' },
                { term: '@CachePut', detail: 'Always runs method AND updates cache. Use on update operations to keep cache fresh without evicting everything.' },
                { term: 'Redis vs Caffeine', detail: 'Caffeine: in-process heap, no infra, lost on restart. Best for single-node. Redis: external, survives restarts, shared across pods. Required for horizontal scaling.' },
                { term: 'TTL strategy', detail: 'Short TTL (1–5 min) for frequently changing data (stock, prices). Long TTL (1h+) for slow-changing data (brands, categories). No TTL = stale forever.' },
                { term: 'Cache stampede', detail: 'Many threads miss at once → all hit DB. Fix: probabilistic early expiry, or use Caffeine\'s AsyncLoadingCache which serialises loading.' }
            ],
            code: `// application.yml
spring:
  cache:
    type: redis          # or caffeine for dev
  redis:
    host: localhost
    port: 6379
  data:
    redis:
      repositories:
        enabled: false

// Service
@Service @CacheConfig(cacheNames="products")
public class ProductService {
    @Cacheable(key="#pageable.pageNumber+'-'+#pageable.pageSize")
    public Page<ProductDto> findAll(Pageable pageable) { ... }

    @CacheEvict(allEntries=true)
    public ProductDto save(ProductRequest req) { ... }

    @CacheEvict(allEntries=true)
    public void delete(Long id) { ... }
}`
        },
        springdata: {
            title: 'Spring Data & Repositories', icon: 'git-branch', color: 'from-violet-400 to-purple-500',
            summary: 'Extends JpaRepository — never write boilerplate CRUD again. Know query derivation, JPQL, and native SQL.',
            concepts: [
                { term: 'Repository hierarchy', detail: 'Repository → CrudRepository → PagingAndSortingRepository → JpaRepository. Extend JpaRepository<Entity, IdType>.' },
                { term: 'Query derivation', detail: 'findByNameContainingIgnoreCase(String name) — Spring parses method name → generates query. Works for simple cases. Breaks for complex joins.' },
                { term: '@Query JPQL', detail: '@Query("SELECT p FROM Product p WHERE p.brand.id=:brandId AND p.deleted=false"). Use JPQL (entity names) not SQL (table names).' },
                { term: '@Query native', detail: '@Query(value="SELECT * FROM products WHERE stock < reorder_qty", nativeQuery=true). Needed for DB-specific functions, complex CTEs.' },
                { term: '@Modifying', detail: 'Required for @Query that writes (UPDATE/DELETE). Combine with @Transactional. Returns int (rows affected).' },
                { term: 'Projections', detail: 'Interface projection: interface ProductSummary { Long getId(); String getName(); BigDecimal getSellingPrice(); } → select only needed columns, avoids loading full entity.' },
                { term: '@Lock', detail: '@Lock(LockModeType.PESSIMISTIC_WRITE) on query method → SELECT FOR UPDATE. Use for stock deduction to prevent overselling.' }
            ],
            code: `public interface ProductRepository extends JpaRepository<Product, Long> {

    // Derived query
    Page<Product> findByBrandIdAndDeletedFalse(Long brandId, Pageable p);

    // JPQL with projection
    @Query("SELECT p.id as id, p.name as name, p.sellingPrice as sellingPrice " +
           "FROM Product p WHERE p.currentStock <= p.reorderQty")
    List<ProductSummary> findLowStockProjection();

    // Pessimistic lock for stock update
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM Product p WHERE p.id=:id")
    Optional<Product> findByIdForUpdate(@Param("id") Long id);

    // Bulk update
    @Modifying @Transactional
    @Query("UPDATE Product p SET p.currentStock = p.currentStock - :qty WHERE p.id = :id")
    int decrementStock(@Param("id") Long id, @Param("qty") int qty);
}`
        },
        validation: {
            title: 'Validation & Error Handling', icon: 'check-circle', color: 'from-green-400 to-teal-500',
            summary: 'Validate at the boundary (controller), handle centrally (GlobalExceptionHandler), respond consistently.',
            concepts: [
                { term: 'Bean Validation (JSR-380)', detail: '@NotNull, @NotBlank, @NotEmpty, @Size(min,max), @Min, @Max, @Email, @Pattern(regexp), @Positive, @DecimalMin, @Past, @Future. Put on DTO fields.' },
                { term: '@Valid vs @Validated', detail: '@Valid triggers standard validation. @Validated enables method-level validation and validation groups. Use @Valid on @RequestBody in 99% of cases.' },
                { term: 'Custom validator', detail: 'Implement ConstraintValidator<YourAnnotation, YourType>. isValid() returns boolean. Useful for cross-field validation (password == confirmPassword).' },
                { term: 'Problem Details (RFC 7807)', detail: 'Standard error response: type, title, status, detail, instance. Spring Boot 3 enables this by default with spring.mvc.problemdetails.enabled=true.' },
                { term: 'Exception hierarchy', detail: 'EntityNotFoundException → 404. IllegalStateException → 409. AccessDeniedException → 403. MethodArgumentNotValidException → 400. All caught in @RestControllerAdvice.' }
            ],
            code: `// DTO
public record ProductRequest(
    @NotBlank(message="SKU is required") String sku,
    @NotBlank String name,
    @Positive(message="Price must be positive") BigDecimal sellingPrice,
    @Min(0) Integer reorderQty
) {}

// Cross-field: passwords match
@Target(ElementType.TYPE) @Retention(RUNTIME)
@Constraint(validatedBy=PasswordMatchValidator.class)
public @interface PasswordsMatch { String message() default "Passwords must match"; ... }

public class PasswordMatchValidator implements ConstraintValidator<PasswordsMatch, SignupRequest> {
    public boolean isValid(SignupRequest r, ConstraintValidatorContext ctx) {
        return r.password().equals(r.confirmPassword());
    }
}

// GlobalExceptionHandler excerpt
@ExceptionHandler(EntityNotFoundException.class)
@ResponseStatus(HttpStatus.NOT_FOUND)
public ErrorResponse handleNotFound(EntityNotFoundException ex) {
    return new ErrorResponse(404, ex.getMessage());
}`
        },
        multitenancy: {
            title: 'Multi-Tenancy & Org Isolation', icon: 'building', color: 'from-slate-400 to-gray-500',
            summary: 'Every ERP serves multiple organisations. Data must never leak between tenants.',
            concepts: [
                { term: 'Strategies', detail: '(1) Separate DB per tenant — max isolation, expensive. (2) Separate schema per tenant — medium. (3) Shared schema with orgId column — most common for SaaS, cheapest.' },
                { term: 'orgId on every entity', detail: 'Every table has org_id FK. Every query must filter by orgId. Use @PrePersist to inject orgId from SecurityContext automatically.' },
                { term: 'Hibernate filter', detail: '@FilterDef(name="orgFilter", parameters=@ParamDef(name="orgId", type=Long.class)) + @Filter(name="orgFilter", condition="org_id = :orgId") on entities. Enable per-request in a filter.' },
                { term: 'CurrentTenantIdentifierResolver', detail: 'For schema-per-tenant: implement this interface to return schema name from JWT. Hibernate switches schema on each request.' },
                { term: 'Thread safety', detail: 'Store orgId in ThreadLocal (cleaned after request) or read from SecurityContextHolder. Never pass orgId as method param through every layer.' }
            ],
            code: `// Inject orgId automatically
@Entity public class Product {
    @Column(nullable=false) private Long orgId;

    @PrePersist void prePersist() {
        if (orgId == null) {
            orgId = SecurityUtils.getCurrentOrgId(); // reads from JWT via SecurityContext
        }
    }
}

// Repository always scoped
@Query("SELECT p FROM Product p WHERE p.orgId = :#{@securityUtils.currentOrgId} AND p.id = :id")
Optional<Product> findByIdSecure(@Param("id") Long id);`
        },
        async: {
            title: 'Async, Events & Scheduling', icon: 'clock', color: 'from-orange-400 to-red-400',
            summary: 'Don\'t block the request thread for slow tasks. Use @Async, ApplicationEvents, or Spring Batch.',
            concepts: [
                { term: '@Async', detail: 'Add @EnableAsync to config. @Async on service methods runs them in a thread pool. Method must return void or CompletableFuture. Exceptions go to AsyncUncaughtExceptionHandler.' },
                { term: 'ApplicationEvent', detail: 'Decouple modules with events. Publish: applicationEventPublisher.publishEvent(new OrderPlacedEvent(order)). Listen: @EventListener on a method in any bean.' },
                { term: '@TransactionalEventListener', detail: 'Listen AFTER the transaction commits. Perfect for sending emails/notifications after a sale is confirmed — avoids acting on a rolled-back transaction.' },
                { term: '@Scheduled', detail: '@EnableScheduling. @Scheduled(cron="0 0 1 * * ?") — runs at 1 AM daily. @Scheduled(fixedDelay=60000) — 60s after last run ends. Use ShedLock for cluster-safe scheduling.' },
                { term: 'ShedLock', detail: 'Prevents duplicate scheduled job execution across multiple pods. Uses a lock table in DB or Redis. @SchedulerLock(name="payrollJob", lockAtMostFor="10m").' }
            ],
            code: `// After bill is created, send receipt async
@Service public class BillService {
    public Bill create(BillRequest req) {
        Bill bill = repo.save(map(req));
        eventPublisher.publishEvent(new BillCreatedEvent(bill));
        return bill;
    }
}

@Component public class NotificationListener {
    @Async
    @TransactionalEventListener(phase=AFTER_COMMIT)
    public void onBillCreated(BillCreatedEvent e) {
        emailService.sendReceipt(e.getBill()); // runs after TX commits, in thread pool
    }
}`
        },
        ratelimit: {
            title: 'Rate Limiting & Throttling', icon: 'gauge', color: 'from-red-400 to-rose-500',
            summary: 'Protect APIs from abuse and overload. Token bucket is the standard algorithm.',
            concepts: [
                { term: 'Token bucket', detail: 'Each client gets N tokens. 1 token consumed per request. Tokens refill at rate R/sec. If tokens=0 → 429 Too Many Requests. Allows short bursts.' },
                { term: 'Bucket4j + Redis', detail: 'Bucket4j is the standard Java rate-limit library. Store state in Redis for distributed limiting across pods. Annotate with @RateLimited or use a filter.' },
                { term: 'Rate limit keys', detail: 'IP-based (unauthenticated). userId-based (authenticated — fairer, prevents shared-IP abuse). Plan-based: FREE=100/hour, PRO=10000/hour.' },
                { term: '429 response', detail: 'Include headers: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset (epoch when it resets), Retry-After (seconds).' },
                { term: 'Throttling patterns', detail: 'Login endpoint: max 5 attempts per 15min per IP (prevent brute force). Report export: max 3 per hour per user (heavy query). Webhook: max 1000/min per org.' }
            ],
            code: `@Component
public class RateLimitFilter extends OncePerRequestFilter {
    private final Map<String, Bucket> buckets = new ConcurrentHashMap<>();

    @Override
    protected void doFilterInternal(HttpServletRequest req, ...) {
        String key = getClientKey(req); // IP or userId
        Bucket bucket = buckets.computeIfAbsent(key, k ->
            Bucket.builder()
                .addLimit(Bandwidth.classic(100, Refill.greedy(100, Duration.ofMinutes(1))))
                .build()
        );
        if (bucket.tryConsume(1)) {
            filterChain.doFilter(req, res);
        } else {
            res.setStatus(429);
            res.setHeader("X-RateLimit-Remaining", "0");
            res.getWriter().write("{\\"error\\":\\"Too many requests\\"}");
        }
    }
}`
        },
        migrations: {
            title: 'DB Migrations — Flyway', icon: 'layers', color: 'from-stone-400 to-slate-500',
            summary: 'Never run raw DDL on production. Every schema change is a versioned, reversible migration file.',
            concepts: [
                { term: 'Flyway basics', detail: 'Add flyway-core dependency. Spring Boot auto-configures. Migration files in classpath:db/migration. Naming: V{version}__{description}.sql. E.g. V1__create_products.sql.' },
                { term: 'Version ordering', detail: 'V1, V2, V3... or V1.1, V1.2. Flyway tracks which versions ran in flyway_schema_history table. Never edit an already-applied migration — create a new one.' },
                { term: 'Repeatable migrations', detail: 'R__seed_data.sql — runs whenever checksum changes. Used for views, stored procedures, reference data.' },
                { term: 'Baseline', detail: 'If DB already exists: flyway.baseline-on-migrate=true. Sets V1 as baseline without running it. Subsequent versions run normally.' },
                { term: 'Zero-downtime migrations', detail: '1) Add new nullable column (no app change). 2) Deploy new code that writes to both old+new columns. 3) Backfill. 4) Make column NOT NULL. 5) Remove old column in next release.' }
            ],
            code: `-- V1__init_schema.sql
CREATE TABLE products (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    org_id BIGINT NOT NULL,
    sku VARCHAR(50) NOT NULL,
    name VARCHAR(200) NOT NULL,
    selling_price DECIMAL(12,2) NOT NULL,
    current_stock INT DEFAULT 0,
    reorder_qty INT DEFAULT 10,
    deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_sku_org (sku, org_id),
    INDEX idx_org_id (org_id),
    INDEX idx_deleted (deleted)
);

-- V2__add_hsn_gst.sql
ALTER TABLE products
    ADD COLUMN hsn_code VARCHAR(10),
    ADD COLUMN gst_rate DECIMAL(5,2) DEFAULT 18.00;`
        }
    };

    // ======================================================
    //  TOGGLE
    // ======================================================
    function toggle() {
        isOpen = !isOpen;
        const drawer  = document.getElementById('devGuideDrawer');
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

    // ======================================================
    //  RENDER
    // ======================================================
    function render() {
        const content = document.getElementById('devGuideContent');

        const catTab = (id, label, icon) => {
            const active = activeCategory === id;
            return `<button onclick="DevGuide.setCategory('${id}')"
                class="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all ${active
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md'
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}">
                <i data-lucide="${icon}" class="w-4 h-4"></i>${label}
            </button>`;
        };

        const sections = activeCategory === 'business' ? BUSINESS_DOCS : BACKEND_TOPICS;

        content.innerHTML = `
            <div class="space-y-5">
                <!-- URL Info -->
                <div class="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-2xl p-4 border border-amber-200 dark:border-amber-800">
                    <div class="flex items-center gap-2 mb-1">
                        <i data-lucide="server" class="w-4 h-4 text-amber-600 dark:text-amber-400"></i>
                        <span class="font-bold text-xs text-amber-800 dark:text-amber-200 uppercase tracking-wide">Endpoints</span>
                    </div>
                    <div class="grid grid-cols-2 gap-2 mt-2">
                        <div>
                            <p class="text-[10px] text-amber-600 dark:text-amber-400 font-bold uppercase mb-1">API Base</p>
                            <code class="text-xs bg-white dark:bg-slate-900 px-2 py-1 rounded-lg block border border-amber-200 font-mono text-amber-700 dark:text-amber-300">${window.API?.getBaseUrl?.() || 'http://localhost:8080'}/api</code>
                        </div>
                        <div>
                            <p class="text-[10px] text-amber-600 dark:text-amber-400 font-bold uppercase mb-1">Health Base</p>
                            <code class="text-xs bg-white dark:bg-slate-900 px-2 py-1 rounded-lg block border border-amber-200 font-mono text-amber-700 dark:text-amber-300">${window.API?.getHealthUrl?.() || 'http://localhost:8080'}/health</code>
                        </div>
                    </div>
                </div>

                <!-- Category Tabs -->
                <div class="flex gap-2">
                    ${catTab('business', 'Business APIs', 'briefcase')}
                    ${catTab('backend', 'Backend Topics', 'cpu')}
                </div>

                <!-- Sections -->
                <div class="space-y-3">
                    ${Object.entries(sections).map(([key, section]) => renderSection(key, section)).join('')}
                </div>

                <!-- CORS snippet always visible -->
                <div class="bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl p-4 border border-emerald-200 dark:border-emerald-800">
                    <h4 class="font-bold text-emerald-800 dark:text-emerald-200 mb-2 flex items-center gap-2 text-sm">
                        <i data-lucide="code-2" class="w-4 h-4"></i>CORS Config (Spring Boot)
                    </h4>
                    <pre class="text-[11px] bg-white dark:bg-slate-900 px-3 py-2 rounded-lg border border-emerald-200 font-mono text-emerald-700 dark:text-emerald-300 overflow-x-auto">@Configuration
public class CorsConfig implements WebMvcConfigurer {
    @Override
    public void addCorsMappings(CorsRegistry r) {
        r.addMapping("/api/**")
            .allowedOrigins("*")
            .allowedMethods("GET","POST","PUT","DELETE","PATCH")
            .allowedHeaders("*").allowCredentials(false);
        // Health endpoint — no auth needed
        r.addMapping("/health/**").allowedOrigins("*");
        r.addMapping("/actuator/**").allowedOrigins("*");
    }
}</pre>
                </div>
            </div>`;
        lucide.createIcons();
    }

    function renderSection(key, section) {
        const isActive = activeSection === key;
        const isBackend = activeCategory === 'backend';

        if (isBackend) {
            return `
            <div class="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden">
                <button onclick="DevGuide.toggleSection('${key}')"
                    class="w-full flex items-center gap-3 p-4 bg-gradient-to-r ${section.color} text-white text-left">
                    <i data-lucide="${section.icon}" class="w-5 h-5 flex-shrink-0"></i>
                    <div class="flex-1 min-w-0">
                        <span class="font-bold text-sm">${section.title}</span>
                        <p class="text-white/75 text-xs mt-0.5 line-clamp-1">${section.summary}</p>
                    </div>
                    <i data-lucide="chevron-down" class="w-4 h-4 flex-shrink-0 transition-transform" id="devguide-icon-${key}" style="${isActive ? 'transform:rotate(180deg)' : ''}"></i>
                </button>
                <div id="devguide-section-${key}" class="${isActive ? '' : 'hidden'}">
                    <div class="p-4 space-y-3 bg-white dark:bg-slate-800">
                        <p class="text-sm text-slate-700 dark:text-slate-100 leading-relaxed font-medium">${section.summary}</p>
                        ${section.concepts.map(c => `
                            <div class="border border-slate-100 dark:border-slate-700 rounded-xl p-3">
                                <p class="font-bold text-xs text-purple-600 dark:text-purple-400 mb-1">${c.term}</p>
                                <p class="text-xs text-slate-700 dark:text-slate-200 leading-relaxed">${c.detail}</p>
                            </div>`).join('')}
                        ${section.code ? `
                        <div>
                            <p class="text-xs font-bold text-slate-600 dark:text-slate-300 mb-1 uppercase tracking-wide">Code Example</p>
                            <pre class="bg-slate-900 text-slate-100 rounded-xl p-3 text-[11px] font-mono overflow-x-auto leading-relaxed">${escHtml(section.code)}</pre>
                        </div>` : ''}
                    </div>
                </div>
            </div>`;
        }

        // Business API section
        return `
        <div class="border border-slate-100 dark:border-slate-700 rounded-2xl overflow-hidden">
            <button onclick="DevGuide.toggleSection('${key}')"
                class="w-full flex items-center gap-3 p-4 bg-gradient-to-r ${section.color} text-white">
                <i data-lucide="${section.icon}" class="w-5 h-5"></i>
                <span class="font-bold">${section.title}</span>
                <span class="ml-auto text-white/70 text-xs">${section.endpoints.length} endpoints</span>
                <i data-lucide="chevron-down" class="w-4 h-4 transition-transform" id="devguide-icon-${key}" style="${isActive ? 'transform:rotate(180deg)' : ''}"></i>
            </button>
            <div id="devguide-section-${key}" class="${isActive ? '' : 'hidden'}">
                <div class="divide-y divide-slate-100 dark:divide-slate-700">
                    ${section.endpoints.map(ep => renderEndpoint(ep)).join('')}
                </div>
            </div>
        </div>`;
    }

    function renderEndpoint(ep) {
        const methodColors = {
            GET:    'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
            POST:   'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
            PUT:    'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
            PATCH:  'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
            DELETE: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
        };
        return `
        <div class="p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
            <div class="flex items-start gap-3 mb-2">
                <span class="px-2 py-1 rounded-lg text-xs font-bold flex-shrink-0 ${methodColors[ep.method] || 'bg-slate-100 text-slate-700'}">${ep.method}</span>
                <code class="text-sm font-mono text-purple-600 dark:text-purple-400 font-semibold break-all">${ep.path}</code>
            </div>
            <p class="text-xs text-slate-700 dark:text-slate-200 mb-2 ml-0 font-medium">${ep.description}</p>
            ${ep.query ? `<details class="mt-2"><summary class="text-xs font-bold text-slate-400 cursor-pointer">Query params</summary>
                <div class="mt-1 bg-slate-50 dark:bg-slate-900 rounded-lg p-2 text-xs font-mono">
                    ${Object.entries(ep.query).map(([k,v]) => `<div><span class="text-blue-500">${k}</span>: <span class="text-slate-700 dark:text-slate-200">${v}</span></div>`).join('')}
                </div></details>` : ''}
            ${ep.body ? `<details class="mt-2"><summary class="text-xs font-bold text-slate-400 cursor-pointer">Request body</summary>
                <pre class="mt-1 bg-slate-50 dark:bg-slate-900 rounded-lg p-2 text-xs font-mono overflow-x-auto text-slate-600 dark:text-slate-300">${JSON.stringify(ep.body, null, 2)}</pre>
                </details>` : ''}
            ${ep.response ? `<details class="mt-2"><summary class="text-xs font-bold text-slate-400 cursor-pointer">Response</summary>
                <pre class="mt-1 bg-slate-50 dark:bg-slate-900 rounded-lg p-2 text-xs font-mono overflow-x-auto text-slate-600 dark:text-slate-300">${JSON.stringify(ep.response, null, 2)}</pre>
                </details>` : ''}
        </div>`;
    }

    function escHtml(s) {
        return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    }

    function setCategory(cat) {
        activeCategory = cat;
        activeSection  = null;
        render();
    }

    function toggleSection(key) {
        activeSection = (activeSection === key) ? null : key;
        const section = document.getElementById(`devguide-section-${key}`);
        const icon    = document.getElementById(`devguide-icon-${key}`);
        // Re-render all sections cleanly
        render();
    }

    return { toggle, render, setCategory, toggleSection, _businessDocs: BUSINESS_DOCS };
})();
