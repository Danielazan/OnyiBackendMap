import { useState, useRef, useEffect, useCallback } from "react";

const MODULES = {
  AUTH: {
    label: "Authentication", color: "#2563EB", bg: "#EFF6FF",
    x: 40, y: 40,
    fns: [
      { name: "register",             cat: "Controller", desc: "Validates fields, checks email uniqueness, hashes password with bcrypt (cost 12), inserts user, generates email-verification token stored in Redis (24h TTL), dispatches welcome + verification email. Returns 201 with user object." },
      { name: "verifyEmail",          cat: "Controller", desc: "Verifies email using token from link. Hashes token, compares against Redis, sets is_verified=true on match, deletes Redis key." },
      { name: "login",                cat: "Controller", desc: "Authenticates via email+password. Checks is_verified, runs bcrypt.compare, invalidates all prior sessions (single-device), generates access token (15min) + refresh token (7d), stores hashed refresh token in DB + Redis." },
      { name: "logout",               cat: "Controller", desc: "Invalidates current session. Deletes user_sessions row + Redis session key. Adds access token jti to Redis blacklist for remaining lifetime." },
      { name: "refreshToken",         cat: "Controller", desc: "Issues new access token from valid refresh token. Verifies signature, looks up session, compares hash. Rotates refresh token if <1 day remaining." },
      { name: "forgotPassword",       cat: "Controller", desc: "Initiates password reset. Silently succeeds even if email not found (prevents enumeration). Stores HMAC-SHA256 hash of 32-byte token in Redis (1h TTL), sends reset email." },
      { name: "resetPassword",        cat: "Controller", desc: "Completes password reset. Validates token hash, updates password_hash with new bcrypt hash, invalidates all sessions, sends confirmation email." },
      { name: "getMe",                cat: "Controller", desc: "Returns full profile of authenticated user from JWT. Excludes password_hash. Includes address count." },
      { name: "updateProfile",        cat: "Controller", desc: "Updates first_name, last_name, phone for authenticated user. Email/password changes require separate verified flows." },
      { name: "hashPassword",         cat: "Utility",    desc: "Wraps bcrypt.hash with cost factor 12 (~300ms on modern server). Returns 60-char bcrypt hash string." },
      { name: "comparePassword",      cat: "Utility",    desc: "Timing-safe bcrypt.compare of raw password against stored hash. Returns boolean." },
      { name: "generateAccessToken",  cat: "Utility",    desc: "Signs JWT access token (HS256, 15min) with payload { sub, role, sessionId, jti }. jti is unique UUID per token for blacklisting on logout." },
      { name: "generateRefreshToken", cat: "Utility",    desc: "Signs JWT refresh token (HS256, 7d) with minimal payload { sub, sessionId }. Uses separate REFRESH_TOKEN_SECRET." },
      { name: "verifyAccessToken",    cat: "Utility",    desc: "Verifies JWT signature, expiry, and Redis blacklist. Returns decoded payload { sub, role, sessionId, jti }." },
      { name: "verifyRefreshToken",   cat: "Utility",    desc: "Verifies refresh token signature and expiry using REFRESH_TOKEN_SECRET. No blacklist — validity checked against user_sessions." },
      { name: "invalidateAllSessions",cat: "Utility",    desc: "Deletes all user_sessions rows and all Redis session:userId:* keys for a user. Called on new login, password reset, admin-forced logout." },
    ],
  },
  USER: {
    label: "User Addresses", color: "#0D9488", bg: "#F0FDFA",
    x: 40, y: 440,
    fns: [
      { name: "getAddresses",     cat: "Controller", desc: "Returns all saved addresses for authenticated user, ordered by is_default DESC, created_at ASC." },
      { name: "addAddress",       cat: "Controller", desc: "Adds a delivery address. If is_default=true, clears existing default first (in transaction), then inserts new address." },
      { name: "updateAddress",    cat: "Controller", desc: "Updates an address field. Verifies ownership. If is_default=true, clears others. Partial updates allowed." },
      { name: "deleteAddress",    cat: "Controller", desc: "Deletes address. Checks for referenced orders — soft-deletes if order references exist to preserve history." },
      { name: "setDefaultAddress",cat: "Controller", desc: "Sets one address as default in a transaction: UPDATE all others to false, UPDATE target to true. Atomically ensures single default." },
    ],
  },
  SECURITY: {
    label: "Security", color: "#7F1D1D", bg: "#FEF2F2",
    x: 40, y: 660,
    fns: [
      { name: "generateSecureToken", cat: "Utility", desc: "crypto.randomBytes(32) → 64-char hex string. Used for verification and reset tokens." },
      { name: "hashToken",           cat: "Utility", desc: "HMAC-SHA256 of a token using TOKEN_HASH_SECRET. Only the hash is stored server-side, never the raw token." },
      { name: "encryptData",         cat: "Utility", desc: "AES-256-GCM encryption with random IV per call. Returns iv:authTag:ciphertext hex string." },
      { name: "decryptData",         cat: "Utility", desc: "Decrypts AES-256-GCM ciphertext. Auth tag verification prevents tampered ciphertext." },
    ],
  },
  LOGGING: {
    label: "Logging", color: "#064E3B", bg: "#F0FDF4",
    x: 40, y: 840,
    fns: [
      { name: "createLogger", cat: "Utility", desc: "Creates Winston logger with Console (dev) and File transports (/logs/app.log + /logs/error.log). Level from LOG_LEVEL env." },
      { name: "logInfo",      cat: "Utility", desc: "Logs INFO message with optional structured meta. Includes UTC timestamp and module name." },
      { name: "logError",     cat: "Utility", desc: "Logs ERROR with full stack trace. Sends to Sentry if SENTRY_DSN configured." },
    ],
  },
  MIDDLEWARE: {
    label: "Middleware", color: "#1E3A5F", bg: "#EFF6FF",
    x: 350, y: 40,
    fns: [
      { name: "authenticate",    cat: "Middleware", desc: "Extracts Bearer token from Authorization header, calls verifyAccessToken, attaches { userId, role, sessionId, jti } to req.user." },
      { name: "authorize",       cat: "Middleware", desc: "Role-based access factory. Returns middleware that checks req.user.role against allowed roles. Returns 403 if unauthorized." },
      { name: "rateLimiter",     cat: "Middleware", desc: "Redis-backed rate limiter. Increments counter by IP/userId with TTL window. Returns 429 on excess. Sets X-RateLimit-Remaining header." },
      { name: "validateRequest", cat: "Middleware", desc: "Joi/Zod schema validation of req.body|query|params. Returns 400 with field-level errors on failure. Strips unknown fields." },
      { name: "errorHandler",    cat: "Middleware", desc: "4-arg global Express error handler. Maps error codes to HTTP statuses. Hides stack traces in production. Logs via logError." },
      { name: "requestLogger",   cat: "Middleware", desc: "Logs method, URL, IP, User-Agent, response time. INFO for 2xx/3xx, WARN for 4xx, ERROR for 5xx. Redacts auth headers." },
      { name: "requestId",       cat: "Middleware", desc: "Assigns UUID v4 to every request as req.id and X-Request-ID header for distributed tracing." },
      { name: "securityHeaders", cat: "Middleware", desc: "Applies Helmet.js headers: nosniff, DENY, XSS-Protection, HSTS (1yr), CSP, no-referrer." },
      { name: "sanitizeInput",   cat: "Middleware", desc: "Recursively HTML-encodes req.body/query/params strings via xss library. Trims whitespace, removes null bytes." },
    ],
  },
  CATEGORY: {
    label: "Categories", color: "#059669", bg: "#ECFDF5",
    x: 350, y: 330,
    fns: [
      { name: "getCategories",            cat: "Controller", desc: "Returns all active categories as nested tree. Cached in Redis (categories:tree, 1h TTL). Built via buildCategoryTree." },
      { name: "getCategoryBySlug",        cat: "Controller", desc: "Returns single category by slug with direct children and product count." },
      { name: "createCategory",           cat: "Admin",      desc: "Creates category. Generates unique slug. Validates parent_id exists. Invalidates category tree cache." },
      { name: "updateCategory",           cat: "Admin",      desc: "Updates category. Prevents circular hierarchy via validateCategoryHierarchy. Regenerates slug if name changes." },
      { name: "deleteCategory",           cat: "Admin",      desc: "Soft-deletes (is_active=false). Recursively deactivates children if cascade=true. Invalidates cache." },
      { name: "buildCategoryTree",        cat: "Utility",    desc: "O(n) flat-to-nested tree conversion using a Map. Indexes by ID, appends children to parent. Root = parent_id null." },
      { name: "validateCategoryHierarchy",cat: "Utility",    desc: "Walks ancestor chain of newParentId — returns false if categoryId found (circular). Returns true if safe." },
    ],
  },
  PRODUCT: {
    label: "Products & Variants", color: "#D97706", bg: "#FFFBEB",
    x: 660, y: 40,
    fns: [
      { name: "getProducts",           cat: "Controller", desc: "Paginated list of active products. Cursor-based pagination. Filters: category, price range, in_stock. Cached 5min per filter combination." },
      { name: "getProductBySlug",      cat: "Controller", desc: "Full product with all variants and images via single JOIN query. Cached 10min under product:<slug>." },
      { name: "createProduct",         cat: "Admin",      desc: "Creates product. Validates category, generates slug, inserts row, calls updateSearchVector. Returns 201." },
      { name: "updateProduct",         cat: "Admin",      desc: "Updates product. Regenerates slug on name change. Refreshes tsvector if name/description changes. Invalidates cache." },
      { name: "deleteProduct",         cat: "Admin",      desc: "Soft-deletes product (is_active=false) and all variants. Preserves order history. Invalidates cache." },
      { name: "updateSearchVector",    cat: "Utility",    desc: "Sets search_vector = to_tsvector('english', name:A || description:B). Uses PostgreSQL GIN index for fast full-text search." },
      { name: "getProductWithVariants",cat: "Utility",    desc: "Fetches product + variants + images in one JOIN. Returns nested object used by product detail, order confirmation, invoices." },
      { name: "createVariant",         cat: "Admin",      desc: "Creates variant with unique SKU. Stores attributes as JSONB {size, color, ...}. Invalidates product cache." },
      { name: "updateVariant",         cat: "Admin",      desc: "Updates variant fields (not SKU). Accepts partial updates. Invalidates product cache." },
      { name: "deleteVariant",         cat: "Admin",      desc: "Soft-deletes variant. Checks for pending orders or active cart items — blocks if referenced (409 VARIANT_IN_USE)." },
      { name: "checkVariantStock",     cat: "Utility",    desc: "Returns true if available stock >= requested quantity. Available = stock_quantity minus unexpired reservations." },
      { name: "decrementVariantStock", cat: "Utility",    desc: "UPDATE ... WHERE stock_quantity >= qty. 0 rows updated = 409 INSUFFICIENT_STOCK. Must run in transaction." },
      { name: "incrementVariantStock", cat: "Utility",    desc: "Restores stock on cancellation or refund. Adds quantity back to stock_quantity. Runs in transaction." },
    ],
  },
  IMAGE: {
    label: "Image Processing", color: "#DB2777", bg: "#FDF2F8",
    x: 660, y: 400,
    fns: [
      { name: "uploadVariantImages", cat: "Admin",   desc: "Accepts up to 8 images (multipart). Validates each via validateImageFile, processes via processImage (3 sizes), inserts into variant_images." },
      { name: "deleteVariantImage",  cat: "Admin",   desc: "Deletes image record + 3 physical files from filesystem. Reorders remaining images' sort_order contiguously." },
      { name: "reorderVariantImages",cat: "Admin",   desc: "Accepts ordered array of image IDs, assigns sort_order 0,1,2... in one transaction. sort_order=0 is primary image." },
      { name: "processImage",        cat: "Utility", desc: "Uses Sharp.js to produce thumbnail(150x150), medium(400x400), large(800x800) in WebP. Falls back to JPEG. Returns path object." },
      { name: "validateImageFile",   cat: "Utility", desc: "Checks MIME type (JPEG/PNG/WebP), size (max 5MB), and magic bytes (prevents MIME spoofing). Throws on any failure." },
      { name: "deleteImageFiles",    cat: "Utility", desc: "Deletes 3 size files from filesystem with try/catch per file. Missing file logs warning but doesn't block DB cleanup." },
    ],
  },
  SEARCH: {
    label: "Search & Filtering", color: "#7C3AED", bg: "#F5F3FF",
    x: 970, y: 40,
    fns: [
      { name: "searchProducts",       cat: "Controller", desc: "Full-text search via tsvector/tsquery. plainto_tsquery for natural language. ts_rank_cd for relevance scoring. Supports concurrent filters + cursor pagination." },
      { name: "getSearchSuggestions", cat: "Controller", desc: "Up to 8 autocomplete suggestions using pg_trgm ILIKE on product names. Cached 5min per query. Min 2 chars." },
      { name: "getFilterOptions",     cat: "Controller", desc: "Returns price range (min/max) and attribute facets (sizes, colors) for a category. Cached 15min per category." },
      { name: "buildFilterConditions",cat: "Utility",    desc: "Builds parameterised SQL WHERE clause from filters object. Only appends conditions for present filters. Returns { whereClause, params }." },
      { name: "encodeCursor",         cat: "Utility",    desc: "Base64 JSON encodes { createdAt, id } for cursor-based pagination. Enables consistent page results under concurrent changes." },
      { name: "decodeCursor",         cat: "Utility",    desc: "Decodes base64 cursor, validates both fields present and typed. Throws 400 INVALID_CURSOR on malformed input." },
    ],
  },
  CART: {
    label: "Cart System", color: "#0891B2", bg: "#ECFEFF",
    x: 970, y: 270,
    fns: [
      { name: "getCart",            cat: "Controller", desc: "Returns user's cart with item details, variant info, totals. Checks Redis first (cart:userId). Validates each item's stock and flags out-of-stock items." },
      { name: "addItemToCart",      cat: "Controller", desc: "Adds variant to cart or increments quantity. Calls getOrCreateCart, validates variant + stock, upserts cart_items. Invalidates cart cache." },
      { name: "updateCartItem",     cat: "Controller", desc: "Updates item quantity. Validates new quantity against stock. Delegates to removeCartItem if quantity=0." },
      { name: "removeCartItem",     cat: "Controller", desc: "Removes item from cart. Verifies ownership (cart belongs to user). Invalidates cart cache." },
      { name: "clearCart",          cat: "Controller", desc: "Deletes all cart_items for user's cart. Retains the cart record itself for future use. Invalidates cart cache." },
      { name: "getOrCreateCart",    cat: "Utility",    desc: "INSERT ... ON CONFLICT DO NOTHING ensures exactly one cart per user. Safe under concurrent requests." },
      { name: "calculateCartTotal", cat: "Utility",    desc: "Computes subtotal (Σ quantity×price) and item count from cart_items JOIN product_variants. Returns Decimal values." },
      { name: "invalidateCartCache",cat: "Utility",    desc: "Deletes Redis key cart:userId. Called on every cart mutation to ensure fresh data on next read." },
    ],
  },
  COUPON: {
    label: "Coupons & Discounts", color: "#EA580C", bg: "#FFF7ED",
    x: 970, y: 530,
    fns: [
      { name: "validateCoupon",       cat: "Controller", desc: "Validates coupon code without applying it. Checks: exists, is_active, expiry, max_uses, min_order_amount. Returns discount preview amount." },
      { name: "calculateDiscount",    cat: "Utility",    desc: "PERCENT: subtotal × (val/100) capped at subtotal. FIXED: min(val, subtotal). Returns Decimal to 2dp. Never negative." },
      { name: "incrementCouponUsage", cat: "Utility",    desc: "UPDATE ... WHERE used_count < max_uses. 0 rows = 409 COUPON_EXHAUSTED. Atomic — prevents over-redemption in concurrent checkouts." },
      { name: "createCoupon",         cat: "Admin",      desc: "Creates coupon (admin). Code stored uppercase. Validates uniqueness, positive value, future expiry." },
    ],
  },
  ORDER: {
    label: "Order Management", color: "#65A30D", bg: "#F7FEE7",
    x: 1280, y: 40,
    fns: [
      { name: "createOrder",              cat: "Controller", desc: "Full checkout in one DB transaction: lock cart, validate + lock variant rows (SELECT FOR UPDATE), check stock, apply coupon, snapshot prices, calculate totals, insert order + items, create stock reservations, clear cart. Then triggers payment + email." },
      { name: "getOrders",                cat: "Controller", desc: "Paginated user order list (newest first). Cursor pagination. Supports status filter. Returns summary fields." },
      { name: "getOrderById",             cat: "Controller", desc: "Full order with items, variant info, address, payment summary, and complete status history timeline." },
      { name: "updateOrderStatus",        cat: "Admin",      desc: "Advances order through state machine. Validates legal transitions. Records history. Calls releaseOrderStock or commitOrderStock. Sends email + SSE." },
      { name: "getAllOrders",             cat: "Admin",      desc: "Admin view: filterable (status, date range, customer email), sortable, paginated. Includes customer name + item count." },
      { name: "reserveOrderStock",        cat: "Utility",    desc: "Inserts stock_reservation rows (one per item) with 15min expiry. Does NOT decrement stock — committed only on payment capture." },
      { name: "releaseOrderStock",        cat: "Utility",    desc: "Deletes all stock_reservations for an order. Called on cancellation before payment capture." },
      { name: "commitOrderStock",         cat: "Utility",    desc: "On payment success: fetches reservations, calls decrementVariantStock for each, deletes reservations. Runs in transaction." },
      { name: "cancelExpiredOrders",      cat: "Cron",       desc: "Finds PENDING orders with expired stock reservations. Sets CANCELLED status, releases stock, inserts status history, sends cancellation emails." },
      { name: "generateOrderNumber",      cat: "Utility",    desc: "Returns human-readable ref: ORD-YYYYMMDD-XXXXXXXX (8-char alphanumeric). Separate from UUID primary key." },
      { name: "recordOrderStatusHistory", cat: "Utility",    desc: "Inserts order_status_history row with status + UTC timestamp. Always within the same transaction as the status update." },
      { name: "calculateOrderTotals",     cat: "Utility",    desc: "Σ quantity×variant.price → subtotal. Applies coupon via calculateDiscount. Returns { subtotal, discountAmount, totalAmount } as Decimals." },
    ],
  },
  STOCK: {
    label: "Stock Reservations", color: "#DC2626", bg: "#FEF2F2",
    x: 1280, y: 440,
    fns: [
      { name: "cleanupExpiredReservations",cat: "Cron",   desc: "Deletes stock_reservations rows where expires_at < NOW() and order still PENDING. Returns count of deleted rows." },
      { name: "getAvailableStock",         cat: "Utility",desc: "available = stock_quantity − Σ(reserved WHERE expires_at > NOW()). Used by checkVariantStock and cart validation." },
    ],
  },
  PAYMENT: {
    label: "Payment Integration", color: "#7C3AED", bg: "#F5F3FF",
    x: 1590, y: 40,
    fns: [
      { name: "createPaymentIntent",       cat: "Controller", desc: "Creates payment intent with Stripe or PayPal via abstraction layer. Stores PENDING transaction in payment_transactions. Returns clientSecret/approvalUrl." },
      { name: "confirmPayment",            cat: "Controller", desc: "Frontend-triggered payment confirmation. Verifies with provider, calls handlePaymentSuccess or handlePaymentFailure." },
      { name: "processRefund",             cat: "Admin",      desc: "Initiates full/partial refund. Calls provider refund API. Records REFUND transaction, updates order to REFUNDED, restores stock, sends email." },
      { name: "handlePaymentSuccess",      cat: "Internal",   desc: "On payment captured: UPDATE transaction→SUCCESS, commitOrderStock, order→CONFIRMED, status history, send receipt email, broadcast SSE to admin." },
      { name: "handlePaymentFailure",      cat: "Internal",   desc: "On payment failed: UPDATE transaction→FAILED, order→CANCELLED, releaseOrderStock, status history, send failure email." },
      { name: "createStripePaymentIntent", cat: "Provider",   desc: "Calls Stripe API. Converts amount to smallest unit. Sets automatic_payment_methods:enabled. Attaches { orderId, userId } metadata." },
      { name: "validateStripeWebhook",     cat: "Security",   desc: "stripe.webhooks.constructEvent with raw body buffer + stripe-signature. Throws on mismatch (forgery protection)." },
      { name: "logTransaction",            cat: "Utility",    desc: "Inserts or updates payment_transactions row. Full provider JSON response stored in payload JSONB for audit." },
    ],
  },
  WEBHOOK: {
    label: "Webhook Handlers", color: "#9333EA", bg: "#FAF5FF",
    x: 1590, y: 360,
    fns: [
      { name: "handleStripeWebhook", cat: "Controller", desc: "Verifies Stripe webhook signature (raw body), parses event type, routes to handlePaymentSuccess/Failure. Requires raw body parser." },
      { name: "handlePaypalWebhook", cat: "Controller", desc: "Verifies PayPal webhook via PayPal verification API. Routes PAYMENT.CAPTURE.COMPLETED/DENIED to handlePaymentSuccess/Failure." },
    ],
  },
  NOTIFICATION: {
    label: "Notifications (SSE)", color: "#0284C7", bg: "#F0F9FF",
    x: 1590, y: 500,
    fns: [
      { name: "getNotifications",     cat: "Controller", desc: "Returns paginated notifications for user (newest first). Includes unread count in meta. Supports unread_only filter." },
      { name: "markNotificationRead", cat: "Controller", desc: "Sets is_read=true. Supports single notification ID or 'all'. Verifies ownership before update." },
      { name: "streamNotifications",  cat: "Controller", desc: "Establishes SSE connection. Sets event-stream headers. Registers res in SSEClients Map. Sends 30s heartbeat. Cleans up on disconnect." },
      { name: "sendSSEEvent",         cat: "Utility",    desc: "Writes SSE message to all active connections for a userId. Silently skips if no connection. Supports multiple tabs per user." },
      { name: "broadcastToAdmin",     cat: "Utility",    desc: "Sends SSE to all connected admin users. Used for new-order, low-stock, and payment events on admin dashboard." },
      { name: "createNotification",   cat: "Utility",    desc: "Inserts notifications row AND immediately pushes to user's active SSE connection via sendSSEEvent. Returns created record." },
    ],
  },
  EMAIL: {
    label: "Email Service", color: "#0369A1", bg: "#F0F9FF",
    x: 1900, y: 40,
    fns: [
      { name: "buildTransporter",              cat: "Utility", desc: "Singleton Nodemailer SMTP transporter from EMAIL_HOST/PORT/USER/PASS env vars. Verifies connection on first call." },
      { name: "renderEmailTemplate",           cat: "Utility", desc: "Loads Handlebars HTML template from /templates/email/, compiles with data context. Inline CSS for email client compatibility." },
      { name: "sendWelcomeEmail",              cat: "Sender",  desc: "Branded welcome email to new user with first name and CTA link to start shopping." },
      { name: "sendEmailVerificationEmail",    cat: "Sender",  desc: "Sends verification link: FRONTEND_URL/verify-email?token=X&userId=Y. Uses email-verification template." },
      { name: "sendPasswordResetEmail",        cat: "Sender",  desc: "Sends reset link (1h expiry matching Redis TTL): FRONTEND_URL/reset-password?token=X&userId=Y." },
      { name: "sendOrderConfirmationEmail",    cat: "Sender",  desc: "Order confirmation with itemised list, address, totals. Attaches PDF invoice from generateOrderInvoice." },
      { name: "sendPaymentReceiptEmail",       cat: "Sender",  desc: "Receipt with transaction ID, provider, amount, currency, timestamp, and order link." },
      { name: "sendOrderStatusUpdateEmail",    cat: "Sender",  desc: "Status update email with dynamic content per status (SHIPPED includes tracking placeholder, DELIVERED prompts review)." },
      { name: "sendLowStockAlertEmail",        cat: "Sender",  desc: "Admin alert when variant stock <= LOW_STOCK_THRESHOLD. Includes product name, SKU, current count." },
      { name: "sendNewOrderNotificationEmail", cat: "Sender",  desc: "Admin email on new order: reference, customer name, total, item count. Supplements real-time SSE." },
    ],
  },
  REPORT: {
    label: "Reporting & Analytics", color: "#CA8A04", bg: "#FEFCE8",
    x: 1900, y: 380,
    fns: [
      { name: "getSalesReport",             cat: "Admin",   desc: "Sales summary for date range: total revenue, order count, avg order value, daily time series, top 10 products by revenue. Uses materialized view." },
      { name: "getProductPerformanceReport",cat: "Admin",   desc: "Per-product: units sold, revenue, return rate. Sorted by revenue desc. Supports category filter + pagination." },
      { name: "getInventoryReport",         cat: "Admin",   desc: "All active variant stocks with LOW/OK/OUT flag based on LOW_STOCK_THRESHOLD. Sorted by stock asc (low first)." },
      { name: "exportReport",              cat: "Admin",    desc: "Streams CSV download for sales/products/inventory report. Sets Content-Disposition attachment header." },
      { name: "convertToCSV",             cat: "Utility",   desc: "Array of objects → RFC 4180 CSV string. Supports dot-notation keys for nested fields. Escapes commas, quotes, newlines." },
    ],
  },
  ADMIN: {
    label: "Admin Dashboard", color: "#1E3A5F", bg: "#EFF6FF",
    x: 1900, y: 620,
    fns: [
      { name: "getDashboardStats",        cat: "Admin", desc: "Real-time overview: today's revenue, order count, new users, low-stock count, 7-day revenue sparkline. Combines live queries + materialized views." },
      { name: "refreshMaterializedViews", cat: "Cron",  desc: "Hourly cron: REFRESH MATERIALIZED VIEW CONCURRENTLY for daily_sales_summary + product_revenue_summary. CONCURRENTLY avoids blocking reads." },
    ],
  },
  PDF: {
    label: "PDF Generation", color: "#B45309", bg: "#FFFBEB",
    x: 1900, y: 750,
    fns: [
      { name: "generateOrderInvoice", cat: "Utility",    desc: "Puppeteer headless Chromium renders invoice Handlebars template → PDF Buffer. Uses --no-sandbox for Docker. Called by sendOrderConfirmationEmail." },
      { name: "downloadInvoice",      cat: "Controller", desc: "HTTP endpoint: verifies ownership, calls generateOrderInvoice, streams PDF with Content-Disposition: attachment." },
    ],
  },
  CRON: {
    label: "Scheduled Jobs", color: "#6B7280", bg: "#F9FAFB",
    x: 350, y: 940,
    fns: [
      { name: "cancelExpiredOrders",        cat: "Every 5min",  desc: "Finds PENDING orders with expired stock reservations. Cancels them, releases stock, inserts status history, sends cancellation emails." },
      { name: "cleanupExpiredReservations", cat: "Every 10min", desc: "Deletes orphaned stock_reservations rows (expires_at < NOW()). Prevents phantom stock locks from accumulating." },
      { name: "refreshMaterializedViews",   cat: "Hourly",      desc: "REFRESH MATERIALIZED VIEW CONCURRENTLY for analytics views. Non-blocking — reads continue during refresh." },
      { name: "sendLowStockAlertsJob",      cat: "Every 6h",    desc: "Queries variants with stock <= threshold. Sends alert email per qualifying variant. Suppresses duplicates via Redis key (12h TTL)." },
      { name: "cleanupExpiredSessionsJob",  cat: "Daily 03:00", desc: "DELETE FROM user_sessions WHERE expires_at < NOW(). Redis keys expire automatically — this prevents DB table growth." },
      { name: "cleanupOldNotificationsJob", cat: "Weekly",      desc: "DELETE read notifications older than 90 days. Keeps notifications table lean." },
    ],
  },
  DB: {
    label: "Database Utilities", color: "#1D4ED8", bg: "#EFF6FF",
    x: 660, y: 940,
    fns: [
      { name: "query",               cat: "DB", desc: "Executes parameterised SQL via pg pool → PgBouncer. All inputs use $1,$2... placeholders. Logs queries >1000ms as warnings." },
      { name: "transaction",         cat: "DB", desc: "Acquires client, calls BEGIN, invokes callback(client), COMMIT on success or ROLLBACK on error. Releases client in finally block." },
      { name: "checkDatabaseHealth", cat: "DB", desc: "Executes SELECT 1 to verify connectivity. Used by /health endpoint and startup bootstrap." },
    ],
  },
  REDIS: {
    label: "Redis Cache", color: "#DC2626", bg: "#FEF2F2",
    x: 970, y: 940,
    fns: [
      { name: "redisGet",         cat: "Cache", desc: "GET by key. Returns null on miss. Fail-open on connection error (returns null, logs warning)." },
      { name: "redisSet",         cat: "Cache", desc: "SET with optional EX (seconds TTL). Auto JSON.stringify for objects. Persists indefinitely if TTL omitted." },
      { name: "redisDel",         cat: "Cache", desc: "DEL one or multiple keys. Returns count of deleted keys." },
      { name: "redisSetNX",       cat: "Cache", desc: "SET if Not eXists. Returns true if set. Used for distributed locks and idempotency keys." },
      { name: "flushPattern",     cat: "Cache", desc: "SCAN-based pattern delete (non-blocking). Deletes in batches of 100. Returns total deleted count." },
      { name: "checkRedisHealth", cat: "Cache", desc: "PING → expects PONG. Returns boolean. Used by /health endpoint." },
    ],
  },
  UTIL: {
    label: "General Utilities", color: "#374151", bg: "#F9FAFB",
    x: 1280, y: 940,
    fns: [
      { name: "generateSlug",     cat: "Utility", desc: "Name → URL-safe slug: lowercase, trim, replace specials with hyphens, collapse hyphens. No uniqueness guarantee — callers must check." },
      { name: "formatCurrency",   cat: "Utility", desc: "Intl.NumberFormat currency string. Default NGN. Returns e.g. N1,500.00." },
      { name: "retry",            cat: "Utility", desc: "Retries async fn up to maxRetries times with exponential backoff (delayMs doubles each attempt). Re-throws on final failure." },
      { name: "parseQueryParams", cat: "Utility", desc: "Coerces Express query strings per schema (string→int/bool/date). Applies defaults, range validation. Returns typed params." },
      { name: "sleep",            cat: "Utility", desc: "Promise that resolves after N milliseconds. Used in retry and rate-limiting helpers." },
      { name: "pickFields",       cat: "Utility", desc: "Returns new object with only specified field names. Prevents accidental leakage of internal fields like password_hash." },
      { name: "healthCheck",      cat: "Controller", desc: "GET /health: runs checkDatabaseHealth + checkRedisHealth in parallel. Returns 200 healthy or 503 degraded with failing components." },
    ],
  },
};

