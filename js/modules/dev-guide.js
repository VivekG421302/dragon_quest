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
    const BUSINESS_DOCS = {
        auth: {
            title: 'Auth & Session', icon: 'key', color: 'from-amber-400 to-orange-500',
            endpoints: [
                { method:'POST', path:'/api/v1/auth/signup', description:'Register a new organisation account',
                  body:{ organizationName:'string (req)', email:'string (req)', username:'string (req, 3–50)', password:'string (req, min 8)', confirmPassword:'string (must match)' },
                  response:{ id:'number', username:'string', email:'string', organizationName:'string', createdAt:'ISO datetime' } },
                { method:'POST', path:'/api/v1/auth/login', description:'Authenticate and receive JWT',
                  body:{ username:'string (req)', password:'string (req)' },
                  response:{ token:'JWT string', type:'Bearer', user:{ id:'number', username:'string', email:'string', roles:['ROLE_ADMIN'] } } },
                { method:'POST', path:'/api/v1/auth/refresh', description:'Refresh an expiring JWT token',
                  body:{ refreshToken:'string' }, response:{ token:'new JWT', expiresIn:'seconds' } },
                { method:'POST', path:'/api/v1/auth/logout', description:'Invalidate session / blacklist token' },
                { method:'GET',  path:'/api/v1/auth/me',     description:'Get current authenticated user profile' }
            ]
        },
        rbac: {
            title: 'RBAC & Permissions', icon: 'shield', color: 'from-rose-400 to-red-500',
            endpoints: [
                { method:'GET',  path:'/api/v1/roles',            description:'List all roles',
                  response:{ content:[{ id:'number', name:'ROLE_ADMIN | ROLE_MANAGER | ROLE_CASHIER', permissions:['string'] }] } },
                { method:'POST', path:'/api/v1/roles',            description:'Create a custom role',
                  body:{ name:'string', permissions:['PRODUCTS_READ','BILLS_WRITE'] } },
                { method:'PUT',  path:'/api/v1/roles/{id}',       description:'Update role permissions' },
                { method:'DELETE',path:'/api/v1/roles/{id}',      description:'Delete a role' },
                { method:'GET',  path:'/api/v1/users',            description:'List all users in org (ADMIN only)' },
                { method:'POST', path:'/api/v1/users/{id}/roles', description:'Assign roles to user',
                  body:{ roleIds:[1,2] } },
                { method:'DELETE',path:'/api/v1/users/{id}/roles/{roleId}', description:'Remove a role from user' },
                { method:'GET',  path:'/api/v1/permissions',      description:'List all available permissions' }
            ]
        },
        crm: {
            title: 'CRM — Customers', icon: 'users', color: 'from-sky-400 to-blue-500',
            endpoints: [
                { method:'GET',  path:'/api/v1/customers',        description:'List customers with pagination & search',
                  query:{ page:'0', size:'20', sort:'createdAt,desc', search:'string', segment:'REGULAR|VIP|WHOLESALE' },
                  response:{ content:[{ id:'number', name:'string', email:'string', phone:'string', gstIn:'string', address:'string', segment:'string', totalPurchases:'decimal', lastPurchaseDate:'ISO date', creditLimit:'decimal' }] } },
                { method:'POST', path:'/api/v1/customers',        description:'Create new customer',
                  body:{ name:'string (req)', email:'string', phone:'string', gstIn:'string', address:'string', segment:'REGULAR', creditLimit:0 } },
                { method:'GET',  path:'/api/v1/customers/{id}',   description:'Get customer by ID with purchase history' },
                { method:'PUT',  path:'/api/v1/customers/{id}',   description:'Update customer details' },
                { method:'DELETE',path:'/api/v1/customers/{id}',  description:'Soft-delete customer' },
                { method:'GET',  path:'/api/v1/customers/{id}/bills',     description:'All bills for a customer' },
                { method:'GET',  path:'/api/v1/customers/{id}/ledger',    description:'Customer debit/credit ledger' },
                { method:'POST', path:'/api/v1/customers/{id}/credit',    description:'Add credit to customer account',
                  body:{ amount:'decimal', note:'string' } },
                { method:'GET',  path:'/api/v1/customers/stats',  description:'CRM analytics: LTV, churn, top buyers' }
            ]
        },
        sales: {
            title: 'Sales & Billing', icon: 'receipt', color: 'from-emerald-400 to-teal-500',
            endpoints: [
                { method:'POST', path:'/api/v1/bills',            description:'Create a new sale bill (immutable after creation)',
                  body:{ customerId:'number (optional)', customerName:'string', customerPhone:'string', items:[{ productId:'number', quantity:'number', unitPrice:'decimal', discount:'decimal (0)' }], taxRate:'decimal', paymentMode:'CASH|CARD|UPI|CREDIT', notes:'string' },
                  response:{ id:'number', invoiceNumber:'INV-00001 (auto)', grandTotal:'decimal', status:'PAID|PENDING', qrCode:'string (UPI)' } },
                { method:'GET',  path:'/api/v1/bills',            description:'List bills with filters',
                  query:{ page:'0', size:'20', sort:'createdAt,desc', search:'string', fromDate:'ISO date', toDate:'ISO date', status:'PAID|PENDING', paymentMode:'CASH|CARD|UPI' } },
                { method:'GET',  path:'/api/v1/bills/{id}',       description:'Get single bill with full line items' },
                { method:'PATCH',path:'/api/v1/bills/{id}/status',description:'Update bill payment status',
                  body:{ status:'PAID|CANCELLED', paymentMode:'UPI' } },
                { method:'GET',  path:'/api/v1/bills/stats',      description:'Sales analytics',
                  response:{ todaySales:'decimal', weekSales:'decimal', monthSales:'decimal', totalBills:'number', avgOrderValue:'decimal', topProduct:'string' } },
                { method:'POST', path:'/api/v1/quotes',           description:'Create a sales quotation (not a bill)',
                  body:{ customerId:'number', items:'[...]', validTill:'ISO date' } },
                { method:'POST', path:'/api/v1/quotes/{id}/convert', description:'Convert quote to bill' },
                { method:'GET',  path:'/api/v1/sales/report',    description:'Monthly/yearly sales report with trends' }
            ]
        },
        pos: {
            title: 'POS Terminal', icon: 'scan-line', color: 'from-violet-400 to-purple-500',
            endpoints: [
                { method:'GET',  path:'/api/v1/pos/session',       description:'Get current open POS session',
                  response:{ sessionId:'number', openedAt:'ISO datetime', openingCash:'decimal', salesCount:'number', cashIn:'decimal' } },
                { method:'POST', path:'/api/v1/pos/session/open',  description:'Open a new POS shift session',
                  body:{ openingCash:'decimal', notes:'string' } },
                { method:'POST', path:'/api/v1/pos/session/close', description:'Close POS session & reconcile cash',
                  body:{ closingCash:'decimal', notes:'string' } },
                { method:'GET',  path:'/api/v1/pos/products/search',description:'Fast product search by barcode or name',
                  query:{ q:'barcode or name', limit:'20' } },
                { method:'POST', path:'/api/v1/pos/bill',          description:'Quick checkout (same as /bills but session-aware)',
                  body:{ sessionId:'number', items:'[...]', paymentMode:'CASH|CARD|UPI', cashTendered:'decimal' },
                  response:{ bill:'...', changeDue:'decimal', receiptUrl:'string' } },
                { method:'GET',  path:'/api/v1/pos/cash-drawer',   description:'Current cash-in-drawer amount' }
            ]
        },
        purchase: {
            title: 'Purchase & Procurement', icon: 'shopping-cart', color: 'from-orange-400 to-amber-500',
            endpoints: [
                { method:'GET',  path:'/api/v1/purchase-orders',   description:'List purchase orders',
                  query:{ page:'0', size:'20', status:'DRAFT|SENT|RECEIVED|CANCELLED', supplierId:'number' } },
                { method:'POST', path:'/api/v1/purchase-orders',   description:'Create purchase order (PO)',
                  body:{ supplierId:'number (req)', expectedDate:'ISO date', items:[{ productId:'number', quantity:'number', unitCost:'decimal' }], notes:'string' } },
                { method:'GET',  path:'/api/v1/purchase-orders/{id}', description:'Get PO details' },
                { method:'PUT',  path:'/api/v1/purchase-orders/{id}', description:'Update PO (only if DRAFT)' },
                { method:'PATCH',path:'/api/v1/purchase-orders/{id}/send',    description:'Mark PO as sent to supplier' },
                { method:'POST', path:'/api/v1/purchase-orders/{id}/receive', description:'Receive goods against PO (updates stock)',
                  body:{ items:[{ productId:'number', receivedQty:'number', condition:'GOOD|DAMAGED' }], invoiceNumber:'string' } },
                { method:'DELETE',path:'/api/v1/purchase-orders/{id}',        description:'Cancel PO (only if DRAFT or SENT)' },
                { method:'GET',  path:'/api/v1/purchase-orders/stats',        description:'Procurement analytics: spend, pending deliveries' }
            ]
        },
        wms: {
            title: 'WMS — Warehouse', icon: 'warehouse', color: 'from-cyan-400 to-sky-500',
            endpoints: [
                { method:'GET',  path:'/api/v1/products',          description:'Product master list',
                  query:{ page:'0', size:'20', sort:'name,asc', search:'string', brandId:'number', lowStock:'boolean', outOfStock:'boolean' } },
                { method:'POST', path:'/api/v1/products',          description:'Create product',
                  body:{ sku:'string (req, unique)', name:'string (req)', eanCode:'string', itemCode:'string', brandId:'number', color:'string', size:'string', purchasePrice:'decimal (req)', sellingPrice:'decimal (req)', reorderQty:10, expiryDate:'ISO date', hsnCode:'string', gstRate:'decimal' } },
                { method:'PUT',  path:'/api/v1/products/{id}',     description:'Update product' },
                { method:'DELETE',path:'/api/v1/products/{id}',    description:'Soft-delete product' },
                { method:'GET',  path:'/api/v1/inventory',         description:'Current stock levels per product',
                  query:{ lowStock:'boolean', outOfStock:'boolean', page:'0', size:'20' } },
                { method:'POST', path:'/api/v1/inventory/adjust',  description:'Manual stock adjustment',
                  body:{ productId:'number', adjustment:'integer (+add / -subtract)', reason:'string (req)' } },
                { method:'GET',  path:'/api/v1/stock-movements',   description:'Full stock movement audit log',
                  query:{ page:'0', size:'50', productId:'number', type:'INWARD|OUTWARD', fromDate:'ISO', toDate:'ISO' } },
                { method:'POST', path:'/api/v1/stock-movements',   description:'Record stock movement manually',
                  body:{ productId:'number', type:'INWARD|OUTWARD', quantity:'number', reason:'string', referenceId:'string' } },
                { method:'GET',  path:'/api/v1/inventory/stats',   description:'Total stock value, low-stock count' },
                { method:'GET',  path:'/api/v1/brands',            description:'List brands', query:{ page:'0', size:'20', search:'string' } },
                { method:'POST', path:'/api/v1/brands',            description:'Create brand', body:{ name:'string (req)', logoUrl:'string', description:'string' } },
                { method:'PUT',  path:'/api/v1/brands/{id}',       description:'Update brand' },
                { method:'DELETE',path:'/api/v1/brands/{id}',      description:'Delete brand' }
            ]
        },
        hrms: {
            title: 'HRMS — Employees', icon: 'user-check', color: 'from-pink-400 to-rose-500',
            endpoints: [
                { method:'GET',  path:'/api/v1/employees',         description:'List all employees',
                  query:{ page:'0', size:'20', department:'string', status:'ACTIVE|INACTIVE', role:'string' } },
                { method:'POST', path:'/api/v1/employees',         description:'Onboard new employee',
                  body:{ name:'string', email:'string', phone:'string', department:'string', designation:'string', salary:'decimal', joinDate:'ISO date', panNumber:'string', bankAccount:'string', bankIfsc:'string' } },
                { method:'GET',  path:'/api/v1/employees/{id}',    description:'Get employee profile with attendance' },
                { method:'PUT',  path:'/api/v1/employees/{id}',    description:'Update employee details' },
                { method:'DELETE',path:'/api/v1/employees/{id}',   description:'Offboard / deactivate employee' },
                { method:'GET',  path:'/api/v1/attendance',        description:'Attendance log',
                  query:{ employeeId:'number', month:'2025-01', page:'0' } },
                { method:'POST', path:'/api/v1/attendance/punch',  description:'Punch in/out',
                  body:{ employeeId:'number', type:'IN|OUT', timestamp:'ISO datetime', location:'string' } },
                { method:'GET',  path:'/api/v1/payroll',           description:'Payroll runs list',
                  query:{ month:'2025-01', status:'PENDING|PROCESSED|PAID' } },
                { method:'POST', path:'/api/v1/payroll/run',       description:'Generate payroll for a month',
                  body:{ month:'2025-01', includeBonus:'boolean' } },
                { method:'POST', path:'/api/v1/payroll/{id}/disburse', description:'Mark payroll as disbursed' },
                { method:'GET',  path:'/api/v1/leaves',            description:'Leave requests',
                  query:{ employeeId:'number', status:'PENDING|APPROVED|REJECTED', fromDate:'ISO' } },
                { method:'POST', path:'/api/v1/leaves',            description:'Apply for leave',
                  body:{ employeeId:'number', type:'SICK|CASUAL|EARNED', fromDate:'ISO', toDate:'ISO', reason:'string' } },
                { method:'PATCH',path:'/api/v1/leaves/{id}/approve', description:'Approve/reject leave request',
                  body:{ status:'APPROVED|REJECTED', remarks:'string' } }
            ]
        },
        accounting: {
            title: 'Accounting & Ledger', icon: 'book-open', color: 'from-indigo-400 to-violet-500',
            endpoints: [
                { method:'GET',  path:'/api/v1/accounts',          description:'Chart of accounts (COA)',
                  query:{ type:'ASSET|LIABILITY|EQUITY|INCOME|EXPENSE', page:'0' } },
                { method:'POST', path:'/api/v1/accounts',          description:'Create GL account',
                  body:{ name:'string', code:'string', type:'ASSET', parentId:'number (optional)' } },
                { method:'GET',  path:'/api/v1/journal-entries',   description:'Journal entries (double-entry)',
                  query:{ fromDate:'ISO', toDate:'ISO', accountId:'number', page:'0' } },
                { method:'POST', path:'/api/v1/journal-entries',   description:'Post journal entry',
                  body:{ date:'ISO', description:'string', lines:[{ accountId:'number', debit:'decimal', credit:'decimal' }], reference:'string' } },
                { method:'GET',  path:'/api/v1/reports/trial-balance',   description:'Trial balance report', query:{ asOf:'ISO date' } },
                { method:'GET',  path:'/api/v1/reports/profit-loss',     description:'P&L statement',        query:{ fromDate:'ISO', toDate:'ISO' } },
                { method:'GET',  path:'/api/v1/reports/balance-sheet',   description:'Balance sheet',        query:{ asOf:'ISO date' } },
                { method:'GET',  path:'/api/v1/reports/cash-flow',       description:'Cash flow statement',  query:{ fromDate:'ISO', toDate:'ISO' } },
                { method:'GET',  path:'/api/v1/gst/returns',      description:'GST return filing status',    query:{ period:'2025-01' } },
                { method:'POST', path:'/api/v1/gst/returns/generate', description:'Generate GSTR-1 / GSTR-3B',
                  body:{ period:'2025-01', type:'GSTR1|GSTR3B' } }
            ]
        },
        banking: {
            title: 'Banking & Payments', icon: 'landmark', color: 'from-teal-400 to-emerald-500',
            endpoints: [
                { method:'GET',  path:'/api/v1/bank-accounts',     description:'List company bank accounts' },
                { method:'POST', path:'/api/v1/bank-accounts',     description:'Link a bank account',
                  body:{ bankName:'string', accountNumber:'string', ifsc:'string', accountType:'CURRENT|SAVINGS', openingBalance:'decimal' } },
                { method:'GET',  path:'/api/v1/bank-accounts/{id}/transactions', description:'Bank transactions list',
                  query:{ fromDate:'ISO', toDate:'ISO', type:'CREDIT|DEBIT', page:'0' } },
                { method:'POST', path:'/api/v1/bank-accounts/{id}/transactions', description:'Record a bank transaction manually',
                  body:{ type:'CREDIT|DEBIT', amount:'decimal', date:'ISO', description:'string', reference:'string' } },
                { method:'POST', path:'/api/v1/bank-accounts/{id}/reconcile', description:'Bank reconciliation — match statement with ledger',
                  body:{ statementDate:'ISO', statementBalance:'decimal', matchedTxnIds:[1,2,3] } },
                { method:'GET',  path:'/api/v1/payments',          description:'All payment records (inward/outward)',
                  query:{ mode:'CASH|CARD|UPI|NEFT|RTGS', status:'PENDING|CLEARED|FAILED', page:'0' } },
                { method:'POST', path:'/api/v1/payments',          description:'Record a payment',
                  body:{ type:'INWARD|OUTWARD', amount:'decimal', mode:'UPI', reference:'UTR/cheque', entityType:'CUSTOMER|SUPPLIER', entityId:'number', date:'ISO' } }
            ]
        },
        returns: {
            title: 'Returns & Refunds', icon: 'rotate-ccw', color: 'from-red-400 to-pink-500',
            endpoints: [
                { method:'GET',  path:'/api/v1/returns',           description:'List all returns',
                  query:{ page:'0', size:'20', fromDate:'ISO', toDate:'ISO', reason:'string' } },
                { method:'POST', path:'/api/v1/returns',           description:'Process a customer return',
                  body:{ billId:'number (req)', productId:'number', quantity:'number', reason:'string', refundMode:'CASH|STORE_CREDIT|ORIGINAL_PAYMENT', refundAmount:'decimal' } },
                { method:'GET',  path:'/api/v1/returns/{id}',      description:'Get return details' },
                { method:'PATCH',path:'/api/v1/returns/{id}/approve', description:'Approve return and trigger stock update + refund' }
            ]
        },
        suppliers: {
            title: 'Suppliers', icon: 'truck', color: 'from-slate-400 to-zinc-500',
            endpoints: [
                { method:'GET',  path:'/api/v1/suppliers',         description:'List suppliers',
                  query:{ page:'0', size:'20', search:'string', status:'ACTIVE|INACTIVE' } },
                { method:'POST', path:'/api/v1/suppliers',         description:'Create supplier',
                  body:{ name:'string (req)', companyName:'string', email:'string', phone:'string', gstIn:'string', address:'string', paymentTerms:'string', contactPersons:[{ name:'string', phone:'string', email:'string', designation:'string' }] } },
                { method:'PUT',  path:'/api/v1/suppliers/{id}',    description:'Update supplier' },
                { method:'DELETE',path:'/api/v1/suppliers/{id}',   description:'Deactivate supplier' },
                { method:'GET',  path:'/api/v1/suppliers/{id}/ledger', description:'Supplier payment ledger' }
            ]
        },
        ecommerce: {
            title: 'E-Commerce', icon: 'shopping-bag', color: 'from-fuchsia-400 to-purple-500',
            endpoints: [
                { method:'GET',  path:'/api/v1/ecommerce/orders',  description:'Online orders list',
                  query:{ page:'0', status:'NEW|PROCESSING|SHIPPED|DELIVERED|CANCELLED', platform:'SHOPIFY|WOOCOMMERCE|OWN' } },
                { method:'POST', path:'/api/v1/ecommerce/orders',  description:'Create order from online platform',
                  body:{ platformOrderId:'string', platform:'string', customerId:'number', items:'[...]', shippingAddress:'{}', paymentStatus:'PAID' } },
                { method:'PATCH',path:'/api/v1/ecommerce/orders/{id}/ship',   description:'Mark order as shipped',
                  body:{ courierName:'string', trackingNumber:'string' } },
                { method:'PATCH',path:'/api/v1/ecommerce/orders/{id}/deliver', description:'Mark order as delivered' },
                { method:'POST', path:'/api/v1/ecommerce/webhook', description:'Receive platform webhooks (Shopify / WooCommerce)' }
            ]
        },
        trading: {
            title: 'Trading & Distribution', icon: 'arrow-left-right', color: 'from-lime-400 to-green-500',
            endpoints: [
                { method:'GET',  path:'/api/v1/price-lists',       description:'Price lists per customer segment / market' },
                { method:'POST', path:'/api/v1/price-lists',       description:'Create a price list',
                  body:{ name:'string', segment:'RETAIL|WHOLESALE|VIP', effectiveFrom:'ISO date', items:[{ productId:'number', price:'decimal', minQty:'number' }] } },
                { method:'POST', path:'/api/v1/price-lists/{id}/activate', description:'Activate a price list' },
                { method:'GET',  path:'/api/v1/promotions',        description:'Active discounts and promotions' },
                { method:'POST', path:'/api/v1/promotions',        description:'Create promotion',
                  body:{ name:'string', type:'FLAT|PERCENT|BOGO', value:'decimal', minOrderValue:'decimal', productIds:'[number]', fromDate:'ISO', toDate:'ISO', maxUses:'number' } },
                { method:'GET',  path:'/api/v1/trading/margins',   description:'Margin report — purchase vs selling price per product' }
            ]
        },
        company: {
            title: 'Company Setup', icon: 'building-2', color: 'from-blue-400 to-indigo-500',
            endpoints: [
                { method:'GET',  path:'/api/v1/company',           description:'Get company profile',
                  response:{ id:'number', name:'string', logoUrl:'string', taxRegistration:'GSTIN', phone:'string', email:'string', address:'string', gstType:'REGULAR|COMPOSITION', financialYear:'2024-25' } },
                { method:'POST', path:'/api/v1/company',           description:'Create/update company profile',
                  body:{ name:'string (req)', logoUrl:'string', taxRegistration:'string', phone:'string', email:'string', address:'string', gstType:'REGULAR', financialYear:'2025-26' } },
                { method:'GET',  path:'/api/v1/settings',          description:'Application settings (invoice prefix, tax defaults, etc.)' },
                { method:'PUT',  path:'/api/v1/settings',          description:'Update settings',
                  body:{ invoicePrefix:'INV', invoiceStartNumber:1, defaultTaxRate:18, currency:'INR', timezone:'Asia/Kolkata', dateFormat:'DD/MM/YYYY' } }
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
                        <p class="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">${section.summary}</p>
                        ${section.concepts.map(c => `
                            <div class="border border-slate-100 dark:border-slate-700 rounded-xl p-3">
                                <p class="font-bold text-xs text-purple-600 dark:text-purple-400 mb-1">${c.term}</p>
                                <p class="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">${c.detail}</p>
                            </div>`).join('')}
                        ${section.code ? `
                        <div>
                            <p class="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wide">Code Example</p>
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
            <p class="text-xs text-slate-500 dark:text-slate-400 mb-2 ml-0">${ep.description}</p>
            ${ep.query ? `<details class="mt-2"><summary class="text-xs font-bold text-slate-400 cursor-pointer">Query params</summary>
                <div class="mt-1 bg-slate-50 dark:bg-slate-900 rounded-lg p-2 text-xs font-mono">
                    ${Object.entries(ep.query).map(([k,v]) => `<div><span class="text-blue-500">${k}</span>: <span class="text-slate-500">${v}</span></div>`).join('')}
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