const RELS = [
  { from:"register",to:"hashPassword" }, { from:"register",to:"generateSecureToken" },
  { from:"register",to:"hashToken" }, { from:"register",to:"sendWelcomeEmail" },
  { from:"register",to:"sendEmailVerificationEmail" },
  { from:"verifyEmail",to:"hashToken" },
  { from:"login",to:"comparePassword" }, { from:"login",to:"generateAccessToken" },
  { from:"login",to:"generateRefreshToken" }, { from:"login",to:"invalidateAllSessions" },
  { from:"logout",to:"verifyAccessToken" }, { from:"logout",to:"redisDel" },
  { from:"refreshToken",to:"verifyRefreshToken" }, { from:"refreshToken",to:"generateAccessToken" },
  { from:"forgotPassword",to:"generateSecureToken" }, { from:"forgotPassword",to:"hashToken" },
  { from:"forgotPassword",to:"sendPasswordResetEmail" },
  { from:"resetPassword",to:"hashToken" }, { from:"resetPassword",to:"hashPassword" },
  { from:"resetPassword",to:"invalidateAllSessions" },
  { from:"invalidateAllSessions",to:"flushPattern" },
  { from:"authenticate",to:"verifyAccessToken" },
  { from:"rateLimiter",to:"redisGet" }, { from:"rateLimiter",to:"redisSet" },
  { from:"errorHandler",to:"logError" }, { from:"requestLogger",to:"logInfo" },
  { from:"getCategories",to:"buildCategoryTree" }, { from:"getCategories",to:"redisGet" },
  { from:"getCategories",to:"redisSet" }, { from:"createCategory",to:"generateSlug" },
  { from:"createCategory",to:"redisDel" }, { from:"updateCategory",to:"validateCategoryHierarchy" },
  { from:"updateCategory",to:"generateSlug" }, { from:"updateCategory",to:"redisDel" },
  { from:"deleteCategory",to:"redisDel" },
  { from:"getProducts",to:"encodeCursor" }, { from:"getProducts",to:"redisGet" },
  { from:"getProducts",to:"redisSet" }, { from:"createProduct",to:"generateSlug" },
  { from:"createProduct",to:"updateSearchVector" }, { from:"updateProduct",to:"generateSlug" },
  { from:"updateProduct",to:"updateSearchVector" }, { from:"updateProduct",to:"redisDel" },
  { from:"checkVariantStock",to:"getAvailableStock" },
  { from:"commitOrderStock",to:"decrementVariantStock" },
  { from:"commitOrderStock",to:"releaseOrderStock" },
  { from:"processRefund",to:"incrementVariantStock" },
  { from:"uploadVariantImages",to:"validateImageFile" }, { from:"uploadVariantImages",to:"processImage" },
  { from:"deleteVariantImage",to:"deleteImageFiles" },
  { from:"searchProducts",to:"buildFilterConditions" }, { from:"searchProducts",to:"encodeCursor" },
  { from:"searchProducts",to:"decodeCursor" }, { from:"getSearchSuggestions",to:"redisGet" },
  { from:"getSearchSuggestions",to:"redisSet" },
  { from:"getCart",to:"redisGet" }, { from:"getCart",to:"redisSet" },
  { from:"getCart",to:"checkVariantStock" }, { from:"addItemToCart",to:"getOrCreateCart" },
  { from:"addItemToCart",to:"checkVariantStock" }, { from:"addItemToCart",to:"invalidateCartCache" },
  { from:"updateCartItem",to:"invalidateCartCache" }, { from:"removeCartItem",to:"invalidateCartCache" },
  { from:"clearCart",to:"invalidateCartCache" }, { from:"invalidateCartCache",to:"redisDel" },
  { from:"validateCoupon",to:"calculateDiscount" }, { from:"createOrder",to:"incrementCouponUsage" },
  { from:"createOrder",to:"validateCoupon" }, { from:"createOrder",to:"calculateOrderTotals" },
  { from:"createOrder",to:"reserveOrderStock" }, { from:"createOrder",to:"recordOrderStatusHistory" },
  { from:"createOrder",to:"clearCart" }, { from:"createOrder",to:"createPaymentIntent" },
  { from:"createOrder",to:"sendOrderConfirmationEmail" }, { from:"createOrder",to:"transaction" },
  { from:"calculateOrderTotals",to:"calculateDiscount" },
  { from:"updateOrderStatus",to:"recordOrderStatusHistory" },
  { from:"updateOrderStatus",to:"releaseOrderStock" }, { from:"updateOrderStatus",to:"commitOrderStock" },
  { from:"updateOrderStatus",to:"sendOrderStatusUpdateEmail" }, { from:"updateOrderStatus",to:"sendSSEEvent" },
  { from:"cancelExpiredOrders",to:"releaseOrderStock" },
  { from:"cancelExpiredOrders",to:"recordOrderStatusHistory" },
  { from:"createPaymentIntent",to:"createStripePaymentIntent" },
  { from:"createPaymentIntent",to:"logTransaction" },
  { from:"handleStripeWebhook",to:"validateStripeWebhook" },
  { from:"handleStripeWebhook",to:"handlePaymentSuccess" },
  { from:"handleStripeWebhook",to:"handlePaymentFailure" },
  { from:"handlePaypalWebhook",to:"handlePaymentSuccess" },
  { from:"handlePaypalWebhook",to:"handlePaymentFailure" },
  { from:"handlePaymentSuccess",to:"commitOrderStock" },
  { from:"handlePaymentSuccess",to:"updateOrderStatus" }, { from:"handlePaymentSuccess",to:"logTransaction" },
  { from:"handlePaymentSuccess",to:"sendPaymentReceiptEmail" },
  { from:"handlePaymentSuccess",to:"broadcastToAdmin" },
  { from:"handlePaymentFailure",to:"releaseOrderStock" },
  { from:"handlePaymentFailure",to:"updateOrderStatus" }, { from:"handlePaymentFailure",to:"logTransaction" },
  { from:"processRefund",to:"logTransaction" }, { from:"processRefund",to:"updateOrderStatus" },
  { from:"processRefund",to:"sendOrderConfirmationEmail" },
  { from:"confirmPayment",to:"handlePaymentSuccess" }, { from:"confirmPayment",to:"handlePaymentFailure" },
  { from:"createNotification",to:"sendSSEEvent" }, { from:"broadcastToAdmin",to:"sendSSEEvent" },
  { from:"sendOrderConfirmationEmail",to:"generateOrderInvoice" },
  { from:"sendWelcomeEmail",to:"renderEmailTemplate" }, { from:"sendWelcomeEmail",to:"buildTransporter" },
  { from:"sendLowStockAlertEmail",to:"buildTransporter" },
  { from:"exportReport",to:"convertToCSV" }, { from:"getDashboardStats",to:"query" },
  { from:"getSalesReport",to:"query" }, { from:"downloadInvoice",to:"generateOrderInvoice" },
  { from:"sendLowStockAlertsJob",to:"sendLowStockAlertEmail" },
  { from:"sendLowStockAlertsJob",to:"redisSetNX" },
  { from:"cleanupExpiredSessionsJob",to:"query" }, { from:"cleanupOldNotificationsJob",to:"query" },
  { from:"transaction",to:"query" },
  { from:"healthCheck",to:"checkDatabaseHealth" }, { from:"healthCheck",to:"checkRedisHealth" },
];

const MOD_W = 240, ROW_H = 22, HDR_H = 38, PAD = 10;

const FN_LOOKUP = {};
Object.entries(MODULES).forEach(([mk, mod]) => {
  mod.fns.forEach((fn, i) => { FN_LOOKUP[fn.name] = { moduleKey: mk, index: i }; });
});

function getModH(mk) { return HDR_H + MODULES[mk].fns.length * ROW_H + PAD; }

function getFnCenter(name) {
  const info = FN_LOOKUP[name]; if (!info) return null;
  const mod = MODULES[info.moduleKey];
  return { x: mod.x + MOD_W / 2, y: mod.y + HDR_H + info.index * ROW_H + ROW_H / 2 };
}

function getFnRect(name) {
  const info = FN_LOOKUP[name]; if (!info) return null;
  const mod = MODULES[info.moduleKey];
  return { x: mod.x, y: mod.y + HDR_H + info.index * ROW_H, w: MOD_W, h: ROW_H };
}

export default function FunctionMap() {
  const svgRef = useRef(null);
  const stateRef = useRef({ scale: 0.52, pan: { x: 8, y: 8 } });
  const [scale, setScale] = useState(0.52);
  const [pan, setPan] = useState({ x: 8, y: 8 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState(null);
  const [selected, setSelected] = useState(null);
  const [hovered, setHovered] = useState(null);

  useEffect(() => { stateRef.current = { scale, pan }; }, [scale, pan]);

  useEffect(() => {
    const el = svgRef.current; if (!el) return;
    const handler = (e) => {
      e.preventDefault();
      const { scale: s, pan: p } = stateRef.current;
      const rect = el.getBoundingClientRect();
      const mx = e.clientX - rect.left, my = e.clientY - rect.top;
      const delta = e.deltaY < 0 ? 1.1 : 0.91;
      const ns = Math.min(Math.max(s * delta, 0.12), 3);
      setPan({ x: mx - (mx - p.x) * (ns / s), y: my - (my - p.y) * (ns / s) });
      setScale(ns);
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, []);

  const handleMouseDown = useCallback((e) => {
    if (e.target.closest("[data-fn]")) return;
    e.preventDefault();
    setDragging(true);
    setDragStart({ x: e.clientX - stateRef.current.pan.x, y: e.clientY - stateRef.current.pan.y });
  }, []);
  const handleMouseMove = useCallback((e) => {
    if (!dragging || !dragStart) return;
    setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  }, [dragging, dragStart]);
  const handleMouseUp = useCallback(() => { setDragging(false); setDragStart(null); }, []);

  const selName = selected?.fnName;
  const outgoing = selName ? RELS.filter(r => r.from === selName).map(r => r.to) : [];
  const incoming = selName ? RELS.filter(r => r.to === selName).map(r => r.from) : [];
  const related = new Set([...outgoing, ...incoming]);

  function RelLines() {
    if (!selName) return null;
    return [
      ...outgoing.map((to, i) => {
        const a = getFnCenter(selName), b = getFnCenter(to); if (!a || !b) return null;
        const cpx = (a.x + b.x) / 2;
        return <path key={"o"+i} d={`M${a.x},${a.y} C${cpx},${a.y} ${cpx},${b.y} ${b.x},${b.y}`}
          fill="none" stroke="#2563EB" strokeWidth={1.8} opacity={0.75} markerEnd="url(#ao)" />;
      }),
      ...incoming.map((from, i) => {
        const a = getFnCenter(from), b = getFnCenter(selName); if (!a || !b) return null;
        const cpx = (a.x + b.x) / 2;
        return <path key={"i"+i} d={`M${a.x},${a.y} C${cpx},${a.y} ${cpx},${b.y} ${b.x},${b.y}`}
          fill="none" stroke="#D97706" strokeWidth={1.8} strokeDasharray="6,3" opacity={0.75} markerEnd="url(#ai)" />;
      }),
    ].filter(Boolean);
  }

  function ModBox({ mk }) {
    const mod = MODULES[mk];
    const mh = getModH(mk);
    const isDimmed = selName && !mod.fns.some(f => f.name === selName || related.has(f.name));
    return (
      <g opacity={isDimmed ? 0.2 : 1} style={{ transition: "opacity 0.18s" }}>
        <rect x={mod.x+3} y={mod.y+3} width={MOD_W} height={mh} rx={8} fill="#00000015" />
        <rect x={mod.x} y={mod.y} width={MOD_W} height={mh} rx={8}
              fill={mod.bg} stroke={mod.color} strokeWidth={selName && !isDimmed ? 2 : 1.5} />
        <rect x={mod.x} y={mod.y} width={MOD_W} height={HDR_H} rx={8} fill={mod.color} />
        <rect x={mod.x} y={mod.y+HDR_H-8} width={MOD_W} height={8} fill={mod.color} />
        <text x={mod.x+MOD_W/2} y={mod.y+HDR_H/2+1} textAnchor="middle" dominantBaseline="middle"
              fill="white" fontSize={11.5} fontWeight="700" fontFamily="Arial,sans-serif">{mod.label}</text>
        {mod.fns.map((fn, i) => {
          const fy = mod.y + HDR_H + i * ROW_H;
          const isSel = selName === fn.name, isOut = outgoing.includes(fn.name), isIn = incoming.includes(fn.name), isHov = hovered === fn.name;
          const rowFill = isSel ? mod.color : isOut ? "#DBEAFE" : isIn ? "#FEF3C7" : isHov ? "#F1F5F9" : (i%2===0?"#FFFFFF":mod.bg);
          return (
            <g key={fn.name} data-fn="1"
               onClick={e => { e.stopPropagation(); setSelected(s => s?.fnName===fn.name ? null : { fnName:fn.name, moduleKey:mk }); }}
               onMouseEnter={() => setHovered(fn.name)} onMouseLeave={() => setHovered(null)}
               style={{ cursor:"pointer" }}>
              <rect x={mod.x} y={fy} width={MOD_W} height={ROW_H} fill={rowFill}
                    stroke={(isOut||isIn)&&!isSel ? mod.color:"none"} strokeWidth={0.5} />
              {(isOut||isIn)&&!isSel && <circle cx={mod.x+8} cy={fy+ROW_H/2} r={3} fill={isOut?"#2563EB":"#D97706"} />}
              <text x={mod.x+(isOut||isIn?18:8)} y={fy+ROW_H/2} dominantBaseline="middle"
                    fill={isSel?"white":isOut?"#1D4ED8":isIn?"#92400E":"#1F2937"}
                    fontSize={10} fontFamily="'Courier New',monospace"
                    fontWeight={isSel||isOut||isIn?"700":"400"}>{fn.name}</text>
              <text x={mod.x+MOD_W-7} y={fy+ROW_H/2} textAnchor="end" dominantBaseline="middle"
                    fill={isSel?"rgba(255,255,255,0.7)":"#9CA3AF"} fontSize={8} fontFamily="Arial,sans-serif" fontStyle="italic">
                {fn.cat}</text>
            </g>
          );
        })}
      </g>
    );
  }

  function SelRect() {
    if (!selName) return null;
    const r = getFnRect(selName); if (!r) return null;
    const color = MODULES[FN_LOOKUP[selName]?.moduleKey]?.color || "#2563EB";
    return <rect x={r.x-1.5} y={r.y-1} width={r.w+3} height={r.h+2} fill="none"
                 stroke={color} strokeWidth={2.5} rx={3} style={{ pointerEvents:"none" }} />;
  }

  function Panel() {
    if (!selected) return null;
    const mod = MODULES[selected.moduleKey];
    const fn = mod?.fns.find(f => f.name === selected.fnName); if (!fn) return null;
    const myOut = RELS.filter(r => r.from === fn.name).map(r => r.to);
    const myIn  = RELS.filter(r => r.to === fn.name).map(r => r.from);
    return (
      <div style={{ position:"absolute", bottom:0, left:0, right:0, background:"#fff",
                    borderTop:`3px solid ${mod.color}`, boxShadow:"0 -6px 30px rgba(0,0,0,0.13)",
                    padding:"14px 18px 14px", maxHeight:"220px", display:"flex", gap:"18px",
                    zIndex:20, animation:"slideUp 0.18s ease" }}>
        <div style={{ flex:1, minWidth:0, overflow:"hidden" }}>
          <div style={{ display:"flex", alignItems:"center", gap:"8px", marginBottom:"7px", flexWrap:"wrap" }}>
            <span style={{ background:mod.color, color:"white", padding:"2px 10px", borderRadius:"4px",
                           fontSize:"13px", fontWeight:"700", fontFamily:"Courier New,monospace" }}>{fn.name}</span>
            <span style={{ background:mod.bg, color:mod.color, border:`1px solid ${mod.color}20`,
                           padding:"1px 9px", borderRadius:"10px", fontSize:"11px", fontWeight:"600" }}>{mod.label}</span>
            <span style={{ background:"#F3F4F6", color:"#6B7280", padding:"1px 8px",
                           borderRadius:"10px", fontSize:"11px" }}>{fn.cat}</span>
            <span style={{ marginLeft:"auto", background:"#F3F4F6", color:"#6B7280",
                           padding:"1px 10px", borderRadius:"10px", fontSize:"10px" }}>
              {myOut.length} calls · {myIn.length} called-by
            </span>
            <button onClick={() => setSelected(null)}
              style={{ background:"none", border:"none", cursor:"pointer", color:"#9CA3AF",
                       fontSize:"20px", lineHeight:1, padding:"0 2px", marginLeft:"4px" }}>×</button>
          </div>
          <p style={{ margin:0, fontSize:"12.5px", color:"#374151", lineHeight:1.55, overflow:"hidden",
                      display:"-webkit-box", WebkitLineClamp:3, WebkitBoxOrient:"vertical" }}>{fn.desc}</p>
        </div>
        <div style={{ display:"flex", gap:"12px", minWidth:"340px", maxWidth:"460px", overflowY:"auto" }}>
          {myOut.length > 0 && (
            <div style={{ flex:1 }}>
              <div style={{ fontSize:"10.5px", fontWeight:"700", color:"#2563EB", marginBottom:"5px",
                            display:"flex", alignItems:"center", gap:"5px" }}>
                <span style={{ width:7, height:7, borderRadius:"50%", background:"#2563EB", display:"inline-block" }}/>
                CALLS ({myOut.length})
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:"3px" }}>
                {myOut.map(n => (
                  <div key={n} onClick={() => { const i=FN_LOOKUP[n]; if(i) setSelected({ fnName:n, moduleKey:i.moduleKey }); }}
                       style={{ fontSize:"10.5px", fontFamily:"Courier New,monospace", color:"#1D4ED8",
                                background:"#EFF6FF", padding:"2px 7px", borderRadius:"3px",
                                cursor:"pointer", borderLeft:"2px solid #2563EB" }}>{n}</div>
                ))}
              </div>
            </div>
          )}
          {myIn.length > 0 && (
            <div style={{ flex:1 }}>
              <div style={{ fontSize:"10.5px", fontWeight:"700", color:"#D97706", marginBottom:"5px",
                            display:"flex", alignItems:"center", gap:"5px" }}>
                <span style={{ width:7, height:7, borderRadius:"50%", background:"#D97706", display:"inline-block" }}/>
                CALLED BY ({myIn.length})
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:"3px" }}>
                {myIn.map(n => (
                  <div key={n} onClick={() => { const i=FN_LOOKUP[n]; if(i) setSelected({ fnName:n, moduleKey:i.moduleKey }); }}
                       style={{ fontSize:"10.5px", fontFamily:"Courier New,monospace", color:"#92400E",
                                background:"#FFFBEB", padding:"2px 7px", borderRadius:"3px",
                                cursor:"pointer", borderLeft:"2px solid #D97706" }}>{n}</div>
                ))}
              </div>
            </div>
          )}
          {myOut.length===0 && myIn.length===0 && (
            <div style={{ color:"#9CA3AF", fontSize:"12px", alignSelf:"center" }}>No tracked relationships.</div>
          )}
        </div>
      </div>
    );
  }

  const totalFns = Object.values(MODULES).reduce((s,m) => s+m.fns.length, 0);

  const zoomTo = (dir) => {
    const { scale: s, pan: p } = stateRef.current;
    const el = svgRef.current;
    const cx = el ? el.clientWidth/2 : 500, cy = el ? el.clientHeight/2 : 300;
    const ns = Math.min(Math.max(s * (dir>0?1.25:0.8), 0.12), 3);
    setPan({ x: cx-(cx-p.x)*(ns/s), y: cy-(cy-p.y)*(ns/s) });
    setScale(ns);
  };

  return (
    <div style={{ width:"100%", height:"100vh", display:"flex", flexDirection:"column",
                  background:"#F1F5F9", fontFamily:"Arial,sans-serif", overflow:"hidden" }}>
      <style>{`@keyframes slideUp{from{transform:translateY(16px);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>
      {/* Topbar */}
      <div style={{ display:"flex", alignItems:"center", gap:"12px", padding:"7px 14px",
                    background:"#0F172A", borderBottom:"2px solid #2563EB", flexShrink:0, zIndex:10 }}>
        <span style={{ color:"white", fontWeight:"800", fontSize:"14px", letterSpacing:"0.3px" }}>
          ⚡ Backend Function Map
        </span>
        <span style={{ color:"#64748B", fontSize:"11px" }}>·</span>
        <span style={{ color:"#94A3B8", fontSize:"11px" }}>
          {totalFns} functions &nbsp;·&nbsp; {RELS.length} relationships &nbsp;·&nbsp; {Object.keys(MODULES).length} modules
        </span>
        {selName && (
          <span style={{ color:"#60A5FA", fontSize:"11px", background:"#1E3A5F",
                         padding:"2px 10px", borderRadius:"10px", fontFamily:"Courier New" }}>
            🔍 {selName}
          </span>
        )}
        <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:"8px" }}>
          <div style={{ display:"flex", gap:"10px", marginRight:"8px" }}>
            {[
              { dot:"#2563EB", line:"solid", label:"Calls" },
              { dot:"#D97706", line:"dashed", label:"Called by" },
            ].map(l => (
              <span key={l.label} style={{ display:"flex", alignItems:"center", gap:"4px", color:"#94A3B8", fontSize:"10.5px" }}>
                <svg width="20" height="10" style={{ display:"inline-block" }}>
                  <line x1="0" y1="5" x2="20" y2="5" stroke={l.dot} strokeWidth="2"
                        strokeDasharray={l.line==="dashed"?"5,3":"none"} />
                </svg>
                {l.label}
              </span>
            ))}
            <span style={{ color:"#94A3B8", fontSize:"10px" }}>
              🔵 outgoing fn &nbsp; 🟡 incoming fn
            </span>
          </div>
          <span style={{ color:"#60A5FA", fontSize:"11px", minWidth:"38px" }}>
            {Math.round(scale*100)}%
          </span>
          {[{l:"−",d:-1},{l:"+",d:1}].map(b=>(
            <button key={b.l} onClick={()=>zoomTo(b.d)} style={{
              background:"rgba(255,255,255,0.08)", border:"1px solid rgba(255,255,255,0.15)",
              color:"white", padding:"2px 10px", borderRadius:"4px",
              cursor:"pointer", fontSize:"14px", fontWeight:"700" }}>{b.l}</button>
          ))}
          <button onClick={()=>{ setScale(0.52); setPan({x:8,y:8}); }} style={{
            background:"rgba(255,255,255,0.08)", border:"1px solid rgba(255,255,255,0.15)",
            color:"#94A3B8", padding:"2px 10px", borderRadius:"4px",
            cursor:"pointer", fontSize:"11px" }}>RESET</button>
        </div>
      </div>
      {/* Canvas + Panel */}
      <div style={{ flex:1, position:"relative", overflow:"hidden" }}>
        <svg ref={svgRef} width="100%" height="100%"
             style={{ cursor:dragging?"grabbing":"grab", display:"block", userSelect:"none" }}
             onMouseDown={handleMouseDown} onMouseMove={handleMouseMove}
             onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}
             onClick={()=>setSelected(null)}>
          <defs>
            <marker id="ao" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
              <path d="M0,0 L0,6 L8,3 z" fill="#2563EB" /></marker>
            <marker id="ai" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
              <path d="M0,0 L0,6 L8,3 z" fill="#D97706" /></marker>
            <pattern id="dots" width="26" height="26" patternUnits="userSpaceOnUse">
              <circle cx="13" cy="13" r="0.9" fill="#CBD5E1" /></pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dots)" />
          <g transform={`translate(${pan.x},${pan.y}) scale(${scale})`}>
            <RelLines />
            {Object.keys(MODULES).map(mk => <ModBox key={mk} mk={mk} />)}
            <SelRect />
          </g>
        </svg>
        <Panel />
      </div>
    </div>
  );
}