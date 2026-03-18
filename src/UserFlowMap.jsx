import { useState, useRef, useEffect, useCallback } from "react";

// ══════════════════════════════════════════════════════════════════════════════
// COLORS & LAYOUT CONSTANTS
// ══════════════════════════════════════════════════════════════════════════════
const LC = {
  V:"#3B82F6", A:"#8B5CF6", B:"#10B981",
  P:"#0EA5E9", AO:"#EF4444", AM:"#DC2626", SYS:"#64748B",
};

const LANES = [
  {id:"V",  label:"VISITOR JOURNEY",     color:LC.V,  lx:20,   lw:290},
  {id:"A",  label:"AUTHENTICATION",      color:LC.A,  lx:330,  lw:260},
  {id:"B",  label:"PURCHASE FLOW",       color:LC.B,  lx:610,  lw:310},
  {id:"P",  label:"BUYER ACCOUNT",       color:LC.P,  lx:940,  lw:270},
  {id:"AO", label:"ADMIN — OPERATIONS",  color:LC.AO, lx:1230, lw:310},
  {id:"AM", label:"ADMIN — MANAGEMENT",  color:LC.AM, lx:1560, lw:310},
];

const SZ = {
  start:   {w:170, h:36},
  end:     {w:170, h:36},
  page:    {w:210, h:40},
  decision:{w:210, h:62},
  action:  {w:210, h:38},
};

// ══════════════════════════════════════════════════════════════════════════════
// NODES
// ══════════════════════════════════════════════════════════════════════════════
const NODES = [
  {id:"entry",         s:"start",    label:"User Visits Site",                    lane:"V",  x:55,   y:80,   c:LC.SYS, desc:"Any user — visitor, buyer, or admin — arrives at the website URL."},
  {id:"maint_q",       s:"decision", label:"Maintenance\nMode On?",               lane:"V",  x:50,   y:170,  c:LC.SYS, desc:"System checks the maintenance_mode site setting on every request.", outcomes:["YES → Maintenance Page","NO → Continue to Homepage"]},
  {id:"maint_pg",      s:"page",     label:"Maintenance Page",                    lane:"V",  x:290,  y:174,  c:LC.SYS, desc:"Branded maintenance page shown to all non-admin users. Shows message and estimated return time set by admin."},
  {id:"homepage",      s:"page",     label:"Homepage",                            lane:"V",  x:55,   y:290,  c:LC.V,   desc:"Main landing page. Hero banner slider, category grid, new arrivals, flash sales slider, testimonials, FAQs, newsletter section."},
  {id:"browse_q",      s:"decision", label:"What does\nUser Browse?",             lane:"V",  x:50,   y:390,  c:LC.V,   desc:"User decides what to explore from the homepage.", outcomes:["Products","Categories","Search","Flash Sales","New Arrivals","Sale Items"]},
  {id:"prod_list",     s:"page",     label:"Product Listing",                     lane:"V",  x:55,   y:500,  c:LC.V,   desc:"Paginated product grid with filter sidebar (price range, category, attributes, stock), sort dropdown, and active filter chips."},
  {id:"cat_pg",        s:"page",     label:"Category Page",                       lane:"V",  x:55,   y:554,  c:LC.V,   desc:"Category landing page showing subcategories as visual cards and filtered products within the category."},
  {id:"search_pg",     s:"page",     label:"Search Results",                      lane:"V",  x:55,   y:608,  c:LC.V,   desc:"Full-text search results powered by PostgreSQL tsvector/tsquery. Live autocomplete suggestions in search bar. Ranked by relevance."},
  {id:"flash_pg",      s:"page",     label:"Flash Sales Page",                    lane:"V",  x:55,   y:662,  c:LC.V,   desc:"All currently active flash sales with products, sale prices, countdown timers, and add-to-cart buttons."},
  {id:"arrivals_pg",   s:"page",     label:"New Arrivals",                        lane:"V",  x:55,   y:716,  c:LC.V,   desc:"Products sorted by createdAt DESC. Shows recently added items with new badge."},
  {id:"sale_pg",       s:"page",     label:"Sale / Discounted Products",          lane:"V",  x:55,   y:770,  c:LC.V,   desc:"All products where is_on_sale=true or currently in a flash sale. Shows original price crossed out."},
  {id:"prod_detail",   s:"page",     label:"Product Detail",                      lane:"V",  x:55,   y:860,  c:LC.V,   desc:"Full product page. Image gallery, variant selector, price block (including flash sale countdown if active), description, reviews section, recently viewed, related products."},
  {id:"size_guide",    s:"action",   label:"Size Guide Modal",                    lane:"V",  x:55,   y:914,  c:LC.V,   desc:"Popup overlay showing measurement chart for the product's category. Only shown if admin has created a size guide for this category."},
  {id:"compare_pg",    s:"page",     label:"Product Comparison",                  lane:"V",  x:55,   y:968,  c:LC.V,   desc:"Side-by-side comparison table for up to 4 selected products. Shows attributes, price, rating, stock status."},
  {id:"auth_q",        s:"decision", label:"Action Requires\nLogin?",             lane:"V",  x:50,   y:1058, c:LC.SYS, desc:"Triggered when visitor tries to add to cart, buy now, or add to wishlist.", outcomes:["YES (visitor) → Redirect to Login","NO (buyer/admin) → Continue"]},
  {id:"about_pg",      s:"page",     label:"About Us",                            lane:"V",  x:55,   y:1160, c:LC.V,   desc:"Brand story page. Admin-managed HTML content via rich text editor. Shows team, mission, CTA to shop."},
  {id:"contact_pg",    s:"page",     label:"Contact Us",                          lane:"V",  x:55,   y:1212, c:LC.V,   desc:"Contact form (name, email, subject, message). Business info from site settings. Submission creates ContactMessage record and notifies admin."},
  {id:"faq_pg",        s:"page",     label:"FAQ Page",                            lane:"V",  x:55,   y:1264, c:LC.V,   desc:"Full FAQ page with category tabs and accordion items. All admin-managed."},
  {id:"policies_pg",   s:"page",     label:"Shipping / Privacy / Terms",          lane:"V",  x:55,   y:1316, c:LC.V,   desc:"Three static policy pages — all admin-managed HTML content via page editor."},
  {id:"chat_widget",   s:"action",   label:"💬 Live Chat Widget\n(Floating — Every Page)", lane:"V", x:55, y:1376, c:LC.SYS, desc:"Floating chat bubble present on every page. Opens real-time chat panel. Visitor/buyer messages routed to Admin Chat Inbox."},
  {id:"login_pg",      s:"page",     label:"Login Page",                          lane:"A",  x:345,  y:290,  c:LC.A,   desc:"Login with email/password or Google Sign-In button. Forgot password link. Redirect to signup for new users."},
  {id:"login_meth",    s:"decision", label:"Login Method?",                       lane:"A",  x:340,  y:382,  c:LC.A,   outcomes:["Google OAuth","Email + Password"]},
  {id:"google_auth",   s:"action",   label:"Google OAuth Flow",                   lane:"A",  x:345,  y:472,  c:LC.A,   desc:"Google ID token verified server-side. New account auto-created with is_verified=true if first login."},
  {id:"creds_form",    s:"action",   label:"Email + Password Form",               lane:"A",  x:345,  y:524,  c:LC.A,   desc:"Email and password validated. bcrypt.compare against stored hash."},
  {id:"creds_q",       s:"decision", label:"Credentials Valid?",                  lane:"A",  x:340,  y:598,  c:LC.A,   outcomes:["YES → Redirect to destination","NO → Show inline error"]},
  {id:"login_err",     s:"action",   label:"Show Error + Rate Limit",             lane:"A",  x:345,  y:670,  c:LC.A,   desc:"Inline field error shown. After 5 failed attempts per 15 min per IP, rate limiter returns 429."},
  {id:"anon_merge",    s:"action",   label:"Merge Anonymous Activity",            lane:"A",  x:345,  y:726,  c:LC.A,   desc:"linkAnonymousToUser() called. Anonymous browsing history, recently viewed, and page views merged into the authenticated account."},
  {id:"signup_pg",     s:"page",     label:"Sign Up Page",                        lane:"A",  x:345,  y:820,  c:LC.A,   desc:"Registration form. Name, email, password, confirm password fields with strength indicator. Terms checkbox."},
  {id:"country_step",  s:"action",   label:"Country Selection Step",              lane:"A",  x:345,  y:874,  c:LC.A,   desc:"Inline step within signup. Dropdown of countries. Stored on user profile. Affects currency display."},
  {id:"pw_strength",   s:"action",   label:"Password Strength Check",             lane:"A",  x:345,  y:926,  c:LC.A,   desc:"Real-time password strength indicator. Requires uppercase, lowercase, digit, and special character."},
  {id:"signup_submit", s:"action",   label:"Account Created",                     lane:"A",  x:345,  y:978,  c:LC.A,   desc:"User inserted with is_verified=false. Verification email dispatched. Welcome email dispatched."},
  {id:"verify_pg",     s:"page",     label:"Email Verification Page",             lane:"A",  x:345,  y:1040, c:LC.A,   desc:"Token consumed from URL query string. HMAC hash compared against Redis. Sets is_verified=true on match."},
  {id:"verify_q",      s:"decision", label:"Token Valid?",                        lane:"A",  x:340,  y:1116, c:LC.A,   outcomes:["YES → Auto-redirect to login (3s)","NO → Show error + resend option"]},
  {id:"resend_opt",    s:"action",   label:"Resend Verification Email",           lane:"A",  x:345,  y:1188, c:LC.A,   desc:"Generates new verification token, stores in Redis (24h TTL), sends new email."},
  {id:"forgot_pg",     s:"page",     label:"Forgot Password",                     lane:"A",  x:345,  y:1280, c:LC.A,   desc:"Email input. Always returns success message regardless of whether email exists (prevents enumeration)."},
  {id:"reset_email",   s:"action",   label:"Reset Email Sent",                    lane:"A",  x:345,  y:1334, c:LC.A,   desc:"If user exists: 32-byte token generated, HMAC hash stored in Redis (1h TTL), reset email dispatched."},
  {id:"reset_pg",      s:"page",     label:"Reset Password Page",                 lane:"A",  x:345,  y:1394, c:LC.A,   desc:"New password + confirm password fields. Token validated from URL. Password updated, all sessions invalidated."},
  {id:"pw_done",       s:"action",   label:"Password Updated → Login",            lane:"A",  x:345,  y:1450, c:LC.A,   desc:"All active sessions terminated. Confirmation email sent. User redirected to login page."},
  {id:"buy_now",       s:"action",   label:"Buy Now (Skip Cart)",                 lane:"B",  x:650,  y:200,  c:LC.B,   desc:"Creates a temporary single-item order context. Bypasses cart entirely. Goes directly to checkout."},
  {id:"cart_pg",       s:"page",     label:"Cart Page",                           lane:"B",  x:650,  y:290,  c:LC.B,   desc:"Cart items with current prices (flash sale prices if active), quantity steppers, remove buttons, stock warnings for changed availability."},
  {id:"cart_empty_q",  s:"decision", label:"Cart Empty?",                         lane:"B",  x:645,  y:380,  c:LC.B,   outcomes:["YES → Show empty state + shop link","NO → Continue"]},
  {id:"coupon_inp",    s:"action",   label:"Apply Coupon Code",                   lane:"B",  x:650,  y:458,  c:LC.B,   desc:"Real-time coupon validation via validateCoupon API. Checks code, expiry, usage limit, minimum order amount."},
  {id:"coupon_q",      s:"decision", label:"Coupon Valid?",                       lane:"B",  x:645,  y:528,  c:LC.B,   outcomes:["YES → Apply discount, show savings","NO → Show specific error code"]},
  {id:"discount_ok",   s:"action",   label:"Discount Applied to Total",           lane:"B",  x:650,  y:604,  c:LC.B,   desc:"Discount line shown in order summary. Total recalculated. Coupon code locked in for checkout."},
  {id:"checkout_pg",   s:"page",     label:"Checkout Page",                       lane:"B",  x:650,  y:690,  c:LC.B,   desc:"Final review before payment. Fulfillment selection, address/location, order summary, payment provider selection."},
  {id:"fulfil_q",      s:"decision", label:"Fulfillment Type?",                   lane:"B",  x:645,  y:774,  c:LC.B,   outcomes:["DELIVERY → Select/add address","PICKUP → Select pickup location"]},
  {id:"delivery_addr", s:"action",   label:"Select Delivery Address",             lane:"B",  x:570,  y:848,  c:LC.B,   desc:"Dropdown of saved addresses. Option to add new address inline. Required field for delivery orders."},
  {id:"pickup_loc",    s:"action",   label:"Select Pickup Location",              lane:"B",  x:748,  y:848,  c:LC.B,   desc:"Dropdown of admin-managed pickup locations. Shows name, address, opening hours."},
  {id:"provider_q",    s:"decision", label:"Payment Provider?",                   lane:"B",  x:645,  y:926,  c:LC.B,   outcomes:["Stripe (card)","PayPal","Paystack (card/bank/USSD)"], desc:"Only shows providers that admin has enabled in site settings."},
  {id:"payment_pg",    s:"page",     label:"Payment Page",                        lane:"B",  x:650,  y:1010, c:LC.B,   desc:"Provider-specific payment UI. Stripe: card form via Stripe Elements. PayPal: Smart Button. Paystack: redirect to hosted page."},
  {id:"order_created", s:"action",   label:"Order Created (PENDING)",             lane:"B",  x:650,  y:1082, c:LC.B,   desc:"Transaction: lock variants FOR UPDATE, check stock, snapshot prices, insert order + items + stock reservations (15 min TTL), clear cart."},
  {id:"payment_q",     s:"decision", label:"Payment Successful?",                 lane:"B",  x:645,  y:1152, c:LC.B,   outcomes:["YES → Confirm order","NO → Cancel + release stock"]},
  {id:"pay_fail",      s:"action",   label:"Fail: Release Stock + Notify",        lane:"B",  x:860,  y:1156, c:LC.SYS, desc:"handlePaymentFailure: updates transaction to FAILED, order to CANCELLED, calls releaseOrderStock(), sends failure email."},
  {id:"pay_success",   s:"action",   label:"Commit Stock + Confirm Order",        lane:"B",  x:650,  y:1224, c:LC.B,   desc:"handlePaymentSuccess: commits stock, updates order to CONFIRMED, sends receipt + confirmation emails, broadcasts SSE to admin."},
  {id:"est_delivery",  s:"action",   label:"Admin Sets Est. Delivery Date",       lane:"B",  x:650,  y:1278, c:LC.SYS, desc:"Optional. When admin updates status to Packed/Out for Delivery, they can set an estimated delivery date shown to buyer."},
  {id:"order_conf",    s:"page",     label:"Order Confirmation Page",             lane:"B",  x:650,  y:1338, c:LC.B,   desc:"Order reference, tracking number, items, address/pickup location, totals, estimated delivery (if set), invoice download button."},
  {id:"emails_out",    s:"action",   label:"Emails: Receipt + Confirmation",      lane:"B",  x:650,  y:1396, c:LC.SYS, desc:"sendOrderConfirmationEmail (with PDF invoice attachment) + sendPaymentReceiptEmail dispatched to buyer."},
  {id:"profile_dash",  s:"page",     label:"Profile Dashboard",                   lane:"P",  x:960,  y:290,  c:LC.P,   desc:"Central account hub. Profile card, order stats, quick links to all account sections."},
  {id:"edit_profile",  s:"page",     label:"Edit Profile + Avatar",               lane:"P",  x:960,  y:356,  c:LC.P,   desc:"Update name, phone, country. Upload/crop profile picture. Change password form."},
  {id:"my_orders",     s:"page",     label:"My Orders",                           lane:"P",  x:960,  y:436,  c:LC.P,   desc:"Paginated order list. Filter tabs: All, Pending, Confirmed, Packed, Shipped, Delivered, Cancelled."},
  {id:"order_detail_b",s:"page",     label:"Order Detail + Tracking",             lane:"P",  x:960,  y:504,  c:LC.P,   desc:"Full order detail. Visual status timeline, tracking number, estimated delivery date, external tracking URL (if set by admin), invoice download."},
  {id:"sse_notify",    s:"action",   label:"Real-time SSE Status Updates",        lane:"P",  x:960,  y:562,  c:LC.P,   desc:"When admin updates order status, buyer receives instant SSE notification popup AND order detail page updates live without refresh."},
  {id:"write_review",  s:"page",     label:"Write / Edit Review",                 lane:"P",  x:960,  y:632,  c:LC.P,   desc:"Star rating (1-5) + written review. Only available to buyers with DELIVERED order containing this product."},
  {id:"review_approve_q",s:"decision",label:"Auto-Approve Reviews?",              lane:"P",  x:955,  y:702,  c:LC.SYS, desc:"Controlled by admin's require_review_approval site setting.", outcomes:["require_review_approval=false → Live immediately","true → Pending admin approval"]},
  {id:"addresses_pg",  s:"page",     label:"Saved Addresses",                     lane:"P",  x:960,  y:796,  c:LC.P,   desc:"Manage multiple delivery addresses. Set default address. Add/edit/delete. Default address pre-selected at checkout."},
  {id:"wishlists_pg",  s:"page",     label:"My Wishlists",                        lane:"P",  x:960,  y:864,  c:LC.P,   desc:"Multiple named wishlists (Birthday List, Christmas List, etc.). Create new list, rename, delete list."},
  {id:"wishlist_det",  s:"page",     label:"Wishlist Detail",                     lane:"P",  x:960,  y:932,  c:LC.P,   desc:"Products in a specific wishlist. Add to cart buttons. Move item to another wishlist. Remove item."},
  {id:"recent_pg",     s:"page",     label:"Recently Viewed",                     lane:"P",  x:960,  y:1002, c:LC.P,   desc:"Last 20 viewed products ordered by most recent. Works for logged-in buyers. Anonymous visitors tracked via cookie."},
  {id:"my_reviews",    s:"page",     label:"My Reviews",                          lane:"P",  x:960,  y:1072, c:LC.P,   desc:"All reviews written by this buyer. Star rating, comment, product link, approval status badge. Buyer can edit (not delete)."},
  {id:"mark_helpful",  s:"action",   label:"Mark Review Helpful",                 lane:"P",  x:960,  y:1128, c:LC.P,   desc:"ReviewHelpful junction record created. One vote per user per review. Helpful count shown on review."},
  {id:"saved_search",  s:"page",     label:"Saved Searches + Alerts",             lane:"P",  x:960,  y:1198, c:LC.P,   desc:"Bookmarked search queries. When new product matches a saved search, buyer gets notified via email and SSE notification."},
  {id:"notif_pg",      s:"page",     label:"Notifications Inbox",                 lane:"P",  x:960,  y:1268, c:LC.P,   desc:"Full persistent notification history. All past notifications stored in DB. Mark as read individually or all at once."},
  {id:"notif_prefs",   s:"page",     label:"Notification Preferences",            lane:"P",  x:960,  y:1338, c:LC.P,   desc:"Toggles: order status updates, promotional emails, newsletter. Newsletter subscribe/unsubscribe button."},
  {id:"admin_login",   s:"start",    label:"Admin Login",                         lane:"AO", x:1260, y:80,   c:LC.AO,  desc:"Same login flow but role=admin. Redirects to Admin Dashboard instead of buyer homepage."},
  {id:"admin_dash",    s:"page",     label:"Admin Dashboard",                     lane:"AO", x:1260, y:170,  c:LC.AO,  desc:"Store overview: today's revenue, orders, new users, low-stock count, 7-day chart, traffic summary, recent orders, unread messages badge. Live SSE updates."},
  {id:"admin_prods",   s:"page",     label:"Product Management",                  lane:"AO", x:1260, y:260,  c:LC.AO,  desc:"All products table with search, filter (category/status/stock). Bulk activate/deactivate. Status toggles. Link to add/edit."},
  {id:"admin_add",     s:"page",     label:"Add / Edit Product",                  lane:"AO", x:1260, y:326,  c:LC.AO,  desc:"Product form: name, multi-select categories, rich text description, auto-generated slug, active toggle. After save → Variant Manager."},
  {id:"admin_vars",    s:"page",     label:"Variant + Image Manager",             lane:"AO", x:1260, y:392,  c:LC.AO,  desc:"Manage variants: name, SKU, price, sale_price, is_on_sale toggle, stock_quantity, JSONB attributes. Image upload (max 8, drag to reorder per variant)."},
  {id:"admin_cats",    s:"page",     label:"Category Management",                 lane:"AO", x:1260, y:472,  c:LC.AO,  desc:"Full category tree with drag-to-reorder. Create subcategories at any depth. Edit names, images, sort order. Cascade delete warning."},
  {id:"admin_size",    s:"page",     label:"Size Guide Manager",                  lane:"AO", x:1260, y:538,  c:LC.AO,  desc:"Create measurement charts and assign them to categories. Buyers see 'Size Guide' link on relevant product pages."},
  {id:"admin_banners", s:"page",     label:"Banner Management",                   lane:"AO", x:1260, y:604,  c:LC.AO,  desc:"Homepage hero slider banners. Upload image, set headline, subtitle, CTA text, link destination. Drag to reorder. Toggle active."},
  {id:"admin_flash",   s:"page",     label:"Flash Sale Manager",                  lane:"AO", x:1260, y:684,  c:LC.AO,  desc:"Create flash sales with name, start/end times. Add specific variants with sale prices. Multiple concurrent sales supported."},
  {id:"admin_coupons", s:"page",     label:"Coupon Management",                   lane:"AO", x:1260, y:750,  c:LC.AO,  desc:"Create discount codes: percent or fixed. Set min order amount, max uses, expiry. Usage stats per coupon. Deactivate/delete."},
  {id:"admin_pickup",  s:"page",     label:"Pickup Location Manager",             lane:"AO", x:1260, y:816,  c:LC.AO,  desc:"Manage pickup points: name, full address, city, state, phone, opening hours, active toggle. Buyers select from these at checkout."},
  {id:"admin_orders",  s:"page",     label:"Order Management",                    lane:"AO", x:1260, y:896,  c:LC.AO,  desc:"All orders table. Filter by status, date range, fulfillment type, customer email. Export CSV. Click to view detail."},
  {id:"admin_ord_det", s:"page",     label:"Order Detail (Admin)",                lane:"AO", x:1260, y:962,  c:LC.AO,  desc:"Full order view. Status update dropdown with optional comment. Optional estimated delivery date picker. Tracking URL input. Refund button."},
  {id:"admin_status_flow",s:"action",label:"Order State Machine",                 lane:"AO", x:1260, y:1030, c:LC.AO,  desc:"Valid transitions: PENDING→CONFIRMED→PACKED→OUT_FOR_DELIVERY|READY_FOR_PICKUP→DELIVERED|PICKED_UP. Each transition sends SSE + email to buyer."},
  {id:"admin_customers",s:"page",    label:"Customer Management",                 lane:"AO", x:1260, y:1106, c:LC.AO,  desc:"All registered buyers. Search by name/email. View order history, total spent, last active. Account details."},
  {id:"admin_reviews", s:"page",     label:"Review Management",                   lane:"AM", x:1590, y:260,  c:LC.AM,  desc:"Pending reviews tab (when require_review_approval=true). Approve or delete reviews. Toggle approval requirement setting."},
  {id:"admin_contact", s:"page",     label:"Contact Messages",                    lane:"AM", x:1590, y:326,  c:LC.AM,  desc:"Inbox of all contact form submissions. Filter unread/unreplied. Read full message. Reply via rich text form. Delete messages."},
  {id:"admin_chat",    s:"page",     label:"Live Chat Inbox",                     lane:"AM", x:1590, y:392,  c:LC.AM,  desc:"All active and past chat sessions. Real-time messaging via SSE. Unread chat count badge in sidebar. Close session when resolved."},
  {id:"admin_sales",   s:"page",     label:"Sales Report",                        lane:"AM", x:1590, y:472,  c:LC.AM,  desc:"Date range picker. KPI cards: revenue, orders, avg order value. Daily revenue line chart. Top 10 products bar chart. Export CSV."},
  {id:"admin_traffic", s:"page",     label:"Traffic Analytics",                   lane:"AM", x:1590, y:538,  c:LC.AM,  desc:"Visitor funnel: Visits → Viewed Product → Added to Cart → Checkout → Purchased. Conversion rate, cart abandonment rate."},
  {id:"admin_inv",     s:"page",     label:"Inventory Report",                    lane:"AM", x:1590, y:604,  c:LC.AM,  desc:"All variants with current stock. LOW/OK/OUT badges. Sorted by stock ascending. Export CSV."},
  {id:"admin_settings",s:"page",     label:"Site Settings",                       lane:"AM", x:1590, y:684,  c:LC.AM,  desc:"General, Shipping, Payment providers, Reviews, Stock threshold, Email, Social links, Currency, Maintenance mode toggle."},
  {id:"admin_pages",   s:"page",     label:"Page Editor",                         lane:"AM", x:1590, y:750,  c:LC.AM,  desc:"WYSIWYG rich text editor for: About Us, Contact Us, Terms & Conditions, Privacy Policy, Shipping Policy."},
  {id:"admin_faq",     s:"page",     label:"FAQ Management",                      lane:"AM", x:1590, y:816,  c:LC.AM,  desc:"FAQ categories and items with drag-to-reorder. Question, answer, active toggle per item."},
  {id:"admin_newsletter",s:"action", label:"Newsletter Auto-Trigger",             lane:"AM", x:1590, y:896,  c:LC.AM,  desc:"Automatically sends newsletter to all is_subscribed=true buyers when: new product added OR flash sale created."},
  {id:"admin_saved_search",s:"action",label:"Saved Search Alert Trigger",         lane:"AM", x:1590, y:952,  c:LC.AM,  desc:"When admin adds a new product, checkSavedSearchMatches() runs. Notifies buyers whose saved searches match via email + SSE."},
  {id:"cron_jobs",     s:"action",   label:"Scheduled Cron Jobs",                 lane:"AM", x:1590, y:1022, c:LC.AM,  desc:"Every 5min: cancel expired orders. Every 10min: cleanup reservations. Every 1min: end expired flash sales. Every 6h: low stock alerts."},
];

const NMAP = Object.fromEntries(NODES.map(n=>[n.id,n]));

// ══════════════════════════════════════════════════════════════════════════════
// EDGES
// ══════════════════════════════════════════════════════════════════════════════
const EDGES = [
  {f:"entry",t:"maint_q",label:""},{f:"maint_q",t:"maint_pg",label:"YES"},{f:"maint_q",t:"homepage",label:"NO"},
  {f:"homepage",t:"browse_q",label:""},{f:"browse_q",t:"prod_list",label:"Products"},{f:"browse_q",t:"cat_pg",label:"Category"},
  {f:"browse_q",t:"search_pg",label:"Search"},{f:"browse_q",t:"flash_pg",label:"Flash Sales"},
  {f:"browse_q",t:"arrivals_pg",label:"New In"},{f:"browse_q",t:"sale_pg",label:"Sale"},
  {f:"prod_list",t:"prod_detail",label:"Click Product"},{f:"cat_pg",t:"prod_detail",label:"Click Product"},
  {f:"search_pg",t:"prod_detail",label:"Click Result"},{f:"flash_pg",t:"prod_detail",label:"Click Product"},
  {f:"arrivals_pg",t:"prod_detail",label:"Click Product"},{f:"sale_pg",t:"prod_detail",label:"Click Product"},
  {f:"prod_detail",t:"size_guide",label:"Size Guide Link"},{f:"prod_detail",t:"compare_pg",label:"Compare Button"},
  {f:"prod_detail",t:"auth_q",label:"Add to Cart / Wishlist"},{f:"homepage",t:"about_pg",label:"About Link"},
  {f:"homepage",t:"contact_pg",label:"Contact Link"},{f:"homepage",t:"faq_pg",label:"FAQ Section"},
  {f:"homepage",t:"policies_pg",label:"Footer Links"},{f:"auth_q",t:"login_pg",label:"Not Logged In → Redirect"},
  {f:"auth_q",t:"cart_pg",label:"Logged In → Add to Cart"},{f:"auth_q",t:"wishlists_pg",label:"Logged In → Wishlist"},
  {f:"prod_detail",t:"buy_now",label:"Buy Now"},{f:"buy_now",t:"checkout_pg",label:"Skip Cart"},
  {f:"login_pg",t:"login_meth",label:""},{f:"login_meth",t:"google_auth",label:"Google"},
  {f:"login_meth",t:"creds_form",label:"Email/PW"},{f:"google_auth",t:"anon_merge",label:"Verified"},
  {f:"creds_form",t:"creds_q",label:"Submit"},{f:"creds_q",t:"login_err",label:"NO"},
  {f:"creds_q",t:"anon_merge",label:"YES"},{f:"anon_merge",t:"homepage",label:"→ Redirect Back"},
  {f:"login_pg",t:"signup_pg",label:"Create Account"},{f:"login_pg",t:"forgot_pg",label:"Forgot Password"},
  {f:"signup_pg",t:"country_step",label:"Fill Form"},{f:"country_step",t:"pw_strength",label:""},
  {f:"pw_strength",t:"signup_submit",label:"Submit"},{f:"signup_submit",t:"verify_pg",label:"→ Check Email"},
  {f:"verify_pg",t:"verify_q",label:"Token from URL"},{f:"verify_q",t:"login_pg",label:"YES → Login"},
  {f:"verify_q",t:"resend_opt",label:"NO → Expired"},{f:"forgot_pg",t:"reset_email",label:"Submit Email"},
  {f:"reset_email",t:"reset_pg",label:"Click Email Link"},{f:"reset_pg",t:"pw_done",label:"Submit"},
  {f:"pw_done",t:"login_pg",label:"→ Login"},{f:"cart_pg",t:"cart_empty_q",label:""},
  {f:"cart_empty_q",t:"coupon_inp",label:"NO — Has Items"},{f:"cart_empty_q",t:"prod_list",label:"YES — Continue Shopping"},
  {f:"coupon_inp",t:"coupon_q",label:"Apply Code"},{f:"coupon_q",t:"discount_ok",label:"YES"},
  {f:"discount_ok",t:"checkout_pg",label:"Proceed"},{f:"coupon_q",t:"checkout_pg",label:"NO / Skip Coupon"},
  {f:"checkout_pg",t:"fulfil_q",label:""},{f:"fulfil_q",t:"delivery_addr",label:"DELIVERY"},
  {f:"fulfil_q",t:"pickup_loc",label:"PICKUP"},{f:"delivery_addr",t:"provider_q",label:""},
  {f:"pickup_loc",t:"provider_q",label:""},{f:"provider_q",t:"payment_pg",label:""},
  {f:"payment_pg",t:"order_created",label:"Place Order"},{f:"order_created",t:"payment_q",label:""},
  {f:"payment_q",t:"pay_fail",label:"NO"},{f:"payment_q",t:"pay_success",label:"YES"},
  {f:"pay_success",t:"est_delivery",label:""},{f:"est_delivery",t:"order_conf",label:""},
  {f:"order_conf",t:"emails_out",label:""},{f:"order_conf",t:"my_orders",label:"View My Orders"},
  {f:"order_conf",t:"profile_dash",label:"Go to Account"},{f:"profile_dash",t:"edit_profile",label:"Edit"},
  {f:"profile_dash",t:"my_orders",label:"Orders"},{f:"my_orders",t:"order_detail_b",label:"View"},
  {f:"order_detail_b",t:"sse_notify",label:"Live Updates"},{f:"order_detail_b",t:"write_review",label:"Write Review"},
  {f:"write_review",t:"review_approve_q",label:"Submit"},{f:"profile_dash",t:"addresses_pg",label:"Addresses"},
  {f:"profile_dash",t:"wishlists_pg",label:"Wishlists"},{f:"wishlists_pg",t:"wishlist_det",label:"Open List"},
  {f:"wishlist_det",t:"cart_pg",label:"Add to Cart"},{f:"profile_dash",t:"recent_pg",label:"History"},
  {f:"profile_dash",t:"my_reviews",label:"Reviews"},{f:"my_reviews",t:"mark_helpful",label:"Helpful Vote"},
  {f:"profile_dash",t:"saved_search",label:"Saved Searches"},{f:"profile_dash",t:"notif_pg",label:"Notifications"},
  {f:"profile_dash",t:"notif_prefs",label:"Preferences"},{f:"admin_login",t:"admin_dash",label:""},
  {f:"admin_dash",t:"admin_prods",label:"Products"},{f:"admin_prods",t:"admin_add",label:"Add / Edit"},
  {f:"admin_add",t:"admin_vars",label:"After Save"},{f:"admin_prods",t:"admin_cats",label:"Categories"},
  {f:"admin_cats",t:"admin_size",label:"Size Guides"},{f:"admin_dash",t:"admin_banners",label:"Banners"},
  {f:"admin_dash",t:"admin_flash",label:"Flash Sales"},{f:"admin_flash",t:"admin_newsletter",label:"Auto-trigger"},
  {f:"admin_add",t:"admin_newsletter",label:"New Product"},{f:"admin_add",t:"admin_saved_search",label:"New Product Alert"},
  {f:"admin_dash",t:"admin_coupons",label:"Coupons"},{f:"admin_dash",t:"admin_pickup",label:"Pickup Locations"},
  {f:"admin_dash",t:"admin_orders",label:"Orders"},{f:"admin_orders",t:"admin_ord_det",label:"View"},
  {f:"admin_ord_det",t:"admin_status_flow",label:"Update Status"},{f:"admin_status_flow",t:"sse_notify",label:"→ Buyer SSE"},
  {f:"admin_dash",t:"admin_customers",label:"Customers"},{f:"admin_dash",t:"admin_reviews",label:"Reviews"},
  {f:"admin_dash",t:"admin_contact",label:"Messages"},{f:"admin_dash",t:"admin_chat",label:"Live Chat"},
  {f:"admin_dash",t:"admin_sales",label:"Sales Report"},{f:"admin_dash",t:"admin_traffic",label:"Traffic"},
  {f:"admin_dash",t:"admin_inv",label:"Inventory"},{f:"admin_dash",t:"admin_settings",label:"Settings"},
  {f:"admin_settings",t:"admin_pages",label:"Page Editor"},{f:"admin_settings",t:"admin_faq",label:"FAQ"},
  {f:"admin_dash",t:"cron_jobs",label:"Auto (background)"},
];

// ══════════════════════════════════════════════════════════════════════════════
// PAGE DATA — BATCH 1
// ══════════════════════════════════════════════════════════════════════════════
const PAGE_DATA = {
  homepage: {
    purpose:"Primary entry point for all visitors and returning buyers. Drives brand awareness, product discovery, and conversion through curated sections — all dynamically controlled by the admin.",
    overview:"The Homepage assembles every major discovery pathway in a single scroll. Its sections are independently admin-managed: banners rotate, products refresh, flash sales appear and expire automatically, and testimonials surface the most-helpful reviews. The page renders a different navigation state depending on whether the user is an anonymous visitor, an authenticated buyer, or an admin. Flash Sales section is completely hidden when no active sales exist.",
    sections:[
      {num:"01",name:"Top Navigation Bar",description:"Persistent global header present on every public-facing page. Houses primary navigation, global search with live autocomplete, wishlist shortcut, cart icon with live item-count badge, and user authentication state indicator.",components:["Logo — SVG or image asset, links back to Homepage","Primary nav links: Home, Shop, Flash Sales, Categories, New Arrivals","Search bar — on focus triggers live autocomplete dropdown via debounced API call","Wishlist icon — heart icon; redirects to Login if visitor with return_to param","Cart icon — bag icon with floating circular badge (0–99, then '99+'); links to Cart Page","User avatar — circular, shows initials; hover reveals dropdown: My Account, My Orders, Notifications, Logout","Login / Register CTAs — shown only when no session is active","Announcement bar (optional) — one-line admin-managed promo text above nav; toggled in Site Settings"]},
      {num:"02",name:"Hero Banner Slider",description:"Full-width rotating promotional banner, 100% admin-managed. Each slide has a background image panel, headline, subtitle, primary CTA, and optional secondary CTA. Supports multiple slides, auto-rotates every 5 seconds, pauses on hover.",components:["SliderContainer — full viewport width, fixed height (~220–260px)","SlideItem — two-column layout: content column (left 55%) + image panel (right 45%)","Eyebrow/tag label — small category or promo tag above headline","Headline text — H1 equivalent, admin-set, max 2 lines","Subtitle text — optional body line","Primary CTA button — filled; admin-configured label and destination","Secondary CTA button — outlined; optional","Banner image — admin-uploaded, right panel","Prev / Next arrows — semi-transparent circular buttons","Pagination dots — active dot wider than inactive","Auto-rotation timer — 5 s interval, resets on manual interaction"]},
      {num:"03",name:"Trust Badges Row",description:"Four evenly-divided horizontal cells immediately below the hero. Each cell presents an icon, a bold short label, and a supporting sub-label. Builds buyer confidence at the first visible scroll position.",components:["TrustBadgeCell × 4: Truck / Free Shipping · Shield / Warranty Guaranteed · Refresh / Easy Returns · Headset / 24/7 Support","Horizontal dividers between cells (desktop); 2×2 grid on tablet/mobile"]},
      {num:"04",name:"Category Grid — Shop by Category",description:"Two rows of five category cards, dynamically pulled from the DB sorted by admin sort_order. Clicking any card navigates to the Category Page.",components:["SectionHeader — title, subtitle, 'View All' link (→ all products)","CategoryCard × 10 — image thumbnail (square/rounded), category name label below","Section hidden if no active categories exist","Data: SELECT id, name, image FROM categories WHERE parent_id IS NULL AND is_active=true ORDER BY sort_order LIMIT 10"]},
      {num:"05",name:"New Arrivals Section",description:"Horizontally tab-filterable product grid showing the most recently added products. Tab filter navigates by top-level category.",components:["SectionHeader — 'New Arrivals'","TabFilter pills — All, Men, Women, Kids, Accessories etc.; 'All' selected by default","ProductCard × 4 — image, 'New' badge, wishlist button, name, price, star rating, 'Add to Cart' button","ProductCard states: in-stock / low-stock ('Only N left') / out-of-stock / sale (sale price + strikethrough)"]},
      {num:"06",name:"About Us Snippet",description:"Brand story teaser. Text column: eyebrow, headline, body excerpt, CTA. Image column: brand lifestyle photo. Both pulled from the same Page Editor record as the full About Us page.",components:["Two-column grid: text left, image right","Eyebrow label — 'About Us' small caps","Headline — admin-set H2-level text","Body excerpt — first N characters of About Us content","CTA — 'Explore Our Story' → /about","Brand image — admin-uploaded via About Us page editor"]},
      {num:"07",name:"Flash Sales Section",description:"Dynamically rendered showcase of all currently active flash sales. Hidden entirely when no active flash sales exist. Countdown timer counts to the earliest flash sale end_time.",components:["SectionHeader + 'View All Flash Sales' link","CountdownTimer — D:H:M:S, updates every 1 second, counts to earliest active flash sale end_time","FlashSaleCard × up to 4 — image, sale badge (-X%), name, sale price, strikethrough original, sold-% progress bar","Entire section hidden when NOW() is outside all flash sale windows"]},
      {num:"08",name:"Customer Testimonials",description:"Up to 6 approved reviews ranked by helpful_count DESC, rating DESC. Three-column grid with two pages accessible via pagination dots. Auto-cycles every 6 seconds.",components:["SectionHeader — 'What Our Clients Say'","TestimonialCard × 3 visible — star rating, review body (3-line clamp), reviewer avatar, reviewer first name, 'Verified Purchase' label","Pagination dots — page 1 (cards 1–3) / page 2 (cards 4–6)","Data: SELECT reviews WHERE is_approved=true ORDER BY helpful_count DESC, rating DESC LIMIT 6"]},
      {num:"09",name:"FAQ Accordion Snippet",description:"Preview of the first 4 FAQ items ordered by admin sort_order. First item expanded by default. 'View All FAQs' link navigates to the full FAQ page.",components:["SectionHeader — 'Frequently Asked Questions'","AccordionItem × 4 — question text (trigger), answer body (animated collapse/expand), chevron icon","First item pre-expanded on page load","'View All FAQs' text link → /faq"]},
      {num:"10",name:"Newsletter Subscription",description:"Email capture for registered buyers. Sets is_subscribed=true on the buyer record. Visitors are prompted to create an account first.",components:["Section container — differentiated background","Headline + subtitle","Email input field — inline with Subscribe CTA button","Sub-note — 'Available to signed-up buyers only · Unsubscribe anytime'","Success state: 'Subscribed! You'll hear from us soon.'","Error state: 'No account found — please register first.'"]},
      {num:"11",name:"Footer",description:"Global footer on every public page. Four-column layout: brand info + social, Help, Company, Categories. Bottom bar: copyright + payment provider badges.",components:["Brand column — logo, short description, 4 social media icon buttons (Instagram, Facebook, Twitter, YouTube)","Help column — Contact Us, FAQ, Shipping Policy, Returns Policy","Company column — About Us, Careers, Privacy Policy, Terms & Conditions","Categories column — top-level category links (dynamic from DB)","Bottom bar — copyright string, Stripe / PayPal / Paystack badges"]},
      {num:"12",name:"Floating Live Chat Widget",description:"Persistent circular FAB anchored bottom-right on every public page. Opens a sliding chat panel. Supports anonymous visitors (session-tracked) and authenticated buyers (linked to account).",components:["Chat bubble FAB — circular, fixed position, bottom-right, high z-index","Unread badge — red dot when admin has sent an unread message","Chat panel (on open) — slides up; agent name header; scrollable message thread; text input + send","Anonymous session: identified by session_id cookie","Authenticated buyer: linked to user.id"]}
    ],
    states:[
      "Visitor (unauthenticated): nav shows Login/Register; cart badge hidden or zero; wishlist redirects to login",
      "Buyer (authenticated): nav shows user avatar with dropdown; cart badge shows real count from DB/session",
      "No active flash sales: Flash Sales section is completely hidden — no empty frame",
      "No categories configured: Category Grid section is hidden",
      "Maintenance mode ON: this page replaced entirely by the Maintenance Page for non-admin users",
      "Page loading: product sections show skeleton card placeholders (animated grey boxes)",
      "Mobile viewport: hamburger menu; product grids collapse to 2 columns then 1 column"
    ],
    dataRequirements:[
      "GET /api/banners — active banners ordered by sort_order",
      "GET /api/categories?root=true&limit=10 — top-level categories for grid",
      "GET /api/products?sort=newest&limit=8 — new arrivals with variant images + avg_rating",
      "GET /api/flash-sales/active — active flash sales with product variants + sale prices",
      "GET /api/reviews?approved=true&sort=helpful&limit=6 — testimonials",
      "GET /api/faqs?limit=4&sort=order — first 4 FAQ items",
      "Auth state: from JWT cookie / session token (SSR-accessible)",
      "Cart count: authenticated → DB cart_items count; visitor → localStorage"
    ],
    designNotes:[
      "Hero slider must pause on hover (WCAG 2.1 accessibility requirement for auto-rotating content)",
      "Countdown timer must NOT cause layout reflow on each tick — only update text content nodes",
      "All product images lazy-loaded; hero banner image eagerly loaded (preload link in <head>)",
      "Flash Sales section rendered conditionally server-side — no empty wrapper div should appear on screen",
      "Newsletter form: POST /api/newsletter/subscribe — 200 on success, 404 if email not a registered buyer",
      "About Us snippet pulls from the same DB record as /about — zero admin duplication"
    ]
  },
  prod_list:{
    purpose:"Primary browsable catalogue view. Allows buyers and visitors to discover, filter, sort, and paginate through all active products. Entry point to Product Detail pages.",
    overview:"The Product Listing page serves as the catalogue backbone. It renders a two-column layout — a persistent filter sidebar on the left and a responsive product grid on the right. The page adapts its heading, result count, and pre-applied filters based on entry context (All Products vs. a specific category vs. a search query). Filter state is reflected in the URL query string to support deep-linking and browser back navigation.",
    sections:[
      {num:"01",name:"Top Navigation Bar",description:"Same persistent global header. Search bar shows the current query pre-filled if the page was reached via a search.",components:["NavigationBar — same component as Homepage Section 01","Search bar — pre-populated with query string when loaded from a search action"]},
      {num:"02",name:"Breadcrumb Bar",description:"Single-line contextual breadcrumb below the nav. Reflects current navigation depth. Updates based on how the page was reached.",components:["Breadcrumb — horizontal list separated by '›'","Example paths: Home › Shop · All Products / Home › Women / Home › Search: 'blazer'","Last crumb is non-linked (current page)"]},
      {num:"03",name:"Page Header + Results Info + View Toggle",description:"Row between breadcrumb and main grid area. Shows page title, total matching product count, sort dropdown, and grid/list view toggle.",components:["Page title — H1, dynamically set: 'All Products', 'Women', 'Search: blazer', etc.","Results count — 'Showing X of Y products'","Sort dropdown — Newest First, Price: Low→High, Price: High→Low, Most Popular, Best Rated","View toggle — grid icon (active) / list icon; toggles layout between grid and list mode","Mobile: sort + toggle collapse into a bottom sheet 'Sort & Filter' button"]},
      {num:"04",name:"Active Filter Chips",description:"Horizontal row of dismissible chips showing currently active filter selections. Each chip has a × to remove that filter. 'Clear All' removes all at once. Hidden when no filters are active.",components:["FilterChip × N — label text + × dismiss button","'Clear All' button — secondary style, far right","Row hidden when no filters active"]},
      {num:"05",name:"Filter Sidebar",description:"Fixed-width left sidebar (200px desktop). Each section collapsible via chevron toggle. Filter changes applied immediately — no Apply button needed. URL query string updates to reflect state.",components:["Categories — checkbox list with product count per category; 'Show more' expand link if >5 items","Price Range — dual-handle range slider; min/max input boxes","Size — button-style pill selectors; multi-select","Colour — circular colour swatches (18×18px); multi-select; selected state shows 2px ring","Star Rating — checkbox list: ★★★★★ through ★★★☆☆ with count per tier","In Stock Only — toggle switch (on by default in some views)","On Sale Only — toggle switch","Mobile: sidebar becomes a bottom sheet / drawer triggered by 'Filter' button"]},
      {num:"06",name:"Product Grid",description:"Main content area right of the filter sidebar. Responsive grid of ProductCards. Default 4 columns. Skeleton state shown while fetching.",components:["ProductCard — product image (lazy load), 'New' badge (if created_at within 30 days), sale badge (e.g. '–20%'), wishlist heart button (top-right), quick-compare icon (bottom-right), product name, price, sale price + strikethrough if discounted, star rating + review count, 'Add to Cart' button","ProductCard states: in-stock normal / low-stock ('Only N left') / out-of-stock (greyed button)","SkeletonCard — animated grey placeholder shown during initial fetch","'Add to Cart' triggers auth check; visitors redirected to login"]},
      {num:"07",name:"Pagination",description:"Below the product grid. Numbered page buttons with prev/next arrows. Generated from total_count ÷ page_size.",components:["Prev button — disabled on page 1","Page number buttons — 1, 2, 3, '…', last_page; current page highlighted","Next button — disabled on last page","Results summary — 'Showing products 1–24 of 248'"]}
    ],
    states:[
      "Default (all products): heading = 'All Products', no pre-filters applied",
      "Category context: heading = category name, category filter pre-applied and shown as chip",
      "Search context: heading = 'Results for: [query]', full-text search applied",
      "Flash Sales context: heading = 'Flash Sales', flash-sale filter pre-applied",
      "No results: empty state illustration + 'No products match your filters' + 'Clear All Filters' CTA",
      "Loading: skeleton cards shown in grid area; sidebar still visible with previous filter state",
      "Out-of-stock items can appear (greyed) unless 'In Stock Only' toggle is active"
    ],
    dataRequirements:[
      "GET /api/products?category=&minPrice=&maxPrice=&sizes=&colors=&rating=&inStock=&onSale=&sort=&page=&limit=",
      "Returns: { products[], total_count, page, total_pages, facets{} }",
      "Product fields: id, name, slug, images[0], price, sale_price, is_on_sale, avg_rating, review_count, stock_status, badges[]",
      "GET /api/categories — sidebar category list with product counts",
      "Facets (counts per filter option) ideally pre-computed alongside product results"
    ],
    designNotes:[
      "URL must reflect all active filter state — supports sharing, deep-linking, browser back button",
      "Sort change and filter change both reset pagination to page 1",
      "Wishlist button requires auth; clicking triggers login redirect with return_to param",
      "Compare button adds product to global comparison store (max 4); Compare bar appears at bottom of viewport when ≥2 items selected",
      "Grid view is default; list view shows horizontal card with larger image on left"
    ]
  },
  prod_detail:{
    purpose:"The product-level conversion page. Presents all information needed for a purchase decision and provides the primary Add to Cart and Buy Now entry points.",
    overview:"The Product Detail page is the most information-dense public page. It is split into a two-column upper section (image gallery left, purchase panel right) followed by full-width lower sections for descriptions, specifications, reviews, and related products. Variant selection controls which images display and which price/stock information is shown. Flash sale pricing and countdown timers are displayed inline when applicable. All purchase actions gate on authentication.",
    sections:[
      {num:"01",name:"Navigation Bar + Breadcrumb",description:"Standard global navigation bar, followed by a contextual breadcrumb showing the full category path to this product.",components:["NavigationBar — same as Homepage","Breadcrumb — e.g. Home › Women › Clothing › Classic Tailored Blazer"]},
      {num:"02",name:"Product Image Gallery",description:"Left column of the two-column upper layout. Main image with hover-to-zoom, a scrollable row of up to 8 thumbnails. Selecting a different colour variant swaps the entire image set.",components:["MainImageViewer — large image (min 300px height), Zoom button (top-right, absolute)","Hover zoom — CSS transform scale or zoom overlay lens on desktop hover","ThumbnailStrip — horizontal row, max 8 thumbnails (52–60px); click changes main image; active thumbnail has highlighted border","Variant image swap — clicking a colour swatch swaps the entire gallery to that variant's images"]},
      {num:"03",name:"Product Info Panel",description:"Right column. Contains all purchase-decision content: category tag, action icons, product name, rating row, stock status, price block with optional flash sale countdown, variant selectors, quantity stepper, and CTA buttons.",components:["Category tag — linked pill (e.g. 'Women / Clothing')","Action icons — heart/wishlist button + share/compare icon; top-right","Product name — H1, prominent","Rating row — star icons, avg rating number, review count (linked to reviews section), stock status pill (In Stock / Low Stock / Out of Stock)","Price block card — current price (large); if on sale: strikethrough original + badge (e.g. '–26%'); if flash sale: inner row with '⚡ Flash Sale ends in' + CountdownTimer","Colour variant selector — circular swatches; selected state has 2px border ring; label 'Select Colour'","Size variant selector — pill buttons; selected state highlighted; 'Size Guide' text link; 'Only N left in stock' if low","Quantity stepper — minus / input / plus; min 1, max available stock","'Add to Cart' primary button — full width; requires auth","'Buy Now' secondary button (dark fill) — full width; requires auth; skips to checkout","Trust row — '✓ Free shipping over ₦10,000 · ✓ Easy 30-day returns · ✓ Secure payments'"]},
      {num:"04",name:"Product Description Tabs",description:"Full-width below the two-column upper. Three tabs: Description (admin rich HTML), Specifications (JSONB attributes table), Shipping & Returns (from Site Settings).",components:["TabBar — 'Description', 'Specifications', 'Shipping & Returns'","TabPanel: Description — rich HTML from admin product editor","TabPanel: Specifications — key-value table from variant JSONB attributes","TabPanel: Shipping & Returns — from admin page editor shipping policy content"]},
      {num:"05",name:"Reviews Section",description:"Full-width below tabs. Left: rating summary card (aggregate score + bar chart breakdown). Right: sort tabs + individual review cards.",components:["RatingSummaryCard — overall score (large), star display, 'Based on N reviews', 5-star breakdown progress bars","Sort tabs — Most Recent, Most Helpful, Highest Rated, Lowest Rated","'Write a Review' button — only for buyers with a DELIVERED order for this product","ReviewCard × N — reviewer avatar, name, 'Verified Purchase' label, date, star rating, review body, 'Helpful (N)' button","'Helpful' button creates ReviewHelpful record; one vote per user per review","'Load more reviews' secondary button — fetches next page","Pending approval: buyer's own pending review shows 'Pending Approval' badge"]},
      {num:"06",name:"Recently Viewed + Related Products",description:"Full-width bottom section. Recently viewed (last 20 for logged-in buyers / cookie-tracked for visitors) and related products (same category, by popularity).",components:["SectionHeader — 'You Recently Viewed'","Horizontal product strip × 5 — compact cards; horizontal scroll if more than 5","SectionHeader — 'You May Also Like'","ProductCard row × 4 — same card style as Product Listing grid"]}
    ],
    states:[
      "Visitor: Add to Cart, Buy Now, Add to Wishlist, Write a Review all redirect to Login with return_to param",
      "No active flash sale: Price block shows regular/sale price only — no countdown shown",
      "Flash sale active: Price block shows flash sale price, countdown timer, original price",
      "Selected variant out of stock: 'Out of Stock' greyed button; 'Notify Me When Back In Stock' link appears",
      "Selected variant low stock: 'Only N left in stock' shown in size selector area",
      "No size guide for category: 'Size Guide' link hidden from size selector",
      "Buyer already reviewed: 'Write a Review' becomes 'Edit Your Review'",
      "Review pending approval: buyer sees own review with 'Awaiting Approval' badge; not visible to others"
    ],
    dataRequirements:[
      "GET /api/products/:slug — full product with all variants, images per variant, category path, avg_rating, review_count",
      "GET /api/products/:id/reviews?sort=&page= — paginated review list with reviewer info",
      "GET /api/flash-sales/active?variant_id= — check if selected variant is in active flash sale",
      "GET /api/recently-viewed — last 20 products (auth: from DB; anon: from cookie)",
      "GET /api/products/:id/related — same category products ordered by popularity",
      "POST /api/cart — add item (auth required); returns updated cart count",
      "POST /api/reviews/:id/helpful — mark review helpful (auth required)"
    ],
    designNotes:[
      "Variant selection must update URL (e.g. ?variant=SKU123) to allow direct linking to a specific variant",
      "Flash sale countdown uses the same CountdownTimer component as the Homepage Flash Sales section",
      "Add to Cart should show inline success toast ('Added to cart!') — no page reload",
      "Image gallery thumbnails should be drag-scrollable on touch devices",
      "Reviews section lazy-loads — not included in the initial SSR/SSG payload to keep TTFB low",
      "ReviewCard helpful vote is optimistic: increment client-side immediately, rollback on server error"
    ]
  },
  cat_pg:{
    purpose:"Category-specific landing page providing contextual browsing within a defined product category. Shows subcategory navigation cards followed by a filtered product grid.",
    overview:"The Category Page is a specialised variant of the Product Listing page. It begins with a full-width hero banner for the category, followed by subcategory cards (visual entry points into sub-categories), then transitions into the standard filter sidebar + product grid layout pre-filtered to this category. Subcategory selection updates the pre-applied filter. The page is reached from the Homepage category grid, the navigation, or breadcrumb links.",
    sections:[
      {num:"01",name:"Navigation Bar + Breadcrumb",description:"Same global nav bar. Breadcrumb reflects category depth.",components:["NavigationBar — same as Homepage","Breadcrumb — e.g. Home › Women (or Home › Women › Clothing)"]},
      {num:"02",name:"Category Hero Banner",description:"Full-width visual hero showing the category image with text overlay. Category name + product count displayed bottom-left over a dark gradient. Admin-managed via Category Management.",components:["HeroBanner — full width, height ~140px, background = category.image_url","Dark gradient overlay (bottom to top) — ensures text legibility on any image","Category name — H1, white text, bottom-left positioned","Product count + subcategory summary sub-label — e.g. '124 products · Clothing, Footwear, Accessories'"]},
      {num:"03",name:"Subcategory Cards",description:"Horizontal row of visual cards, one per direct child category. Clicking a card applies that subcategory as a filter or navigates to that subcategory page. Hidden if no child categories exist.",components:["SectionHeader — 'Shop by Subcategory'","SubcategoryCard × N (up to 8 visible, scroll for more) — card with image thumbnail and name label","Active state — selected card has highlighted border + background","Horizontal scroll on mobile if > 4 subcategories"]},
      {num:"04",name:"Filter Sidebar (subcategory-scoped)",description:"Same sidebar as Product Listing but the category filter section displays subcategories of the current parent instead of root categories.",components:["See Product Listing Section 05 for full component list","Subcategory checkboxes replace root category checkboxes","Pre-applied category chip already visible in the Active Filter Chips row"]},
      {num:"05",name:"Product Grid (3-column) + Pagination",description:"3-column product grid (wider cards for category browsing) pre-filtered to this category. Supports all same filtering and sorting as Product Listing.",components:["See Product Listing Section 06 for full component list","Grid uses 3 columns instead of 4 — wider product images for category browsing context"]}
    ],
    states:[
      "No subcategories: Subcategory Cards section hidden entirely",
      "No category image: hero shows a generic gradient fallback background",
      "Subcategory selected: chip added to filter chips row, grid re-filters, URL updates",
      "All products in category out of stock: empty state with 'Check back soon' message",
      "Page reached via direct URL: same pre-filter applied — fully URL-shareable"
    ],
    dataRequirements:[
      "GET /api/categories/:slug — category record with name, image_url, description, parent info",
      "GET /api/categories/:id/children — direct child subcategories",
      "GET /api/products?category_id=&[filters] — product list pre-filtered to this category"
    ],
    designNotes:[
      "Category Page is effectively a Product Listing page with a pre-set context — single component with a 'context' prop avoids duplication",
      "Hero image must have dark gradient overlay — text must be legible regardless of image brightness",
      "Subcategory cards scroll horizontally on mobile if > 4",
      "The active category chip in the filter chips row can be dismissed (reverts to all products, then redirects to /products)"
    ]
  },

  // ─────────────────────────────────────────────────────────────────────────
  search_pg:{
    purpose:"Full-text product search results page. Surfaces matching products ranked by relevance, exposes live autocomplete suggestions, saves search history, and allows buyers to set persistent alerts on search queries.",
    overview:"The Search Results page is the destination for any query entered in the global search bar. The search bar is expanded, always-visible, and full-width on this page — it becomes the page's primary interactive element. Results are ranked server-side using PostgreSQL tsvector/tsquery relevance scoring. The sidebar filters mirror those on Product Listing but are scoped to only the categories and attributes present in the result set (faceted search). A 'Save this search' button allows authenticated buyers to bookmark queries and receive SSE + email notifications when new matching products are added.",
    sections:[
      {num:"01",name:"Expanded Search Bar",description:"Full-width, always-visible search input centered in its own dedicated row. Pre-populated with the current query. Includes a live autocomplete dropdown showing query suggestions (pg_trgm-powered) and the buyer's recent search history. Each recent search can be dismissed or saved as an alert.",components:["Search input — large, 1.5px info-colored border; pre-filled with current query; clear (×) button","Search icon — leading icon inside the input","Search button — trailing CTA inside the input border","Autocomplete dropdown (position:absolute, opens on focus/input)","Dropdown: Suggestions section — query completions from pg_trgm index; first suggestion highlighted","Dropdown: Recent Searches section — past queries with ↺ icon; each has 'Save alert' link and × dismiss button","'Save alert' action — creates SavedSearch record; buyer notified when new matching product added","Annotation: 'Live autocomplete via pg_trgm · Save as alert = notify buyer when new matching product is added'"]},
      {num:"02",name:"Results Meta Row",description:"Single-row bar below the search input showing the result count, the query string in italics, the sort order, a 'Save this search' button, and a sort dropdown.",components:["Results count — 'Showing N results for [query] · sorted by relevance'","'⚡ Save this search' button — success-colored pill; creates SavedSearch record for authenticated buyers; redirects visitors to login","Sort dropdown — Most Relevant (default), Newest First, Price: Low→High, Price: High→Low, Best Rated"]},
      {num:"03",name:"Filter Sidebar",description:"Same filter sidebar as Product Listing, but facets are computed from the current result set only — only categories, sizes, and colours that exist in the results are shown.",components:["Category checkboxes — scoped to matching result categories only with counts","Price Range dual slider","Size pill selectors — only sizes present in results","Colour swatches — only colours present in results","In Stock toggle switch"]},
      {num:"04",name:"Search Results Grid",description:"4-column product grid of matched products. Each card is identical to the Product Listing card. Active filter chips above the grid show current refining filters applied on top of the search.",components:["Active filter chips — dismissible pills for each applied filter; 'Clear all' link","ProductCard × N — image, sale badge, new badge, wishlist button, quick-compare button, name, price, star rating, Add to Cart","'Add to Cart' requires auth — visitors redirected to login","SkeletonCard — shown during initial fetch and on filter change"]},
      {num:"05",name:"No Results State",description:"Shown when the query returns zero products. Replaces the grid area entirely. Provides spelling hints, suggested alternative search terms, and a Browse All CTA.",components:["Large search icon graphic","Headline — 'No results for [query]'","Sub-label — 'Try fewer keywords or check the spelling'","Suggested alternative search term pills — dynamically generated from related categories or truncated query words","'Browse All Products' primary button — navigates to /products"]}
    ],
    states:[
      "Results found: standard sidebar + grid layout",
      "Zero results: grid replaced by No Results State; sidebar hidden or collapsed",
      "Authenticated buyer: 'Save this search' button visible; recent search history shown in autocomplete",
      "Visitor (unauthenticated): 'Save this search' redirects to login with return_to; recent searches still shown from localStorage",
      "Loading: skeleton cards in grid; sidebar visible with empty facets",
      "Filters applied on top of search: active chips row shows filter pills in addition to the query"
    ],
    dataRequirements:[
      "GET /api/search?q=&category=&minPrice=&maxPrice=&sizes=&colors=&inStock=&sort=&page= — full-text search with facets",
      "Returns: { products[], total_count, facets{ categories[], sizes[], colors[], priceRange{} } }",
      "GET /api/search/suggestions?q= — autocomplete suggestions via pg_trgm (debounced, 200ms)",
      "GET /api/saved-searches — buyer's recent search history (auth only)",
      "POST /api/saved-searches — save search alert (auth required)",
      "DELETE /api/saved-searches/:id — dismiss a saved search"
    ],
    designNotes:[
      "The autocomplete dropdown must close on Escape and on click-outside; focus trap is not needed here",
      "Debounce autocomplete API call at 200ms to avoid excessive requests during typing",
      "Highlight matched query terms in bold within product names in the search results grid",
      "The 'Save this search' button must show a filled/active state once saved, and toggle to 'Remove alert'",
      "URL must reflect query and all active filters: /search?q=blue+blazer&category=clothing&inStock=true",
      "Facets should be returned in the same API response as products (not a separate call) to minimise round trips"
    ]
  },

  // ─────────────────────────────────────────────────────────────────────────
  flash_pg:{
    purpose:"Dedicated full page for all currently active and upcoming flash sales. Provides buyers a single destination to discover every time-limited deal, with countdown timers, sold-percentage progress bars, and upcoming sale previews.",
    overview:"The Flash Sales page groups deals by sale name, each sale displayed as a self-contained block with its own header, countdown timer, and 5-column product grid. Multiple concurrent sales are each rendered as separate blocks stacked vertically. An additional 'Upcoming Flash Sales' section below shows future sales in a greyed-out, teaser state with product images blurred or obscured until the sale starts. The 'Flash Sales' nav link is styled with a danger/red accent to draw attention when this page is active.",
    sections:[
      {num:"01",name:"Page Header with Active Sale Count",description:"Full-width header block in a secondary background showing the page title, a 'N Active Now' live badge, and a sub-label. Breadcrumb sits within this block.",components:["Page title — 'Flash Sales' H1","Active sales badge — danger-colored pill: 'N Active Now' where N updates via SSE","Sub-label — 'Limited time deals — grab them before they're gone'","Breadcrumb — 'Home › Flash Sales'"]},
      {num:"02",name:"Active Flash Sale Blocks (one per sale)",description:"Each active sale renders as a bordered card. The card header contains the sale name, a 'LIVE' badge, and the countdown timer. The card body contains a 5-column product grid with sold-% progress bars. A 'View all items in this sale →' secondary button at the bottom links to a filtered product listing scoped to that sale.",components:["SaleCard — bordered, rounded container; one per active flash sale","SaleHeader — sale name (with ⚡ prefix), 'LIVE' badge, countdown timer (H:MM:SS monospace digits)","ProductGrid — 5 columns; ProductCard variant for flash sales: image, sale % badge, name, sale price, strikethrough original price, sold-% progress bar (danger color fill, percentage text below), Add to Cart button","'View all items in this sale →' secondary button — links to /products filtered by this flash sale ID","Multiple SaleCards stacked vertically in order of end_time ASC (soonest-expiring first)"]},
      {num:"03",name:"Upcoming Flash Sales Section",description:"Below all active sales. Shows sales whose start_time is in the future. Products are shown in a greyed-out, semi-opaque card grid with prices hidden ('Price revealed at start'). A 'Set Reminder' button allows buyers to opt-in to a notification when the sale goes live.",components:["SectionHeader — 'Weekend Mega Sale' + 'Starts in Xh Ym' warning-colored badge","'Set Reminder' button — saves buyer preference; sends SSE + email when sale goes live","UpcomingProductCard × 5 — semi-opaque (opacity 0.6), image visible, name visible, price hidden: 'Price revealed at start'","Section entirely hidden if no upcoming flash sales exist"]}
    ],
    states:[
      "No active flash sales: Active Sales section replaced by a friendly empty state with 'Check back soon' message; Upcoming section shown if future sales exist",
      "No upcoming sales: Upcoming section hidden entirely",
      "Authenticated buyer: 'Set Reminder' button enabled; Add to Cart functional",
      "Visitor: 'Set Reminder' redirects to login; Add to Cart redirects to login",
      "Sale ends during page view: countdown timer hits 00:00:00, SSE pushes update, sale block fades out and is removed from DOM",
      "New sale goes live during page view: SSE pushes a new SaleCard into the active section"
    ],
    dataRequirements:[
      "GET /api/flash-sales?status=active — all active flash sales with products + sale prices + sold counts",
      "GET /api/flash-sales?status=upcoming — future flash sales with product previews (prices omitted)",
      "SSE /api/events — listens for flash_sale_started, flash_sale_ended events to update page live",
      "POST /api/flash-sales/:id/remind — set reminder (auth required)",
      "Product sold count: derived from confirmed order items within the sale window, updated via SSE"
    ],
    designNotes:[
      "Countdown timers use the same shared CountdownTimer component as Homepage and Product Detail — single source of truth",
      "Sold-% progress bar must not show more than 100% even if sold count exceeds stock (edge case on concurrent orders)",
      "The 'LIVE' badge should pulse subtly (CSS animation) to indicate real-time status",
      "SaleCards should be ordered by end_time ASC — the soonest-ending sale is most urgent and shown first",
      "Flash sale product cards should not show the quick-compare or wishlist buttons to keep the card compact at 5 columns",
      "Product prices in Upcoming section must be fully hidden server-side — not just CSS hidden — to prevent inspect-element cheating"
    ]
  },

  // ─────────────────────────────────────────────────────────────────────────
  arrivals_pg:{
    purpose:"Dedicated page for the most recently added products, sorted by creation date and optionally grouped by arrival date. Gives regular shoppers a clean view of what's new since their last visit.",
    overview:"The New Arrivals page is a chronologically-ordered product catalogue with a date-grouping feature unique to this page. Products are grouped under date labels ('Added Today', 'Added Yesterday', 'Added This Week') as the buyer scrolls. The page header shows a 'Last updated' timestamp to signal freshness. A 'Added Within' radio filter in the sidebar lets buyers narrow to products added in the last 24h, 3 days, 7 days, or 30 days. Category filter tabs at the top allow quick switching between top-level categories. The 'New' badge appears on every card.",
    sections:[
      {num:"01",name:"Page Header + Breadcrumb",description:"Two-column header: left holds breadcrumb, page title, and sub-label; right holds a 'Last updated' timestamp showing when the most recent product was added.",components:["Breadcrumb — 'Home › New Arrivals'","Page title — 'New Arrivals' H1","Sub-label — 'Fresh drops this week — updated daily'","Last updated — right-aligned label + timestamp (e.g. 'Today, 09:15 AM'); derived from MAX(created_at) of visible products"]},
      {num:"02",name:"Category Filter Tabs",description:"Horizontal scrollable tab row of top-level categories. Selecting a tab filters the grid to that category without losing the 'Added Within' sidebar filter. 'All' is selected by default.",components:["TabPill × N — 'All' (active by default), then each top-level category name; horizontal scroll on overflow","Active state — info-colored background + border","Tab selection updates URL query param and re-fetches grid; does not trigger a full page navigation"]},
      {num:"03",name:"Filter Sidebar",description:"Left sidebar with filters unique or adapted for this page. 'Added Within' radio group replaces the standard category filter.",components:["Added Within — radio group: Today / Last 3 days / Last 7 days / Last 30 days","Price Range — dual-handle range slider","Colour swatches — multi-select","In Stock Only — toggle switch"]},
      {num:"04",name:"Date-Grouped Product Grid",description:"Product grid on the right, grouped by arrival date with horizontal rule date-label separators. Each group is a 4-column grid with a 'Added [Date] — N products' centred heading between groups. All cards show the 'New' badge. Sorted newest-first within each group.",components:["DateGroupSeparator — thin horizontal rule with centred date label (e.g. 'Added Today — 12 products')","ProductCard (New Arrivals variant) × N — image, 'New' badge (always visible on this page), wishlist button, name, price, star rating, Add to Cart button","Results count — 'N new products in the last X days'","Sort dropdown — Newest First (default), Price: Low→High, Price: High→Low","'Load More' secondary button — appends next page of results to the existing grid (no scroll reset)"]}
    ],
    states:[
      "All category selected: shows all recently added products grouped by date",
      "Category tab selected: grid refilters to that category; date grouping maintained",
      "Added Within = Today: shows only products added in the past 24 hours; may show empty state if none",
      "Empty state: 'No new products added in this period' with CTA to Browse All",
      "Loading: skeleton cards shown per group",
      "Authenticated buyer: Add to Cart functional; wishlist functional",
      "Visitor: Add to Cart + wishlist redirect to login with return_to"
    ],
    dataRequirements:[
      "GET /api/products?sort=newest&addedWithin=7&category=&minPrice=&maxPrice=&colors=&inStock=&page= — new arrivals with filters",
      "Returns: { products[], total_count, last_updated } — products include created_at for date grouping client-side",
      "GET /api/categories?root=true — category tab list",
      "Date grouping logic runs client-side: group by DATE(created_at) and sort DESC"
    ],
    designNotes:[
      "The date-group separator ('Added Today — 12 products') is the key visual differentiator of this page vs the standard product listing",
      "'Last updated' timestamp in the header is the MAX(created_at) of the fetched result set — update it when results change",
      "The 'New' badge should always be shown on every card on this page — it is redundant but reassuring to users who expect it here",
      "Radio-group 'Added Within' filter must mutually exclude options — selecting 'Last 7 days' always includes Today and Yesterday",
      "'Load More' should append results to the existing grouped list, not reset scroll — maintain date group context"
    ]
  },

  // ─────────────────────────────────────────────────────────────────────────
  sale_pg:{
    purpose:"Dedicated sale catalogue showing all products currently discounted by either a price markdown (is_on_sale=true) or an active flash sale. Allows buyers to browse and filter the full universe of discounts in one place.",
    overview:"The Sale page is visually differentiated from other listing pages by its danger-colored banner header, which communicates the promotional nature of the page immediately. Products from two sources appear here: those with is_on_sale=true and their sale_price set by the admin, and those currently included in an active flash sale. Sale Type filter tabs at the top allow buyers to isolate flash sale deals from permanent markdowns. The sidebar includes a unique 'Discount Range' filter (e.g. 10–20%, 20–40%) and a 'Sale Type' radio group. Each card prominently shows the savings amount ('Save ₦N,000') and a flash badge where applicable.",
    sections:[
      {num:"01",name:"Page Header + Sale Banner",description:"Full-width danger-colored banner that immediately signals this is a promotional page. Shows breadcrumb, page title, and the total count of items currently on sale.",components:["Banner container — danger background color","Breadcrumb — 'Home › Sale' in danger text color","Page title — 'Sale & Discounted Products' in danger text color","Sub-label — 'Showing all products with active discounts · Up to X% off'","Item count — large number in danger text color + 'items on sale' label; dynamically fetched"]},
      {num:"02",name:"Sale Type Filter Tabs",description:"Four tab buttons below the banner header to filter by discount type. Each tab shows its item count. Active tab adopts the danger color scheme.",components:["Tab: All Discounts — shows total count; danger-colored when active","Tab: Flash Sales — shows count of flash-sale items only","Tab: Price Marked Down — shows count of is_on_sale=true items","Tab: Bundle Deals — placeholder for future feature (shown greyed or hidden if no bundle deals exist)","Tab selection updates URL query param and refilters grid"]},
      {num:"03",name:"Filter Sidebar",description:"Left sidebar with filters tailored to the sale context. Includes a unique 'Discount Range' filter and a 'Sale Type' radio group not found on other listing pages.",components:["Discount Range — checkboxes: 10–20% (N), 20–40% (N), 40–60% (N), 60%+ (N)","Category — standard checkbox list with counts scoped to sale items","Price After Discount — range slider; shows final discounted price range","Sale Type — radio: Flash Sale / Price Markdown / Both"]},
      {num:"04",name:"Sale Products Grid",description:"4-column product grid of all discounted items. Cards are enhanced for the sale context — they prominently show the savings amount and a flash badge for flash-sale items.",components:["Results count — 'N discounted products'","Sort dropdown — Highest Discount (default), Price: Low→High, Price: High→Low, Best Rated","ProductCard (Sale variant) — image, sale % badge, optional '⚡ Flash' badge (for flash-sale items), wishlist button, name, sale price, strikethrough original price, 'Save ₦N,000' green savings label, Add to Cart button","'Load More' secondary button"]}
    ],
    states:[
      "Default: all discounted products (is_on_sale=true OR in active flash sale)",
      "Flash Sales tab active: only products in currently active flash sales",
      "Price Marked Down tab active: only is_on_sale=true products (excludes flash-only sales)",
      "No sale items: empty state with 'No discounts active right now' + 'Browse All Products' CTA",
      "A flash sale ends during page view: affected products removed from results via SSE update",
      "Authenticated buyer: Add to Cart functional",
      "Visitor: Add to Cart redirects to login"
    ],
    dataRequirements:[
      "GET /api/products?onSale=true&saleType=all|flash|markdown&discountMin=&discountMax=&category=&minPrice=&maxPrice=&sort=&page=",
      "Returns: { products[], total_count, facets{ discountRanges[], categories[] } }",
      "Product fields include: sale_percentage (computed), savings_amount (computed), is_flash_sale (bool), flash_sale_end_time",
      "Total sale item count in header: SELECT COUNT(*) WHERE is_on_sale=true OR (in active flash sale)",
      "SSE: listen for flash_sale_ended to remove expired flash items from the grid in real time"
    ],
    designNotes:[
      "The danger-colored page banner is the only place in the buyer-facing UI that uses the danger color as a full-width background — it must be bold and intentional",
      "The '⚡ Flash' badge on product cards must be visually distinct from the percentage badge — they can coexist on the same card",
      "'Save ₦N,000' savings label uses the success (green) color to reinforce positive framing of the discount",
      "Sort default is 'Highest Discount' — this is unique to this page and should be the obvious sort for deal-hunters",
      "Discount Range checkboxes should be multi-select (not radio) to allow buyers to include e.g. 20–40% AND 40–60% simultaneously"
    ]
  },

  // ─────────────────────────────────────────────────────────────────────────
  compare_pg:{
    purpose:"Side-by-side product comparison table allowing buyers to evaluate up to 4 products across all key attributes before making a purchase decision.",
    overview:"The Product Comparison page is reached by adding products to a comparison context (via the compare button on product cards or the sticky comparison bar) and then clicking 'Compare Now'. The page renders a structured HTML table with product columns and attribute rows. The column with the best value (lowest price or highest rating) is automatically highlighted. Differences between products are visually emphasised. A 'sticky comparison bar' — a floating bar that appears at the bottom of Product Listing and Product Detail pages — is the primary trigger surface for this page. Up to 4 products can be compared simultaneously; a '+' slot invites adding a fourth.",
    sections:[
      {num:"01",name:"Page Header",description:"Clean header row with breadcrumb, page title, slot usage counter, and action buttons.",components:["Breadcrumb — 'Home › Compare Products'","Page title — 'Compare Products' H1","Sub-label — 'Select up to 4 products to compare side by side'","Slot counter — 'N of 4 slots used'","'Clear All' secondary button — removes all products from comparison","'Add Product +' primary button — opens a product search modal to add another product"]},
      {num:"02",name:"Comparison Table",description:"Full-width scrollable HTML table. Column 0 is the attribute label column (sticky on scroll). Each product column shows the product image, name, category, and an optional 'Best Value' badge. The final column is an empty '+' slot for adding a fourth product. Attribute rows cover all key decision dimensions.",components:["TableHeader — sticky on horizontal scroll; product image (90px height), × remove button (top-right of image), product name, category breadcrumb, 'Best Value' badge (info-colored pill) on the column with highest rating or lowest price","AddSlot column — dashed-border image placeholder with '+' label and 'Add a product' text","Attribute rows: Price, Sale Price, Rating (★ display + count), In Stock (✓/✗ with colour coding), Sizes Available, Colours (count), Material, Flash Sale status, Shipping cost","Best-value column highlighted with info background across all rows","In Stock row: ✓ in success green, ✗ in danger red","Sale Price row: discounted values shown in danger red","Flash Sale row: 'Active (ends Xh)' shown in danger red","Bottom action row: 'Add to Cart' primary + 'View Product' secondary per column"]},
      {num:"03",name:"Sticky Comparison Bar",description:"A floating bar fixed at the bottom of the viewport that appears on Product Listing and Product Detail pages when the buyer has added ≥2 products to the comparison context. Shows product thumbnails with names and a 'Compare Now' CTA.",components:["Bar container — fixed bottom-0, full width, white background with shadow","'Compare:' label","ProductChip × N — mini image thumbnail (24×24px) + product name truncated + × remove button","AddSlot chip — dashed border, '+Add' label, shown when fewer than 4 products selected","'Compare Now' primary button — right-aligned; navigates to /compare with product IDs in query params","Bar appears when compareStore.length >= 2; hidden when < 2"]}
    ],
    states:[
      "1 product selected: comparison bar not shown; 'Compare Now' button disabled",
      "2–4 products selected: comparison bar visible; 'Compare Now' active",
      "4 products selected: '+' slot in table and bar hidden; 'Add Product +' button disabled",
      "A product is out of stock: its 'Add to Cart' button in the table is greyed and labelled 'Out of Stock'",
      "Best value column: automatically determined — lowest price wins on price rows; highest rating on rating rows; 'Best Value' badge applied to that column header",
      "Mobile: table scrolls horizontally; attribute label column remains sticky"
    ],
    dataRequirements:[
      "GET /api/products/compare?ids=id1,id2,id3,id4 — fetch full comparison data for up to 4 product IDs",
      "Returns: products[] each with: price, sale_price, avg_rating, review_count, stock_status, sizes[], colors[], material, flash_sale_active, flash_sale_end_time, shipping_cost",
      "Compare context (selected product IDs) stored in global state / localStorage — persists across page navigations",
      "POST /api/cart — add item from comparison table (auth required)"
    ],
    designNotes:[
      "The comparison table must be horizontally scrollable on smaller viewports — the attribute column sticks on the left",
      "Best-value highlighting is applied column-wide (all cells in that column get the info background) — not just the header",
      "Differences between rows should be visually surfaced: if only one product has a flash sale, that cell gets a danger highlight",
      "The sticky comparison bar uses a compound animation: slides up from below when first product is added to reach ≥2 threshold",
      "Removing a product from the bar (×) immediately updates the table without a page reload",
      "The 'Add Product +' button in the page header opens an inline search modal (not a new page) for seamless UX"
    ]
  },

  // ─────────────────────────────────────────────────────────────────────────
  login_pg:{
    purpose:"The primary authentication entry point for all users — buyers and admins. Provides two parallel login methods (Google OAuth and email + password) in a branded, conversion-optimised split layout.",
    overview:"The Login page uses a two-column split layout. The left panel is a static brand panel that reinforces value propositions with a feature checklist and brand illustration — it is purely motivational and non-interactive. The right panel contains the full login form. Google OAuth is presented above the fold as the preferred, lowest-friction method. Below a visual divider, the traditional email + password form is available. Both methods flow through the same post-login logic: anonymous activity is merged into the authenticated account, and the buyer is redirected to their original destination (via return_to query param) or the homepage. Admins who log in via this same form are routed to the Admin Dashboard instead.",
    sections:[
      {num:"01",name:"Brand Panel (left column)",description:"Static motivational panel occupying the left half of the split layout. Contains the logo, a welcome sub-heading, a brand illustration placeholder, and a 4-item checklist of buyer benefits. Purely decorative and informational — no interactive elements.",components:["Logo — WillOfGod brand name, large font weight","Welcome headline — 'Welcome back. Sign in to access your orders, wishlist and exclusive deals.'","Brand illustration — image placeholder (admin-uploaded asset or design-time illustration)","Feature checklist × 4 — each item: circular success-coloured checkmark icon + label: 'Access your orders & tracking', 'Manage your wishlists', 'Exclusive member deals', 'Faster checkout'"]},
      {num:"02",name:"Google OAuth Button",description:"Presented first, above the email form, as the lowest-friction login method. Clicking initiates the Google OAuth consent flow. Server-side: the returned ID token is verified via Google's public JWKS endpoint. If the email has no existing account, one is auto-created with is_verified=true and the buyer is logged in seamlessly.",components:["Google OAuth button — full-width, outlined, white background, Google G icon, label: 'Continue with Google'","Annotation: 'Google OAuth · ID token verified server-side · New users auto-registered with is_verified=true'"]},
      {num:"03",name:"'Or' Divider",description:"Visual separator between the Google button and the email form. A horizontal line with 'or sign in with email' centred in white space.",components:["Divider rule — two lines with centred text: 'or sign in with email'"]},
      {num:"04",name:"Email + Password Form",description:"Standard credential form. Email field is a plain text input. Password field has a show/hide toggle (👁 icon, absolute-positioned right). On validation failure, the password field border turns to danger colour and an inline error message appears below it with a 'Forgot password?' link. A 'Remember me' checkbox extends session duration. Rate limiting engages after 5 failed attempts per 15 minutes per IP.",components:["Email input — type=email, placeholder 'you@example.com', label 'Email address'","Password input — type=password, placeholder 'Enter your password', padding-right for 👁 icon, label 'Password'","Show/hide toggle — absolute 👁 icon in password field; toggles type between password and text","Error state — password field border turns danger-coloured; inline error message below: '! Incorrect email or password. Forgot password?' (the forgot link is inline in the error text)","'Remember me' checkbox — left-aligned, extends session TTL","'Forgot password?' link — right-aligned, in the same row as 'Remember me'","Sign In primary button — full width","Rate limit annotation: 'Rate limited to 5 attempts per 15 min per IP · Anonymous browsing history merged on login'","Footer text — 'Don't have an account? Create account' link"]},
    ],
    states:[
      "Default: both fields empty, no error states shown",
      "Credentials error: password border → danger, inline error message visible with Forgot password link",
      "Rate limited (429): form disabled, 'Too many attempts. Please try again in X minutes.' banner shown",
      "Loading (submitting): Sign In button shows spinner/disabled state to prevent double-submission",
      "Return redirect: page loaded with ?return_to=/cart — post-login, user is sent back to that URL",
      "Admin login: same form — role=admin on the user record causes redirect to /admin/dashboard instead of homepage",
      "Google OAuth error: if Google consent is denied or fails, an inline banner displays the OAuth error"
    ],
    dataRequirements:[
      "POST /api/auth/login — { email, password } → sets httpOnly JWT cookie, returns { role, redirect_to }",
      "GET /api/auth/google — initiates OAuth redirect flow",
      "POST /api/auth/google/callback — verifies ID token, creates or retrieves user, sets session",
      "POST /api/auth/merge-anonymous — called after successful login to merge anonymous activity (cart, recently viewed, page views)"
    ],
    designNotes:[
      "Split layout: left panel is bg-secondary, right panel is bg-primary; a single vertical border divides them",
      "The show/hide password toggle must NOT use a separate button element — use an absolutely positioned span to avoid form submission on click",
      "The inline error message should include the 'Forgot password?' link as a natural reading flow, not as a separate element below",
      "Google button must follow Google's brand guidelines: white background, Google G icon, exact label 'Continue with Google'",
      "Post-login merge (linkAnonymousToUser) must be called before the redirect — use an await chain server-side",
      "Both auth methods must honour the return_to query param; sanitise the URL to prevent open redirect attacks"
    ]
  },

  // ─────────────────────────────────────────────────────────────────────────
  signup_pg:{
    purpose:"New buyer registration page. Collects personal details, country, and password in a single multi-step inline form while guiding the user through what comes next via a visible step indicator.",
    overview:"The Sign Up page uses the same two-column split layout as Login, but the left panel shows a 3-step progress indicator alongside the brand panel. The right panel contains the full registration form presented as a single scrollable form with inline step sections. Step 1 collects name, email, and password (with real-time strength meter). Step 2 is an inline country selection dropdown. Both steps are on the same screen — there is no multi-page step navigation. On submission, the account is created with is_verified=false, and two emails are dispatched: a verification email and a welcome email. The buyer is redirected to the Email Verification page.",
    sections:[
      {num:"01",name:"Brand Panel + Step Indicator (left column)",description:"The left panel contains the WillOfGod brand mark, a short motivational tagline, a brand illustration, and a vertical 3-step indicator showing the signup journey: Personal Details (active), Your Country (upcoming), Verify Email (upcoming).",components:["Logo + tagline — 'Join thousands of shoppers. Get access to exclusive deals, order tracking and your personal wishlist.'","Brand illustration placeholder","Step indicator — vertical list of 3 steps, each with: numbered circle (info-coloured when active, tertiary when upcoming), step title, step sub-label","Step 01: Personal Details — active (info background circle, bold title)","Step 02: Your Country — upcoming (greyed circle, normal title)","Step 03: Verify Email — upcoming (greyed circle, normal title)"]},
      {num:"02",name:"Step 1 — Personal Details Form",description:"Top section of the right panel form. Collects full name, email address, password, and confirm password. Name and email show real-time inline validation (success state = green border + '✓ Looks good' / '✓ Available'). Password shows a 4-segment strength bar with a text label (Weak / Medium / Strong). Confirm password shows a match/mismatch indicator.",components:["Heading — 'Create account' + 'Already have one? Sign in' link","Google Sign Up button — full-width outlined, same style as Login page","'Or sign up with email' divider","Full name input — type=text, placeholder 'John Adebayo'; success state: green border + '✓ Looks good' below","Email input — type=email; success state: green border + '✓ Available' (checked via async email-availability endpoint); error state: '✕ Already registered — Sign in?' with login link inline","Password input — type=password, 👁 show/hide toggle, label 'Password', padding-right for icon","Password strength bar — 4-segment horizontal bar: each segment fills with colour (danger=red → warning=amber → success=green) based on entropy score; text label below: 'Weak / Medium — add a special character / Strong'","Confirm password input — type=password, shows '✓ Passwords match' in success green when both match, '✕ Passwords do not match' in danger red when they differ"]},
      {num:"03",name:"Step 2 — Country Selection (inline)",description:"Directly below Step 1 fields in the same form. A labelled country dropdown. Selected country is stored on the user profile and affects currency display throughout the site. This is not a gate — users can change country later in their profile.",components:["Country label — 'Your country'","Country dropdown — <select> with all countries; default: 'Select your country…'; pre-selects Nigeria as first option based on geolocation hint","Annotation: 'Country stored on user profile · Affects currency display · Can be updated later in Profile Settings'"]},
      {num:"04",name:"Terms Checkbox + CTA",description:"Bottom of the form. Terms acceptance checkbox is required. Create Account button is the form submit. Below it, a sign-in redirect link.",components:["Terms checkbox — required; label: 'I agree to the Terms & Conditions and Privacy Policy' with both as inline links","Create Account primary button — full width; disabled until terms checkbox is checked","Annotation: 'On submit: account created with is_verified=false · Verification + welcome emails dispatched'","Footer text — 'Already have an account? Sign in instead'"]}
    ],
    states:[
      "Default: all fields empty, step indicator shows Step 01 active",
      "Name field valid: green border, '✓ Looks good'",
      "Email available: green border, '✓ Available'",
      "Email already registered: danger border, '✕ Already registered — Sign in?' with inline link",
      "Password weak: 1 segment filled in red, 'Weak — needs uppercase, number and special character'",
      "Password medium: 2–3 segments filled in amber, 'Medium — add a special character'",
      "Password strong: all 4 segments filled in green, 'Strong password ✓'",
      "Passwords match: confirm field green border, '✓ Passwords match'",
      "Passwords mismatch: confirm field danger border, '✕ Passwords do not match'",
      "Terms unchecked on submit: checkbox highlighted, form not submitted",
      "Submitting: button shows spinner/disabled state"
    ],
    dataRequirements:[
      "GET /api/auth/check-email?email= — real-time email availability check (debounced 400ms)",
      "POST /api/auth/register — { name, email, password, country } → creates user (is_verified=false), dispatches verification + welcome emails",
      "GET /api/countries — list of country names and codes for the dropdown"
    ],
    designNotes:[
      "Password strength is computed client-side using zxcvbn or equivalent entropy scorer — no server round-trip",
      "Email availability check is debounced at 400ms; show a subtle loading indicator in the field while the request is in-flight",
      "The confirm password check runs purely client-side on input — no API call needed",
      "Terms checkbox must be a real <input type=checkbox> for accessibility — do not use a custom div",
      "Country dropdown should respect the user's browser locale as a default selection hint, but Nigeria is the first option in the list",
      "The Google Sign Up button behaves identically to the Login page Google button — Google auto-selects between register and login"
    ]
  },

  // ─────────────────────────────────────────────────────────────────────────
  verify_pg:{
    purpose:"Email verification flow — handles three distinct states: post-signup check-your-email prompt, successful token verification with auto-redirect countdown, and expired/invalid token error with resend option.",
    overview:"The Email Verification page is a single-column, centred, narrow-layout page (max-width ~480px) that a buyer lands on in two contexts: (1) immediately after sign-up, where it shows the 'Check your email' prompt; and (2) after clicking the verification link in the email, where it shows either a success state (token valid) or a failure state (token expired or already used). The success state includes a live 3-second countdown before auto-redirecting to the Login page. All three states live on the same route (/verify-email) but render conditionally based on the URL query param and server-side token validation result.",
    sections:[
      {num:"01",name:"Check Email State (post-signup prompt)",description:"The default state shown immediately after account creation. A large mail icon, a headline, and a message telling the buyer where the link was sent. Below: a 'Didn't get the email?' helper box with a Resend button.",components:["Minimal nav bar — logo only, no nav links (distraction-free context)","Mail icon — 64×64px circle, info-coloured background, ✉ symbol inside","Headline — 'Check your email'","Body text — 'We sent a verification link to [email address]. Click the link in the email to verify your account.' (email in bold)","'Didn't get the email?' helper card — secondary background, slightly lower visual prominence: title, body ('Check your spam folder. The link expires in 24 hours.'), 'Resend Verification Email' secondary button","Resend button annotation: 'Resend generates new token, stores new Redis key (24h TTL), sends new email · Previous token is invalidated'"]},
      {num:"02",name:"Verification Success State (valid token)",description:"Shown after the server validates the token from the URL query string. Displays a large success checkmark, a confirmation message, a countdown timer counting down from 3 to 0, and a manual 'Go to Login Now' button for buyers who don't want to wait.",components:["Success icon — 64×64px circle, success-coloured background, ✓ symbol inside","Headline — 'Email verified!'","Body text — 'Your account is now active. You can start shopping.'","Countdown box — secondary background card: 'Redirecting to login in...' label + large monospace countdown number (3 → 2 → 1 → redirect)","'Go to Login Now' button — allows immediate redirect without waiting for countdown","Annotation: 'Auto-redirect to login after 3s · is_verified=true set on user record · Redis key deleted'"]},
      {num:"03",name:"Verification Failed State (expired/invalid token)",description:"Shown when the token in the URL does not exist in Redis (expired, already used, or tampered). Displays a danger icon, error message, and two actions: request a new link or go back to login.",components:["Danger icon — 64×64px circle, danger-coloured background, ✕ symbol","Headline — 'Link expired or invalid'","Body text — 'This verification link has expired or already been used. Request a new one below.'","'Send New Verification Email' primary button — generates and sends a new token","'Back to Login' text link — below the button"]}
    ],
    states:[
      "Post-signup: renders State 01 (check email prompt); email address interpolated from POST /register response stored in session",
      "Valid token (?token=xxx): server validates → State 02 shown; countdown starts; is_verified=true written to DB",
      "Invalid/expired token: server returns error → State 03 shown",
      "Resend clicked (in State 01 or 03): new token generated; cooldown of 60s before resend is allowed again (prevents spam); button shows 'Sent! Check your inbox' with a tick after success",
      "Resend cooldown: 'Resend Verification Email' button is disabled and shows countdown: 'Resend in Xs'"
    ],
    dataRequirements:[
      "GET /api/auth/verify-email?token= — validates HMAC token against Redis; sets is_verified=true on match; deletes Redis key",
      "Returns: { success: true } | { error: 'expired' | 'invalid' | 'already_verified' }",
      "POST /api/auth/resend-verification — { email } → generates new token, stores in Redis (24h TTL), sends email",
      "Rate limit on resend: 1 per 60 seconds per email address"
    ],
    designNotes:[
      "All three states render on the same route — the component determines which state to show based on the URL query param and API response",
      "The countdown timer (3 → 0) uses setInterval; clear the interval on component unmount to avoid memory leaks",
      "The 'Go to Login Now' button should cancel the interval timer and navigate immediately",
      "The nav bar on this page is minimal (logo only) — no distracting navigation links during the verification flow",
      "Email address should be interpolated from session storage (set by the register response) — not from the URL to avoid exposure",
      "The resend cooldown must be enforced both client-side (UI disabled) and server-side (Redis rate key)"
    ]
  },

  // ─────────────────────────────────────────────────────────────────────────
  forgot_pg:{
    purpose:"Password recovery entry point. Accepts the buyer's email address and always returns a success response (whether or not the email exists) to prevent user enumeration attacks.",
    overview:"The Forgot Password page is a single-column, centred, narrow-layout page (max-width ~420px). It contains one input field and a submit button. The security-critical design decision is that the success message is always displayed regardless of whether the submitted email is registered — this eliminates the ability for an attacker to test whether an email address has an account. The page also shows a rate-limit error state when the buyer has submitted too many requests within a 15-minute window.",
    sections:[
      {num:"01",name:"Enter Email Form",description:"Minimal focused form. A warning-coloured key icon reinforces the password recovery context. The email field is the only input. A back-to-login link is available both above and below the form.",components:["Minimal nav bar — logo (left) + '← Back to Login' text link (right)","Key icon — 56×56px circle, warning-coloured background, 🔑 symbol","Headline — 'Forgot your password?'","Body text — 'Enter your email address and we'll send you a reset link. The link expires in 1 hour.'","Email input — type=email, placeholder 'you@example.com', label 'Email address'","'Send Reset Link' primary button — full width","'← Back to Login' text link — centred below the button"]},
      {num:"02",name:"Success State (always shown — even if email not found)",description:"Replaces the form after submission. A success-coloured banner card with an email icon, a title, and a carefully worded message that is intentionally ambiguous about whether the email exists in the system.",components:["Success banner card — success-coloured background and border, rounded corners","Email icon — ✉ in success colour","Title — 'Reset link sent'","Body text — 'If that email exists in our system, a reset link has been sent. Check your inbox and spam folder.'","Annotation: 'Response is identical whether email exists or not — prevents user enumeration attack · Redis key set with 1h TTL only if user exists'"]},
      {num:"03",name:"Rate Limit State",description:"Shown in place of the success state when the buyer has exceeded the allowed number of reset requests within the rate limit window.",components:["Danger banner card — danger-coloured background and border","Title — 'Too many requests'","Body text — 'You've made too many reset requests. Please wait 15 minutes before trying again.'"]}
    ],
    states:[
      "Default: empty email field, form visible",
      "Submitted (any email): form replaced by success banner (State 02) regardless of whether email exists",
      "Rate limited: form replaced by danger banner (State 03); form cannot be re-submitted until cooldown expires",
      "Invalid email format: client-side validation; email field shows 'Please enter a valid email address' before submission"
    ],
    dataRequirements:[
      "POST /api/auth/forgot-password — { email } → always returns 200 with identical JSON; internally: if user exists, generates 32-byte token, stores HMAC hash in Redis (1h TTL), dispatches reset email",
      "Rate limit: 3 requests per 15 min per IP address; returns 429 when exceeded"
    ],
    designNotes:[
      "The success message MUST be identical whether the email is registered or not — this is a security requirement, not a UX preference",
      "Do not show any loading state on the button that could hint at whether a DB lookup is happening",
      "The page is intentionally minimal — no sidebar, no navigation, no distractions; all focus is on the single action",
      "The rate limit banner replaces the entire form area — it is not shown alongside the form",
      "The '← Back to Login' links (both in the nav and below the form) use the same route — no JavaScript needed"
    ]
  },

  // ─────────────────────────────────────────────────────────────────────────
  reset_pg:{
    purpose:"Password reset form reached via the one-time link in the reset email. Validates the token from the URL, displays a secure new-password form with inline requirement checking, and handles both success and expired-token states.",
    overview:"The Reset Password page is a single-column, centred narrow layout (max-width ~420px). It is accessed exclusively via the reset link dispatched by the Forgot Password flow — the URL contains a signed token. The server validates the token on page load; if valid, the form is displayed. Both the new password and confirm password fields include the same strength meter used on the Sign Up page. A password requirements checklist updates in real-time as the buyer types. On success, all active sessions for the account are invalidated, a confirmation email is sent, and the buyer is redirected to Login. On token expiry, an error state is shown with an option to request a fresh link.",
    sections:[
      {num:"01",name:"Reset Password Form (token valid state)",description:"The main form shown when the token is valid. Lock icon reinforces security context. The buyer's masked email address is shown as a personalisation cue. Both password fields show the strength meter and the requirements checklist updates live.",components:["Minimal nav bar — logo only","Lock icon — 56×56px circle, info-coloured background, 🔒 symbol","Headline — 'Reset your password'","Sub-text — 'Choose a strong new password for [email]' (email masked, e.g. jo***@email.com)","New password input — type=password, 👁 show/hide toggle, label 'New password'","Password strength bar — 4-segment bar: all green when strong","Strength label — 'Strong password ✓' in success green (or 'Weak/Medium' in respective colours)","Confirm new password input — type=password, 👁 show/hide toggle; success state: '✓ Passwords match'","Password requirements checklist card — secondary background: 5 items with ✓ (success) or ✕ (danger): At least 8 characters, Uppercase letter (A-Z), Lowercase letter (a-z), Number (0-9), Special character (!@#$…)","'Reset Password' primary button — full width","Annotation: 'On success: password_hash updated · all sessions invalidated · confirmation email sent · redirect to login'"]},
      {num:"02",name:"Success State",description:"Replaces the form after the password is successfully updated. A large success checkmark, a confirmation message, and a single 'Go to Login' button.",components:["Success icon — 56×56px circle, success-coloured background, ✓ symbol","Headline — 'Password updated!'","Body text — 'All your active sessions have been signed out for security. Please sign in with your new password.'","'Go to Login' button — centre-aligned, not full-width"]},
      {num:"03",name:"Expired Token State",description:"Shown when the server validates the URL token and finds it missing from Redis (expired or already used). Offers two recovery options.",components:["Danger icon — 56×56px circle, danger-coloured background, ✕ symbol","Headline — 'Reset link expired'","Body text — 'This reset link has expired or already been used. Password reset links are valid for 1 hour.'","'Request New Link' primary button — navigates back to /forgot-password","'Back to Login' secondary button — side by side with Request New Link"]}
    ],
    states:[
      "Token valid (on page load): form rendered; token stored in component state for submission",
      "Token expired/invalid (on page load): State 03 shown immediately; form never rendered",
      "Password weak: segments fill partially in amber/red; requirements checklist shows unmet items in danger red",
      "Password strong: all 4 segments green; all 5 requirements show ✓ in success green",
      "Passwords match: confirm field green border, '✓ Passwords match'",
      "Passwords mismatch: confirm field danger border, '✕ Passwords do not match'",
      "Submitting: button disabled/spinner to prevent double-submission",
      "Success (200 from API): State 02 rendered; all sessions invalidated server-side; confirmation email sent"
    ],
    dataRequirements:[
      "GET /api/auth/validate-reset-token?token= — verifies HMAC token exists in Redis; called on page load",
      "Returns: { valid: true, masked_email: 'jo***@email.com' } | { valid: false, reason: 'expired' | 'invalid' }",
      "POST /api/auth/reset-password — { token, new_password } → updates password_hash, deletes Redis key, invalidates all sessions (DELETE FROM sessions WHERE user_id=), sends confirmation email"
    ],
    designNotes:[
      "Token validation must happen server-side on page load — never trust the token validation to client-side alone",
      "The masked email ('jo***@email.com') is returned from the token validation endpoint and stored in component state — it personalises the form without exposing the full address in the URL",
      "Password requirements checklist updates on every keypress — pure client-side, no API calls",
      "The strength bar and requirements checklist are shared components with the Sign Up page",
      "After success, do NOT keep the reset token in the URL — navigate to /login with a ?message=password_reset_success query param to show a confirmation banner on the login page"
    ]
  },

  // ─────────────────────────────────────────────────────────────────────────
  maint_pg:{
    purpose:"System-wide maintenance gate shown to all visitors and buyers when maintenance mode is enabled by an admin. Communicates status, shows estimated return time, and preserves admin access.",
    overview:"The Maintenance Page is a full-screen, centred informational page served by middleware that intercepts all incoming requests when maintenance_mode=true in site settings. Admins are exempt: the middleware checks the JWT role and allows admin users through. For everyone else, this page replaces all routes. It features a large warning icon, a headline, an estimated completion time (admin-set), a set of work-in-progress task pills, and an email notification capture for visitors who want to be alerted when the site returns. A persistent admin access banner at the bottom remains available for admins to log in during the outage. A third section (Section 03) shows the admin-facing maintenance settings form as context for UI/UX designers building the admin Site Settings page.",
    sections:[
      {num:"01",name:"Main Maintenance Screen (shown to all visitors and buyers)",description:"Full-height centred layout on a secondary background. Warning-coloured gear icon, headline, body text, an estimated completion time card, three task-pill chips, and an email notification capture form.",components:["Minimal nav bar — logo (left) + 'Maintenance Mode' warning-coloured pill badge (right)","Gear icon — 80×80px circle, warning-coloured background, ⚙ symbol (32px)","Headline — 'We'll be back soon'","Body text — 'We're performing scheduled maintenance to improve your experience. We apologise for the inconvenience.'","Estimated completion card — white card, 'ESTIMATED COMPLETION' small caps label, time value (e.g. 'Today at 3:00 PM WAT'), sub-note 'Set by admin in site settings'","Work-in-progress task chips × 3 — horizontal row: '◻ Upgrading database', '◻ Deploying new features', '◻ Performance optimisation'","Email notification section — 'Get notified when we're back:' label, email input + 'Notify Me' primary button"]},
      {num:"02",name:"Admin Access Banner",description:"Fixed to the bottom of the maintenance screen. A subtle bar with a green status dot indicating admin access is still available, and an 'Admin Login →' button that routes to the standard login page.",components:["Green status dot — 8×8px circle, success colour","Text — 'Admin access is available during maintenance'","'Admin Login →' primary button — routes to /login; admin role grants bypass of maintenance middleware","Annotation: 'Middleware checks maintenance_mode setting · Redirects all non-admin requests to this page · Admin can still log in and manage the dashboard'"]},
      {num:"03",name:"Admin: Maintenance Mode Toggle (in Site Settings — shown for UI/UX reference)",description:"The admin-facing control that enables/disables maintenance mode. Rendered here for completeness so UI/UX designers know what the admin form looks like when building the Site Settings page.",components:["Settings card — white background, rounded border","Row: 'Maintenance Mode' label + sub-text 'Blocks all visitor and buyer access to the site' + warning-coloured toggle switch (ON state)","Divider","Maintenance message textarea — label 'Maintenance message (shown to visitors)'; pre-filled with current message","Estimated completion datetime input — type=datetime-local","'Save Maintenance Settings' primary button — full width","Annotation: 'Changes take effect immediately on save · No server restart required'"]}
    ],
    states:[
      "Maintenance mode ON: this page is served to ALL requests from non-admin users; replaces every public route",
      "Admin user: middleware detects role=admin in JWT → bypasses maintenance page; all admin routes remain accessible",
      "Email notification submitted: 'Notify Me' button shows success state: '✓ We'll let you know!'; email stored server-side",
      "Maintenance mode OFF: this page is never served; all routes return to normal",
      "Estimated completion time not set by admin: time field shows 'To be confirmed' instead of a specific time"
    ],
    dataRequirements:[
      "Middleware: check site_settings.maintenance_mode on EVERY request (cached in Redis, TTL 30s)",
      "If maintenance_mode=true AND req.user.role !== 'admin': serve maintenance page with 503 status",
      "GET /api/settings/public — returns { maintenance_mode, maintenance_message, maintenance_eta, site_name, logo_url } — publicly accessible even in maintenance mode",
      "POST /api/maintenance/notify — { email } → stores email for notification when maintenance ends",
      "Admin: PATCH /api/settings — { maintenance_mode, maintenance_message, maintenance_eta } → updates settings, invalidates Redis cache"
    ],
    designNotes:[
      "The maintenance page must be served with HTTP 503 and a Retry-After header set to the estimated completion time — this signals to search engines not to de-index the site",
      "The page must load without any JS bundle if possible — it should be a lightweight static render since the app may be in a broken state",
      "The admin access banner must always be visible — do not let it be scrolled off screen; use position sticky or fixed",
      "The gear icon should have a subtle CSS spin animation (rotate 360deg, 8s linear infinite) to visually reinforce that work is in progress",
      "The email notification capture is a simple POST — no account required; store emails in a separate notification_subscribers table"
    ]
  },

  cart_pg:{
    purpose:"The pre-checkout holding area where buyers review selected items, adjust quantities, apply coupon codes, and confirm order composition before committing to payment.",
    overview:"Two-column layout: wide left column lists all cart items with real-time stock and price; narrower right column holds order summary, coupon input, and checkout CTA. Items are always fetched fresh from the DB so flash sale prices and OOS states are current. Out-of-stock items block Proceed to Checkout.",
    sections:[
      {num:"01",name:"Cart Items List",description:"Each item row: 70×70px thumbnail, name, variant, flash badge, strikethrough original price if discounted, stock status pill, quantity stepper, Save and Remove actions. OOS items rendered at 0.6 opacity with stepper replaced by Remove button.",components:["Page header — 'My Cart (N items)', 'Clear All' danger text button","CartItem row × N — thumbnail (70×70px), product name, variant text, ⚡ Flash Sale badge (danger), strikethrough original price, sale price, stock pill (● In Stock success / ● Only N left warning / ✕ Out of stock danger)","Quantity stepper — − / count / +; max = stock_quantity; disabled for OOS","'♡ Save' text button — moves to wishlist (auth required)","'✕ Remove' text button — removes from cart","OOS item — 0.6 opacity, stepper hidden, Remove button danger-bordered","Continue Shopping link (left), 'Remove out-of-stock items to proceed' hint (right, only when OOS items exist)"]},
      {num:"02",name:"Order Summary",description:"Right-column sticky card. Subtotal, applied discount in success green, shipping note, bold total.",components:["Subtotal row — 'Subtotal (N items)' + value","Discount row — success green, shown only when coupon applied","Divider","Total row — bold, larger font","'Shipping calculated at checkout' sub-note"]},
      {num:"03",name:"Coupon Code Input",description:"Real-time coupon validation. Success banner replaces input on valid code. Specific error messages on failure.",components:["Coupon text input + 'Apply' primary button inline","Success state — success-coloured banner: code name, discount description, savings amount, × dismiss","Error state — danger inline message: 'Expired' / 'Usage limit reached' / 'Minimum order ₦X,XXX required'"]},
      {num:"04",name:"Checkout CTA + Payment Badges",description:"Primary conversion CTA. Blocked when OOS items present.",components:["'Proceed to Checkout →' primary button — full width; disabled (HTML disabled attr) when OOS items exist","Stripe / PayPal / Paystack pill badges below button"]},
      {num:"05",name:"You May Also Like",description:"2-column mini product grid driving incremental discovery in the right column.",components:["2 mini product cards — thumbnail (60px height), name lines, price line"]}
    ],
    states:[
      "Items present, none OOS: stepper enabled, Proceed button active",
      "OOS items present: affected rows 0.6 opacity, Proceed button disabled, hint text shown",
      "Cart empty: full-page empty state — illustration + 'Your cart is empty' + 'Start Shopping' CTA",
      "Coupon applied: success banner visible, discount row in summary, total recalculated",
      "Flash sale expires mid-session: SSE event → price reverts, badge removed, summary recalculates",
      "Buy Now entry: single item pre-selected, Proceed to Checkout is immediate CTA"
    ],
    dataRequirements:[
      "GET /api/cart — items with current prices, stock, flash sale status (fresh DB fetch every load)",
      "PATCH /api/cart/:item_id — { quantity } → updated cart totals",
      "DELETE /api/cart/:item_id — remove item; DELETE /api/cart — clear all",
      "POST /api/cart/:item_id/save — move to wishlist (auth required)",
      "POST /api/coupons/validate — { code, cart_total } → { valid, discount_type, discount_value, savings_amount, error_code }",
      "SSE /api/events — flash_sale_ended, stock_changed events"
    ],
    designNotes:[
      "Cart prices MUST be fetched from DB on every load — never read from client cache",
      "Quantity stepper max enforced client-side AND server-side",
      "'Proceed to Checkout' must use HTML disabled attribute, not just CSS opacity",
      "Flash sale badge on cart item shows countdown timer if sale ends within 1 hour",
      "Anonymous visitor carts stored server-side via session_id cookie; merged on login"
    ]
  },

  checkout_pg:{
    purpose:"Final order configuration before payment. Captures fulfillment type, delivery address or pickup location, order notes, and payment provider selection.",
    overview:"Two-column layout under a stripped nav (logo + 🔒 Secure Checkout only). A 4-step progress bar shows Cart ✓ → Checkout (active) → Payment → Confirmation. Left column: fulfillment toggle, address/pickup selector, order notes. Right column: read-only order summary + payment provider selection + Place Order CTA.",
    sections:[
      {num:"01",name:"Checkout Progress Steps",description:"4-step linear progress bar. Cart ✓ done (success), Checkout active (info), Payment and Confirmation upcoming (tertiary).",components:["Step dot × 4 — 28×28px circles: success ✓ / info active / tertiary upcoming","Connecting bar — success colour for completed, tertiary for upcoming","Step label below each dot"]},
      {num:"02",name:"Fulfillment Type Toggle",description:"Two large toggle cards side by side. Delivery selected by default. Clicking Pickup switches the address section.",components:["Delivery card — 🚚 icon, 'Delivery', 'Ship to your address'; info border+bg when selected","Pickup card — 🏪 icon, 'Pickup', 'Collect from our store'; standard border when unselected"]},
      {num:"03",name:"Delivery: Address Selection",description:"Radio list of saved addresses. Default pre-selected. Inline add-address form expands on click.",components:["AddressCard × N — radio button, label (Home/Office), address string, 'Default' success pill; info border+bg when selected","'+ Add New Address' dashed-border info button — expands inline form","Inline form — Full name, Phone, Street, City, State, Country; Save + Cancel"]},
      {num:"04",name:"Pickup Location (shown when Pickup selected)",description:"Radio list of admin-managed active pickup locations, each showing name, address, opening hours.",components:["PickupLocationCard × N — radio button, location name, address, opening hours; info border+bg when selected"]},
      {num:"05",name:"Order Notes",description:"Optional free-text textarea for delivery/packaging instructions.",components:["Label 'Delivery / Order Notes (optional)'","Textarea — 2 rows, placeholder 'Any special instructions…'"]},
      {num:"06",name:"Order Summary Sidebar",description:"Read-only item list + price breakdown in the right column.",components:["Item rows — 36×36 thumbnail, name, variant, price","Subtotal / Shipping / Coupon / Total breakdown"]},
      {num:"07",name:"Payment Provider + CTA",description:"Radio list of admin-enabled providers. 'Place Order & Pay →' full-width primary button.",components:["Provider radio card × N — radio, name, supported methods, logo placeholder","Stripe (default), PayPal, Paystack","'Place Order & Pay →' primary button, full width","'By placing an order you agree to our Terms & Conditions' sub-note"]}
    ],
    states:[
      "Delivery selected: address selector shown; pickup hidden",
      "Pickup selected: pickup list shown; address hidden",
      "No saved addresses: only '+ Add New Address' shown; form expanded by default",
      "Add New Address expanded: inline form visible below address cards",
      "'Place Order & Pay →' clicked: form validated, order created PENDING, navigate to Payment page"
    ],
    dataRequirements:[
      "GET /api/addresses — buyer saved delivery addresses",
      "POST /api/addresses — create address inline",
      "GET /api/pickup-locations — admin-managed active locations",
      "GET /api/settings/payment-providers — admin-enabled providers",
      "POST /api/orders — creates PENDING order, returns order_id"
    ],
    designNotes:[
      "Nav must be stripped to logo + secure checkout label only to reduce abandonment",
      "Fulfillment toggle cards must be minimum 44px height (mobile tap target)",
      "Default address pre-selected from is_default=true in addresses response",
      "'Place Order & Pay →' validates all required fields before enabling"
    ]
  },

  payment_pg:{
    purpose:"Provider-specific payment UI rendered after order creation. Handles Stripe Elements card input, PayPal Smart Button, and Paystack redirect. Shows processing overlay during confirmation.",
    overview:"Most security-sensitive page. Nav stripped to logo + SSL label. Progress bar shows Cart ✓ / Checkout ✓ / Payment (active) / Confirmation. Left column renders provider-specific payment UI (one at a time). Right column: locked read-only order summary + security badges. Card data never touches the app server — Stripe Elements renders in a sandboxed iframe.",
    sections:[
      {num:"01",name:"Progress Steps (Payment active)",description:"Cart ✓ (success) / Checkout ✓ (success) / Payment (info/active) / Confirmation (tertiary upcoming).",components:["Same step-dot + bar component as Checkout; Cart and Checkout both show ✓"]},
      {num:"02",name:"Stripe Card Payment Form",description:"Stripe Elements sandboxed iframe wrapper. Three fields: card number (with network icon detection), expiry, CVC.",components:["Section heading — 'Pay with Card' + Visa/MC logo placeholders","Stripe Elements container — secondary bg, rounded border, iframe annotation label","Card number field — monospace '4242  4242  4242  4242', card icon right-aligned","Expiry field — 'MM / YY', half-width","CVC field — '•••', half-width","Annotation: 'Card data never touches our server — PCI compliant via Stripe Elements iframe'"]},
      {num:"03",name:"PayPal Option",description:"PayPal Smart Button rendered in a dashed-border container. Clicking redirects to PayPal approval flow.",components:["Container — dashed border, secondary bg, centred","PayPal button — #003087 navy bg, white 'Pay with PayPal'","'Clicking redirects to PayPal approval page' sub-text"]},
      {num:"04",name:"Paystack Option",description:"Single CTA button redirecting to Paystack hosted payment page.",components:["Container — dashed border, secondary bg, centred","'Supports Card, Bank Transfer, USSD' label","Paystack button — #00C3F7 teal bg, 'Pay ₦36,000 with Paystack'","'Redirects to Paystack hosted payment page' sub-text"]},
      {num:"05",name:"Processing Overlay",description:"Shown after buyer initiates payment. Prevents double-submission. Three animated dots.",components:["Info-coloured banner — 'Processing your payment…', 'Please do not close this page'","Three pulsing dots — info colour, varying opacity","Payment button disabled during this state"]},
      {num:"06",name:"Order Summary Sidebar (read-only)",description:"Locked right column. Item rows, price breakdown, delivery address, security badges, Back to Checkout button.",components:["Item name + price rows (read-only)","Subtotal / Shipping / Coupon / Total breakdown","'Delivering to:' address text","Security badges — 🔒 SSL Encrypted, 🔒 PCI DSS Compliant, 🔒 Secure Payment Gateway","'← Back to Checkout' secondary button"]}
    ],
    states:[
      "Stripe selected: Stripe Elements form visible; PayPal/Paystack hidden",
      "PayPal selected: PayPal button visible; Stripe/Paystack hidden",
      "Paystack selected: Paystack button visible; Stripe/PayPal hidden",
      "Processing: overlay shown, all fields non-interactive, button disabled",
      "Payment success (webhook): navigate to Order Confirmation; order → CONFIRMED; stock committed",
      "Payment failure (webhook): danger banner — 'Payment failed. Please try again.'; stock released; order → CANCELLED",
      "Stripe client-side error: inline error below card field"
    ],
    dataRequirements:[
      "GET /api/orders/:id — pending order for summary sidebar",
      "POST /api/payments/stripe/confirm — { order_id, payment_method_id }",
      "Stripe webhook POST /api/webhooks/stripe — payment_intent.succeeded / payment_intent.payment_failed",
      "POST /api/payments/paypal/create-order + POST /api/payments/paypal/capture",
      "POST /api/payments/paystack/initialize + GET /api/payments/paystack/verify?reference="
    ],
    designNotes:[
      "Card data NEVER passes through app server — Stripe Elements handles PCI compliance entirely",
      "Processing overlay must block all interaction — CSS pointer-events:none on underlying elements",
      "Stripe Elements styled via the appearance API to match app font and colours",
      "Three loading dots animation must be CSS-only keyframe opacity"
    ]
  },

  order_conf:{
    purpose:"Post-purchase confirmation showing order was placed and payment received. Provides order reference, tracking number, full order details, delivery info, and next-step actions.",
    overview:"Single-column centred layout (max-width ~600px). Nav stripped to logo only. Opens with a large success checkmark + personalised headline, then: order reference and tracking number as copyable monospace cards, full item + price summary, delivery/pickup info, and three action buttons. Receipt email + PDF confirmation email dispatched automatically.",
    sections:[
      {num:"01",name:"Success Header",description:"Centred success icon, congratulatory headline, personalised sub-text.",components:["Success icon — 72×72px circle, success bg, ✓ 32px","Headline — 'Order Confirmed!'","Sub-text — 'Thank you, [first name]. Your payment was successful and your order is being processed.'"]},
      {num:"02",name:"Order Reference + Tracking Number",description:"Two-column info card grid. Each card: small-caps label + monospace value.",components:["OrderReferenceCard — 'ORDER REFERENCE', reference value in monospace","TrackingNumberCard — 'TRACKING NUMBER', tracking value in monospace","Both: secondary bg, rounded border, 1fr 1fr grid"]},
      {num:"03",name:"Order Items Summary",description:"Bordered card listing items (thumbnail, name, variant, qty, price) + full price breakdown.",components:["OrderItem row × N — 44×44px thumbnail, name, variant+qty, price right-aligned","Subtotal / Discount (success green) / Shipping (Free success green) / Divider / 'Total Paid' bold"]},
      {num:"04",name:"Delivery / Pickup Info",description:"Two-column info card grid — fulfillment address and estimated delivery.",components:["'Delivering to' card — buyer name, street, city+state","'Estimated Delivery' card — date (e.g. 'March 20, 2026'), 'Set by admin · Updates when status changes'","If pickup: left card shows 'Pickup Location' + location name and address"]},
      {num:"05",name:"Action Buttons",description:"Three action buttons in a clear hierarchy.",components:["'Download Invoice' primary button — PDF download","'View My Orders' secondary button — /account/orders","'Continue Shopping' full-width secondary — /products","Annotation: 'Receipt email + confirmation email with PDF invoice sent · SSE notification pushed to buyer'"]}
    ],
    states:[
      "Delivery order: 'Delivering to' shows postal address; estimated delivery if admin has set it",
      "Pickup order: 'Pickup Location' card shows location name + address",
      "No estimated delivery set: 'Estimated Delivery' card shows 'To be confirmed'",
      "Invoice generating: 'Download Invoice' briefly disabled while PDF generates"
    ],
    dataRequirements:[
      "GET /api/orders/:id — full order data including items, totals, address/pickup, tracking_number, estimated_delivery",
      "GET /api/orders/:id/invoice — PDF blob for download",
      "order_id stored in session after POST /api/orders (not exposed in URL)",
      "SSE event order.confirmed pushed after successful payment webhook"
    ],
    designNotes:[
      "Page must not be accessible without order_id in session — redirect to /orders if accessed directly",
      "Success icon entry animation — scale 0→1 with ease-out spring",
      "Order reference and tracking number should each have a clipboard copy icon button",
      "All amounts must be pulled from the order record — never from cart state"
    ]
  },

  my_orders:{
    purpose:"The buyer's persistent order history. Filterable, paginated list of all orders with colour-coded status badges, quick actions, and navigation to order detail.",
    overview:"Two-column layout: 200px left AccountSidebar (shared across all account pages) and wider right content area. Horizontal status filter tabs with per-tab counts, followed by chronological order cards. SSE updates status badges in real-time.",
    sections:[
      {num:"01",name:"Account Sidebar",description:"Left nav shared across all buyer account pages. Buyer avatar, name, role. Vertical nav list with current section highlighted.",components:["Buyer avatar — 36×36px circle, info bg, initials","Buyer name bold + 'Buyer · Location' sub-label","Nav items — My Orders (active), Profile, Addresses, Wishlists, Reviews, Saved Searches, Notifications, Notification Prefs","Active item — info bg, info bold text; inactive — transparent bg, secondary text"]},
      {num:"02",name:"Status Filter Tabs",description:"One tab per order status with count badge. 'All' default selected.",components:["Tabs — All (12), Pending (2), Confirmed (1), Packed (1), Shipped (3), Delivered (4), Cancelled (1)","Active tab — info border + bg; count badge uses bg-primary","Inactive tab — standard border; count badge uses bg-secondary","Tab selection filters list; URL updates with ?status="]},
      {num:"03",name:"Orders List",description:"Chronological order cards. Each card: reference, date+items+type, status badge, total, contextual actions.",components:["OrderCard — bordered, rounded, 12px padding","Order reference — monospace bold 11px","Date · items · fulfillment type — tertiary 9px","Status badge — Pending #FAEEDA/#633806 · Confirmed #E1F5EE/#085041 · Packed #EEEDFE/#3C3489 · Shipped #E6F1FB/#0C447C · Delivered #EAF3DE/#27500A · Cancelled #FCEBEB/#791F1F","Order total — 13px bold","'Write Review' info-bordered button — Delivered orders only","'View Order →' primary button — always shown"]}
    ],
    states:[
      "All tab: all orders shown",
      "Status tab: filtered list; empty state if no orders in status",
      "Empty state: 'You haven't placed any orders yet' + 'Start Shopping' CTA",
      "SSE update: affected badge animates in real time without refresh",
      "Loading: skeleton order cards"
    ],
    dataRequirements:[
      "GET /api/orders?status=&page=&limit= — paginated buyer orders with status filter",
      "Returns { orders[], total_count, status_counts{ all, pending, confirmed, packed, shipped, delivered, cancelled } }",
      "SSE /api/events — order.status_updated events to update badge live"
    ],
    designNotes:[
      "AccountSidebar is a shared component across ALL buyer account pages — extract as reusable",
      "Status badge colours must be consistent throughout the entire app — use a central STATUS_COLORS constant",
      "'Write Review' button only rendered when status=DELIVERED — never server-render for other statuses",
      "SSE badge update should include a brief background-flash animation to draw attention"
    ]
  },

  order_detail_b:{
    purpose:"Full buyer-facing order detail page. Live visual status timeline, tracking info, ordered items, complete payment breakdown, delivery address, and review prompts for delivered orders.",
    overview:"Two-column layout: wide left column for status timeline, tracking, and item list; narrower right column for payment summary, delivery address, and review prompts. Page header shows order reference (monospace), date, fulfillment type, status badge, and Download Invoice button. SSE pushes status updates live — the timeline animates to the new step without a refresh.",
    sections:[
      {num:"01",name:"Page Header",description:"Full-width header below nav. Breadcrumb, order reference, date+type sub-label, status badge, Download Invoice button.",components:["Breadcrumb — 'Home › My Orders › Order Detail'","Order reference — monospace H2 (e.g. 'ORD-20260317-A3F8K2QZ')","Sub-label — 'Placed on 17 March 2026 · Delivery Order'","Status badge — colour-coded (same palette as My Orders)","'Download Invoice' primary button right-aligned","'← Back to My Orders' info link in nav bar"]},
      {num:"02",name:"Order Status Timeline",description:"Vertical dot-and-bar timeline. Done steps: success dot ✓ + success bar. Active step: info dot ● + info text + estimated date. Upcoming: grey dot ○ + tertiary text + '—'.",components:["StatusStep × 5 — Order Placed, Payment Confirmed, Order Packed, Out for Delivery, Delivered","Done — success dot (✓), success vertical bar to next step","Active — info dot (●), info text, estimated date if admin set it","Upcoming — grey dot (○), tertiary text, date '—'","SSE annotation: 'Live SSE updates this timeline when admin changes status'"]},
      {num:"03",name:"Tracking Section",description:"Secondary-bg card. Tracking number in monospace. Tracking URL link appears when admin sets it.",components:["'Tracking Number' label + monospace value","'No external link set yet' italics → replaced by '🔗 Track Package' link when tracking_url is set"]},
      {num:"04",name:"Order Items List",description:"Each item: 52×52px thumbnail, name, variant+qty, unit price, line total.",components:["OrderItem row × N — thumbnail, name bold, 'variant · Qty: N', 'Unit price: ₦X', line total right-aligned","Rows separated by border-bottom divider"]},
      {num:"05",name:"Payment Summary",description:"Right column top. Full price breakdown + payment provider + transaction ID.",components:["Subtotal, Coupon (success green if applied), Shipping, Divider, 'Total Paid' bold","Payment provider row (Stripe/PayPal/Paystack)","Transaction ID — truncated monospace (e.g. 'pi_3P...xQZ2')"]},
      {num:"06",name:"Delivery Address",description:"Right column below payment summary. Delivery address used for this order.",components:["Buyer full name bold, street, city+state, country"]},
      {num:"07",name:"Write Review (DELIVERED orders only)",description:"Right column, visible only when status=DELIVERED. Each item has a 'Review' button navigating to the Write Review page.",components:["'Rate your purchase:' label","Item row × N — product name + 'Review' info-bordered button","'← Back to Orders' secondary full-width button at bottom"]}
    ],
    states:[
      "Order in progress: timeline shows completed steps green, active step info blue, upcoming grey",
      "Order Delivered: all steps green; Write Review section visible",
      "Tracking URL set: 'No external link set yet' → '🔗 Track Package' link",
      "Estimated delivery set: active step shows 'Estimated: March 20, 2026'",
      "SSE update received: timeline animates to next step; toast notification appears",
      "Pickup order: Delivery Address section shows Pickup Location details instead"
    ],
    dataRequirements:[
      "GET /api/orders/:id — full order: items, variants, totals, address/pickup, tracking_number, tracking_url, estimated_delivery, status, transaction details",
      "GET /api/orders/:id/invoice — PDF for Download Invoice",
      "SSE /api/events — order.status_updated with order_id to animate timeline"
    ],
    designNotes:[
      "Timeline vertical bar between done→active: success colour; active→upcoming: tertiary colour",
      "SSE dot animation: grey → success with brief scale pulse (1 → 1.2 → 1)",
      "Tracking number should have a clipboard copy button",
      "order_id in URL should be the public reference string, not a database UUID",
      "'Write Review' section must be completely absent from the DOM when status is not DELIVERED"
    ]
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// WIREFRAME DESIGN TOKENS
// ══════════════════════════════════════════════════════════════════════════════
const T = {
  bg0:"#FFFFFF",bg1:"#F9FAFB",bg2:"#F3F4F6",bg3:"#E5E7EB",
  text0:"#111827",text1:"#374151",text2:"#6B7280",text3:"#9CA3AF",
  border0:"#D1D5DB",border1:"#E5E7EB",border2:"#F3F4F6",
  blue:"#1D4ED8",blueLight:"#EFF6FF",blueBorder:"#BFDBFE",blueText:"#1E40AF",
  red:"#B91C1C",redLight:"#FEF2F2",green:"#15803D",greenLight:"#F0FDF4",
  yellow:"#B45309",
  font:"'DM Sans','Segoe UI',system-ui,sans-serif",
  mono:"'JetBrains Mono',monospace",
  r:{sm:4,md:6,lg:10,full:999},
};

// ── Shared wireframe sub-components ──────────────────────────────────────────
function WfSection({num,label,children,bg=T.bg0}){
  return(
    <div style={{borderBottom:`1px solid ${T.border1}`,background:bg}}>
      <div style={{fontSize:9,letterSpacing:"0.1em",textTransform:"uppercase",color:T.text3,background:T.bg2,
        padding:"4px 20px",borderBottom:`1px solid ${T.border2}`,fontWeight:600,fontFamily:T.mono,
        display:"flex",alignItems:"center",gap:8}}>
        <span style={{color:T.blueText,fontWeight:700}}>{num}</span>
        <span>—</span><span>{label}</span>
      </div>
      {children}
    </div>
  );
}

function WfImg({height=120,label="",style={}}){
  return(
    <div style={{background:T.bg3,height,display:"flex",flexDirection:"column",
      alignItems:"center",justifyContent:"center",gap:4,position:"relative",overflow:"hidden",...style}}>
      <svg style={{position:"absolute",inset:0,width:"100%",height:"100%",opacity:0.25}} preserveAspectRatio="none">
        <line x1="0" y1="0" x2="100%" y2="100%" stroke={T.text3} strokeWidth="1"/>
        <line x1="100%" y1="0" x2="0" y2="100%" stroke={T.text3} strokeWidth="1"/>
      </svg>
      <div style={{fontSize:16,zIndex:1}}>🖼</div>
      {label&&<div style={{fontSize:9,color:T.text3,letterSpacing:"0.06em",zIndex:1,textTransform:"uppercase"}}>{label}</div>}
    </div>
  );
}

function WfLine({w="100%",h=8,mb=4,opacity=1}){
  return <div style={{height:h,background:T.border0,borderRadius:99,marginBottom:mb,width:w,opacity}}/>;
}

function WfAnnot({children}){
  return(
    <div style={{fontSize:10,color:T.text3,borderLeft:`2px solid ${T.border0}`,
      paddingLeft:8,margin:"4px 20px 8px",fontStyle:"italic",lineHeight:1.6}}>
      {children}
    </div>
  );
}

function WfBtn({children,primary=false,style={}}){
  return(
    <div style={{display:"inline-flex",alignItems:"center",justifyContent:"center",
      background:primary?T.blue:"transparent",color:primary?"#fff":T.text1,
      border:primary?"none":`1px solid ${T.border0}`,borderRadius:T.r.md,
      padding:"7px 16px",fontSize:11,fontWeight:primary?500:400,
      cursor:"pointer",fontFamily:T.font,...style}}>
      {children}
    </div>
  );
}

function WfTag({children,active=false}){
  return(
    <div style={{display:"inline-flex",alignItems:"center",
      background:active?T.blueLight:T.bg2,color:active?T.blueText:T.text2,
      border:`1px solid ${active?T.blueBorder:T.border1}`,
      borderRadius:T.r.full,padding:"3px 10px",fontSize:10}}>
      {children}
    </div>
  );
}

function WfNav(){
  return(
    <div style={{display:"flex",alignItems:"center",padding:"10px 24px",gap:20,
      background:T.bg0,borderBottom:`1px solid ${T.border1}`,boxShadow:"0 1px 4px rgba(0,0,0,0.04)"}}>
      <div style={{fontSize:15,fontWeight:700,color:T.text0,minWidth:90,letterSpacing:-0.5}}>WillOfGod</div>
      <div style={{display:"flex",gap:22,flex:1,justifyContent:"center"}}>
        {["Home","Shop","Flash Sales","Categories","New Arrivals"].map((t,i)=>(
          <span key={t} style={{fontSize:11,color:i===0?T.blueText:T.text2,fontWeight:i===0?600:400}}>{t}</span>
        ))}
      </div>
      <div style={{display:"flex",alignItems:"center",gap:10}}>
        <div style={{background:T.bg2,border:`1px solid ${T.border1}`,borderRadius:T.r.md,
          padding:"5px 12px",fontSize:10,color:T.text3,width:160}}>🔍 Search products…</div>
        <span style={{fontSize:16,color:T.text2,cursor:"pointer"}}>♡</span>
        <div style={{position:"relative"}}>
          <div style={{width:28,height:28,border:`1px solid ${T.border0}`,borderRadius:T.r.md,
            display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,color:T.text2}}>🛍</div>
          <div style={{position:"absolute",top:-5,right:-5,width:16,height:16,
            background:T.red,color:"#fff",borderRadius:"50%",fontSize:8,fontWeight:700,
            display:"flex",alignItems:"center",justifyContent:"center"}}>2</div>
        </div>
        <div style={{width:28,height:28,borderRadius:"50%",background:T.blueLight,
          border:`1px solid ${T.blueBorder}`,display:"flex",alignItems:"center",
          justifyContent:"center",fontSize:10,color:T.blueText,fontWeight:700}}>AB</div>
      </div>
    </div>
  );
}

function WfProductCard({badge=null,flash=false,size="md"}){
  const imgH=size==="sm"?90:122;
  return(
    <div style={{background:T.bg0,border:`1px solid ${T.border1}`,borderRadius:T.r.lg,overflow:"hidden"}}>
      <div style={{position:"relative"}}>
        <WfImg height={imgH}/>
        {badge==="sale"&&<div style={{position:"absolute",top:7,left:7,background:T.redLight,color:T.red,
          borderRadius:T.r.sm,padding:"2px 6px",fontSize:9,fontWeight:700}}>–20%</div>}
        {badge==="new"&&<div style={{position:"absolute",top:7,left:7,background:T.greenLight,color:T.green,
          borderRadius:T.r.sm,padding:"2px 6px",fontSize:9,fontWeight:700}}>New</div>}
        <div style={{position:"absolute",top:7,right:7,width:22,height:22,background:T.bg0,
          border:`1px solid ${T.border0}`,borderRadius:"50%",display:"flex",
          alignItems:"center",justifyContent:"center",fontSize:11,color:T.text3}}>♡</div>
      </div>
      <div style={{padding:10}}>
        <WfLine w="75%" h={10} mb={3}/>
        <WfLine w="50%" h={7} mb={6}/>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:7}}>
          <div style={{display:"flex",alignItems:"baseline",gap:5}}>
            <WfLine w={50} h={10} mb={0}/>
            {badge==="sale"&&<WfLine w={35} h={7} mb={0} opacity={0.4}/>}
          </div>
          <div style={{fontSize:10,color:T.yellow,letterSpacing:1}}>★★★★</div>
        </div>
        {flash&&<div style={{fontSize:9,color:T.red,fontWeight:500,marginBottom:6}}>⚡ Sale ends 01:45:22</div>}
        <WfBtn primary style={{width:"100%",fontSize:10,padding:"6px 0",justifyContent:"center"}}>Add to Cart</WfBtn>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// WIREFRAME: HOMEPAGE
// ══════════════════════════════════════════════════════════════════════════════
function WireframeHomepage(){
  return(
    <div style={{fontFamily:T.font,background:T.bg1,color:T.text0}}>
      <WfSection num="01" label="Top Navigation Bar"><WfNav/>
        <WfAnnot>Logo · Nav links · Search bar with live autocomplete · Wishlist icon · Cart with item badge · User avatar / Login + Register CTAs</WfAnnot>
      </WfSection>

      <WfSection num="02" label="Hero Banner Slider (Admin-managed · auto-rotates · multiple slides)">
        <div style={{position:"relative",height:230,overflow:"hidden",background:T.bg3}}>
          <div style={{position:"absolute",inset:0,display:"grid",gridTemplateColumns:"55% 45%"}}>
            <div style={{display:"flex",flexDirection:"column",justifyContent:"center",padding:"32px 40px",gap:10}}>
              <WfTag>New Collection</WfTag>
              <div style={{fontSize:26,fontWeight:700,color:T.text0,lineHeight:1.25,maxWidth:300}}>Elevate Your Everyday Look</div>
              <WfLine w={200} h={7} mb={0} opacity={0.5}/>
              <WfLine w={170} h={7} mb={10} opacity={0.4}/>
              <div style={{display:"flex",gap:10}}><WfBtn primary>Shop Now</WfBtn><WfBtn>Explore Sales</WfBtn></div>
            </div>
            <WfImg height={230} label="Banner Image" style={{borderRadius:0}}/>
          </div>
          {[{s:"left",sym:"‹"},{s:"right",sym:"›"}].map(({s,sym})=>(
            <div key={s} style={{position:"absolute",[s]:10,top:"50%",transform:"translateY(-50%)",
              width:28,height:28,background:"rgba(255,255,255,0.88)",borderRadius:"50%",
              display:"flex",alignItems:"center",justifyContent:"center",
              fontSize:14,color:T.text1,border:`1px solid ${T.border0}`,cursor:"pointer"}}>{sym}</div>
          ))}
          <div style={{position:"absolute",bottom:12,left:"50%",transform:"translateX(-50%)",display:"flex",gap:5}}>
            <div style={{width:22,height:4,background:T.text0,borderRadius:99,opacity:0.7}}/>
            <div style={{width:6,height:4,background:T.border0,borderRadius:99}}/>
            <div style={{width:6,height:4,background:T.border0,borderRadius:99}}/>
          </div>
        </div>
        <WfAnnot>Auto-rotates every 5 s · Pauses on hover (WCAG) · Admin sets: image, headline, subtitle, CTA label, CTA destination</WfAnnot>
      </WfSection>

      <WfSection num="03" label="Trust Badges Row">
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",background:T.bg0}}>
          {[["🚚","Free Shipping","On orders over ₦10,000"],["🛡️","Warranty Guaranteed","All products covered"],["🔄","Easy Returns","30-day hassle-free"],["🎧","24/7 Support","Always here for you"]].map(([ic,t,s],i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:12,padding:"14px 20px",
              borderRight:i<3?`1px solid ${T.border2}`:"none"}}>
              <div style={{fontSize:22}}>{ic}</div>
              <div>
                <div style={{fontSize:11,fontWeight:600,color:T.text0,marginBottom:2}}>{t}</div>
                <div style={{fontSize:10,color:T.text2}}>{s}</div>
              </div>
            </div>
          ))}
        </div>
        <WfAnnot>Static content · 4 trust signals · Collapses to 2×2 on mobile</WfAnnot>
      </WfSection>

      <WfSection num="04" label="Category Grid — Shop by Category">
        <div style={{padding:"20px 24px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:16}}>
            <div>
              <div style={{fontSize:17,fontWeight:700,color:T.text0}}>Shop by Category</div>
              <div style={{fontSize:11,color:T.text2,marginTop:2}}>Browse all our collections</div>
            </div>
            <WfBtn>View All →</WfBtn>
          </div>
          {[0,1].map(row=>(
            <div key={row} style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:12,marginBottom:row===0?12:0}}>
              {["Women","Men","Kids","Electronics","Accessories"].map((cat,i)=>(
                <div key={i} style={{textAlign:"center",cursor:"pointer"}}>
                  <WfImg height={76} style={{borderRadius:T.r.lg,marginBottom:7}}/>
                  <div style={{fontSize:11,color:T.text1,fontWeight:500}}>{cat}</div>
                </div>
              ))}
            </div>
          ))}
        </div>
        <WfAnnot>Dynamic · ordered by admin sort_order · Section hidden if no active categories</WfAnnot>
      </WfSection>

      <WfSection num="05" label="New Arrivals Section">
        <div style={{padding:"20px 24px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <div style={{fontSize:17,fontWeight:700,color:T.text0}}>New Arrivals</div>
            <div style={{display:"flex",gap:6}}>
              {["All","Men","Women","Kids","Accessories"].map((t,i)=><WfTag key={t} active={i===0}>{t}</WfTag>)}
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14}}>
            {[null,"new","new",null].map((b,i)=><WfProductCard key={i} badge={b}/>)}
          </div>
        </div>
        <WfAnnot>Sorted by created_at DESC · Tab filter changes category scope · Skeleton cards shown on load</WfAnnot>
      </WfSection>

      <WfSection num="06" label="About Us Snippet">
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",background:T.bg2}}>
          <div style={{padding:"32px 40px",display:"flex",flexDirection:"column",justifyContent:"center",gap:10}}>
            <div style={{fontSize:10,letterSpacing:"0.1em",textTransform:"uppercase",color:T.text3,fontWeight:600}}>About Us</div>
            <div style={{fontSize:20,fontWeight:700,color:T.text0,lineHeight:1.3}}>Designed for your everyday confidence</div>
            <WfLine w="100%" mb={3}/><WfLine w="90%" mb={3}/><WfLine w="80%" mb={14}/>
            <WfBtn primary style={{alignSelf:"flex-start"}}>Explore Our Story →</WfBtn>
          </div>
          <WfImg height={200} label="About Image" style={{borderRadius:0}}/>
        </div>
        <WfAnnot>Content pulled from same Page Editor record as /about · Zero admin duplication</WfAnnot>
      </WfSection>

      <WfSection num="07" label="Flash Sales Section (entirely hidden when no active sales)">
        <div style={{padding:"20px 24px",background:T.bg1}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <div>
              <div style={{fontSize:17,fontWeight:700,color:T.text0,marginBottom:6}}>Flash Sales</div>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <span style={{fontSize:11,color:T.text2}}>Ends in:</span>
                {["02","14","37","09"].map((t,i)=>(
                  <span key={i} style={{display:"inline-flex"}}>
                    <span style={{background:T.text0,color:T.bg0,borderRadius:T.r.sm,padding:"2px 7px",fontSize:12,fontWeight:600,fontFamily:T.mono}}>{t}</span>
                    {i<3&&<span style={{margin:"0 2px",color:T.text2,fontSize:12}}>:</span>}
                  </span>
                ))}
              </div>
            </div>
            <WfBtn>View All Flash Sales →</WfBtn>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14}}>
            {["sale","sale","sale","sale"].map((b,i)=><WfProductCard key={i} badge={b} flash={true}/>)}
          </div>
        </div>
        <WfAnnot>CountdownTimer counts to earliest active flash sale end_time · Progress bar shows % sold · Hidden when NOW() is outside all flash sale windows</WfAnnot>
      </WfSection>

      <WfSection num="08" label="Customer Testimonials (Top 6 by helpfulness)">
        <div style={{padding:"20px 24px"}}>
          <div style={{fontSize:17,fontWeight:700,color:T.text0,textAlign:"center",marginBottom:18}}>What Our Clients Say</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14}}>
            {[1,2,3].map(i=>(
              <div key={i} style={{background:T.bg2,border:`1px solid ${T.border1}`,borderRadius:T.r.lg,padding:16}}>
                <div style={{fontSize:13,color:T.yellow,marginBottom:8,letterSpacing:2}}>★★★★★</div>
                <WfLine mb={4}/><WfLine w="88%" mb={4}/><WfLine w="72%" mb={14}/>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <div style={{width:32,height:32,borderRadius:"50%",background:T.bg3,border:`1px solid ${T.border0}`,flexShrink:0}}/>
                  <div><WfLine w={70} h={9} mb={3}/><WfLine w={50} h={7} mb={0} opacity={0.6}/></div>
                </div>
              </div>
            ))}
          </div>
          <div style={{display:"flex",justifyContent:"center",gap:6,marginTop:14}}>
            <div style={{width:24,height:4,background:T.text0,borderRadius:99,opacity:0.7}}/>
            <div style={{width:6,height:4,background:T.border0,borderRadius:99}}/>
          </div>
        </div>
        <WfAnnot>Auto-fetched: top 6 approved reviews · Verified Purchase label on each card · 2 pages of 3 cards</WfAnnot>
      </WfSection>

      <WfSection num="09" label="FAQ Accordion Snippet (first 4 items)">
        <div style={{padding:"20px 24px"}}>
          <div style={{fontSize:17,fontWeight:700,color:T.text0,textAlign:"center",marginBottom:16}}>Frequently Asked Questions</div>
          {["How long does delivery take?","What payment methods do you accept?","Can I track my order?","Do you ship internationally?"].map((q,i)=>(
            <div key={i} style={{border:`1px solid ${T.border1}`,borderRadius:T.r.md,marginBottom:6,overflow:"hidden"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
                padding:"11px 16px",background:i===0?T.bg2:T.bg0,cursor:"pointer"}}>
                <span style={{fontSize:12,color:T.text0,fontWeight:i===0?500:400}}>{q}</span>
                <span style={{fontSize:16,color:T.text3}}>{i===0?"−":"+"}</span>
              </div>
              {i===0&&(
                <div style={{padding:"10px 16px",borderTop:`1px solid ${T.border1}`}}>
                  <WfLine w="92%" mb={4}/><WfLine w="70%" mb={0}/>
                </div>
              )}
            </div>
          ))}
          <div style={{textAlign:"center",marginTop:12}}>
            <span style={{fontSize:11,color:T.blueText,textDecoration:"underline",cursor:"pointer"}}>View All FAQs →</span>
          </div>
        </div>
        <WfAnnot>First 4 from DB ordered by sort_order · First item pre-expanded · Admin-managed via FAQ Management</WfAnnot>
      </WfSection>

      <WfSection num="10" label="Newsletter Subscription">
        <div style={{padding:"28px 24px",background:T.bg2,textAlign:"center"}}>
          <div style={{fontSize:17,fontWeight:700,color:T.text0,marginBottom:4}}>Subscribe to our Newsletter</div>
          <div style={{fontSize:12,color:T.text2,marginBottom:16}}>Get updates on new arrivals and exclusive flash sales</div>
          <div style={{display:"flex",gap:8,maxWidth:400,margin:"0 auto 10px"}}>
            <input readOnly placeholder="Enter your email address" style={{flex:1,padding:"9px 14px",
              border:`1px solid ${T.border0}`,borderRadius:T.r.md,fontSize:11,background:T.bg0,fontFamily:T.font}}/>
            <WfBtn primary>Subscribe</WfBtn>
          </div>
          <div style={{fontSize:10,color:T.text3}}>Available to signed-up buyers only · Unsubscribe anytime</div>
        </div>
        <WfAnnot>Only captures existing buyer emails · Auto-triggers newsletter on new product OR flash sale creation</WfAnnot>
      </WfSection>

      <WfSection num="11" label="Footer">
        <div style={{padding:"28px 24px 14px",background:T.bg0}}>
          <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr",gap:28,marginBottom:22}}>
            <div>
              <div style={{fontSize:16,fontWeight:700,color:T.text0,marginBottom:10}}>WillOfGod</div>
              <WfLine mb={4}/><WfLine w="85%" mb={4}/><WfLine w="70%" mb={14}/>
              <div style={{display:"flex",gap:8}}>
                {["📸","📘","🐦","▶️"].map((ic,i)=>(
                  <div key={i} style={{width:28,height:28,borderRadius:"50%",border:`1px solid ${T.border0}`,
                    display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,cursor:"pointer"}}>{ic}</div>
                ))}
              </div>
            </div>
            {[["Help","Contact Us","FAQ","Shipping Policy","Returns"],
              ["Company","About Us","Careers","Privacy Policy","Terms"],
              ["Categories","Women","Men","Kids","Electronics"]].map((col,ci)=>(
              <div key={ci}>
                <div style={{fontSize:12,fontWeight:600,color:T.text0,marginBottom:10}}>{col[0]}</div>
                {col.slice(1).map(l=><div key={l} style={{fontSize:11,color:T.text2,marginBottom:6,cursor:"pointer"}}>{l}</div>)}
              </div>
            ))}
          </div>
          <div style={{borderTop:`1px solid ${T.border2}`,paddingTop:12,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{fontSize:11,color:T.text3}}>© 2026 WillOfGod. All rights reserved.</div>
            <div style={{display:"flex",gap:6}}>{["Stripe","PayPal","Paystack"].map(p=><WfTag key={p}>{p}</WfTag>)}</div>
          </div>
        </div>
      </WfSection>

      <WfSection num="12" label="Floating Live Chat Widget (fixed bottom-right — every page)">
        <div style={{padding:"16px 24px",display:"flex",alignItems:"center",gap:16}}>
          <div style={{position:"relative"}}>
            <div style={{width:48,height:48,borderRadius:"50%",background:T.blue,display:"flex",
              alignItems:"center",justifyContent:"center",fontSize:22,color:"#fff",
              boxShadow:"0 4px 14px rgba(29,78,216,0.35)",cursor:"pointer"}}>💬</div>
            <div style={{position:"absolute",top:0,right:0,width:14,height:14,background:T.red,
              borderRadius:"50%",border:`2px solid ${T.bg0}`,fontSize:7,fontWeight:700,
              display:"flex",alignItems:"center",justifyContent:"center",color:"#fff"}}>1</div>
          </div>
          <div style={{fontSize:11,color:T.text2,lineHeight:1.6}}>
            Fixed position · Bottom-right · Opens sliding chat panel on click · Supports anonymous visitors (session cookie) and authenticated buyers (account-linked) · Red badge when admin has sent unread messages
          </div>
        </div>
      </WfSection>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// WIREFRAME: PRODUCT LISTING
// ══════════════════════════════════════════════════════════════════════════════
function WireframeProductListing(){
  return(
    <div style={{fontFamily:T.font,background:T.bg1,color:T.text0}}>
      <WfSection num="01" label="Top Navigation Bar"><WfNav/></WfSection>

      <WfSection num="02" label="Breadcrumb Bar">
        <div style={{padding:"8px 24px",fontSize:11,color:T.text2,background:T.bg2,display:"flex",gap:6,alignItems:"center"}}>
          {["Home","›","Shop","›","All Products"].map((s,i)=>(
            <span key={i} style={{color:i===4?T.text0:s==="›"?T.text3:T.blueText,fontWeight:i===4?500:400}}>{s}</span>
          ))}
        </div>
      </WfSection>

      <WfSection num="03" label="Page Header + Results Count + Sort + View Toggle">
        <div style={{padding:"14px 24px",display:"flex",justifyContent:"space-between",alignItems:"center",background:T.bg0}}>
          <div>
            <div style={{fontSize:20,fontWeight:700,color:T.text0}}>All Products</div>
            <div style={{fontSize:11,color:T.text3,marginTop:2}}>248 products found</div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <span style={{fontSize:11,color:T.text2}}>Sort by:</span>
              <select style={{fontSize:11,padding:"5px 10px",border:`1px solid ${T.border0}`,
                borderRadius:T.r.md,background:T.bg0,fontFamily:T.font}}>
                <option>Newest First</option>
              </select>
            </div>
            <div style={{display:"flex",gap:4}}>
              {[{ic:"⊞",act:true},{ic:"≡",act:false}].map(({ic,act})=>(
                <div key={ic} style={{width:28,height:28,borderRadius:T.r.sm,
                  background:act?T.blueLight:T.bg2,border:`1px solid ${act?T.blueBorder:T.border1}`,
                  display:"flex",alignItems:"center",justifyContent:"center",
                  fontSize:14,color:act?T.blueText:T.text2,cursor:"pointer"}}>{ic}</div>
              ))}
            </div>
          </div>
        </div>
      </WfSection>

      <WfSection num="04" label="Active Filter Chips">
        <div style={{padding:"8px 24px",display:"flex",gap:7,alignItems:"center",background:T.bg0,flexWrap:"wrap",borderBottom:`1px solid ${T.border2}`}}>
          <span style={{fontSize:11,color:T.text3}}>Active filters:</span>
          {["Women","₦5,000 – ₦25,000","In Stock"].map(f=>(
            <div key={f} style={{display:"flex",alignItems:"center",gap:4,background:T.blueLight,
              border:`1px solid ${T.blueBorder}`,borderRadius:T.r.full,padding:"3px 10px"}}>
              <span style={{fontSize:10,color:T.blueText}}>{f}</span>
              <span style={{fontSize:12,color:T.blueText,cursor:"pointer"}}>×</span>
            </div>
          ))}
          <WfBtn style={{fontSize:10,padding:"3px 10px"}}>Clear All</WfBtn>
        </div>
      </WfSection>

      <WfSection num="05+06" label="Filter Sidebar (200px) + Product Grid (4-col)">
        <div style={{display:"grid",gridTemplateColumns:"200px 1fr"}}>
          {/* SIDEBAR */}
          <div style={{borderRight:`1px solid ${T.border1}`,padding:16,background:T.bg0}}>
            {/* Categories */}
            <div style={{marginBottom:12}}>
              <div style={{fontSize:11,fontWeight:600,color:T.text0,marginBottom:8,display:"flex",justifyContent:"space-between"}}>
                Categories <span style={{fontWeight:400,fontSize:10,color:T.text3}}>▾</span>
              </div>
              {[["Clothing",124,true],["Electronics",48,true],["Footwear",32,false],["Accessories",44,false]].map(([c,n,chk])=>(
                <label key={c} style={{display:"flex",alignItems:"center",gap:7,marginBottom:6,cursor:"pointer"}}>
                  <input type="checkbox" defaultChecked={chk} readOnly style={{width:12,height:12}}/>
                  <span style={{fontSize:10,color:T.text1}}>{c} ({n})</span>
                </label>
              ))}
              <span style={{fontSize:10,color:T.blueText,cursor:"pointer"}}>+ Show more</span>
            </div>
            <div style={{height:1,background:T.border2,margin:"10px 0"}}/>
            {/* Price */}
            <div style={{marginBottom:12}}>
              <div style={{fontSize:11,fontWeight:600,color:T.text0,marginBottom:8}}>Price Range</div>
              <input type="range" min={0} max={100} defaultValue={60} style={{width:"100%",marginBottom:6}}/>
              <div style={{display:"flex",justifyContent:"space-between"}}>
                {["₦0","₦50,000"].map(v=>(
                  <div key={v} style={{background:T.bg2,border:`1px solid ${T.border0}`,borderRadius:T.r.sm,padding:"3px 8px",fontSize:10,color:T.text2}}>{v}</div>
                ))}
              </div>
            </div>
            <div style={{height:1,background:T.border2,margin:"10px 0"}}/>
            {/* Size */}
            <div style={{marginBottom:12}}>
              <div style={{fontSize:11,fontWeight:600,color:T.text0,marginBottom:8}}>Size</div>
              <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                {["XS","S","M","L","XL","XXL"].map((s,i)=>(
                  <div key={s} style={{padding:"3px 8px",border:`1px solid ${i===2?T.blueBorder:T.border0}`,
                    background:i===2?T.blueLight:"transparent",borderRadius:T.r.sm,
                    fontSize:10,color:i===2?T.blueText:T.text1,cursor:"pointer"}}>{s}</div>
                ))}
              </div>
            </div>
            <div style={{height:1,background:T.border2,margin:"10px 0"}}/>
            {/* Colour */}
            <div style={{marginBottom:12}}>
              <div style={{fontSize:11,fontWeight:600,color:T.text0,marginBottom:8}}>Colour</div>
              <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>
                {[["#1a1a18",false],["#8B1919",false],["#0C3C6E",true],["#2B5A0E",false],["#4A2804",false],["#888480",false]].map(([c,act],i)=>(
                  <div key={i} style={{width:20,height:20,borderRadius:"50%",background:c,
                    border:act?`2.5px solid ${T.text0}`:`1px solid ${T.border0}`,cursor:"pointer"}}/>
                ))}
              </div>
            </div>
            <div style={{height:1,background:T.border2,margin:"10px 0"}}/>
            {/* Rating */}
            <div style={{marginBottom:12}}>
              <div style={{fontSize:11,fontWeight:600,color:T.text0,marginBottom:8}}>Star Rating</div>
              {[[5,42],[4,87],[3,63]].map(([r,n])=>(
                <label key={r} style={{display:"flex",alignItems:"center",gap:6,marginBottom:5,cursor:"pointer"}}>
                  <input type="checkbox" readOnly style={{width:12,height:12}}/>
                  <span style={{fontSize:11,color:T.yellow}}>{"★".repeat(r)}{"☆".repeat(5-r)}</span>
                  <span style={{fontSize:10,color:T.text3}}>({n})</span>
                </label>
              ))}
            </div>
            <div style={{height:1,background:T.border2,margin:"10px 0"}}/>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
              <span style={{fontSize:11,color:T.text0}}>In Stock Only</span>
              <div style={{width:34,height:18,background:T.blue,borderRadius:99,position:"relative"}}>
                <div style={{position:"absolute",right:2,top:2,width:14,height:14,background:"#fff",borderRadius:"50%"}}/>
              </div>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{fontSize:11,color:T.text0}}>On Sale Only</span>
              <div style={{width:34,height:18,background:T.bg3,border:`1px solid ${T.border0}`,borderRadius:99,position:"relative"}}>
                <div style={{position:"absolute",left:2,top:2,width:14,height:14,background:T.border0,borderRadius:"50%"}}/>
              </div>
            </div>
          </div>
          {/* GRID */}
          <div style={{padding:16,background:T.bg1}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <div style={{fontSize:11,color:T.text2}}>Showing <strong style={{color:T.text0}}>24</strong> of 62 products</div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12}}>
              {[null,"sale","new",null,"new",null,"sale",null].map((b,i)=><WfProductCard key={i} badge={b} size="sm"/>)}
            </div>
          </div>
        </div>
        <WfAnnot>Filter changes update URL query string · All filter state deep-linkable · 'Add to Cart' requires auth · Compare bar appears at bottom when ≥2 products selected</WfAnnot>
      </WfSection>

      <WfSection num="07" label="Pagination">
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 24px",background:T.bg0}}>
          <div style={{fontSize:11,color:T.text3}}>Showing products 1–24 of 248</div>
          <div style={{display:"flex",alignItems:"center",gap:5}}>
            <WfBtn style={{fontSize:10,padding:"5px 12px"}}>‹ Prev</WfBtn>
            {[1,2,3,"…",12].map((p,i)=>(
              <div key={i} style={{width:28,height:28,borderRadius:T.r.md,
                background:i===0?T.blueLight:"transparent",border:`1px solid ${i===0?T.blueBorder:T.border1}`,
                display:"flex",alignItems:"center",justifyContent:"center",
                fontSize:11,color:i===0?T.blueText:T.text2,cursor:"pointer"}}>{p}</div>
            ))}
            <WfBtn style={{fontSize:10,padding:"5px 12px"}}>Next ›</WfBtn>
          </div>
        </div>
      </WfSection>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// WIREFRAME: PRODUCT DETAIL
// ══════════════════════════════════════════════════════════════════════════════
function WireframeProductDetail(){
  return(
    <div style={{fontFamily:T.font,background:T.bg1,color:T.text0}}>
      <WfSection num="01" label="Top Navigation Bar + Breadcrumb">
        <WfNav/>
        <div style={{padding:"8px 24px",fontSize:11,background:T.bg2,display:"flex",gap:6}}>
          {["Home","›","Women","›","Clothing","›","Classic Tailored Blazer"].map((s,i)=>(
            <span key={i} style={{color:i===6?T.text0:s==="›"?T.text3:T.blueText,fontWeight:i===6?500:400}}>{s}</span>
          ))}
        </div>
      </WfSection>

      <WfSection num="02+03" label="Image Gallery (left column) + Product Info Panel (right column)">
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",background:T.bg0}}>
          {/* Gallery */}
          <div style={{padding:20,borderRight:`1px solid ${T.border1}`}}>
            <div style={{fontSize:9,letterSpacing:"0.1em",textTransform:"uppercase",color:T.text3,marginBottom:12,fontWeight:600,fontFamily:T.mono}}>02 — Image Gallery</div>
            <div style={{position:"relative",marginBottom:10}}>
              <WfImg height={285} label="Main Product Image" style={{borderRadius:T.r.lg}}/>
              <div style={{position:"absolute",top:10,right:10,background:"rgba(255,255,255,0.92)",
                border:`1px solid ${T.border0}`,borderRadius:T.r.sm,padding:"4px 10px",
                fontSize:10,color:T.text2}}>⊕ Zoom</div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:7}}>
              {[0,1,2,3,4].map(i=>(
                <WfImg key={i} height={56} style={{borderRadius:T.r.md,
                  border:i===0?`2px solid ${T.blue}`:`1px solid ${T.border1}`}}/>
              ))}
            </div>
            <WfAnnot>Variant-specific images · Click thumbnail → changes main image · Hover to zoom · Max 8 per variant</WfAnnot>
          </div>
          {/* Info */}
          <div style={{padding:20}}>
            <div style={{fontSize:9,letterSpacing:"0.1em",textTransform:"uppercase",color:T.text3,marginBottom:14,fontWeight:600,fontFamily:T.mono}}>03 — Product Info Panel</div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
              <WfTag>Women / Clothing</WfTag>
              <div style={{display:"flex",gap:7}}>
                {["♡","⊕"].map(ic=>(
                  <div key={ic} style={{width:30,height:30,borderRadius:"50%",border:`1px solid ${T.border0}`,
                    display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,color:T.text2,cursor:"pointer"}}>{ic}</div>
                ))}
              </div>
            </div>
            <div style={{fontSize:22,fontWeight:700,color:T.text0,marginBottom:8,lineHeight:1.25}}>Classic Tailored Blazer</div>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
              <span style={{fontSize:13,color:T.yellow,letterSpacing:1}}>★★★★☆</span>
              <span style={{fontSize:11,color:T.blueText,textDecoration:"underline",cursor:"pointer"}}>42 reviews</span>
              <span style={{fontSize:11,color:T.green,fontWeight:500}}>● In Stock</span>
            </div>
            {/* Price block */}
            <div style={{background:T.bg2,border:`1px solid ${T.border1}`,borderRadius:T.r.md,padding:14,marginBottom:16}}>
              <div style={{display:"flex",alignItems:"baseline",gap:10,marginBottom:10}}>
                <span style={{fontSize:26,fontWeight:700,color:T.text0}}>₦18,500</span>
                <span style={{fontSize:15,color:T.text3,textDecoration:"line-through"}}>₦25,000</span>
                <div style={{background:T.redLight,color:T.red,borderRadius:T.r.sm,padding:"2px 8px",fontSize:11,fontWeight:700}}>–26%</div>
              </div>
              <div style={{paddingTop:10,borderTop:`1px solid ${T.border1}`,display:"flex",alignItems:"center",gap:8}}>
                <span style={{fontSize:11,color:T.red,fontWeight:600}}>⚡ Flash Sale ends in:</span>
                <div style={{display:"flex",gap:3}}>
                  {["01","45","22"].map((t,i)=>(
                    <span key={i} style={{display:"inline-flex"}}>
                      <span style={{background:T.red,color:"#fff",borderRadius:T.r.sm,padding:"1px 6px",fontSize:11,fontFamily:T.mono,fontWeight:600}}>{t}</span>
                      {i<2&&<span style={{color:T.red,fontSize:12,margin:"0 1px"}}>:</span>}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            {/* Colour */}
            <div style={{marginBottom:14}}>
              <div style={{fontSize:12,fontWeight:600,color:T.text0,marginBottom:8}}>Select Colour</div>
              <div style={{display:"flex",gap:8}}>
                {[["#1a1a18",true],["#0C3C6E",false],["#8B1919",false],["#888480",false]].map(([c,act],i)=>(
                  <div key={i} style={{width:26,height:26,borderRadius:"50%",background:c,
                    border:act?`2.5px solid ${T.text0}`:`1px solid ${T.border0}`,cursor:"pointer"}}/>
                ))}
              </div>
            </div>
            {/* Size */}
            <div style={{marginBottom:14}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                <div style={{fontSize:12,fontWeight:600,color:T.text0}}>Select Size</div>
                <span style={{fontSize:11,color:T.blueText,textDecoration:"underline",cursor:"pointer"}}>Size Guide</span>
              </div>
              <div style={{display:"flex",gap:7,marginBottom:6}}>
                {["XS","S","M","L","XL"].map((s,i)=>(
                  <div key={s} style={{padding:"6px 12px",border:`1px solid ${i===2?T.blueBorder:T.border0}`,
                    background:i===2?T.blueLight:"transparent",borderRadius:T.r.md,
                    fontSize:12,color:i===2?T.blueText:T.text1,cursor:"pointer"}}>{s}</div>
                ))}
              </div>
              <div style={{fontSize:10,color:T.red}}>Only 3 left in stock</div>
            </div>
            {/* Qty */}
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
              <span style={{fontSize:12,fontWeight:600,color:T.text0}}>Qty:</span>
              <div style={{display:"flex",alignItems:"center",border:`1px solid ${T.border0}`,borderRadius:T.r.md,overflow:"hidden"}}>
                {["−","1","+"].map((v,i)=>(
                  <div key={i} style={{width:i===1?42:32,height:34,background:i===1?T.bg0:T.bg2,
                    display:"flex",alignItems:"center",justifyContent:"center",
                    fontSize:i===1?13:18,color:T.text1,
                    borderLeft:i>0?`1px solid ${T.border0}`:"none",cursor:i!==1?"pointer":"default"}}>{v}</div>
                ))}
              </div>
            </div>
            {/* CTAs */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
              <WfBtn primary style={{padding:"12px 0",fontSize:13,justifyContent:"center"}}>Add to Cart</WfBtn>
              <div style={{display:"flex",alignItems:"center",justifyContent:"center",
                background:T.text0,color:T.bg0,borderRadius:T.r.md,
                padding:"12px 0",fontSize:13,fontWeight:500,cursor:"pointer"}}>Buy Now</div>
            </div>
            <WfAnnot>Add to Cart & Buy Now both require login · Visitors redirected to login with return_to param</WfAnnot>
            <div style={{display:"flex",gap:14,paddingTop:12,borderTop:`1px solid ${T.border2}`,flexWrap:"wrap"}}>
              {["🚚 Free shipping over ₦10,000","🔄 Easy 30-day returns","🔒 Secure payments"].map(f=>(
                <div key={f} style={{fontSize:10,color:T.text3}}>{f}</div>
              ))}
            </div>
          </div>
        </div>
      </WfSection>

      <WfSection num="04" label="Product Description + Specification Tabs">
        <div style={{background:T.bg0,padding:"0 24px"}}>
          <div style={{display:"flex",borderBottom:`1px solid ${T.border1}`}}>
            {["Description","Specifications","Shipping & Returns"].map((t,i)=>(
              <div key={t} style={{padding:"11px 20px",fontSize:12,cursor:"pointer",
                color:i===0?T.text0:T.text3,
                borderBottom:i===0?`2.5px solid ${T.text0}`:"2px solid transparent",
                fontWeight:i===0?600:400}}>{t}</div>
            ))}
          </div>
          <div style={{padding:"16px 0"}}>
            {[100,95,90,88,75,60].map((w,i)=><WfLine key={i} w={`${w}%`} mb={5}/>)}
          </div>
        </div>
        <WfAnnot>Description: rich HTML from admin editor · Specifications: JSONB attributes as key-value table · Shipping & Returns: from Page Editor policy content</WfAnnot>
      </WfSection>

      <WfSection num="05" label="Reviews Section">
        <div style={{padding:"20px 24px",background:T.bg0}}>
          <div style={{display:"grid",gridTemplateColumns:"220px 1fr",gap:20}}>
            <div style={{background:T.bg2,border:`1px solid ${T.border1}`,borderRadius:T.r.lg,padding:18,textAlign:"center"}}>
              <div style={{fontSize:40,fontWeight:700,color:T.text0,lineHeight:1}}>4.2</div>
              <div style={{fontSize:16,color:T.yellow,margin:"6px 0 4px",letterSpacing:2}}>★★★★☆</div>
              <div style={{fontSize:11,color:T.text3,marginBottom:14}}>Based on 42 reviews</div>
              {[5,4,3,2,1].map(r=>(
                <div key={r} style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
                  <span style={{fontSize:10,color:T.text3,minWidth:8}}>{r}</span>
                  <div style={{flex:1,height:5,background:T.bg3,borderRadius:99}}>
                    <div style={{height:"100%",width:`${[70,50,20,10,5][5-r]}%`,background:T.yellow,borderRadius:99}}/>
                  </div>
                </div>
              ))}
            </div>
            <div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                <div style={{display:"flex",gap:6}}>
                  {["Most Recent","Most Helpful","Highest","Lowest"].map((s,i)=><WfTag key={s} active={i===0}>{s}</WfTag>)}
                </div>
                <WfBtn primary style={{fontSize:11}}>Write a Review</WfBtn>
              </div>
              {[1,2].map(i=>(
                <div key={i} style={{border:`1px solid ${T.border1}`,borderRadius:T.r.lg,padding:14,marginBottom:10}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <div style={{width:32,height:32,borderRadius:"50%",background:T.bg3,border:`1px solid ${T.border0}`}}/>
                      <div>
                        <div style={{fontSize:12,fontWeight:600,color:T.text0}}>Buyer Name</div>
                        <div style={{fontSize:10,color:T.text3}}>Verified Purchase · 2 days ago</div>
                      </div>
                    </div>
                    <div style={{fontSize:13,color:T.yellow,letterSpacing:1}}>★★★★★</div>
                  </div>
                  <WfLine mb={4}/><WfLine w="76%" mb={10}/>
                  <WfBtn style={{fontSize:10,padding:"3px 10px"}}>👍 Helpful (7)</WfBtn>
                </div>
              ))}
              <WfBtn style={{width:"100%",justifyContent:"center",fontSize:11}}>Load more reviews</WfBtn>
            </div>
          </div>
        </div>
        <WfAnnot>'Write a Review' only for buyers with DELIVERED order for this product · One helpful vote per user per review</WfAnnot>
      </WfSection>

      <WfSection num="06" label="Recently Viewed + Related Products">
        <div style={{padding:"16px 24px",background:T.bg2}}>
          <div style={{fontSize:14,fontWeight:700,color:T.text0,marginBottom:12}}>You Recently Viewed</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:10,marginBottom:20}}>
            {[1,2,3,4,5].map(i=>(
              <div key={i}><WfImg height={82} style={{borderRadius:T.r.md,marginBottom:6}}/><WfLine w="80%" h={7} mb={0}/></div>
            ))}
          </div>
          <div style={{fontSize:14,fontWeight:700,color:T.text0,marginBottom:12}}>You May Also Like</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12}}>
            {[null,"sale","new",null].map((b,i)=><WfProductCard key={i} badge={b} size="sm"/>)}
          </div>
        </div>
        <WfAnnot>Authenticated buyers: last 20 from DB · Visitors: cookie-tracked · Related: same category ordered by popularity</WfAnnot>
      </WfSection>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// WIREFRAME: CATEGORY PAGE
// ══════════════════════════════════════════════════════════════════════════════
function WireframeCategoryPage(){
  return(
    <div style={{fontFamily:T.font,background:T.bg1,color:T.text0}}>
      <WfSection num="01" label="Top Navigation Bar + Breadcrumb">
        <WfNav/>
        <div style={{padding:"8px 24px",fontSize:11,background:T.bg2,display:"flex",gap:6}}>
          {["Home","›","Women"].map((s,i)=>(
            <span key={i} style={{color:i===2?T.text0:s==="›"?T.text3:T.blueText,fontWeight:i===2?500:400}}>{s}</span>
          ))}
        </div>
      </WfSection>

      <WfSection num="02" label="Category Hero Banner">
        <div style={{position:"relative",height:150}}>
          <WfImg height={150} label="Category Banner Image" style={{borderRadius:0}}/>
          <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",
            justifyContent:"flex-end",padding:"20px 28px",
            background:"linear-gradient(to top, rgba(0,0,0,0.52) 0%, transparent 65%)"}}>
            <div style={{fontSize:26,fontWeight:700,color:"#fff",marginBottom:4,textShadow:"0 1px 4px rgba(0,0,0,0.4)"}}>Women</div>
            <div style={{fontSize:12,color:"rgba(255,255,255,0.85)"}}>124 products · Clothing, Footwear, Accessories</div>
          </div>
        </div>
        <WfAnnot>Category image admin-managed in Category Management · Dark gradient overlay ensures legibility on any image · Product count dynamically fetched</WfAnnot>
      </WfSection>

      <WfSection num="03" label="Subcategory Cards">
        <div style={{padding:"18px 24px",background:T.bg0}}>
          <div style={{fontSize:13,fontWeight:700,color:T.text0,marginBottom:12}}>Shop by Subcategory</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:12}}>
            {["Dresses","Tops","Trousers","Jackets","Accessories"].map((s,i)=>(
              <div key={s} style={{border:`1px solid ${i===0?T.blueBorder:T.border1}`,
                background:i===0?T.blueLight:T.bg0,borderRadius:T.r.lg,overflow:"hidden",cursor:"pointer"}}>
                <WfImg height={74} style={{borderRadius:0}}/>
                <div style={{padding:"7px 8px",fontSize:11,fontWeight:i===0?600:400,
                  color:i===0?T.blueText:T.text0,textAlign:"center"}}>{s}</div>
              </div>
            ))}
          </div>
        </div>
        <WfAnnot>Direct child subcategories of current category · Active card highlighted · Hidden if no child categories · Horizontal scroll on mobile</WfAnnot>
      </WfSection>

      <WfSection num="04+05" label="Filter Sidebar (subcategory-scoped) + Product Grid (3-col)">
        <div style={{display:"grid",gridTemplateColumns:"200px 1fr"}}>
          {/* Sidebar */}
          <div style={{borderRight:`1px solid ${T.border1}`,padding:16,background:T.bg0}}>
            <div style={{fontSize:11,fontWeight:600,color:T.text0,marginBottom:9}}>
              Subcategory <span style={{fontWeight:400,color:T.text3,fontSize:10}}>▾</span>
            </div>
            {[["Dresses",28,true],["Tops",34,true],["Trousers",22,false],["Jackets",18,false],["Accessories",22,false]].map(([c,n,chk])=>(
              <label key={c} style={{display:"flex",alignItems:"center",gap:7,marginBottom:6,cursor:"pointer"}}>
                <input type="checkbox" defaultChecked={chk} readOnly style={{width:12,height:12}}/>
                <span style={{fontSize:10,color:T.text1}}>{c} ({n})</span>
              </label>
            ))}
            <div style={{height:1,background:T.border2,margin:"12px 0"}}/>
            <div style={{fontSize:11,fontWeight:600,color:T.text0,marginBottom:8}}>Price Range</div>
            <input type="range" min={0} max={100} defaultValue={70} style={{width:"100%",marginBottom:6}}/>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}>
              <div style={{background:T.bg2,border:`1px solid ${T.border0}`,borderRadius:T.r.sm,padding:"3px 7px",fontSize:10,color:T.text2}}>₦0</div>
              <div style={{background:T.bg2,border:`1px solid ${T.border0}`,borderRadius:T.r.sm,padding:"3px 7px",fontSize:10,color:T.text2}}>₦50k</div>
            </div>
            <div style={{height:1,background:T.border2,margin:"12px 0"}}/>
            <div style={{fontSize:11,fontWeight:600,color:T.text0,marginBottom:8}}>Size</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:12}}>
              {["XS","S","M","L","XL"].map((s,i)=>(
                <div key={s} style={{padding:"3px 8px",border:`1px solid ${i===1?T.blueBorder:T.border0}`,
                  background:i===1?T.blueLight:"transparent",borderRadius:T.r.sm,
                  fontSize:10,color:i===1?T.blueText:T.text1,cursor:"pointer"}}>{s}</div>
              ))}
            </div>
            <div style={{height:1,background:T.border2,margin:"12px 0"}}/>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{fontSize:11,color:T.text0}}>In Stock Only</span>
              <div style={{width:34,height:18,background:T.blue,borderRadius:99,position:"relative"}}>
                <div style={{position:"absolute",right:2,top:2,width:14,height:14,background:"#fff",borderRadius:"50%"}}/>
              </div>
            </div>
          </div>
          {/* Grid */}
          <div style={{padding:16,background:T.bg1}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <div style={{fontSize:11,color:T.text2}}>Showing <strong style={{color:T.text0}}>62</strong> of 124 products</div>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <span style={{fontSize:10,color:T.text2}}>Sort:</span>
                <select style={{fontSize:10,padding:"4px 8px",border:`1px solid ${T.border0}`,borderRadius:T.r.md,fontFamily:T.font}}>
                  <option>Most Popular</option>
                </select>
              </div>
            </div>
            <div style={{display:"flex",gap:6,marginBottom:12,flexWrap:"wrap"}}>
              {["Dresses","Tops","S","In Stock"].map(f=>(
                <div key={f} style={{display:"flex",alignItems:"center",gap:3,background:T.blueLight,
                  border:`1px solid ${T.blueBorder}`,borderRadius:T.r.full,padding:"2px 8px"}}>
                  <span style={{fontSize:10,color:T.blueText}}>{f}</span>
                  <span style={{fontSize:11,color:T.blueText,cursor:"pointer"}}>×</span>
                </div>
              ))}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12}}>
              {[null,"sale","new",null,"sale",null].map((b,i)=><WfProductCard key={i} badge={b}/>)}
            </div>
            <div style={{display:"flex",justifyContent:"center",marginTop:16}}>
              <WfBtn style={{fontSize:11,padding:"9px 32px"}}>Load More Products</WfBtn>
            </div>
          </div>
        </div>
        <WfAnnot>Category filter pre-applied · Subcategory checkboxes replace root categories · 3-col grid for wider product images</WfAnnot>
      </WfSection>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// WIREFRAME: SEARCH RESULTS
// ══════════════════════════════════════════════════════════════════════════════
function WireframeSearchResults(){
  return(
    <div style={{fontFamily:T.font,background:T.bg1,color:T.text0}}>
      <WfSection num="Nav" label="Top Navigation Bar"><WfNav/></WfSection>

      {/* EXPANDED SEARCH BAR */}
      <WfSection num="01" label="Expanded Search Bar (full-width · always visible on this page)">
        <div style={{padding:"14px 24px",background:T.bg2,borderBottom:`1px solid ${T.border1}`}}>
          <div style={{position:"relative",maxWidth:600,margin:"0 auto"}}>
            <div style={{display:"flex",alignItems:"center",border:`1.5px solid ${T.blueBorder}`,
              borderRadius:T.r.md,background:T.bg0,overflow:"hidden"}}>
              <span style={{padding:"0 12px",fontSize:16,color:T.text3}}>⌕</span>
              <div style={{flex:1,padding:"9px 4px",fontSize:13,color:T.text0,fontWeight:400}}>
                Blue blazer women
              </div>
              <span style={{padding:"0 10px",fontSize:14,color:T.text3,cursor:"pointer"}}>×</span>
              <WfBtn primary style={{borderRadius:"0 6px 6px 0",padding:"10px 18px",fontSize:11,alignSelf:"stretch"}}>Search</WfBtn>
            </div>
            {/* Autocomplete dropdown */}
            <div style={{position:"absolute",top:"calc(100% + 3px)",left:0,right:0,background:T.bg0,
              border:`1px solid ${T.border0}`,borderRadius:T.r.md,zIndex:5,boxShadow:"0 4px 16px rgba(0,0,0,0.08)",overflow:"hidden"}}>
              <div style={{padding:"8px 0"}}>
                <div style={{fontSize:9,color:T.text3,padding:"3px 14px",letterSpacing:"0.1em",textTransform:"uppercase",fontWeight:600}}>Suggestions</div>
                {["Blue blazer women formal","Blue blazer women casual","Blue blazer women size L"].map((s,i)=>(
                  <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 14px",
                    background:i===0?T.bg2:"transparent",cursor:"pointer"}}>
                    <span style={{fontSize:13,color:T.text3}}>⌕</span>
                    <span style={{fontSize:12,color:T.text0}}>{s}</span>
                  </div>
                ))}
                <div style={{height:1,background:T.border2,margin:"4px 0"}}/>
                <div style={{fontSize:9,color:T.text3,padding:"3px 14px",letterSpacing:"0.1em",textTransform:"uppercase",fontWeight:600}}>Recent Searches</div>
                {["Red dress","Cotton shirt"].map((s,i)=>(
                  <div key={i} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"7px 14px",cursor:"pointer"}}>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <span style={{fontSize:12,color:T.text3}}>↺</span>
                      <span style={{fontSize:12,color:T.text1}}>{s}</span>
                    </div>
                    <div style={{display:"flex",gap:10,alignItems:"center"}}>
                      <span style={{fontSize:10,color:T.blueText,cursor:"pointer"}}>Save alert</span>
                      <span style={{fontSize:13,color:T.text3,cursor:"pointer"}}>×</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <WfAnnot>Live autocomplete via pg_trgm · 'Save alert' = buyer notified by SSE + email when new matching product is added · Recent searches from buyer history or localStorage</WfAnnot>
      </WfSection>

      {/* RESULTS META ROW */}
      <WfSection num="02" label="Results Meta Row">
        <div style={{padding:"9px 24px",display:"flex",justifyContent:"space-between",alignItems:"center",background:T.bg0}}>
          <div style={{fontSize:11,color:T.text2}}>
            Showing <strong style={{color:T.text0}}>34</strong> results for <em style={{color:T.blueText}}>"blue blazer women"</em> · sorted by relevance
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <div style={{background:T.greenLight,border:`1px solid #BBF7D0`,borderRadius:T.r.full,
              padding:"3px 10px",fontSize:10,color:T.green,fontWeight:500,cursor:"pointer"}}>
              ⚡ Save this search
            </div>
            <select style={{fontSize:10,padding:"4px 8px",border:`1px solid ${T.border0}`,borderRadius:T.r.md,fontFamily:T.font}}>
              <option>Most Relevant</option>
            </select>
          </div>
        </div>
        <WfAnnot>Save this search → creates SavedSearch record; authenticated buyers get SSE + email on new matching products · Visitors redirected to login</WfAnnot>
      </WfSection>

      {/* SIDEBAR + GRID */}
      <WfSection num="03+04" label="Filter Sidebar (faceted) + Results Grid (4-col)">
        <div style={{display:"grid",gridTemplateColumns:"190px 1fr"}}>
          {/* Sidebar */}
          <div style={{borderRight:`1px solid ${T.border1}`,padding:14,background:T.bg0}}>
            <div style={{fontSize:11,fontWeight:600,color:T.text0,marginBottom:8}}>Category</div>
            {[["Clothing",22,true],["Footwear",8,false],["Accessories",4,false]].map(([c,n,chk])=>(
              <label key={c} style={{display:"flex",alignItems:"center",gap:7,marginBottom:6,cursor:"pointer"}}>
                <input type="checkbox" defaultChecked={chk} readOnly style={{width:12,height:12}}/>
                <span style={{fontSize:10,color:T.text1}}>{c} ({n})</span>
              </label>
            ))}
            <div style={{height:1,background:T.border2,margin:"10px 0"}}/>
            <div style={{fontSize:11,fontWeight:600,color:T.text0,marginBottom:8}}>Price Range</div>
            <input type="range" min={0} max={100} defaultValue={65} style={{width:"100%",marginBottom:5}}/>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
              <span style={{fontSize:10,color:T.text3}}>₦0</span>
              <span style={{fontSize:10,color:T.text3}}>₦50k</span>
            </div>
            <div style={{height:1,background:T.border2,margin:"10px 0"}}/>
            <div style={{fontSize:11,fontWeight:600,color:T.text0,marginBottom:8}}>Size</div>
            <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:10}}>
              {["XS","S","M","L","XL"].map((s,i)=>(
                <div key={s} style={{padding:"3px 8px",border:`1px solid ${i===2?T.blueBorder:T.border0}`,
                  background:i===2?T.blueLight:"transparent",borderRadius:T.r.sm,
                  fontSize:10,color:i===2?T.blueText:T.text1,cursor:"pointer"}}>{s}</div>
              ))}
            </div>
            <div style={{height:1,background:T.border2,margin:"10px 0"}}/>
            <div style={{fontSize:11,fontWeight:600,color:T.text0,marginBottom:8}}>Colour</div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:10}}>
              {[["#0C447C",true],["#2C2C2A",false],["#A32D2D",false],["#B4B2A9",false]].map(([c,act],i)=>(
                <div key={i} style={{width:18,height:18,borderRadius:"50%",background:c,
                  border:act?`2.5px solid ${T.text0}`:`1px solid ${T.border0}`,cursor:"pointer"}}/>
              ))}
            </div>
            <div style={{height:1,background:T.border2,margin:"10px 0"}}/>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{fontSize:11,color:T.text0}}>In Stock</span>
              <div style={{width:32,height:17,background:T.blue,borderRadius:99,position:"relative"}}>
                <div style={{position:"absolute",right:2,top:2,width:13,height:13,background:"#fff",borderRadius:"50%"}}/>
              </div>
            </div>
          </div>
          {/* Grid */}
          <div style={{padding:14,background:T.bg1}}>
            <div style={{display:"flex",gap:6,marginBottom:10,flexWrap:"wrap",alignItems:"center"}}>
              {["Women","₦5k–₦30k","M","In Stock"].map(f=>(
                <div key={f} style={{display:"flex",alignItems:"center",gap:3,background:T.blueLight,
                  border:`1px solid ${T.blueBorder}`,borderRadius:T.r.full,padding:"2px 8px"}}>
                  <span style={{fontSize:10,color:T.blueText}}>{f}</span>
                  <span style={{fontSize:12,color:T.blueText,cursor:"pointer"}}>×</span>
                </div>
              ))}
              <button style={{fontSize:10,color:T.text3,background:"transparent",border:"none",cursor:"pointer"}}>Clear all</button>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:9}}>
              {[null,"sale","new",null,null,null,"sale",null].map((b,i)=><WfProductCard key={i} badge={b} size="sm"/>)}
            </div>
          </div>
        </div>
      </WfSection>

      {/* NO RESULTS */}
      <WfSection num="05" label="No Results State (shown when query returns 0 products)">
        <div style={{padding:"14px 24px",background:T.bg0}}>
          <div style={{border:`1px dashed ${T.border0}`,borderRadius:T.r.lg,padding:28,
            textAlign:"center",background:T.bg2,maxWidth:500,margin:"0 auto"}}>
            <div style={{fontSize:32,marginBottom:10,color:T.text3}}>⌕</div>
            <div style={{fontSize:15,fontWeight:700,color:T.text0,marginBottom:4}}>No results for "blue silk blazer"</div>
            <div style={{fontSize:11,color:T.text2,marginBottom:14}}>Try fewer keywords or check the spelling</div>
            <div style={{display:"flex",justifyContent:"center",gap:7,flexWrap:"wrap",marginBottom:16}}>
              {["Blazer","Women Jacket","Formal Wear"].map(s=><WfTag key={s}>{s}</WfTag>)}
            </div>
            <WfBtn primary style={{justifyContent:"center"}}>Browse All Products</WfBtn>
          </div>
        </div>
        <WfAnnot>Replaces grid entirely · Suggested terms generated from related categories and truncated query tokens</WfAnnot>
      </WfSection>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// WIREFRAME: FLASH SALES PAGE
// ══════════════════════════════════════════════════════════════════════════════
function WireframeFlashSales(){
  return(
    <div style={{fontFamily:T.font,background:T.bg1,color:T.text0}}>
      {/* Nav with Flash Sales link highlighted red */}
      <div style={{display:"flex",alignItems:"center",padding:"10px 24px",gap:20,
        background:T.bg0,borderBottom:`1px solid ${T.border1}`,boxShadow:"0 1px 4px rgba(0,0,0,0.04)"}}>
        <div style={{fontSize:15,fontWeight:700,color:T.text0,minWidth:90}}>WillOfGod</div>
        <div style={{display:"flex",gap:22,flex:1,justifyContent:"center"}}>
          {["Home","Shop"].map(t=><span key={t} style={{fontSize:11,color:T.text2}}>{t}</span>)}
          <span style={{fontSize:11,color:T.red,fontWeight:700}}>⚡ Flash Sales</span>
          {["Categories","New Arrivals"].map(t=><span key={t} style={{fontSize:11,color:T.text2}}>{t}</span>)}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:16,color:T.text2}}>♡</span>
          <div style={{position:"relative"}}>
            <div style={{width:28,height:28,border:`1px solid ${T.border0}`,borderRadius:T.r.md,
              display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,color:T.text2}}>🛍</div>
            <div style={{position:"absolute",top:-5,right:-5,width:16,height:16,background:T.red,
              color:"#fff",borderRadius:"50%",fontSize:8,fontWeight:700,
              display:"flex",alignItems:"center",justifyContent:"center"}}>2</div>
          </div>
          <div style={{width:28,height:28,borderRadius:"50%",background:T.blueLight,
            border:`1px solid ${T.blueBorder}`,display:"flex",alignItems:"center",
            justifyContent:"center",fontSize:10,color:T.blueText,fontWeight:700}}>AB</div>
        </div>
      </div>

      {/* PAGE HEADER */}
      <WfSection num="01" label="Page Header with Active Sale Count">
        <div style={{background:T.bg2,padding:"16px 24px",borderBottom:`1px solid ${T.border1}`,
          display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:4}}>
              <span style={{fontSize:20,fontWeight:700,color:T.text0}}>Flash Sales</span>
              <span style={{background:T.redLight,color:T.red,fontSize:11,padding:"2px 10px",
                borderRadius:T.r.full,fontWeight:600}}>3 Active Now</span>
            </div>
            <div style={{fontSize:11,color:T.text2}}>Limited time deals — grab them before they're gone</div>
          </div>
          <div style={{fontSize:11,color:T.text3}}>Home › Flash Sales</div>
        </div>
        <WfAnnot>'N Active Now' badge live — updates via SSE when a sale starts or ends · Breadcrumb included in header row</WfAnnot>
      </WfSection>

      {/* ACTIVE SALE BLOCKS */}
      <WfSection num="02" label="Active Flash Sale Blocks (one card per concurrent sale · ordered by end_time ASC)">
        <div style={{padding:"16px 24px"}}>
          {[{name:"Summer Clearance",h:"02",m:"14",s:"37"},{name:"Electronics Week",h:"00",m:"45",s:"18"}].map((sale,si)=>(
            <div key={si} style={{border:`1px solid ${T.border0}`,borderRadius:T.r.lg,marginBottom:16,overflow:"hidden"}}>
              {/* Sale header */}
              <div style={{background:T.bg2,padding:"10px 18px",display:"flex",
                justifyContent:"space-between",alignItems:"center",borderBottom:`1px solid ${T.border1}`}}>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <span style={{fontSize:15,fontWeight:700,color:T.text0}}>⚡ {sale.name}</span>
                  <span style={{background:T.redLight,color:T.red,fontSize:9,padding:"2px 7px",
                    borderRadius:T.r.sm,fontWeight:700}}>LIVE</span>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:7}}>
                  <span style={{fontSize:11,color:T.text2}}>Ends in:</span>
                  {[sale.h,sale.m,sale.s].map((t,i)=>(
                    <span key={i} style={{display:"inline-flex"}}>
                      <span style={{background:T.bg0,border:`1px solid ${T.border0}`,borderRadius:T.r.sm,
                        padding:"3px 8px",fontSize:13,fontWeight:700,color:T.text0,fontFamily:T.mono}}>{t}</span>
                      {i<2&&<span style={{margin:"0 2px",color:T.text2,fontSize:13}}>:</span>}
                    </span>
                  ))}
                </div>
              </div>
              {/* 5-column product grid */}
              <div style={{padding:"12px 18px"}}>
                <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:10,marginBottom:10}}>
                  {[40,55,65,70,80].map((sold,i)=>(
                    <div key={i} style={{background:T.bg0,border:`1px solid ${T.border1}`,borderRadius:T.r.lg,overflow:"hidden"}}>
                      <div style={{position:"relative"}}>
                        <WfImg height={90} style={{borderRadius:0}}/>
                        <div style={{position:"absolute",top:5,left:5,background:T.redLight,color:T.red,
                          borderRadius:T.r.sm,padding:"2px 5px",fontSize:8,fontWeight:700}}>-{22+si*4+i*3}%</div>
                        <div style={{position:"absolute",top:5,right:5,width:18,height:18,background:T.bg0,
                          border:`1px solid ${T.border0}`,borderRadius:"50%",
                          display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:T.text3}}>♡</div>
                      </div>
                      <div style={{padding:7}}>
                        <WfLine w="85%" h={9} mb={3}/>
                        <div style={{display:"flex",gap:5,alignItems:"center",marginBottom:4}}>
                          <WfLine w={40} h={9} mb={0}/>
                          <span style={{fontSize:8,color:T.text3,textDecoration:"line-through"}}>₦20k</span>
                        </div>
                        {/* sold bar */}
                        <div style={{height:4,background:T.bg3,borderRadius:99,margin:"5px 0 2px"}}>
                          <div style={{height:"100%",width:`${sold}%`,background:T.red,borderRadius:99}}/>
                        </div>
                        <div style={{fontSize:8,color:T.text2,marginBottom:5}}>{sold}% sold</div>
                        <WfBtn primary style={{width:"100%",fontSize:8,padding:"4px 0",justifyContent:"center"}}>Add to Cart</WfBtn>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{display:"flex",justifyContent:"flex-end"}}>
                  <WfBtn style={{fontSize:10}}>View all items in this sale →</WfBtn>
                </div>
              </div>
            </div>
          ))}
        </div>
        <WfAnnot>One SaleCard per concurrent active flash sale · Ordered by end_time ASC (soonest expiring first) · Sold % bar uses danger color · 'LIVE' badge pulses via CSS animation · Sale card removed from DOM when sale ends (SSE)</WfAnnot>
      </WfSection>

      {/* UPCOMING */}
      <WfSection num="03" label="Upcoming Flash Sales (not yet active — prices hidden)">
        <div style={{padding:"0 24px 18px"}}>
          <div style={{border:`1px solid ${T.border1}`,borderRadius:T.r.lg,overflow:"hidden"}}>
            <div style={{background:T.bg2,padding:"10px 18px",display:"flex",
              justifyContent:"space-between",alignItems:"center",borderBottom:`1px solid ${T.border1}`}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <span style={{fontSize:14,fontWeight:700,color:T.text0}}>Weekend Mega Sale</span>
                <span style={{background:"#FFFBEB",border:"1px solid #FDE68A",color:T.yellow,
                  fontSize:9,padding:"2px 8px",borderRadius:T.r.sm,fontWeight:600}}>Starts in 4h 20m</span>
              </div>
              <WfTag>Set Reminder</WfTag>
            </div>
            <div style={{padding:"12px 18px",display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:10}}>
              {[1,2,3,4,5].map(i=>(
                <div key={i} style={{background:T.bg0,border:`1px solid ${T.border1}`,borderRadius:T.r.lg,
                  overflow:"hidden",opacity:0.55}}>
                  <WfImg height={76} style={{borderRadius:0}}/>
                  <div style={{padding:7}}>
                    <WfLine w="80%" h={9} mb={3}/>
                    <WfLine w="55%" h={7} mb={7}/>
                    <div style={{textAlign:"center",fontSize:9,color:T.text3}}>Price revealed at start</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <WfAnnot>Products visible but greyed (opacity 0.55) · Prices hidden server-side (not just CSS) · 'Set Reminder' saves preference; buyer notified via SSE + email when sale goes live · Hidden entirely when no upcoming sales</WfAnnot>
      </WfSection>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// WIREFRAME: NEW ARRIVALS
// ══════════════════════════════════════════════════════════════════════════════
function WireframeNewArrivals(){
  return(
    <div style={{fontFamily:T.font,background:T.bg1,color:T.text0}}>
      {/* Nav — New Arrivals link highlighted */}
      <div style={{display:"flex",alignItems:"center",padding:"10px 24px",gap:20,
        background:T.bg0,borderBottom:`1px solid ${T.border1}`,boxShadow:"0 1px 4px rgba(0,0,0,0.04)"}}>
        <div style={{fontSize:15,fontWeight:700,color:T.text0,minWidth:90}}>WillOfGod</div>
        <div style={{display:"flex",gap:22,flex:1,justifyContent:"center"}}>
          {["Home","Shop","Flash Sales","Categories"].map(t=><span key={t} style={{fontSize:11,color:T.text2}}>{t}</span>)}
          <span style={{fontSize:11,color:T.blueText,fontWeight:700}}>New Arrivals</span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{background:T.bg2,border:`1px solid ${T.border1}`,borderRadius:T.r.md,
            padding:"5px 12px",fontSize:10,color:T.text3,width:140}}>🔍 Search products…</div>
          <div style={{width:28,height:28,borderRadius:"50%",background:T.blueLight,
            border:`1px solid ${T.blueBorder}`,display:"flex",alignItems:"center",
            justifyContent:"center",fontSize:10,color:T.blueText,fontWeight:700}}>AB</div>
        </div>
      </div>

      {/* PAGE HEADER */}
      <WfSection num="01" label="Page Header + Breadcrumb + Last Updated Timestamp">
        <div style={{padding:"14px 24px",background:T.bg2,borderBottom:`1px solid ${T.border1}`,
          display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{fontSize:11,color:T.text3,marginBottom:4}}>Home › New Arrivals</div>
            <div style={{fontSize:20,fontWeight:700,color:T.text0}}>New Arrivals</div>
            <div style={{fontSize:11,color:T.text2,marginTop:3}}>Fresh drops this week — updated daily</div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:10,color:T.text3,marginBottom:3}}>Last updated</div>
            <div style={{fontSize:12,fontWeight:600,color:T.text0}}>Today, 09:15 AM</div>
          </div>
        </div>
        <WfAnnot>'Last updated' = MAX(created_at) of fetched results · Updates when grid re-fetches</WfAnnot>
      </WfSection>

      {/* CATEGORY TABS */}
      <WfSection num="02" label="Category Filter Tabs (horizontal scroll)">
        <div style={{padding:"10px 24px",display:"flex",gap:7,borderBottom:`1px solid ${T.border1}`,
          overflowX:"auto",background:T.bg0}}>
          {["All","Women","Men","Kids","Footwear","Electronics","Accessories","Food"].map((t,i)=>(
            <WfTag key={t} active={i===0}>{t}</WfTag>
          ))}
        </div>
        <WfAnnot>Tab selection filters grid without full page reload · Updates URL query param · Horizontal scroll on overflow</WfAnnot>
      </WfSection>

      {/* SIDEBAR + DATE-GROUPED GRID */}
      <WfSection num="03+04" label="Filter Sidebar + Date-Grouped Product Grid">
        <div style={{display:"grid",gridTemplateColumns:"190px 1fr"}}>
          {/* Sidebar */}
          <div style={{borderRight:`1px solid ${T.border1}`,padding:14,background:T.bg0}}>
            <div style={{fontSize:11,fontWeight:600,color:T.text0,marginBottom:8}}>Added Within</div>
            {["Today","Last 3 days","Last 7 days","Last 30 days"].map((t,i)=>(
              <label key={t} style={{display:"flex",alignItems:"center",gap:7,marginBottom:6,cursor:"pointer"}}>
                <input type="radio" name="period" defaultChecked={i===2} readOnly style={{width:12,height:12}}/>
                <span style={{fontSize:10,color:T.text1}}>{t}</span>
              </label>
            ))}
            <div style={{height:1,background:T.border2,margin:"10px 0"}}/>
            <div style={{fontSize:11,fontWeight:600,color:T.text0,marginBottom:8}}>Price Range</div>
            <input type="range" min={0} max={100} defaultValue={60} style={{width:"100%",marginBottom:5}}/>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
              <span style={{fontSize:10,color:T.text3}}>₦0</span>
              <span style={{fontSize:10,color:T.text3}}>₦50k</span>
            </div>
            <div style={{height:1,background:T.border2,margin:"10px 0"}}/>
            <div style={{fontSize:11,fontWeight:600,color:T.text0,marginBottom:8}}>Colour</div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:10}}>
              {[["#2C2C2A",false],["#A32D2D",false],["#0C447C",true],["#3B6D11",false],["#B4B2A9",false]].map(([c,act],i)=>(
                <div key={i} style={{width:18,height:18,borderRadius:"50%",background:c,
                  border:act?`2.5px solid ${T.text0}`:`1px solid ${T.border0}`,cursor:"pointer"}}/>
              ))}
            </div>
            <div style={{height:1,background:T.border2,margin:"10px 0"}}/>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{fontSize:11,color:T.text0}}>In Stock</span>
              <div style={{width:32,height:17,background:T.blue,borderRadius:99,position:"relative"}}>
                <div style={{position:"absolute",right:2,top:2,width:13,height:13,background:"#fff",borderRadius:"50%"}}/>
              </div>
            </div>
          </div>

          {/* Date-grouped grid */}
          <div style={{padding:14,background:T.bg1}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <div style={{fontSize:11,color:T.text2}}>
                <strong style={{color:T.text0}}>47</strong> new products in the last 7 days
              </div>
              <select style={{fontSize:10,padding:"3px 7px",border:`1px solid ${T.border0}`,borderRadius:T.r.md,fontFamily:T.font}}>
                <option>Newest First</option>
              </select>
            </div>

            {/* Date group: Today */}
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
              <div style={{height:1,flex:1,background:T.border1}}/>
              <div style={{fontSize:9,color:T.text3,whiteSpace:"nowrap",padding:"0 8px",background:T.bg1,fontWeight:600}}>
                Added Today — 12 products
              </div>
              <div style={{height:1,flex:1,background:T.border1}}/>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:9,marginBottom:16}}>
              {[1,2,3,4].map(i=>(
                <div key={i} style={{background:T.bg0,border:`1px solid ${T.border1}`,borderRadius:T.r.lg,overflow:"hidden"}}>
                  <div style={{position:"relative"}}>
                    <WfImg height={100} style={{borderRadius:0}}/>
                    <div style={{position:"absolute",top:5,left:5,background:T.greenLight,color:T.green,
                      borderRadius:T.r.sm,padding:"2px 5px",fontSize:9,fontWeight:700}}>New</div>
                    <div style={{position:"absolute",top:5,right:5,width:20,height:20,background:T.bg0,
                      border:`1px solid ${T.border0}`,borderRadius:"50%",
                      display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:T.text3}}>♡</div>
                  </div>
                  <div style={{padding:8}}>
                    <WfLine w="80%" h={9} mb={3}/>
                    <WfLine w="55%" h={7} mb={5}/>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                      <WfLine w={42} h={9} mb={0}/>
                      <span style={{fontSize:10,color:T.yellow,letterSpacing:1}}>★★★★</span>
                    </div>
                    <WfBtn primary style={{width:"100%",fontSize:9,padding:"5px 0",justifyContent:"center"}}>Add to Cart</WfBtn>
                  </div>
                </div>
              ))}
            </div>

            {/* Date group: Yesterday */}
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
              <div style={{height:1,flex:1,background:T.border1}}/>
              <div style={{fontSize:9,color:T.text3,whiteSpace:"nowrap",padding:"0 8px",background:T.bg1,fontWeight:600}}>
                Added Yesterday — 18 products
              </div>
              <div style={{height:1,flex:1,background:T.border1}}/>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:9,marginBottom:14}}>
              {[1,2,3,4].map(i=>(
                <div key={i} style={{background:T.bg0,border:`1px solid ${T.border1}`,borderRadius:T.r.lg,overflow:"hidden"}}>
                  <div style={{position:"relative"}}>
                    <WfImg height={100} style={{borderRadius:0}}/>
                    <div style={{position:"absolute",top:5,right:5,width:20,height:20,background:T.bg0,
                      border:`1px solid ${T.border0}`,borderRadius:"50%",
                      display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:T.text3}}>♡</div>
                  </div>
                  <div style={{padding:8}}>
                    <WfLine w="75%" h={9} mb={3}/>
                    <WfLine w="50%" h={7} mb={5}/>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                      <WfLine w={40} h={9} mb={0}/>
                      <span style={{fontSize:10,color:T.yellow,letterSpacing:1}}>★★★</span>
                    </div>
                    <WfBtn primary style={{width:"100%",fontSize:9,padding:"5px 0",justifyContent:"center"}}>Add to Cart</WfBtn>
                  </div>
                </div>
              ))}
            </div>

            <div style={{display:"flex",justifyContent:"center"}}>
              <WfBtn style={{fontSize:10,padding:"8px 28px"}}>Load More</WfBtn>
            </div>
          </div>
        </div>
        <WfAnnot>Date-grouping is the key visual differentiator of this page · 'Added Within' is a radio (mutually exclusive) · 'New' badge always shown on every card here · 'Load More' appends results without scroll reset</WfAnnot>
      </WfSection>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// WIREFRAME: SALE / DISCOUNTED PRODUCTS
// ══════════════════════════════════════════════════════════════════════════════
function WireframeSalePage(){
  const dangerBg="#FEF2F2", dangerText="#991B1B", dangerBorder="#FECACA";
  return(
    <div style={{fontFamily:T.font,background:T.bg1,color:T.text0}}>
      <WfSection num="Nav" label="Top Navigation Bar"><WfNav/></WfSection>

      {/* SALE BANNER HEADER */}
      <WfSection num="01" label="Page Header + Sale Banner (danger-colored — unique to this page)">
        <div style={{background:dangerBg,padding:"16px 24px",borderBottom:`1px solid ${dangerBorder}`}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div>
              <div style={{fontSize:10,color:dangerText,marginBottom:3,letterSpacing:"0.06em",textTransform:"uppercase",fontWeight:500}}>Home › Sale</div>
              <div style={{fontSize:20,fontWeight:700,color:dangerText}}>Sale & Discounted Products</div>
              <div style={{fontSize:11,color:dangerText,marginTop:3,opacity:0.8}}>Showing all products with active discounts · Up to 60% off</div>
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{fontSize:28,fontWeight:700,color:dangerText,lineHeight:1}}>247</div>
              <div style={{fontSize:11,color:dangerText,opacity:0.8}}>items on sale</div>
            </div>
          </div>
        </div>
        <WfAnnot>Danger-colored banner is unique to this page — the only full-width danger background in the buyer UI · Item count dynamically fetched (is_on_sale=true OR in active flash sale)</WfAnnot>
      </WfSection>

      {/* SALE TYPE TABS */}
      <WfSection num="02" label="Sale Type Filter Tabs">
        <div style={{padding:"10px 24px",display:"flex",gap:8,borderBottom:`1px solid ${T.border1}`,background:T.bg0}}>
          {[["All Discounts","247",true],["Flash Sales","38",false],["Price Marked Down","142",false],["Bundle Deals","67",false]].map(([t,c,act])=>(
            <button key={t} style={{display:"flex",alignItems:"center",gap:6,padding:"5px 12px",
              border:`1px solid ${act?dangerBorder:T.border0}`,
              background:act?dangerBg:"transparent",borderRadius:T.r.md,cursor:"pointer"}}>
              <span style={{fontSize:11,color:act?dangerText:T.text1}}>{t}</span>
              <span style={{fontSize:9,background:act?T.bg0:T.bg2,color:act?dangerText:T.text3,
                borderRadius:T.r.full,padding:"1px 6px"}}>{c}</span>
            </button>
          ))}
        </div>
        <WfAnnot>Tab selection refilters grid · URL param updates · Count badges show items per type</WfAnnot>
      </WfSection>

      {/* SIDEBAR + GRID */}
      <WfSection num="03+04" label="Filter Sidebar (sale-specific filters) + Sale Products Grid (4-col)">
        <div style={{display:"grid",gridTemplateColumns:"190px 1fr"}}>
          {/* Sidebar */}
          <div style={{borderRight:`1px solid ${T.border1}`,padding:14,background:T.bg0}}>
            <div style={{fontSize:11,fontWeight:600,color:T.text0,marginBottom:8}}>Discount Range</div>
            {["10% – 20% (84)","20% – 40% (103)","40% – 60% (47)","60%+ (13)"].map((r,i)=>(
              <label key={r} style={{display:"flex",alignItems:"center",gap:7,marginBottom:6,cursor:"pointer"}}>
                <input type="checkbox" defaultChecked={i===1} readOnly style={{width:12,height:12}}/>
                <span style={{fontSize:10,color:T.text1}}>{r}</span>
              </label>
            ))}
            <div style={{height:1,background:T.border2,margin:"10px 0"}}/>
            <div style={{fontSize:11,fontWeight:600,color:T.text0,marginBottom:8}}>Category</div>
            {[["Women",82,true],["Men",54,true],["Kids",38,false],["Electronics",41,false],["Footwear",32,false]].map(([c,n,chk])=>(
              <label key={c} style={{display:"flex",alignItems:"center",gap:7,marginBottom:6,cursor:"pointer"}}>
                <input type="checkbox" defaultChecked={chk} readOnly style={{width:12,height:12}}/>
                <span style={{fontSize:10,color:T.text1}}>{c} ({n})</span>
              </label>
            ))}
            <div style={{height:1,background:T.border2,margin:"10px 0"}}/>
            <div style={{fontSize:11,fontWeight:600,color:T.text0,marginBottom:8}}>Price After Discount</div>
            <input type="range" min={0} max={100} defaultValue={55} style={{width:"100%",marginBottom:5}}/>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
              <span style={{fontSize:10,color:T.text3}}>₦0</span>
              <span style={{fontSize:10,color:T.text3}}>₦50k</span>
            </div>
            <div style={{height:1,background:T.border2,margin:"10px 0"}}/>
            <div style={{fontSize:11,fontWeight:600,color:T.text0,marginBottom:8}}>Sale Type</div>
            {["Flash Sale","Price Markdown","Both"].map((t,i)=>(
              <label key={t} style={{display:"flex",alignItems:"center",gap:7,marginBottom:6,cursor:"pointer"}}>
                <input type="radio" name="saletype" defaultChecked={i===2} readOnly style={{width:12,height:12}}/>
                <span style={{fontSize:10,color:T.text1}}>{t}</span>
              </label>
            ))}
          </div>

          {/* Grid */}
          <div style={{padding:14,background:T.bg1}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <div style={{fontSize:11,color:T.text2}}>
                <strong style={{color:T.text0}}>136</strong> discounted products
              </div>
              <select style={{fontSize:10,padding:"3px 7px",border:`1px solid ${T.border0}`,borderRadius:T.r.md,fontFamily:T.font}}>
                <option>Highest Discount</option>
              </select>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
              {[20,25,30,35,40,45,50,55].map((pct,i)=>(
                <div key={i} style={{background:T.bg0,border:`1px solid ${T.border1}`,borderRadius:T.r.lg,overflow:"hidden"}}>
                  <div style={{position:"relative"}}>
                    <WfImg height={100} style={{borderRadius:0}}/>
                    <div style={{position:"absolute",top:5,left:5,background:dangerBg,color:dangerText,
                      borderRadius:T.r.sm,padding:"2px 6px",fontSize:9,fontWeight:700}}>-{pct}%</div>
                    {i===2&&(
                      <div style={{position:"absolute",top:5,right:5,background:dangerBg,color:dangerText,
                        fontSize:7,padding:"1px 5px",borderRadius:T.r.sm,fontWeight:700}}>⚡ Flash</div>
                    )}
                    {i!==2&&(
                      <div style={{position:"absolute",top:5,right:5,width:20,height:20,background:T.bg0,
                        border:`1px solid ${T.border0}`,borderRadius:"50%",
                        display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:T.text3}}>♡</div>
                    )}
                  </div>
                  <div style={{padding:8}}>
                    <WfLine w="80%" h={9} mb={3}/>
                    <div style={{display:"flex",gap:5,alignItems:"center",marginBottom:3}}>
                      <WfLine w={40} h={9} mb={0}/>
                      <span style={{fontSize:8,color:T.text3,textDecoration:"line-through"}}>₦{20+i*3}k</span>
                    </div>
                    <div style={{fontSize:9,color:T.green,marginBottom:6,fontWeight:500}}>Save ₦{3+i}k</div>
                    <WfBtn primary style={{width:"100%",fontSize:9,padding:"5px 0",justifyContent:"center"}}>Add to Cart</WfBtn>
                  </div>
                </div>
              ))}
            </div>
            <div style={{display:"flex",justifyContent:"center",marginTop:14}}>
              <WfBtn style={{fontSize:10,padding:"8px 28px"}}>Load More</WfBtn>
            </div>
          </div>
        </div>
        <WfAnnot>Default sort is 'Highest Discount' — unique to this page · 'Save ₦N' in green reinforces positive framing · ⚡ Flash badge coexists with % badge on flash-sale items · Discount Range is multi-select checkbox</WfAnnot>
      </WfSection>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// WIREFRAME: PRODUCT COMPARISON
// ══════════════════════════════════════════════════════════════════════════════
function WireframeComparison(){
  const products=["Classic Blazer","Slim Fit Jacket","Formal Coat"];
  const attrs=[
    {label:"Price",       vals:["₦18,500","₦22,000","₦29,000"],type:"price"},
    {label:"Sale Price",  vals:["₦14,800 (–20%)","₦22,000","₦23,200 (–20%)"],type:"sale"},
    {label:"Rating",      vals:["★★★★☆ (42)","★★★★★ (87)","★★★☆☆ (23)"],type:"rating"},
    {label:"In Stock",    vals:["✓ Yes","✓ Yes","✗ No"],type:"stock"},
    {label:"Sizes",       vals:["XS S M L XL","S M L XL XXL","XS S M L"],type:"text"},
    {label:"Colours",     vals:["3 options","5 options","2 options"],type:"text"},
    {label:"Material",    vals:["85% Polyester","100% Cotton","70% Wool"],type:"text"},
    {label:"Flash Sale",  vals:["Active (ends 2h)","No","No"],type:"flash"},
    {label:"Shipping",    vals:["Free","Free","₦1,500"],type:"text"},
  ];
  const bestColIdx=1; // Slim Fit Jacket — best rated

  return(
    <div style={{fontFamily:T.font,background:T.bg1,color:T.text0}}>
      <WfSection num="Nav" label="Top Navigation Bar"><WfNav/></WfSection>

      {/* PAGE HEADER */}
      <WfSection num="01" label="Page Header">
        <div style={{padding:"12px 24px",background:T.bg2,borderBottom:`1px solid ${T.border1}`,
          display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{fontSize:10,color:T.text3,marginBottom:3}}>Home › Compare Products</div>
            <div style={{fontSize:18,fontWeight:700,color:T.text0}}>Compare Products</div>
            <div style={{fontSize:11,color:T.text2,marginTop:2}}>Select up to 4 products to compare side by side</div>
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <span style={{fontSize:11,color:T.text3}}>3 of 4 slots used</span>
            <WfBtn style={{fontSize:10}}>Clear All</WfBtn>
            <WfBtn primary style={{fontSize:10}}>Add Product +</WfBtn>
          </div>
        </div>
        <WfAnnot>'Add Product +' opens an inline product search modal (not a new page) · 'Clear All' resets comparison store · Slot counter updates live</WfAnnot>
      </WfSection>

      {/* COMPARISON TABLE */}
      <WfSection num="02" label="Comparison Table (scrollable · attribute column sticky)">
        <div style={{padding:"16px 24px",overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",minWidth:560}}>
            <colgroup>
              <col style={{width:140}}/>
              {products.map((_,i)=><col key={i}/>)}
              <col style={{width:120}}/>
            </colgroup>

            {/* Product headers */}
            <thead>
              <tr>
                <th style={{padding:0,borderRight:`1px solid ${T.border1}`}}/>
                {products.map((name,i)=>(
                  <th key={i} style={{padding:"12px 10px",border:`1px solid ${T.border1}`,verticalAlign:"top",
                    background:i===bestColIdx?T.blueLight:T.bg0}}>
                    <div style={{position:"relative"}}>
                      <button style={{position:"absolute",top:0,right:0,background:"transparent",border:"none",
                        cursor:"pointer",fontSize:13,color:T.text3,lineHeight:1}}>×</button>
                    </div>
                    <WfImg height={90} style={{borderRadius:T.r.md,marginBottom:8,
                      border:i===bestColIdx?`1px solid ${T.blueBorder}`:undefined}}/>
                    <div style={{fontSize:12,fontWeight:600,color:i===bestColIdx?T.blueText:T.text0,marginBottom:2}}>{name}</div>
                    <div style={{fontSize:10,color:T.text3,textAlign:"center"}}>Women / Clothing</div>
                    {i===bestColIdx&&(
                      <div style={{background:T.blueLight,color:T.blueText,fontSize:8,borderRadius:T.r.full,
                        padding:"2px 8px",marginTop:6,textAlign:"center",fontWeight:600}}>Best Value</div>
                    )}
                  </th>
                ))}
                {/* Add slot */}
                <th style={{padding:"12px 10px",border:`1px solid ${T.border1}`,background:T.bg2}}>
                  <div style={{border:`1px dashed ${T.border0}`,borderRadius:T.r.md,height:90,
                    display:"flex",alignItems:"center",justifyContent:"center",
                    fontSize:22,color:T.text3,marginBottom:8}}>+</div>
                  <div style={{fontSize:10,color:T.text3,textAlign:"center"}}>Add a product</div>
                </th>
              </tr>
            </thead>

            {/* Attribute rows */}
            <tbody>
              {attrs.map(({label,vals,type})=>(
                <tr key={label}>
                  <td style={{padding:"9px 12px",fontSize:10,fontWeight:600,color:T.text2,
                    borderRight:`1px solid ${T.border1}`,borderBottom:`1px solid ${T.border1}`,
                    background:T.bg2,position:"sticky",left:0}}>{label}</td>
                  {vals.map((v,i)=>{
                    const isBest=i===bestColIdx;
                    let color=isBest?T.blueText:T.text0;
                    if(type==="stock") color=v.includes("✓")?T.green:T.red;
                    else if(type==="flash"&&v.includes("Active")) color=T.red;
                    else if(type==="sale"&&v!=="₦22,000") color=T.red;
                    return(
                      <td key={i} style={{padding:"9px 12px",fontSize:10,textAlign:"center",
                        border:`1px solid ${T.border1}`,
                        background:isBest?T.blueLight:T.bg0,color}}>
                        {type==="rating"
                          ?<span><span style={{color:T.yellow}}>{v.split(" ")[0]}</span>{" "}<span style={{fontSize:9,color:T.text3}}>{v.split(" ")[1]}</span></span>
                          :v}
                      </td>
                    );
                  })}
                  <td style={{border:`1px solid ${T.border1}`,background:T.bg2}}/>
                </tr>
              ))}

              {/* CTA row */}
              <tr>
                <td style={{padding:"10px 12px",borderRight:`1px solid ${T.border1}`,background:T.bg2}}/>
                {products.map((n,i)=>(
                  <td key={i} style={{padding:"10px 12px",border:`1px solid ${T.border1}`,
                    textAlign:"center",background:i===bestColIdx?T.blueLight:T.bg0}}>
                    <div style={{display:"flex",flexDirection:"column",gap:6}}>
                      <WfBtn primary style={{width:"100%",fontSize:9,justifyContent:"center",
                        opacity:n==="Formal Coat"?0.4:1}}>{n==="Formal Coat"?"Out of Stock":"Add to Cart"}</WfBtn>
                      <WfBtn style={{width:"100%",fontSize:9,justifyContent:"center"}}>View Product</WfBtn>
                    </div>
                  </td>
                ))}
                <td style={{border:`1px solid ${T.border1}`,background:T.bg2}}/>
              </tr>
            </tbody>
          </table>
        </div>
        <WfAnnot>Max 4 products · Best-value column (info background) auto-determined — highest rating wins tie · Out-of-stock product has greyed 'Out of Stock' button · Table scrolls horizontally on mobile; attribute column sticks left</WfAnnot>
      </WfSection>

      {/* STICKY COMPARISON BAR */}
      <WfSection num="03" label="Sticky Comparison Bar (fixed bottom — appears on Product Listing + Product Detail when ≥2 products selected)">
        <div style={{padding:"14px 24px",background:T.bg0}}>
          <div style={{background:T.bg0,border:`1px solid ${T.border0}`,borderRadius:T.r.lg,
            padding:"10px 16px",display:"flex",alignItems:"center",gap:10,
            boxShadow:"0 -2px 12px rgba(0,0,0,0.08)"}}>
            <span style={{fontSize:11,color:T.text2,whiteSpace:"nowrap",fontWeight:500}}>Compare:</span>
            {products.map((n,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:6,background:T.bg2,
                border:`1px solid ${T.border0}`,borderRadius:T.r.md,padding:"4px 9px"}}>
                <WfImg height={24} style={{width:24,borderRadius:T.r.sm}}/>
                <span style={{fontSize:10,color:T.text0,whiteSpace:"nowrap"}}>{n}</span>
                <span style={{fontSize:13,color:T.text3,cursor:"pointer"}}>×</span>
              </div>
            ))}
            <div style={{background:T.bg2,border:`1px dashed ${T.border0}`,borderRadius:T.r.md,
              padding:"4px 12px",fontSize:10,color:T.text3,cursor:"pointer"}}>+ Add</div>
            <WfBtn primary style={{marginLeft:"auto",whiteSpace:"nowrap",fontSize:10}}>Compare Now</WfBtn>
          </div>
        </div>
        <WfAnnot>Slides up from bottom when comparison store reaches ≥2 items · Each chip has × to remove · 'Compare Now' navigates to /compare?ids=id1,id2,id3 · Bar hidden when fewer than 2 products selected</WfAnnot>
      </WfSection>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// WIREFRAME: LOGIN PAGE
// ══════════════════════════════════════════════════════════════════════════════
function WireframeLogin(){
  const purple=LC.A; // Auth lane colour
  return(
    <div style={{fontFamily:T.font,background:T.bg1,color:T.text0}}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",minHeight:560}}>

        {/* LEFT BRAND PANEL */}
        <div style={{background:T.bg2,padding:"40px 36px",display:"flex",flexDirection:"column",
          justifyContent:"center",borderRight:`1px solid ${T.border1}`}}>
          <div style={{fontSize:9,letterSpacing:"0.12em",textTransform:"uppercase",color:T.text3,
            marginBottom:20,fontWeight:600,fontFamily:T.mono}}>01 — Brand Panel (left column)</div>
          <div style={{fontSize:22,fontWeight:700,color:T.text0,marginBottom:8}}>WillOfGod</div>
          <div style={{fontSize:13,color:T.text1,marginBottom:24,lineHeight:1.7,maxWidth:260}}>
            Welcome back. Sign in to access your orders, wishlist and exclusive deals.
          </div>
          <WfImg height={164} label="Brand Illustration" style={{borderRadius:T.r.lg,marginBottom:24}}/>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {["Access your orders & tracking","Manage your wishlists","Exclusive member deals","Faster checkout"].map((f,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:10}}>
                <div style={{width:18,height:18,borderRadius:"50%",background:T.greenLight,
                  border:`1px solid #86EFAC`,display:"flex",alignItems:"center",
                  justifyContent:"center",flexShrink:0}}>
                  <span style={{fontSize:9,color:T.green,fontWeight:700}}>✓</span>
                </div>
                <span style={{fontSize:11,color:T.text1}}>{f}</span>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT FORM PANEL */}
        <div style={{padding:"36px 36px",display:"flex",flexDirection:"column",justifyContent:"center",background:T.bg0}}>
          <div style={{fontSize:9,letterSpacing:"0.12em",textTransform:"uppercase",color:T.text3,
            marginBottom:20,fontWeight:600,fontFamily:T.mono}}>02 — Login Form</div>
          <div style={{fontSize:20,fontWeight:700,color:T.text0,marginBottom:4}}>Sign in</div>
          <div style={{fontSize:11,color:T.text2,marginBottom:20}}>
            No account?{" "}<span style={{color:T.blueText,textDecoration:"underline",cursor:"pointer"}}>Create one — it's free</span>
          </div>

          {/* Google button */}
          <div style={{fontSize:9,letterSpacing:"0.1em",textTransform:"uppercase",color:T.text3,
            marginBottom:10,fontWeight:600,fontFamily:T.mono}}>Google OAuth</div>
          <div style={{width:"100%",border:`1px solid ${T.border0}`,borderRadius:T.r.md,padding:"10px",
            fontSize:11,cursor:"pointer",background:T.bg0,color:T.text0,
            display:"flex",alignItems:"center",justifyContent:"center",gap:9,marginBottom:8}}>
            <div style={{width:16,height:16,borderRadius:"50%",background:T.bg3,border:`1px solid ${T.border0}`,flexShrink:0}}/>
            Continue with Google
          </div>
          <div style={{fontSize:9,color:T.text3,borderLeft:`2px solid ${T.border0}`,paddingLeft:7,
            marginBottom:14,fontStyle:"italic",lineHeight:1.6}}>
            Google OAuth · ID token verified server-side · New users auto-registered with is_verified=true
          </div>

          {/* Divider */}
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
            <div style={{flex:1,height:1,background:T.border2}}/>
            <span style={{fontSize:10,color:T.text3}}>or sign in with email</span>
            <div style={{flex:1,height:1,background:T.border2}}/>
          </div>

          {/* Email field */}
          <div style={{fontSize:9,letterSpacing:"0.1em",textTransform:"uppercase",color:T.text3,
            marginBottom:10,fontWeight:600,fontFamily:T.mono}}>Email + Password Form</div>
          <label style={{fontSize:10,fontWeight:600,color:T.text1,marginBottom:5,display:"block"}}>Email address</label>
          <input readOnly placeholder="you@example.com" type="email" style={{
            width:"100%",border:`1px solid ${T.border0}`,borderRadius:T.r.md,
            padding:"8px 10px",fontSize:11,background:T.bg0,marginBottom:12,fontFamily:T.font}}/>

          {/* Password field — error state */}
          <label style={{fontSize:10,fontWeight:600,color:T.text1,marginBottom:5,display:"block"}}>Password</label>
          <div style={{position:"relative",marginBottom:6}}>
            <input readOnly placeholder="Enter your password" type="password" style={{
              width:"100%",border:`1px solid ${T.red}`,borderRadius:T.r.md,
              padding:"8px 36px 8px 10px",fontSize:11,background:T.bg0,fontFamily:T.font}}/>
            <span style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",
              fontSize:12,color:T.text3,cursor:"pointer"}}>👁</span>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:5,fontSize:10,color:T.red,marginBottom:12}}>
            <div style={{width:13,height:13,borderRadius:"50%",background:T.redLight,
              border:`1px solid #FECACA`,display:"flex",alignItems:"center",
              justifyContent:"center",flexShrink:0}}>
              <span style={{fontSize:8,color:T.red,fontWeight:700}}>!</span>
            </div>
            Incorrect email or password.{" "}
            <span style={{color:T.blueText,textDecoration:"underline",cursor:"pointer"}}>Forgot password?</span>
          </div>

          {/* Remember me + forgot */}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
            <label style={{display:"flex",alignItems:"center",gap:7,cursor:"pointer"}}>
              <input type="checkbox" readOnly style={{width:12,height:12}}/>
              <span style={{fontSize:10,color:T.text1}}>Remember me</span>
            </label>
            <span style={{fontSize:10,color:T.blueText,textDecoration:"underline",cursor:"pointer"}}>Forgot password?</span>
          </div>

          <WfBtn primary style={{width:"100%",justifyContent:"center",padding:"10px 0",fontSize:12,marginBottom:8}}>Sign In</WfBtn>
          <div style={{fontSize:9,color:T.text3,borderLeft:`2px solid ${T.border0}`,paddingLeft:7,
            marginBottom:14,fontStyle:"italic",lineHeight:1.6}}>
            Rate limited to 5 attempts per 15 min per IP · Anonymous browsing history merged on login
          </div>
          <div style={{height:1,background:T.border2,marginBottom:14}}/>
          <div style={{textAlign:"center",fontSize:10,color:T.text2}}>
            Don't have an account?{" "}<span style={{color:T.blueText,textDecoration:"underline",cursor:"pointer"}}>Create account</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// WIREFRAME: SIGN UP PAGE
// ══════════════════════════════════════════════════════════════════════════════
function WireframeSignUp(){
  const steps=[
    {num:"01",title:"Personal Details",sub:"Name, email, password",active:true},
    {num:"02",title:"Your Country",sub:"Where are you based?",active:false},
    {num:"03",title:"Verify Email",sub:"Confirm your address",active:false},
  ];
  return(
    <div style={{fontFamily:T.font,background:T.bg1,color:T.text0}}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1.2fr",minHeight:620}}>

        {/* LEFT */}
        <div style={{background:T.bg2,padding:"40px 36px",display:"flex",flexDirection:"column",
          justifyContent:"center",borderRight:`1px solid ${T.border1}`}}>
          <div style={{fontSize:9,letterSpacing:"0.12em",textTransform:"uppercase",color:T.text3,
            marginBottom:20,fontWeight:600,fontFamily:T.mono}}>01 — Brand Panel</div>
          <div style={{fontSize:22,fontWeight:700,color:T.text0,marginBottom:8}}>WillOfGod</div>
          <div style={{fontSize:13,color:T.text1,marginBottom:20,lineHeight:1.7,maxWidth:260}}>
            Join thousands of shoppers. Get access to exclusive deals, order tracking and your personal wishlist.
          </div>
          <WfImg height={140} label="Signup Illustration" style={{borderRadius:T.r.lg,marginBottom:24}}/>

          <div style={{fontSize:9,letterSpacing:"0.12em",textTransform:"uppercase",color:T.text3,
            marginBottom:14,fontWeight:600,fontFamily:T.mono}}>Step Indicator</div>
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            {steps.map(({num,title,sub,active})=>(
              <div key={num} style={{display:"flex",alignItems:"flex-start",gap:12}}>
                <div style={{width:26,height:26,borderRadius:"50%",flexShrink:0,
                  background:active?T.blueLight:T.bg3,
                  border:`1px solid ${active?T.blueBorder:T.border0}`,
                  display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <span style={{fontSize:9,fontWeight:600,color:active?T.blueText:T.text3}}>{num}</span>
                </div>
                <div>
                  <div style={{fontSize:11,fontWeight:active?600:400,color:active?T.text0:T.text3}}>{title}</div>
                  <div style={{fontSize:9,color:T.text3,marginTop:1}}>{sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT FORM */}
        <div style={{padding:"32px 36px",display:"flex",flexDirection:"column",justifyContent:"flex-start",
          overflowY:"auto",background:T.bg0}}>
          <div style={{fontSize:9,letterSpacing:"0.12em",textTransform:"uppercase",color:T.text3,
            marginBottom:16,fontWeight:600,fontFamily:T.mono}}>02 — Step 1: Personal Details</div>
          <div style={{fontSize:20,fontWeight:700,color:T.text0,marginBottom:4}}>Create account</div>
          <div style={{fontSize:11,color:T.text2,marginBottom:16}}>
            Already have one?{" "}<span style={{color:T.blueText,textDecoration:"underline",cursor:"pointer"}}>Sign in</span>
          </div>

          <div style={{width:"100%",border:`1px solid ${T.border0}`,borderRadius:T.r.md,padding:"9px",
            fontSize:11,background:T.bg0,color:T.text0,display:"flex",alignItems:"center",
            justifyContent:"center",gap:9,marginBottom:10,cursor:"pointer"}}>
            <div style={{width:16,height:16,borderRadius:"50%",background:T.bg3,border:`1px solid ${T.border0}`}}/>
            Sign up with Google
          </div>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
            <div style={{flex:1,height:1,background:T.border2}}/>
            <span style={{fontSize:10,color:T.text3}}>or sign up with email</span>
            <div style={{flex:1,height:1,background:T.border2}}/>
          </div>

          {/* Full name — success state */}
          <label style={{fontSize:10,fontWeight:600,color:T.text1,marginBottom:5,display:"block"}}>Full name</label>
          <input readOnly value="John Adebayo" style={{width:"100%",border:`1px solid ${T.green}`,
            borderRadius:T.r.md,padding:"8px 10px",fontSize:11,background:T.bg0,
            marginBottom:4,fontFamily:T.font,color:T.text0}}/>
          <div style={{fontSize:9,color:T.green,marginBottom:10}}>✓ Looks good</div>

          {/* Email — success state */}
          <label style={{fontSize:10,fontWeight:600,color:T.text1,marginBottom:5,display:"block"}}>Email address</label>
          <input readOnly value="john@email.com" style={{width:"100%",border:`1px solid ${T.green}`,
            borderRadius:T.r.md,padding:"8px 10px",fontSize:11,background:T.bg0,
            marginBottom:4,fontFamily:T.font,color:T.text0}}/>
          <div style={{fontSize:9,color:T.green,marginBottom:10}}>✓ Available</div>

          {/* Password + strength */}
          <label style={{fontSize:10,fontWeight:600,color:T.text1,marginBottom:5,display:"block"}}>Password</label>
          <div style={{position:"relative",marginBottom:7}}>
            <input readOnly placeholder="Create a strong password" type="password" style={{
              width:"100%",border:`1px solid ${T.border0}`,borderRadius:T.r.md,
              padding:"8px 36px 8px 10px",fontSize:11,background:T.bg0,fontFamily:T.font}}/>
            <span style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",
              fontSize:12,color:T.text3,cursor:"pointer"}}>👁</span>
          </div>
          {/* 4-segment strength bar — medium */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:3,marginBottom:5}}>
            {[T.green,T.green,"#F59E0B",T.bg3].map((c,i)=>(
              <div key={i} style={{height:3,background:c,borderRadius:99}}/>
            ))}
          </div>
          <div style={{fontSize:9,color:"#B45309",marginBottom:12}}>Medium strength — add a special character</div>

          {/* Confirm password */}
          <label style={{fontSize:10,fontWeight:600,color:T.text1,marginBottom:5,display:"block"}}>Confirm password</label>
          <input readOnly placeholder="Repeat your password" type="password" style={{
            width:"100%",border:`1px solid ${T.border0}`,borderRadius:T.r.md,
            padding:"8px 10px",fontSize:11,background:T.bg0,marginBottom:14,fontFamily:T.font}}/>

          {/* Step 2 — country */}
          <div style={{fontSize:9,letterSpacing:"0.12em",textTransform:"uppercase",color:T.text3,
            marginBottom:12,fontWeight:600,fontFamily:T.mono}}>03 — Step 2: Country Selection (inline)</div>
          <label style={{fontSize:10,fontWeight:600,color:T.text1,marginBottom:5,display:"block"}}>Your country</label>
          <select style={{width:"100%",border:`1px solid ${T.border0}`,borderRadius:T.r.md,
            padding:"8px 10px",fontSize:11,background:T.bg0,marginBottom:4,fontFamily:T.font,
            cursor:"pointer",color:T.text0}}>
            <option>Nigeria</option>
            <option>Ghana</option>
            <option>South Africa</option>
            <option>Kenya</option>
          </select>
          <div style={{fontSize:9,color:T.text3,borderLeft:`2px solid ${T.border0}`,paddingLeft:7,
            marginBottom:14,fontStyle:"italic",lineHeight:1.6}}>
            Country stored on user profile · Affects currency display · Can be updated later in Profile Settings
          </div>

          {/* Terms checkbox */}
          <label style={{display:"flex",alignItems:"flex-start",gap:9,cursor:"pointer",marginBottom:16}}>
            <input type="checkbox" readOnly style={{width:12,height:12,marginTop:2,flexShrink:0}}/>
            <span style={{fontSize:10,color:T.text1,lineHeight:1.6}}>
              I agree to the{" "}
              <span style={{color:T.blueText,textDecoration:"underline"}}>Terms & Conditions</span>{" "}and{" "}
              <span style={{color:T.blueText,textDecoration:"underline"}}>Privacy Policy</span>
            </span>
          </label>

          <WfBtn primary style={{width:"100%",justifyContent:"center",padding:"10px 0",fontSize:12,marginBottom:6}}>Create Account</WfBtn>
          <div style={{fontSize:9,color:T.text3,borderLeft:`2px solid ${T.border0}`,paddingLeft:7,
            marginBottom:12,fontStyle:"italic",lineHeight:1.6}}>
            On submit: account created with is_verified=false · Verification + welcome emails dispatched
          </div>
          <div style={{textAlign:"center",fontSize:10,color:T.text2}}>
            Already have an account?{" "}<span style={{color:T.blueText,textDecoration:"underline",cursor:"pointer"}}>Sign in instead</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// WIREFRAME: EMAIL VERIFICATION
// ══════════════════════════════════════════════════════════════════════════════
function WireframeEmailVerification(){
  return(
    <div style={{fontFamily:T.font,background:T.bg1,color:T.text0}}>
      {/* Minimal nav */}
      <div style={{display:"flex",alignItems:"center",padding:"10px 24px",
        borderBottom:`1px solid ${T.border1}`,background:T.bg0}}>
        <div style={{fontSize:14,fontWeight:700,color:T.text0}}>WillOfGod</div>
      </div>

      <div style={{maxWidth:480,margin:"0 auto",padding:"40px 24px"}}>

        {/* STATE 01 — Check email */}
        <WfSection num="01" label="Check Email State (shown immediately after signup)">
          <div style={{padding:"24px 0",textAlign:"center"}}>
            <div style={{width:64,height:64,borderRadius:"50%",background:T.blueLight,
              border:`1px solid ${T.blueBorder}`,display:"flex",alignItems:"center",
              justifyContent:"center",margin:"0 auto 16px",fontSize:26,color:T.blueText}}>✉</div>
            <div style={{fontSize:19,fontWeight:700,color:T.text0,marginBottom:7}}>Check your email</div>
            <div style={{fontSize:11,color:T.text1,lineHeight:1.75,marginBottom:20}}>
              We sent a verification link to{" "}
              <strong style={{color:T.text0}}>john@email.com</strong>. Click the link in the email to verify your account.
            </div>
            <div style={{background:T.bg2,border:`1px solid ${T.border1}`,borderRadius:T.r.lg,
              padding:16,marginBottom:14,textAlign:"left"}}>
              <div style={{fontSize:11,fontWeight:600,color:T.text0,marginBottom:8}}>Didn't get the email?</div>
              <div style={{fontSize:10,color:T.text1,marginBottom:12,lineHeight:1.6}}>
                Check your spam folder. The link expires in 24 hours.
              </div>
              <WfBtn style={{width:"100%",justifyContent:"center",fontSize:10}}>Resend Verification Email</WfBtn>
            </div>
            <WfAnnot>Resend generates new token · stores new Redis key (24h TTL) · sends new email · Previous token invalidated · 60s cooldown between resends</WfAnnot>
          </div>
        </WfSection>

        <div style={{height:1,background:T.border1,margin:"8px 0"}}/>

        {/* STATE 02 — Success */}
        <WfSection num="02" label="Verification Success State (after clicking the email link — token valid)">
          <div style={{padding:"24px 0",textAlign:"center"}}>
            <div style={{width:64,height:64,borderRadius:"50%",background:T.greenLight,
              border:`1px solid #86EFAC`,display:"flex",alignItems:"center",
              justifyContent:"center",margin:"0 auto 16px",fontSize:28,color:T.green}}>✓</div>
            <div style={{fontSize:19,fontWeight:700,color:T.text0,marginBottom:7}}>Email verified!</div>
            <div style={{fontSize:11,color:T.text1,lineHeight:1.75,marginBottom:16}}>
              Your account is now active. You can start shopping.
            </div>
            <div style={{background:T.bg2,border:`1px solid ${T.border1}`,borderRadius:T.r.md,
              padding:"10px 20px",display:"inline-block",marginBottom:16}}>
              <div style={{fontSize:10,color:T.text2,marginBottom:3}}>Redirecting to login in…</div>
              <div style={{fontSize:24,fontWeight:700,color:T.text0,fontFamily:T.mono}}>3</div>
            </div>
            <br/>
            <WfBtn primary style={{padding:"9px 28px",fontSize:11}}>Go to Login Now</WfBtn>
            <WfAnnot>Auto-redirect to login after 3s · is_verified=true set on user record · Redis key deleted</WfAnnot>
          </div>
        </WfSection>

        <div style={{height:1,background:T.border1,margin:"8px 0"}}/>

        {/* STATE 03 — Failed */}
        <WfSection num="03" label="Verification Failed State (expired or invalid token)">
          <div style={{padding:"24px 0",textAlign:"center"}}>
            <div style={{width:64,height:64,borderRadius:"50%",background:T.redLight,
              border:`1px solid #FECACA`,display:"flex",alignItems:"center",
              justifyContent:"center",margin:"0 auto 16px",fontSize:26,color:T.red}}>✕</div>
            <div style={{fontSize:19,fontWeight:700,color:T.text0,marginBottom:7}}>Link expired or invalid</div>
            <div style={{fontSize:11,color:T.text1,lineHeight:1.75,marginBottom:18}}>
              This verification link has expired or already been used. Request a new one below.
            </div>
            <WfBtn primary style={{padding:"9px 28px",fontSize:11,marginBottom:10}}>Send New Verification Email</WfBtn>
            <br/>
            <span style={{fontSize:10,color:T.blueText,textDecoration:"underline",cursor:"pointer"}}>Back to Login</span>
          </div>
        </WfSection>

      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// WIREFRAME: FORGOT PASSWORD
// ══════════════════════════════════════════════════════════════════════════════
function WireframeForgotPassword(){
  return(
    <div style={{fontFamily:T.font,background:T.bg1,color:T.text0}}>
      {/* Minimal nav */}
      <div style={{display:"flex",alignItems:"center",padding:"10px 24px",
        borderBottom:`1px solid ${T.border1}`,background:T.bg0}}>
        <div style={{fontSize:14,fontWeight:700,color:T.text0}}>WillOfGod</div>
        <span style={{marginLeft:"auto",fontSize:10,color:T.blueText,
          textDecoration:"underline",cursor:"pointer"}}>← Back to Login</span>
      </div>

      <div style={{maxWidth:420,margin:"0 auto",padding:"40px 24px"}}>

        {/* FORM STATE */}
        <WfSection num="01" label="Enter Email Form">
          <div style={{padding:"24px 0"}}>
            <div style={{textAlign:"center",marginBottom:26}}>
              <div style={{width:58,height:58,borderRadius:"50%",background:"#FFFBEB",
                border:`1px solid #FDE68A`,display:"flex",alignItems:"center",
                justifyContent:"center",margin:"0 auto 14px",fontSize:24}}>🔑</div>
              <div style={{fontSize:19,fontWeight:700,color:T.text0,marginBottom:7}}>Forgot your password?</div>
              <div style={{fontSize:11,color:T.text1,lineHeight:1.75}}>
                Enter your email address and we'll send you a reset link. The link expires in 1 hour.
              </div>
            </div>
            <label style={{fontSize:10,fontWeight:600,color:T.text1,marginBottom:5,display:"block"}}>Email address</label>
            <input readOnly placeholder="you@example.com" type="email" style={{
              width:"100%",border:`1px solid ${T.border0}`,borderRadius:T.r.md,
              padding:"9px 10px",fontSize:11,background:T.bg0,marginBottom:14,fontFamily:T.font}}/>
            <WfBtn primary style={{width:"100%",justifyContent:"center",padding:"10px 0",fontSize:12,marginBottom:12}}>
              Send Reset Link
            </WfBtn>
            <div style={{textAlign:"center"}}>
              <span style={{fontSize:10,color:T.blueText,textDecoration:"underline",cursor:"pointer"}}>← Back to Login</span>
            </div>
          </div>
        </WfSection>

        <div style={{height:1,background:T.border1,margin:"8px 0"}}/>

        {/* SUCCESS STATE */}
        <WfSection num="02" label="Success State (always shown — identical whether email exists or not)">
          <div style={{padding:"16px 0"}}>
            <div style={{background:T.greenLight,border:`1px solid #86EFAC`,
              borderRadius:T.r.lg,padding:18,textAlign:"center"}}>
              <div style={{fontSize:22,marginBottom:8,color:T.green}}>✉</div>
              <div style={{fontSize:14,fontWeight:700,color:T.green,marginBottom:5}}>Reset link sent</div>
              <div style={{fontSize:10,color:T.green,lineHeight:1.65,opacity:0.9}}>
                If that email exists in our system, a reset link has been sent. Check your inbox and spam folder.
              </div>
            </div>
            <WfAnnot>Response is identical whether email exists or not — prevents user enumeration attack · Redis key set with 1h TTL only if user actually exists in DB</WfAnnot>
          </div>
        </WfSection>

        <div style={{height:1,background:T.border1,margin:"8px 0"}}/>

        {/* RATE LIMIT STATE */}
        <WfSection num="03" label="Rate Limit State (too many requests within 15-minute window)">
          <div style={{padding:"16px 0"}}>
            <div style={{background:T.redLight,border:`1px solid #FECACA`,
              borderRadius:T.r.lg,padding:16}}>
              <div style={{fontSize:12,fontWeight:700,color:T.red,marginBottom:5}}>Too many requests</div>
              <div style={{fontSize:10,color:T.red,lineHeight:1.6,opacity:0.9}}>
                You've made too many reset requests. Please wait 15 minutes before trying again.
              </div>
            </div>
          </div>
        </WfSection>

      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// WIREFRAME: RESET PASSWORD
// ══════════════════════════════════════════════════════════════════════════════
function WireframeResetPassword(){
  const reqs=[
    {label:"At least 8 characters",met:true},
    {label:"Uppercase letter (A–Z)",met:true},
    {label:"Lowercase letter (a–z)",met:true},
    {label:"Number (0–9)",met:true},
    {label:"Special character (!@#$…)",met:false},
  ];
  return(
    <div style={{fontFamily:T.font,background:T.bg1,color:T.text0}}>
      {/* Minimal nav */}
      <div style={{display:"flex",alignItems:"center",padding:"10px 24px",
        borderBottom:`1px solid ${T.border1}`,background:T.bg0}}>
        <div style={{fontSize:14,fontWeight:700,color:T.text0}}>WillOfGod</div>
      </div>

      <div style={{maxWidth:420,margin:"0 auto",padding:"40px 24px"}}>

        {/* FORM STATE */}
        <WfSection num="01" label="Reset Password Form (token valid — reached via email link)">
          <div style={{padding:"24px 0"}}>
            <div style={{textAlign:"center",marginBottom:24}}>
              <div style={{width:58,height:58,borderRadius:"50%",background:T.blueLight,
                border:`1px solid ${T.blueBorder}`,display:"flex",alignItems:"center",
                justifyContent:"center",margin:"0 auto 14px",fontSize:22}}>🔒</div>
              <div style={{fontSize:19,fontWeight:700,color:T.text0,marginBottom:6}}>Reset your password</div>
              <div style={{fontSize:11,color:T.text1}}>
                Choose a strong new password for <strong>jo***@email.com</strong>
              </div>
            </div>

            {/* New password — success/strong */}
            <label style={{fontSize:10,fontWeight:600,color:T.text1,marginBottom:5,display:"block"}}>New password</label>
            <div style={{position:"relative",marginBottom:6}}>
              <input readOnly placeholder="Create a new password" type="password" style={{
                width:"100%",border:`1px solid ${T.green}`,borderRadius:T.r.md,
                padding:"9px 36px 9px 10px",fontSize:11,background:T.bg0,fontFamily:T.font}}/>
              <span style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",
                fontSize:12,color:T.text3,cursor:"pointer"}}>👁</span>
            </div>
            {/* All-green strength bar */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:3,marginBottom:5}}>
              {[T.green,T.green,T.green,T.green].map((c,i)=>(
                <div key={i} style={{height:3,background:c,borderRadius:99}}/>
              ))}
            </div>
            <div style={{fontSize:9,color:T.green,marginBottom:14}}>Strong password ✓</div>

            {/* Confirm password — match state */}
            <label style={{fontSize:10,fontWeight:600,color:T.text1,marginBottom:5,display:"block"}}>Confirm new password</label>
            <div style={{position:"relative",marginBottom:5}}>
              <input readOnly placeholder="Repeat new password" type="password" style={{
                width:"100%",border:`1px solid ${T.green}`,borderRadius:T.r.md,
                padding:"9px 36px 9px 10px",fontSize:11,background:T.bg0,fontFamily:T.font}}/>
              <span style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",
                fontSize:12,color:T.text3,cursor:"pointer"}}>👁</span>
            </div>
            <div style={{fontSize:9,color:T.green,marginBottom:16}}>✓ Passwords match</div>

            {/* Requirements checklist */}
            <div style={{background:T.bg2,border:`1px solid ${T.border1}`,borderRadius:T.r.md,
              padding:"12px 14px",marginBottom:18}}>
              <div style={{fontSize:9,fontWeight:600,color:T.text1,marginBottom:9,textTransform:"uppercase",letterSpacing:"0.05em"}}>
                Password requirements:
              </div>
              {reqs.map(({label,met},i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",gap:7,marginBottom:5}}>
                  <span style={{fontSize:10,color:met?T.green:T.red,fontWeight:700,flexShrink:0}}>{met?"✓":"✕"}</span>
                  <span style={{fontSize:10,color:met?T.green:T.red}}>{label}</span>
                </div>
              ))}
            </div>

            <WfBtn primary style={{width:"100%",justifyContent:"center",padding:"10px 0",fontSize:12,marginBottom:8}}>
              Reset Password
            </WfBtn>
            <WfAnnot>On success: password_hash updated · all sessions invalidated · confirmation email sent · redirect to login</WfAnnot>
          </div>
        </WfSection>

        <div style={{height:1,background:T.border1,margin:"8px 0"}}/>

        {/* SUCCESS STATE */}
        <WfSection num="02" label="Success State">
          <div style={{padding:"24px 0",textAlign:"center"}}>
            <div style={{width:58,height:58,borderRadius:"50%",background:T.greenLight,
              border:`1px solid #86EFAC`,display:"flex",alignItems:"center",
              justifyContent:"center",margin:"0 auto 14px",fontSize:24,color:T.green}}>✓</div>
            <div style={{fontSize:17,fontWeight:700,color:T.text0,marginBottom:7}}>Password updated!</div>
            <div style={{fontSize:10,color:T.text1,lineHeight:1.7,marginBottom:18,maxWidth:300,margin:"0 auto 18px"}}>
              All your active sessions have been signed out for security. Please sign in with your new password.
            </div>
            <WfBtn primary style={{padding:"9px 28px",fontSize:11}}>Go to Login</WfBtn>
          </div>
        </WfSection>

        <div style={{height:1,background:T.border1,margin:"8px 0"}}/>

        {/* EXPIRED TOKEN STATE */}
        <WfSection num="03" label="Expired Token State (link expired or already used)">
          <div style={{padding:"24px 0",textAlign:"center"}}>
            <div style={{width:58,height:58,borderRadius:"50%",background:T.redLight,
              border:`1px solid #FECACA`,display:"flex",alignItems:"center",
              justifyContent:"center",margin:"0 auto 14px",fontSize:22,color:T.red}}>✕</div>
            <div style={{fontSize:17,fontWeight:700,color:T.text0,marginBottom:7}}>Reset link expired</div>
            <div style={{fontSize:10,color:T.text1,lineHeight:1.7,marginBottom:18,maxWidth:300,margin:"0 auto 18px"}}>
              This reset link has expired or already been used. Password reset links are valid for 1 hour.
            </div>
            <div style={{display:"flex",gap:9,justifyContent:"center"}}>
              <WfBtn primary style={{padding:"9px 22px",fontSize:11}}>Request New Link</WfBtn>
              <WfBtn style={{padding:"9px 22px",fontSize:11}}>Back to Login</WfBtn>
            </div>
          </div>
        </WfSection>

      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// WIREFRAME: MAINTENANCE PAGE
// ══════════════════════════════════════════════════════════════════════════════
function WireframeMaintenance(){
  return(
    <div style={{fontFamily:T.font,background:T.bg1,color:T.text0}}>
      {/* Minimal branded nav */}
      <div style={{display:"flex",alignItems:"center",padding:"10px 24px",
        borderBottom:`1px solid ${T.border1}`,background:T.bg0}}>
        <div style={{fontSize:14,fontWeight:700,color:T.text0}}>WillOfGod</div>
        <div style={{marginLeft:"auto",background:"#FFFBEB",border:"1px solid #FDE68A",
          color:"#B45309",fontSize:9,padding:"2px 10px",borderRadius:T.r.full,fontWeight:600}}>
          Maintenance Mode
        </div>
      </div>

      {/* MAIN SCREEN */}
      <WfSection num="01" label="Main Maintenance Screen (served to ALL visitors and buyers when maintenance_mode=true)">
        <div style={{minHeight:380,display:"flex",flexDirection:"column",alignItems:"center",
          justifyContent:"center",padding:"48px 24px",textAlign:"center",background:T.bg2}}>
          {/* Gear icon */}
          <div style={{width:80,height:80,borderRadius:"50%",background:"#FFFBEB",
            border:"1px solid #FDE68A",display:"flex",alignItems:"center",
            justifyContent:"center",marginBottom:20,fontSize:34}}>⚙</div>
          <div style={{fontSize:24,fontWeight:700,color:T.text0,marginBottom:8}}>We'll be back soon</div>
          <div style={{fontSize:13,color:T.text1,maxWidth:420,lineHeight:1.75,marginBottom:24}}>
            We're performing scheduled maintenance to improve your experience. We apologise for the inconvenience.
          </div>

          {/* Estimated completion card */}
          <div style={{background:T.bg0,border:`1px solid ${T.border0}`,borderRadius:T.r.lg,
            padding:"16px 32px",marginBottom:22,minWidth:260}}>
            <div style={{fontSize:9,color:T.text3,marginBottom:6,letterSpacing:"0.08em",
              textTransform:"uppercase",fontWeight:600}}>Estimated completion</div>
            <div style={{fontSize:18,fontWeight:700,color:T.text0}}>Today at 3:00 PM WAT</div>
            <div style={{fontSize:10,color:T.text3,marginTop:4}}>Set by admin in site settings</div>
          </div>

          {/* Task pills */}
          <div style={{display:"flex",gap:8,marginBottom:26,flexWrap:"wrap",justifyContent:"center"}}>
            {["◻ Upgrading database","◻ Deploying new features","◻ Performance optimisation"].map(t=>(
              <div key={t} style={{display:"flex",alignItems:"center",gap:5,background:T.bg0,
                border:`1px solid ${T.border1}`,borderRadius:T.r.md,padding:"6px 12px"}}>
                <span style={{fontSize:10,color:T.text2}}>{t}</span>
              </div>
            ))}
          </div>

          {/* Notify me */}
          <div style={{maxWidth:340,width:"100%"}}>
            <div style={{fontSize:11,color:T.text1,marginBottom:10}}>Get notified when we're back:</div>
            <div style={{display:"flex",gap:8}}>
              <input readOnly placeholder="Enter your email" style={{flex:1,border:`1px solid ${T.border0}`,
                borderRadius:T.r.md,padding:"9px 10px",fontSize:11,background:T.bg0,fontFamily:T.font}}/>
              <WfBtn primary style={{whiteSpace:"nowrap",padding:"9px 16px"}}>Notify Me</WfBtn>
            </div>
          </div>
        </div>
        <WfAnnot>Middleware serves HTTP 503 with Retry-After header · Gear icon has CSS spin animation · All routes redirect here except /admin/* for role=admin · Page loads without JS bundle if possible</WfAnnot>
      </WfSection>

      {/* ADMIN ACCESS BANNER */}
      <WfSection num="02" label="Admin Access Banner (always visible — admins can still log in during maintenance)">
        <div style={{background:T.bg0,padding:"12px 24px",display:"flex",
          alignItems:"center",justifyContent:"space-between"}}>
          <div style={{display:"flex",alignItems:"center",gap:9}}>
            <div style={{width:9,height:9,borderRadius:"50%",background:T.green,flexShrink:0}}/>
            <span style={{fontSize:11,color:T.text1}}>Admin access is available during maintenance</span>
          </div>
          <WfBtn primary style={{padding:"6px 16px",fontSize:10,whiteSpace:"nowrap"}}>Admin Login →</WfBtn>
        </div>
        <WfAnnot>Admin Login → routes to /login · JWT role=admin bypasses maintenance middleware · Banner must remain visible at all times — position sticky or fixed</WfAnnot>
      </WfSection>

      {/* ADMIN SETTINGS FORM (reference) */}
      <WfSection num="03" label="Admin: Maintenance Mode Toggle — in Site Settings (shown for UI/UX reference)">
        <div style={{padding:"16px 24px"}}>
          <div style={{maxWidth:500}}>
            <div style={{background:T.bg0,border:`1px solid ${T.border0}`,borderRadius:T.r.lg,padding:16}}>
              {/* Toggle row */}
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                <div>
                  <div style={{fontSize:13,fontWeight:600,color:T.text0}}>Maintenance Mode</div>
                  <div style={{fontSize:10,color:T.text2,marginTop:2}}>Blocks all visitor and buyer access to the site</div>
                </div>
                {/* Toggle ON (warning colour) */}
                <div style={{width:42,height:23,background:"#FCD34D",borderRadius:99,position:"relative",cursor:"pointer"}}>
                  <div style={{position:"absolute",right:2,top:2,width:19,height:19,background:"#fff",borderRadius:"50%",
                    boxShadow:"0 1px 3px rgba(0,0,0,0.2)"}}/>
                </div>
              </div>
              <div style={{height:1,background:T.border2,marginBottom:14}}/>
              <label style={{fontSize:10,fontWeight:600,color:T.text1,marginBottom:5,display:"block"}}>
                Maintenance message (shown to visitors)
              </label>
              <textarea readOnly style={{width:"100%",border:`1px solid ${T.border0}`,borderRadius:T.r.md,
                padding:"8px 10px",fontSize:10,background:T.bg0,height:58,resize:"none",
                fontFamily:T.font,marginBottom:12,color:T.text1}}>
                We're performing scheduled maintenance to improve your experience...
              </textarea>
              <label style={{fontSize:10,fontWeight:600,color:T.text1,marginBottom:5,display:"block"}}>
                Estimated completion time
              </label>
              <input readOnly type="datetime-local" defaultValue="2026-03-17T15:00" style={{
                width:"100%",border:`1px solid ${T.border0}`,borderRadius:T.r.md,
                padding:"8px 10px",fontSize:10,background:T.bg0,marginBottom:14,fontFamily:T.font}}/>
              <WfBtn primary style={{width:"100%",justifyContent:"center",padding:"9px 0",fontSize:11}}>
                Save Maintenance Settings
              </WfBtn>
              <WfAnnot>Changes take effect immediately on save · No server restart required · Redis maintenance_mode cache invalidated on save</WfAnnot>
            </div>
          </div>
        </div>
      </WfSection>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// WIREFRAME: CART PAGE
// ══════════════════════════════════════════════════════════════════════════════
function WireframeCart(){
  const items=[
    {name:"Classic Tailored Blazer",variant:"Blue / Size M",price:"₦18,500",orig:"₦25,000",flash:true,stock:"3 left",qty:1,oos:false},
    {name:"Slim Fit Chinos",variant:"Beige / Size 32",price:"₦12,000",orig:null,flash:false,stock:"In stock",qty:2,oos:false},
    {name:"Leather Oxford Shoes",variant:"Black / Size 42",price:"₦22,000",orig:null,flash:false,stock:"Out of stock",qty:1,oos:true},
  ];
  return(
    <div style={{fontFamily:T.font,background:T.bg1,color:T.text0}}>
      <WfNav/>
      <div style={{padding:"7px 24px",fontSize:10,color:T.text2,background:T.bg2,borderBottom:`1px solid ${T.border1}`}}>
        Home › My Cart
      </div>

      <div style={{padding:"12px 24px",display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:`1px solid ${T.border1}`,background:T.bg0}}>
        <div style={{fontSize:17,fontWeight:700,color:T.text0}}>My Cart <span style={{fontSize:13,color:T.text3,fontWeight:400}}>(3 items)</span></div>
        <button style={{fontSize:10,color:T.red,background:"transparent",border:"none",cursor:"pointer"}}>Clear All</button>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 300px"}}>
        {/* LEFT: Cart items */}
        <div style={{padding:"14px 24px",borderRight:`1px solid ${T.border1}`,background:T.bg0}}>
          <div style={{fontSize:9,letterSpacing:"0.12em",textTransform:"uppercase",color:T.text3,
            background:T.bg2,padding:"4px 0",marginBottom:12,fontWeight:600,fontFamily:T.mono}}>
            01 — Cart Items List
          </div>
          {items.map((item,i)=>(
            <div key={i} style={{display:"flex",gap:14,padding:"14px 0",
              borderBottom:`1px solid ${T.border1}`,opacity:item.oos?0.6:1}}>
              <WfImg height={70} style={{width:70,flexShrink:0,borderRadius:T.r.md}}/>
              <div style={{flex:1}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:3}}>
                  <div style={{fontSize:12,fontWeight:600,color:T.text0}}>{item.name}</div>
                  <div style={{fontSize:13,fontWeight:700,color:T.text0,whiteSpace:"nowrap",marginLeft:10}}>{item.price}</div>
                </div>
                <div style={{fontSize:10,color:T.text3,marginBottom:5}}>{item.variant}</div>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                  {item.flash&&<span style={{background:T.redLight,color:T.red,borderRadius:T.r.sm,padding:"1px 6px",fontSize:9,fontWeight:600}}>⚡ Flash Sale</span>}
                  {item.orig&&<span style={{fontSize:10,color:T.text3,textDecoration:"line-through"}}>{item.orig}</span>}
                  <span style={{fontSize:10,fontWeight:500,color:item.oos?T.red:item.stock.includes("left")?"#B45309":T.green}}>
                    {item.oos?"✕ Out of stock":"● "+item.stock}
                  </span>
                </div>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                  {item.oos
                    ?<button style={{fontSize:9,color:T.red,background:"transparent",border:`1px solid #FECACA`,borderRadius:T.r.sm,padding:"3px 9px",cursor:"pointer"}}>Remove</button>
                    :<div style={{display:"flex",alignItems:"center",border:`1px solid ${T.border0}`,borderRadius:T.r.md,overflow:"hidden"}}>
                      <button style={{width:28,height:28,background:T.bg2,border:"none",cursor:"pointer",fontSize:16,color:T.text1}}>−</button>
                      <span style={{width:34,textAlign:"center",fontSize:12,color:T.text0}}>{item.qty}</span>
                      <button style={{width:28,height:28,background:T.bg2,border:"none",cursor:"pointer",fontSize:16,color:T.text1}}>+</button>
                    </div>
                  }
                  <div style={{display:"flex",gap:10}}>
                    <button style={{fontSize:9,color:T.text3,background:"transparent",border:"none",cursor:"pointer"}}>♡ Save</button>
                    {!item.oos&&<button style={{fontSize:9,color:T.red,background:"transparent",border:"none",cursor:"pointer"}}>✕ Remove</button>}
                  </div>
                </div>
              </div>
            </div>
          ))}
          <WfAnnot>Out-of-stock items flagged in red at 0.6 opacity · Quantity capped at available stock · Save moves item to wishlist · Flash sale badge shows countdown if ≤1h remaining</WfAnnot>
          <div style={{marginTop:12,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span style={{fontSize:10,color:T.blueText,cursor:"pointer",textDecoration:"underline"}}>← Continue Shopping</span>
            <span style={{fontSize:10,color:T.red}}>Remove out-of-stock items to proceed</span>
          </div>
        </div>

        {/* RIGHT: Summary + coupon */}
        <div style={{padding:16,background:T.bg1}}>
          <div style={{fontSize:9,letterSpacing:"0.12em",textTransform:"uppercase",color:T.text3,
            background:T.bg2,padding:"4px 0",marginBottom:12,fontWeight:600,fontFamily:T.mono}}>
            02 — Order Summary
          </div>
          <div style={{background:T.bg2,border:`1px solid ${T.border1}`,borderRadius:T.r.lg,padding:14,marginBottom:14}}>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:T.text1,marginBottom:7}}>
              <span>Subtotal (2 items)</span><span style={{fontWeight:600,color:T.text0}}>₦42,500</span>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:T.green,marginBottom:7}}>
              <span>Discount</span><span>−₦6,500</span>
            </div>
            <div style={{height:1,background:T.border2,margin:"7px 0"}}/>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:14,fontWeight:700,color:T.text0,marginBottom:5}}>
              <span>Total</span><span>₦36,000</span>
            </div>
            <div style={{fontSize:9,color:T.text3}}>Shipping calculated at checkout</div>
          </div>

          <div style={{fontSize:9,letterSpacing:"0.12em",textTransform:"uppercase",color:T.text3,
            background:T.bg2,padding:"4px 0",marginBottom:10,fontWeight:600,fontFamily:T.mono}}>
            03 — Coupon Code
          </div>
          <div style={{display:"flex",gap:6,marginBottom:8}}>
            <input readOnly placeholder="Enter coupon code" style={{flex:1,border:`1px solid ${T.border0}`,borderRadius:T.r.md,padding:"7px 10px",fontSize:11,background:T.bg0,fontFamily:T.font}}/>
            <WfBtn primary style={{whiteSpace:"nowrap",fontSize:10,padding:"7px 12px"}}>Apply</WfBtn>
          </div>
          {/* Coupon applied success state */}
          <div style={{background:T.greenLight,border:`1px solid #86EFAC`,borderRadius:T.r.md,padding:"8px 12px",
            display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <div>
              <div style={{fontSize:10,fontWeight:600,color:T.green}}>SAVE20 applied</div>
              <div style={{fontSize:9,color:T.green}}>20% off — you save ₦6,500</div>
            </div>
            <span style={{fontSize:13,color:T.green,cursor:"pointer"}}>×</span>
          </div>
          <WfAnnot>validateCoupon API called in real-time · Specific errors: Expired / Usage limit reached / Minimum order not met</WfAnnot>

          <WfBtn primary style={{width:"100%",justifyContent:"center",padding:"11px 0",fontSize:13,marginTop:8,marginBottom:10}}>
            Proceed to Checkout →
          </WfBtn>
          <div style={{display:"flex",justifyContent:"center",gap:7}}>
            {["Stripe","PayPal","Paystack"].map(p=><WfTag key={p}>{p}</WfTag>)}
          </div>

          <div style={{fontSize:9,letterSpacing:"0.12em",textTransform:"uppercase",color:T.text3,
            background:T.bg2,padding:"4px 0",margin:"14px 0 10px",fontWeight:600,fontFamily:T.mono}}>
            04 — You May Also Like
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            {[1,2].map(i=>(
              <div key={i} style={{border:`1px solid ${T.border1}`,borderRadius:T.r.md,overflow:"hidden"}}>
                <WfImg height={60} style={{borderRadius:0}}/>
                <div style={{padding:"5px 8px"}}>
                  <WfLine w="80%" h={10} mb={3}/>
                  <WfLine w="50%" h={7} mb={0}/>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// WIREFRAME: CHECKOUT PAGE
// ══════════════════════════════════════════════════════════════════════════════
function WireframeCheckout(){
  const StepBar=({steps})=>(
    <div style={{display:"flex",alignItems:"flex-start",padding:"14px 24px",borderBottom:`1px solid ${T.border1}`}}>
      {steps.map(([label,state],i)=>(
        <div key={label} style={{display:"flex",flexDirection:"column",alignItems:"center",flex:i<steps.length-1?1:0,gap:4}}>
          <div style={{display:"flex",alignItems:"center",width:"100%"}}>
            <div style={{width:28,height:28,borderRadius:"50%",flexShrink:0,margin:"0 auto",
              background:state==="done"?T.greenLight:state==="active"?T.blueLight:T.bg3,
              border:`1px solid ${state==="done"?"#86EFAC":state==="active"?T.blueBorder:T.border0}`,
              display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:600,
              color:state==="done"?T.green:state==="active"?T.blueText:T.text3}}>
              {state==="done"?"✓":i+1}
            </div>
            {i<steps.length-1&&<div style={{flex:1,height:2,background:state==="done"?"#86EFAC":T.border2}}/>}
          </div>
          <div style={{fontSize:9,whiteSpace:"nowrap",
            color:state==="active"?T.blueText:state==="done"?T.green:T.text3}}>{label}</div>
        </div>
      ))}
    </div>
  );
  return(
    <div style={{fontFamily:T.font,background:T.bg1,color:T.text0}}>
      {/* Stripped nav */}
      <div style={{display:"flex",alignItems:"center",padding:"10px 24px",background:T.bg0,borderBottom:`1px solid ${T.border1}`}}>
        <div style={{fontSize:15,fontWeight:700,color:T.text0}}>WillOfGod</div>
        <div style={{flex:1}}/>
        <span style={{fontSize:10,color:T.text3}}>🔒 Secure Checkout</span>
      </div>

      <WfSection num="01" label="Checkout Progress Steps">
        <StepBar steps={[["Cart","done"],["Checkout","active"],["Payment","upcoming"],["Confirmation","upcoming"]]}/>
      </WfSection>

      <div style={{display:"grid",gridTemplateColumns:"1fr 300px"}}>
        {/* LEFT */}
        <div style={{padding:"16px 24px",borderRight:`1px solid ${T.border1}`,background:T.bg0}}>
          <WfSection num="02" label="Fulfillment Type Toggle">
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,padding:"14px 0 10px"}}>
              {[{icon:"🚚",label:"Delivery",sub:"Ship to your address",active:true},{icon:"🏪",label:"Pickup",sub:"Collect from our store",active:false}].map(({icon,label,sub,active})=>(
                <div key={label} style={{border:`${active?"1.5px":"1px"} solid ${active?T.blueBorder:T.border0}`,
                  background:active?T.blueLight:"transparent",borderRadius:T.r.lg,padding:14,cursor:"pointer"}}>
                  <div style={{fontSize:18,marginBottom:4}}>{icon}</div>
                  <div style={{fontSize:12,fontWeight:600,color:active?T.blueText:T.text0}}>{label}</div>
                  <div style={{fontSize:10,color:active?T.blueText:T.text3}}>{sub}</div>
                </div>
              ))}
            </div>
          </WfSection>

          <WfSection num="03" label="Delivery: Address Selection">
            <div style={{padding:"12px 0"}}>
              {[{label:"Home",addr:"12 Marina Street, Lagos Island, Lagos",def:true},{label:"Office",addr:"45 Victoria Island Boulevard, VI, Lagos",def:false}].map(({label,addr,def},i)=>(
                <div key={i} style={{display:"flex",alignItems:"flex-start",gap:9,
                  border:`${i===0?"1.5px":"1px"} solid ${i===0?T.blueBorder:T.border0}`,
                  background:i===0?T.blueLight:"transparent",borderRadius:T.r.lg,
                  padding:11,marginBottom:8,cursor:"pointer"}}>
                  <input type="radio" defaultChecked={i===0} readOnly style={{marginTop:2,flexShrink:0}}/>
                  <div style={{flex:1}}>
                    <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:3}}>
                      <span style={{fontSize:12,fontWeight:600,color:i===0?T.blueText:T.text0}}>{label}</span>
                      {def&&<span style={{fontSize:8,background:T.greenLight,color:T.green,borderRadius:T.r.full,padding:"1px 6px",fontWeight:600}}>Default</span>}
                    </div>
                    <div style={{fontSize:10,color:T.text2}}>{addr}</div>
                  </div>
                </div>
              ))}
              <button style={{fontSize:10,color:T.blueText,background:"transparent",
                border:`1px dashed ${T.blueBorder}`,borderRadius:T.r.md,padding:"8px 14px",cursor:"pointer",width:"100%"}}>
                + Add New Address
              </button>
              <WfAnnot>Addresses from user_addresses · Default pre-selected · Inline add-address form expands on click</WfAnnot>
            </div>
          </WfSection>

          <WfSection num="04" label="Pickup Location (shown when Pickup tab selected)">
            <div style={{border:`1px dashed ${T.border0}`,borderRadius:T.r.lg,padding:12,background:T.bg2,margin:"12px 0"}}>
              <div style={{fontSize:10,color:T.text3,textAlign:"center",marginBottom:10}}>Shown when Pickup tab is selected</div>
              {["Victoria Island Store — 45 Akin Adesola, VI, Lagos — Mon–Sat 9am–6pm","Ikeja Branch — 12 Allen Ave, Ikeja, Lagos — Mon–Fri 8am–7pm"].map((loc,i)=>(
                <div key={i} style={{display:"flex",alignItems:"flex-start",gap:8,
                  border:`${i===0?"1.5px":"1px"} solid ${i===0?T.blueBorder:T.border0}`,
                  background:i===0?T.blueLight:"transparent",borderRadius:T.r.md,
                  padding:9,marginBottom:7,cursor:"pointer"}}>
                  <input type="radio" defaultChecked={i===0} readOnly/>
                  <span style={{fontSize:9,color:i===0?T.blueText:T.text1,lineHeight:1.5}}>{loc}</span>
                </div>
              ))}
            </div>
          </WfSection>

          <WfSection num="05" label="Order Notes (optional)">
            <div style={{padding:"12px 0"}}>
              <label style={{fontSize:10,fontWeight:600,color:T.text1,marginBottom:5,display:"block"}}>
                Delivery / Order Notes <span style={{fontWeight:400,color:T.text3}}>(optional)</span>
              </label>
              <textarea readOnly placeholder="Any special instructions for delivery or packaging…"
                style={{width:"100%",border:`1px solid ${T.border0}`,borderRadius:T.r.md,
                padding:"8px 10px",fontSize:10,background:T.bg0,height:58,resize:"none",fontFamily:T.font}}/>
            </div>
          </WfSection>
        </div>

        {/* RIGHT: Summary + provider + CTA */}
        <div style={{padding:16,background:T.bg1}}>
          <WfSection num="06" label="Order Summary Sidebar (read-only)">
            <div style={{background:T.bg2,border:`1px solid ${T.border1}`,borderRadius:T.r.lg,padding:14,marginBottom:12}}>
              {[{name:"Classic Tailored Blazer",variant:"Blue / M",price:"₦18,500"},{name:"Slim Fit Chinos",variant:"Beige / 32",price:"₦24,000"}].map((item,i)=>(
                <div key={i} style={{display:"flex",gap:8,marginBottom:10,paddingBottom:10,borderBottom:`1px solid ${T.border2}`}}>
                  <WfImg height={36} style={{width:36,flexShrink:0,borderRadius:T.r.sm}}/>
                  <div style={{flex:1}}>
                    <div style={{fontSize:10,fontWeight:600,color:T.text0}}>{item.name}</div>
                    <div style={{fontSize:9,color:T.text3}}>{item.variant}</div>
                  </div>
                  <div style={{fontSize:10,fontWeight:600,color:T.text0,whiteSpace:"nowrap"}}>{item.price}</div>
                </div>
              ))}
              {[["Subtotal","₦42,500",false],["Shipping","Free",true],["Coupon (SAVE20)","−₦6,500",true]].map(([l,v,green])=>(
                <div key={l} style={{display:"flex",justifyContent:"space-between",fontSize:10,marginBottom:5,color:green?T.green:T.text1}}>
                  <span>{l}</span><span>{v}</span>
                </div>
              ))}
              <div style={{height:1,background:T.border2,margin:"7px 0"}}/>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:14,fontWeight:700,color:T.text0}}>
                <span>Total</span><span>₦36,000</span>
              </div>
            </div>
          </WfSection>

          <WfSection num="07" label="Payment Provider Selection">
            <div style={{marginBottom:10,paddingTop:4}}>
              {[["Stripe","Card (Visa / Mastercard)",true],["PayPal","PayPal balance / card",false],["Paystack","Card, Bank transfer, USSD",false]].map(([name,desc,active])=>(
                <div key={name} style={{display:"flex",alignItems:"center",gap:9,
                  border:`${active?"1.5px":"1px"} solid ${active?T.blueBorder:T.border0}`,
                  background:active?T.blueLight:"transparent",borderRadius:T.r.md,
                  padding:"9px 11px",marginBottom:7,cursor:"pointer"}}>
                  <input type="radio" defaultChecked={active} readOnly/>
                  <div style={{flex:1}}>
                    <div style={{fontSize:11,fontWeight:600,color:active?T.blueText:T.text0}}>{name}</div>
                    <div style={{fontSize:9,color:active?T.blueText:T.text3}}>{desc}</div>
                  </div>
                  <WfImg height={20} style={{width:36,borderRadius:T.r.sm}}/>
                </div>
              ))}
              <WfAnnot>Only shows admin-enabled providers · From site settings</WfAnnot>
            </div>
            <WfBtn primary style={{width:"100%",justifyContent:"center",padding:"11px 0",fontSize:13,marginBottom:7}}>
              Place Order & Pay →
            </WfBtn>
            <div style={{fontSize:9,color:T.text3,textAlign:"center"}}>
              By placing an order you agree to our Terms & Conditions
            </div>
          </WfSection>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// WIREFRAME: PAYMENT PAGE
// ══════════════════════════════════════════════════════════════════════════════
function WireframePayment(){
  return(
    <div style={{fontFamily:T.font,background:T.bg1,color:T.text0}}>
      {/* Stripped nav */}
      <div style={{display:"flex",alignItems:"center",padding:"10px 24px",background:T.bg0,borderBottom:`1px solid ${T.border1}`}}>
        <div style={{fontSize:15,fontWeight:700,color:T.text0}}>WillOfGod</div>
        <div style={{flex:1,textAlign:"center",fontSize:10,color:T.text3}}>🔒 Secure Payment — SSL Encrypted</div>
      </div>

      {/* Progress steps — Cart ✓ Checkout ✓ Payment active */}
      <div style={{display:"flex",alignItems:"flex-start",padding:"12px 24px",borderBottom:`1px solid ${T.border1}`,background:T.bg0}}>
        {[["Cart","done"],["Checkout","done"],["Payment","active"],["Confirmation","upcoming"]].map(([label,state],i,arr)=>(
          <div key={label} style={{display:"flex",flexDirection:"column",alignItems:"center",flex:i<arr.length-1?1:0,gap:3}}>
            <div style={{display:"flex",alignItems:"center",width:"100%"}}>
              <div style={{width:26,height:26,borderRadius:"50%",margin:"0 auto",flexShrink:0,
                background:state==="done"?T.greenLight:state==="active"?T.blueLight:T.bg3,
                border:`1px solid ${state==="done"?"#86EFAC":state==="active"?T.blueBorder:T.border0}`,
                display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:600,
                color:state==="done"?T.green:state==="active"?T.blueText:T.text3}}>
                {state==="done"?"✓":i+1}
              </div>
              {i<arr.length-1&&<div style={{flex:1,height:2,background:state==="done"?"#86EFAC":T.border2}}/>}
            </div>
            <div style={{fontSize:9,whiteSpace:"nowrap",color:state==="active"?T.blueText:state==="done"?T.green:T.text3}}>{label}</div>
          </div>
        ))}
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 280px"}}>
        {/* LEFT: Payment UI */}
        <div style={{padding:"18px 24px",borderRight:`1px solid ${T.border1}`,background:T.bg0}}>

          <WfSection num="02" label="Stripe Card Payment Form (Stripe Elements sandboxed iframe)">
            <div style={{padding:"14px 0"}}>
              <div style={{fontSize:13,fontWeight:600,color:T.text0,marginBottom:12,display:"flex",alignItems:"center",gap:8}}>
                Pay with Card
                <WfImg height={18} style={{width:34,borderRadius:T.r.sm}}/>
                <WfImg height={18} style={{width:34,borderRadius:T.r.sm}}/>
              </div>
              <div style={{border:`1px solid ${T.border0}`,borderRadius:T.r.lg,padding:16,background:T.bg2}}>
                <div style={{fontSize:9,color:T.text3,marginBottom:12,fontStyle:"italic"}}>Stripe Elements — rendered in sandboxed iframe</div>
                <label style={{fontSize:10,fontWeight:600,color:T.text1,marginBottom:5,display:"block"}}>Card number</label>
                <div style={{border:`1px solid ${T.border0}`,borderRadius:T.r.md,padding:"9px 12px",background:T.bg0,marginBottom:12,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{fontSize:12,color:T.text3,fontFamily:T.mono,letterSpacing:2}}>4242  4242  4242  4242</span>
                  <WfImg height={18} style={{width:28,borderRadius:T.r.sm}}/>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                  <div>
                    <label style={{fontSize:10,fontWeight:600,color:T.text1,marginBottom:5,display:"block"}}>Expiry date</label>
                    <div style={{border:`1px solid ${T.border0}`,borderRadius:T.r.md,padding:"9px 12px",background:T.bg0,fontSize:11,color:T.text3,fontFamily:T.mono}}>MM / YY</div>
                  </div>
                  <div>
                    <label style={{fontSize:10,fontWeight:600,color:T.text1,marginBottom:5,display:"block"}}>CVC</label>
                    <div style={{border:`1px solid ${T.border0}`,borderRadius:T.r.md,padding:"9px 12px",background:T.bg0,fontSize:11,color:T.text3,fontFamily:T.mono}}>•••</div>
                  </div>
                </div>
              </div>
              <WfAnnot>Stripe Elements renders in its own sandboxed iframe — card data never touches our server · PCI DSS compliant</WfAnnot>
            </div>
          </WfSection>

          <WfSection num="03" label="PayPal Option (shown when PayPal selected)">
            <div style={{border:`1px dashed ${T.border0}`,borderRadius:T.r.lg,padding:18,textAlign:"center",background:T.bg2,margin:"8px 0"}}>
              <div style={{fontSize:10,color:T.text3,marginBottom:10}}>PayPal Smart Button renders here</div>
              <div style={{background:"#003087",color:"#fff",borderRadius:T.r.md,padding:"10px 28px",display:"inline-block",fontSize:12,fontWeight:600,cursor:"pointer"}}>Pay with PayPal</div>
              <div style={{fontSize:9,color:T.text3,marginTop:8}}>Clicking redirects to PayPal approval page</div>
            </div>
          </WfSection>

          <WfSection num="04" label="Paystack Option (shown when Paystack selected)">
            <div style={{border:`1px dashed ${T.border0}`,borderRadius:T.r.lg,padding:18,textAlign:"center",background:T.bg2,margin:"8px 0"}}>
              <div style={{fontSize:10,color:T.text3,marginBottom:10}}>Supports Card, Bank Transfer, USSD</div>
              <div style={{background:"#00C3F7",color:"#fff",borderRadius:T.r.md,padding:"10px 28px",display:"inline-block",fontSize:12,fontWeight:600,cursor:"pointer"}}>Pay ₦36,000 with Paystack</div>
              <div style={{fontSize:9,color:T.text3,marginTop:8}}>Redirects to Paystack hosted payment page</div>
            </div>
          </WfSection>

          <WfSection num="05" label="Processing Overlay State (after payment initiated)">
            <div style={{border:`1px solid ${T.blueBorder}`,borderRadius:T.r.lg,padding:18,textAlign:"center",background:T.blueLight,margin:"8px 0"}}>
              <div style={{fontSize:13,fontWeight:600,color:T.blueText,marginBottom:5}}>Processing your payment…</div>
              <div style={{fontSize:10,color:T.blueText,opacity:0.8,marginBottom:12}}>Please do not close this page</div>
              <div style={{display:"flex",justifyContent:"center",gap:5}}>
                {[0.45,0.7,1].map((op,i)=>(
                  <div key={i} style={{width:8,height:8,borderRadius:"50%",background:T.blueText,opacity:op}}/>
                ))}
              </div>
            </div>
            <WfAnnot>Payment button disabled during processing · Webhook handles success/failure asynchronously</WfAnnot>
          </WfSection>
        </div>

        {/* RIGHT: Readonly summary */}
        <div style={{padding:16,background:T.bg1}}>
          <WfSection num="06" label="Order Summary (read-only)">
            <div style={{background:T.bg2,border:`1px solid ${T.border1}`,borderRadius:T.r.lg,padding:14,marginBottom:12}}>
              <div style={{fontSize:10,fontWeight:600,color:T.text0,marginBottom:10}}>Order Summary</div>
              {[["Classic Tailored Blazer","₦18,500"],["Slim Fit Chinos","₦24,000"]].map(([n,p])=>(
                <div key={n} style={{display:"flex",justifyContent:"space-between",fontSize:10,marginBottom:5}}>
                  <span style={{color:T.text1}}>{n}</span><span style={{color:T.text0,fontWeight:500}}>{p}</span>
                </div>
              ))}
              <div style={{height:1,background:T.border2,margin:"7px 0"}}/>
              {[["Subtotal","₦42,500",false],["Shipping","Free",true],["Coupon","−₦6,500",true]].map(([l,v,green])=>(
                <div key={l} style={{display:"flex",justifyContent:"space-between",fontSize:10,marginBottom:5,color:green?T.green:T.text1}}>
                  <span>{l}</span><span>{v}</span>
                </div>
              ))}
              <div style={{height:1,background:T.border2,margin:"7px 0"}}/>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:14,fontWeight:700,color:T.text0}}>
                <span>Total</span><span>₦36,000</span>
              </div>
            </div>
            <div style={{fontSize:10,color:T.text1,marginBottom:5,fontWeight:600}}>Delivering to:</div>
            <div style={{fontSize:10,color:T.text2,lineHeight:1.6,marginBottom:14}}>12 Marina Street, Lagos Island, Lagos State</div>
            <div style={{height:1,background:T.border2,marginBottom:12}}/>
            {["🔒 SSL Encrypted","🔒 PCI DSS Compliant","🔒 Secure Payment Gateway"].map(t=>(
              <div key={t} style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}>
                <span style={{fontSize:10,color:T.green}}>{t.split(" ")[0]}</span>
                <span style={{fontSize:10,color:T.text2}}>{t.split(" ").slice(1).join(" ")}</span>
              </div>
            ))}
            <div style={{height:1,background:T.border2,margin:"12px 0"}}/>
            <WfBtn style={{width:"100%",justifyContent:"center",fontSize:10}}>← Back to Checkout</WfBtn>
          </WfSection>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// WIREFRAME: ORDER CONFIRMATION
// ══════════════════════════════════════════════════════════════════════════════
function WireframeOrderConfirmation(){
  return(
    <div style={{fontFamily:T.font,background:T.bg1,color:T.text0}}>
      <div style={{display:"flex",alignItems:"center",padding:"10px 24px",background:T.bg0,borderBottom:`1px solid ${T.border1}`}}>
        <div style={{fontSize:15,fontWeight:700,color:T.text0}}>WillOfGod</div>
      </div>
      <div style={{maxWidth:600,margin:"0 auto",padding:"36px 24px"}}>

        <WfSection num="01" label="Success Header">
          <div style={{textAlign:"center",padding:"24px 0 20px"}}>
            <div style={{width:72,height:72,borderRadius:"50%",background:T.greenLight,
              border:`1px solid #86EFAC`,display:"flex",alignItems:"center",
              justifyContent:"center",margin:"0 auto 16px",fontSize:32,color:T.green}}>✓</div>
            <div style={{fontSize:24,fontWeight:700,color:T.text0,marginBottom:7}}>Order Confirmed!</div>
            <div style={{fontSize:12,color:T.text1,lineHeight:1.7,maxWidth:380,margin:"0 auto"}}>
              Thank you, John. Your payment was successful and your order is being processed.
            </div>
          </div>
        </WfSection>

        <WfSection num="02" label="Order Reference + Tracking Number">
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,padding:"16px 0"}}>
            {[["Order Reference","ORD-20260317-A3F8K2QZ"],["Tracking Number","TRK-20260317-K7P2M9QR"]].map(([label,val])=>(
              <div key={label} style={{background:T.bg2,border:`1px solid ${T.border1}`,borderRadius:T.r.lg,padding:14}}>
                <div style={{fontSize:9,color:T.text3,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:6,fontWeight:600}}>{label}</div>
                <div style={{fontSize:11,fontWeight:600,color:T.text0,fontFamily:T.mono,wordBreak:"break-all"}}>{val}</div>
              </div>
            ))}
          </div>
          <WfAnnot>Both values should have clipboard copy icon buttons — buyers frequently need these for support queries</WfAnnot>
        </WfSection>

        <WfSection num="03" label="Order Items Summary">
          <div style={{background:T.bg0,border:`1px solid ${T.border1}`,borderRadius:T.r.lg,padding:14,margin:"12px 0"}}>
            {[{name:"Classic Tailored Blazer",variant:"Blue / M",qty:1,price:"₦18,500"},{name:"Slim Fit Chinos",variant:"Beige / 32",qty:2,price:"₦24,000"}].map((item,i)=>(
              <div key={i} style={{display:"flex",gap:10,padding:"9px 0",borderBottom:`1px solid ${T.border2}`}}>
                <WfImg height={44} style={{width:44,flexShrink:0,borderRadius:T.r.md}}/>
                <div style={{flex:1}}>
                  <div style={{fontSize:11,fontWeight:600,color:T.text0}}>{item.name}</div>
                  <div style={{fontSize:9,color:T.text3}}>{item.variant} · Qty: {item.qty}</div>
                </div>
                <div style={{fontSize:11,fontWeight:600,color:T.text0}}>{item.price}</div>
              </div>
            ))}
            {[["Subtotal","₦42,500",false],["Discount (SAVE20)","−₦6,500",true],["Shipping","Free",true]].map(([l,v,green])=>(
              <div key={l} style={{display:"flex",justifyContent:"space-between",fontSize:11,marginTop:8,color:green?T.green:T.text1}}>
                <span>{l}</span><span>{v}</span>
              </div>
            ))}
            <div style={{height:1,background:T.border2,margin:"8px 0"}}/>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:15,fontWeight:700,color:T.text0}}>
              <span>Total Paid</span><span>₦36,000</span>
            </div>
          </div>
        </WfSection>

        <WfSection num="04" label="Delivery / Pickup Info">
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,padding:"12px 0"}}>
            <div style={{background:T.bg0,border:`1px solid ${T.border1}`,borderRadius:T.r.lg,padding:14}}>
              <div style={{fontSize:9,color:T.text3,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:7,fontWeight:600}}>Delivering to</div>
              <div style={{fontSize:11,color:T.text0,lineHeight:1.65}}>12 Marina Street<br/>Lagos Island, Lagos State</div>
            </div>
            <div style={{background:T.bg0,border:`1px solid ${T.border1}`,borderRadius:T.r.lg,padding:14}}>
              <div style={{fontSize:9,color:T.text3,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:7,fontWeight:600}}>Estimated Delivery</div>
              <div style={{fontSize:12,fontWeight:600,color:T.text0}}>March 20, 2026</div>
              <div style={{fontSize:9,color:T.text3,marginTop:3}}>Set by admin · Updates when status changes</div>
            </div>
          </div>
        </WfSection>

        <WfSection num="05" label="Action Buttons">
          <div style={{padding:"14px 0"}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
              <WfBtn primary style={{justifyContent:"center",padding:"10px 0",fontSize:12}}>Download Invoice</WfBtn>
              <WfBtn style={{justifyContent:"center",padding:"10px 0",fontSize:12}}>View My Orders</WfBtn>
            </div>
            <WfBtn style={{width:"100%",justifyContent:"center",padding:"10px 0",fontSize:12}}>Continue Shopping</WfBtn>
            <WfAnnot>Receipt email + confirmation email with PDF invoice attachment sent automatically · SSE notification pushed to buyer</WfAnnot>
          </div>
        </WfSection>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// WIREFRAME: MY ORDERS
// ══════════════════════════════════════════════════════════════════════════════
function WireframeMyOrders(){
  const orders=[
    {ref:"ORD-20260317-A3F8K2QZ",date:"17 Mar 2026",items:2,total:"₦36,000",status:"Confirmed",type:"Delivery",bg:"#E1F5EE",col:"#085041"},
    {ref:"ORD-20260310-B9K2M7QP",date:"10 Mar 2026",items:1,total:"₦22,000",status:"Shipped",type:"Delivery",bg:"#E6F1FB",col:"#0C447C"},
    {ref:"ORD-20260301-C4X8N3WL",date:"01 Mar 2026",items:3,total:"₦58,500",status:"Delivered",type:"Pickup",bg:"#EAF3DE",col:"#27500A"},
    {ref:"ORD-20260220-D7T1P6YM",date:"20 Feb 2026",items:1,total:"₦12,000",status:"Cancelled",type:"Delivery",bg:"#FCEBEB",col:"#791F1F"},
  ];
  const sidebarLinks=["My Orders","Profile","Addresses","Wishlists","Reviews","Saved Searches","Notifications","Notification Prefs"];
  return(
    <div style={{fontFamily:T.font,background:T.bg1,color:T.text0}}>
      <WfNav/>
      <div style={{display:"grid",gridTemplateColumns:"200px 1fr"}}>
        {/* Sidebar */}
        <div style={{borderRight:`1px solid ${T.border1}`,padding:16,background:T.bg0}}>
          <div style={{fontSize:9,letterSpacing:"0.12em",textTransform:"uppercase",color:T.text3,
            background:T.bg2,padding:"4px 0",marginBottom:14,fontWeight:600,fontFamily:T.mono}}>
            01 — Account Sidebar
          </div>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:18}}>
            <div style={{width:38,height:38,borderRadius:"50%",background:T.blueLight,
              display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:T.blueText}}>JA</div>
            <div>
              <div style={{fontSize:11,fontWeight:600,color:T.text0}}>John Adebayo</div>
              <div style={{fontSize:9,color:T.text3}}>Buyer · Lagos, NG</div>
            </div>
          </div>
          {sidebarLinks.map((item,i)=>(
            <div key={item} style={{padding:"8px 10px",borderRadius:T.r.md,marginBottom:3,
              background:i===0?T.blueLight:"transparent",cursor:"pointer"}}>
              <span style={{fontSize:10,color:i===0?T.blueText:T.text2,fontWeight:i===0?600:400}}>{item}</span>
            </div>
          ))}
        </div>

        {/* Main content */}
        <div style={{padding:16,background:T.bg1}}>
          <div style={{fontSize:9,letterSpacing:"0.12em",textTransform:"uppercase",color:T.text3,
            background:T.bg2,padding:"4px 0",marginBottom:12,fontWeight:600,fontFamily:T.mono}}>
            02 — Status Filter Tabs
          </div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:14}}>
            {[["All","12",true],["Pending","2",false],["Confirmed","1",false],["Packed","1",false],["Shipped","3",false],["Delivered","4",false],["Cancelled","1",false]].map(([t,c,active])=>(
              <button key={t} style={{display:"flex",alignItems:"center",gap:5,padding:"5px 10px",
                border:`1px solid ${active?T.blueBorder:T.border0}`,
                background:active?T.blueLight:"transparent",borderRadius:T.r.md,cursor:"pointer"}}>
                <span style={{fontSize:10,color:active?T.blueText:T.text1}}>{t}</span>
                <span style={{fontSize:9,background:active?T.bg0:T.bg2,color:active?T.blueText:T.text3,borderRadius:T.r.full,padding:"0 5px"}}>{c}</span>
              </button>
            ))}
          </div>

          <div style={{fontSize:9,letterSpacing:"0.12em",textTransform:"uppercase",color:T.text3,
            background:T.bg2,padding:"4px 0",marginBottom:12,fontWeight:600,fontFamily:T.mono}}>
            03 — Orders List
          </div>
          {orders.map((order,i)=>(
            <div key={i} style={{border:`1px solid ${T.border1}`,borderRadius:T.r.lg,padding:14,marginBottom:9,background:T.bg0}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                <div>
                  <div style={{fontSize:11,fontWeight:600,color:T.text0,fontFamily:T.mono}}>{order.ref}</div>
                  <div style={{fontSize:9,color:T.text3,marginTop:3}}>{order.date} · {order.items} item{order.items>1?"s":""} · {order.type}</div>
                </div>
                <div style={{background:order.bg,color:order.col,borderRadius:T.r.sm,padding:"2px 8px",fontSize:9,fontWeight:600}}>{order.status}</div>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div style={{fontSize:14,fontWeight:700,color:T.text0}}>{order.total}</div>
                <div style={{display:"flex",gap:7}}>
                  {order.status==="Delivered"&&(
                    <button style={{fontSize:9,color:T.blueText,background:"transparent",border:`1px solid ${T.blueBorder}`,borderRadius:T.r.sm,padding:"3px 9px",cursor:"pointer"}}>Write Review</button>
                  )}
                  <WfBtn primary style={{fontSize:9,padding:"4px 12px"}}>View Order →</WfBtn>
                </div>
              </div>
            </div>
          ))}
          <WfAnnot>Status badge colours: Pending=amber · Confirmed=green · Packed=purple · Shipped=blue · Delivered=dark green · Cancelled=red · SSE updates badge in real time without page refresh</WfAnnot>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// WIREFRAME: ORDER DETAIL (BUYER)
// ══════════════════════════════════════════════════════════════════════════════
function WireframeOrderDetail(){
  const timelineSteps=[
    {label:"Order Placed",date:"17 Mar 2026, 10:32",done:true,active:false},
    {label:"Payment Confirmed",date:"17 Mar 2026, 10:33",done:true,active:false},
    {label:"Order Packed",date:"17 Mar 2026, 14:20",done:true,active:false},
    {label:"Out for Delivery",date:"Estimated: 18 Mar 2026",done:false,active:true},
    {label:"Delivered",date:"—",done:false,active:false},
  ];
  return(
    <div style={{fontFamily:T.font,background:T.bg1,color:T.text0}}>
      {/* Nav */}
      <div style={{display:"flex",alignItems:"center",padding:"10px 24px",background:T.bg0,borderBottom:`1px solid ${T.border1}`}}>
        <div style={{fontSize:15,fontWeight:700,color:T.text0}}>WillOfGod</div>
        <div style={{flex:1}}/>
        <span style={{fontSize:10,color:T.blueText,cursor:"pointer",textDecoration:"underline"}}>← Back to My Orders</span>
      </div>

      {/* Page header */}
      <WfSection num="01" label="Page Header — Order Reference, Status, Download Invoice">
        <div style={{padding:"12px 24px",display:"flex",justifyContent:"space-between",alignItems:"center",background:T.bg0}}>
          <div>
            <div style={{fontSize:10,color:T.text3,marginBottom:4}}>Home › My Orders › Order Detail</div>
            <div style={{fontSize:17,fontWeight:700,color:T.text0,fontFamily:T.mono}}>ORD-20260317-A3F8K2QZ</div>
            <div style={{fontSize:10,color:T.text3,marginTop:3}}>Placed on 17 March 2026 · Delivery Order</div>
          </div>
          <div style={{display:"flex",gap:9,alignItems:"center"}}>
            <div style={{background:"#E1F5EE",color:"#085041",borderRadius:T.r.sm,padding:"3px 10px",fontSize:10,fontWeight:600}}>Confirmed</div>
            <WfBtn primary style={{fontSize:10,padding:"6px 14px"}}>Download Invoice</WfBtn>
          </div>
        </div>
      </WfSection>

      <div style={{display:"grid",gridTemplateColumns:"1fr 280px"}}>
        {/* LEFT */}
        <div style={{padding:"16px 24px",borderRight:`1px solid ${T.border1}`,background:T.bg0}}>

          <WfSection num="02" label="Order Status Timeline (live SSE updates)">
            <div style={{padding:"14px 0"}}>
              {timelineSteps.map((step,i)=>(
                <div key={i} style={{display:"flex",gap:14,marginBottom:0}}>
                  <div style={{display:"flex",flexDirection:"column",alignItems:"center",width:26}}>
                    <div style={{width:22,height:22,borderRadius:"50%",flexShrink:0,
                      background:step.done?T.greenLight:step.active?T.blueLight:T.bg3,
                      border:`1px solid ${step.done?"#86EFAC":step.active?T.blueBorder:T.border0}`,
                      display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,
                      color:step.done?T.green:step.active?T.blueText:T.text3}}>
                      {step.done?"✓":step.active?"●":"○"}
                    </div>
                    {i<timelineSteps.length-1&&(
                      <div style={{width:2,height:30,background:step.done?"#86EFAC":T.border2,margin:"3px 0"}}/>
                    )}
                  </div>
                  <div style={{flex:1,paddingBottom:i<timelineSteps.length-1?8:0}}>
                    <div style={{fontSize:11,fontWeight:step.active?600:400,
                      color:step.done?T.text0:step.active?T.blueText:T.text3}}>{step.label}</div>
                    <div style={{fontSize:9,color:step.active?T.blueText:T.text3,marginTop:2}}>{step.date}</div>
                  </div>
                </div>
              ))}
              <WfAnnot>Live SSE updates this timeline when admin changes status · Estimated delivery date shown when admin sets it</WfAnnot>
            </div>
          </WfSection>

          <WfSection num="03" label="Tracking">
            <div style={{background:T.bg2,border:`1px solid ${T.border1}`,borderRadius:T.r.lg,padding:14,margin:"12px 0"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                <div style={{fontSize:10,fontWeight:600,color:T.text0}}>Tracking Number</div>
                <div style={{fontSize:10,fontFamily:T.mono,color:T.text0}}>TRK-20260317-K7P2M9QR</div>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div style={{fontSize:9,color:T.text3}}>External courier tracking</div>
                <div style={{fontSize:9,color:T.text3,fontStyle:"italic"}}>No external link set yet</div>
              </div>
              <WfAnnot>When admin adds tracking_url, a clickable '🔗 Track Package' link replaces 'No external link set yet'</WfAnnot>
            </div>
          </WfSection>

          <WfSection num="04" label="Order Items">
            <div style={{paddingTop:8}}>
              {[{name:"Classic Tailored Blazer",variant:"Blue / Size M",qty:1,unit:"₦18,500",total:"₦18,500"},{name:"Slim Fit Chinos",variant:"Beige / 32",qty:2,unit:"₦12,000",total:"₦24,000"}].map((item,i)=>(
                <div key={i} style={{display:"flex",gap:12,padding:"11px 0",borderBottom:`1px solid ${T.border2}`}}>
                  <WfImg height={52} style={{width:52,flexShrink:0,borderRadius:T.r.md}}/>
                  <div style={{flex:1}}>
                    <div style={{fontSize:11,fontWeight:600,color:T.text0,marginBottom:3}}>{item.name}</div>
                    <div style={{fontSize:9,color:T.text3,marginBottom:2}}>{item.variant} · Qty: {item.qty}</div>
                    <div style={{fontSize:9,color:T.text3}}>Unit price: {item.unit}</div>
                  </div>
                  <div style={{fontSize:12,fontWeight:600,color:T.text0}}>{item.total}</div>
                </div>
              ))}
            </div>
          </WfSection>
        </div>

        {/* RIGHT */}
        <div style={{padding:16,background:T.bg1}}>
          <WfSection num="05" label="Payment Summary">
            <div style={{background:T.bg2,border:`1px solid ${T.border1}`,borderRadius:T.r.lg,padding:14,marginBottom:12}}>
              {[["Subtotal","₦42,500",false],["Coupon (SAVE20)","−₦6,500",true],["Shipping","Free",true]].map(([l,v,green])=>(
                <div key={l} style={{display:"flex",justifyContent:"space-between",fontSize:10,marginBottom:6,color:green?T.green:T.text1}}>
                  <span>{l}</span><span>{v}</span>
                </div>
              ))}
              <div style={{height:1,background:T.border2,margin:"7px 0"}}/>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:14,fontWeight:700,color:T.text0,marginBottom:7}}>
                <span>Total Paid</span><span>₦36,000</span>
              </div>
              <div style={{height:1,background:T.border2,margin:"7px 0"}}/>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:10,marginBottom:4}}>
                <span style={{color:T.text1}}>Provider</span><span style={{color:T.text0}}>Stripe</span>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:9}}>
                <span style={{color:T.text3}}>Transaction ID</span>
                <span style={{fontFamily:T.mono,color:T.text3}}>pi_3P...xQZ2</span>
              </div>
            </div>
          </WfSection>

          <WfSection num="06" label="Delivery Address">
            <div style={{background:T.bg0,border:`1px solid ${T.border1}`,borderRadius:T.r.lg,padding:14,marginBottom:12,fontSize:10,color:T.text1,lineHeight:1.7}}>
              <div style={{fontWeight:600,color:T.text0,marginBottom:3}}>John Adebayo</div>
              12 Marina Street<br/>Lagos Island, Lagos State<br/>Nigeria
            </div>
          </WfSection>

          <WfSection num="07" label="Write Review (shown only when order status = DELIVERED)">
            <div style={{background:T.bg2,border:`1px solid ${T.border1}`,borderRadius:T.r.lg,padding:12,marginBottom:12}}>
              <div style={{fontSize:10,color:T.text1,marginBottom:10}}>Rate your purchase:</div>
              {["Classic Tailored Blazer","Slim Fit Chinos"].map(n=>(
                <div key={n} style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                  <span style={{fontSize:10,color:T.text1}}>{n}</span>
                  <button style={{fontSize:9,color:T.blueText,background:"transparent",border:`1px solid ${T.blueBorder}`,borderRadius:T.r.sm,padding:"2px 9px",cursor:"pointer"}}>Review</button>
                </div>
              ))}
              <WfAnnot>Only shown when order status is DELIVERED · Absent from DOM entirely for other statuses</WfAnnot>
            </div>
            <WfBtn style={{width:"100%",justifyContent:"center",fontSize:10}}>← Back to Orders</WfBtn>
          </WfSection>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// WIREFRAMES REGISTRY
// ══════════════════════════════════════════════════════════════════════════════
const WIREFRAMES = {
  homepage:      {component:WireframeHomepage,          batch:"Batch 1 — Public Pages",       url:"/"},
  prod_list:     {component:WireframeProductListing,    batch:"Batch 1 — Public Pages",       url:"/products"},
  prod_detail:   {component:WireframeProductDetail,     batch:"Batch 1 — Public Pages",       url:"/products/:slug"},
  cat_pg:        {component:WireframeCategoryPage,      batch:"Batch 1 — Public Pages",       url:"/categories/:slug"},
  search_pg:     {component:WireframeSearchResults,     batch:"Batch 2 — Discovery Pages",    url:"/search?q="},
  flash_pg:      {component:WireframeFlashSales,        batch:"Batch 2 — Discovery Pages",    url:"/flash-sales"},
  arrivals_pg:   {component:WireframeNewArrivals,       batch:"Batch 2 — Discovery Pages",    url:"/new-arrivals"},
  sale_pg:       {component:WireframeSalePage,          batch:"Batch 2 — Discovery Pages",    url:"/sale"},
  compare_pg:    {component:WireframeComparison,        batch:"Batch 2 — Discovery Pages",    url:"/compare"},
  login_pg:      {component:WireframeLogin,             batch:"Batch 3 — Auth Pages",         url:"/login"},
  signup_pg:     {component:WireframeSignUp,            batch:"Batch 3 — Auth Pages",         url:"/register"},
  verify_pg:     {component:WireframeEmailVerification, batch:"Batch 3 — Auth Pages",         url:"/verify-email"},
  forgot_pg:     {component:WireframeForgotPassword,    batch:"Batch 3 — Auth Pages",         url:"/forgot-password"},
  reset_pg:      {component:WireframeResetPassword,     batch:"Batch 3 — Auth Pages",         url:"/reset-password"},
  maint_pg:      {component:WireframeMaintenance,       batch:"Batch 3 — Auth Pages",         url:"/maintenance"},
  cart_pg:       {component:WireframeCart,              batch:"Batch 4 — Buyer Flow",         url:"/cart"},
  checkout_pg:   {component:WireframeCheckout,          batch:"Batch 4 — Buyer Flow",         url:"/checkout"},
  payment_pg:    {component:WireframePayment,           batch:"Batch 4 — Buyer Flow",         url:"/payment"},
  order_conf:    {component:WireframeOrderConfirmation, batch:"Batch 4 — Buyer Flow",         url:"/order-confirmation"},
  my_orders:     {component:WireframeMyOrders,          batch:"Batch 4 — Buyer Flow",         url:"/account/orders"},
  order_detail_b:{component:WireframeOrderDetail,       batch:"Batch 4 — Buyer Flow",         url:"/account/orders/:id"},
};

// ══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════════
export default function UserFlowMap() {
  const svgRef     = useRef(null);
  const stRef      = useRef({scale:0.32, pan:{x:60,y:30}});
  const clickRef   = useRef(null);

  const [scale,       setScale]     = useState(0.32);
  const [pan,         setPan]       = useState({x:60, y:30});
  const [sel,         setSel]       = useState(null);
  const [hov,         setHov]       = useState(null);
  const [drag,        setDrag]      = useState(false);
  const [ds,          setDs]        = useState(null);
  const [filterLane,  setFL]        = useState(null);
  const [tab,         setTab]       = useState("overview");
  const [wireframe,   setWireframe] = useState(null);
  const [expandSec,   setExpandSec] = useState(null);

  useEffect(()=>{ stRef.current={scale,pan}; },[scale,pan]);

  // Wheel zoom
  useEffect(()=>{
    const el=svgRef.current; if(!el) return;
    const h=e=>{
      e.preventDefault();
      const {scale:s,pan:p}=stRef.current;
      const r=el.getBoundingClientRect();
      const mx=e.clientX-r.left, my=e.clientY-r.top;
      const f=e.deltaY<0?1.1:0.91;
      const ns=Math.min(5, Math.max(0.07, s*f));
      setPan({x:mx-(mx-p.x)*(ns/s), y:my-(my-p.y)*(ns/s)});
      setScale(ns);
    };
    el.addEventListener("wheel",h,{passive:false});
    return ()=>el.removeEventListener("wheel",h);
  },[]);

  // Escape closes wireframe modal
  useEffect(()=>{
    const h=e=>{ if(e.key==="Escape") setWireframe(null); };
    window.addEventListener("keydown",h);
    return ()=>window.removeEventListener("keydown",h);
  },[]);

  const onMD=e=>{ e.preventDefault(); setDrag(true); setDs({x:e.clientX-pan.x, y:e.clientY-pan.y}); };
  const onMM=e=>{ if(drag&&ds) setPan({x:e.clientX-ds.x, y:e.clientY-ds.y}); };
  const onMU=()=>{ setDrag(false); setDs(null); };

  // Single vs double-click detection
  const handleNodeClick = useCallback((e, nodeId)=>{
    e.stopPropagation();
    if(clickRef.current){
      clearTimeout(clickRef.current);
      clickRef.current=null;
      if(WIREFRAMES[nodeId]) setWireframe(nodeId);
    } else {
      clickRef.current=setTimeout(()=>{
        clickRef.current=null;
        setSel(prev=>{
          const next = prev===nodeId ? null : nodeId;
          if(next){ setTab("overview"); setExpandSec(null); }
          return next;
        });
        setHov(null);
      }, 240);
    }
  },[]);

  const focus      = sel || hov;
  const focusEdges = focus ? EDGES.filter(e=>e.f===focus||e.t===focus) : [];
  const activeIds  = focus ? new Set([focus,...focusEdges.map(e=>e.f===focus?e.t:e.f)]) : null;

  const selNode  = sel ? NMAP[sel] : null;
  const incoming = sel ? EDGES.filter(e=>e.t===sel) : [];
  const outgoing = sel ? EDGES.filter(e=>e.f===sel) : [];
  const pageData = sel ? PAGE_DATA[sel] : null;

  // Build tab list based on whether detailed page data exists
  const tabs = pageData
    ? ["overview","sections","from","to"]
    : ["desc","from","to"];

  const tabLabel = t=>{
    if(t==="overview") return "Overview";
    if(t==="sections") return `Sections (${pageData?.sections?.length||0})`;
    if(t==="desc")     return "Details";
    if(t==="from")     return `From (${incoming.length})`;
    if(t==="to")       return `To (${outgoing.length})`;
    return t;
  };

  // Wireframe modal data
  const wireframeEntry = wireframe ? WIREFRAMES[wireframe]    : null;
  const wireframeNode  = wireframe ? NMAP[wireframe]          : null;
  const wfIncoming     = wireframe ? EDGES.filter(e=>e.t===wireframe) : [];
  const wfOutgoing     = wireframe ? EDGES.filter(e=>e.f===wireframe) : [];

  const CANVAS_H = 1550;

  return (
    <div style={{
      width:"100vw", height:"100vh", background:"#030710", overflow:"hidden",
      position:"relative", fontFamily:"'JetBrains Mono','Fira Code',monospace"
    }}>

      {/* ═══════════════════════════════════════════════════════ HEADER */}
      <div style={{
        position:"absolute",top:0,left:0,right:0,zIndex:30,
        display:"flex",alignItems:"center",gap:14,padding:"9px 16px",
        background:"linear-gradient(180deg,#030710 60%,transparent)"
      }}>
        <div>
          <div style={{fontSize:9,letterSpacing:4,color:"#1E40AF",textTransform:"uppercase",marginBottom:2}}>
            WillOfGod E-Commerce
          </div>
          <div style={{fontSize:17,fontWeight:700,color:"#E2E8F0",letterSpacing:-0.5}}>
            User Flow Diagram
          </div>
        </div>
        <div style={{color:"#1E293B",fontSize:10,borderLeft:"1px solid #0F172A",paddingLeft:14}}>
          {NODES.length} steps · {EDGES.length} transitions · 6 swimlanes
        </div>
        <div style={{display:"flex",gap:5,marginLeft:14,flexWrap:"wrap"}}>
          {LANES.map(l=>(
            <button key={l.id} onClick={()=>setFL(filterLane===l.id?null:l.id)} style={{
              background:filterLane===l.id?l.color+"33":"transparent",
              border:`1px solid ${filterLane===l.id?l.color:l.color+"44"}`,
              color:filterLane===l.id?l.color:l.color+"88",
              padding:"2px 9px",borderRadius:4,cursor:"pointer",
              fontSize:8,letterSpacing:1,fontFamily:"inherit",
            }}>{l.label}</button>
          ))}
        </div>
        <div style={{marginLeft:"auto",display:"flex",gap:6}}>
          {sel&&(
            <button onClick={()=>setSel(null)} style={{
              background:"transparent",border:"1px solid #1E293B",color:"#475569",
              padding:"3px 10px",borderRadius:4,cursor:"pointer",fontSize:10,fontFamily:"inherit",
            }}>deselect</button>
          )}
          <button onClick={()=>{setScale(0.32);setPan({x:60,y:30});setSel(null);setFL(null);}} style={{
            background:"#0F172A",border:"1px solid #1E293B",color:"#475569",
            padding:"3px 12px",borderRadius:4,cursor:"pointer",fontSize:10,fontFamily:"inherit",
          }}>RESET</button>
          <div style={{background:"#0F172A",border:"1px solid #1E293B",color:"#334155",
            padding:"3px 12px",borderRadius:4,fontSize:10,minWidth:46,textAlign:"center"}}>
            {Math.round(scale*100)}%
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════ LEGEND */}
      <div style={{
        position:"absolute",top:58,left:10,zIndex:30,
        background:"#070C18",border:"1px solid #0D1520",borderRadius:8,
        padding:"10px 12px",minWidth:148
      }}>
        <div style={{fontSize:8,color:"#1E293B",letterSpacing:3,marginBottom:8,textTransform:"uppercase"}}>
          Node Types
        </div>
        {[
          {shape:"page",    label:"Page",         fill:"#0C1424", stroke:"#3B82F6"},
          {shape:"decision",label:"Decision",     fill:"#0C1424", stroke:"#EF4444"},
          {shape:"action",  label:"Action/Event", fill:"#0A1020", stroke:"#64748B"},
          {shape:"start",   label:"Start/End",    fill:"#1E293B", stroke:"#94A3B8"},
        ].map(({shape,label,fill,stroke})=>(
          <div key={shape} style={{display:"flex",alignItems:"center",gap:8,marginBottom:5}}>
            {shape==="decision"
              ? <svg width={16} height={12}><polygon points="8,0 16,6 8,12 0,6" fill={fill} stroke={stroke} strokeWidth={1}/></svg>
              : <svg width={18} height={10}><rect x={0} y={0} width={18} height={10} rx={shape==="start"?5:2} fill={fill} stroke={stroke} strokeWidth={1}/></svg>
            }
            <span style={{fontSize:9,color:"#334155"}}>{label}</span>
          </div>
        ))}
        <div style={{marginTop:8,paddingTop:8,borderTop:"1px solid #0D1520"}}>
          <div style={{fontSize:8,color:"#1E293B",letterSpacing:3,marginBottom:5,textTransform:"uppercase"}}>Flow</div>
          <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:3}}>
            <div style={{width:18,height:1.5,background:"#38BDF8"}}/><span style={{fontSize:8,color:"#334155"}}>Forward →</span>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:7}}>
            <div style={{width:18,height:1.5,background:"#F59E0B",borderTop:"1.5px dashed #F59E0B"}}/><span style={{fontSize:8,color:"#334155"}}>Incoming ←</span>
          </div>
          <div style={{fontSize:8,color:"#1E293B",letterSpacing:3,marginBottom:4,textTransform:"uppercase"}}>Interaction</div>
          <div style={{fontSize:8,color:"#334155",marginBottom:2}}>Single click → Detail panel</div>
          <div style={{fontSize:8,color:"#3B82F6"}}>Double click → Wireframe view</div>
          <div style={{fontSize:8,color:"#475569",marginTop:4}}><span style={{color:"#3B82F6"}}>W</span> badge = wireframe available</div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════ DETAIL PANEL */}
      {selNode&&(
        <div style={{
          position:"absolute",top:58,right:10,zIndex:30,
          width:370,maxHeight:"calc(100vh - 74px)",
          overflowY:"auto",scrollbarWidth:"none",
          background:"#070C18",borderRadius:8,
          border:`1px solid ${selNode.c}44`,
          borderLeft:`3px solid ${selNode.c}`,
          animation:"sli 0.18s ease-out",
        }}>

          {/* Panel Header */}
          <div style={{padding:"12px 14px 10px",borderBottom:"1px solid #0D1520"}}>
            <div style={{display:"flex",gap:6,marginBottom:8,flexWrap:"wrap",alignItems:"center"}}>
              <span style={{
                background:LANES.find(l=>l.id===selNode.lane)?.color+"22",
                color:LANES.find(l=>l.id===selNode.lane)?.color||"#64748B",
                fontSize:8,letterSpacing:2,padding:"2px 7px",borderRadius:3
              }}>
                {LANES.find(l=>l.id===selNode.lane)?.label||selNode.lane}
              </span>
              <span style={{background:"#0F172A",color:"#475569",fontSize:8,letterSpacing:1,padding:"2px 7px",borderRadius:3}}>
                {selNode.s.toUpperCase()}
              </span>
              {WIREFRAMES[selNode.id]&&(
                <button
                  onClick={()=>setWireframe(selNode.id)}
                  style={{background:"#3B82F622",color:"#3B82F6",fontSize:8,letterSpacing:1,
                    padding:"2px 7px",borderRadius:3,border:"1px solid #3B82F644",
                    cursor:"pointer",fontFamily:"inherit"}}
                >
                  ⊞ VIEW WIREFRAME
                </button>
              )}
            </div>
            <div style={{fontSize:14,fontWeight:700,color:"#E2E8F0",lineHeight:1.3,marginBottom:6}}>
              {selNode.label.replace(/\n/g," ")}
            </div>
            {pageData&&(
              <p style={{margin:0,fontSize:10,color:"#475569",lineHeight:1.65,fontStyle:"italic",
                paddingTop:6,borderTop:"1px solid #0A1020"}}>
                {pageData.purpose}
              </p>
            )}
          </div>

          {/* Tab Bar */}
          <div style={{display:"flex",borderBottom:"1px solid #0D1520",overflowX:"auto",scrollbarWidth:"none"}}>
            {tabs.map(t=>(
              <button key={t} onClick={()=>setTab(t)} style={{
                flexShrink:0,padding:"7px 9px",background:"transparent",border:"none",
                cursor:"pointer",fontFamily:"inherit",fontSize:8,letterSpacing:0.8,
                textTransform:"uppercase",whiteSpace:"nowrap",
                color:tab===t?selNode.c:"#1E293B",
                borderBottom:tab===t?`2px solid ${selNode.c}`:"2px solid transparent",
              }}>
                {tabLabel(t)}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div style={{padding:"12px 14px"}}>

            {/* ── OVERVIEW / DESC TAB ── */}
            {(tab==="overview"||tab==="desc")&&(
              <div>
                {pageData ? (
                  <>
                    <p style={{margin:"0 0 12px",fontSize:11,color:"#64748B",lineHeight:1.78}}>
                      {pageData.overview}
                    </p>

                    {/* Key UI States */}
                    <div style={{marginBottom:14}}>
                      <div style={{fontSize:9,color:"#F59E0B",letterSpacing:2,marginBottom:7,textTransform:"uppercase"}}>
                        Key UI States
                      </div>
                      {pageData.states.map((s,i)=>(
                        <div key={i} style={{display:"flex",gap:6,marginBottom:5,alignItems:"flex-start"}}>
                          <div style={{width:4,height:4,borderRadius:1,background:"#F59E0B",flexShrink:0,marginTop:5}}/>
                          <span style={{fontSize:10,color:"#94A3B8",lineHeight:1.55}}>{s}</span>
                        </div>
                      ))}
                    </div>

                    {/* Data Requirements */}
                    <div style={{marginBottom:14}}>
                      <div style={{fontSize:9,color:"#10B981",letterSpacing:2,marginBottom:7,textTransform:"uppercase"}}>
                        Data Requirements
                      </div>
                      {pageData.dataRequirements.map((d,i)=>(
                        <div key={i} style={{display:"flex",gap:6,marginBottom:4,alignItems:"flex-start",
                          background:"#060D18",borderRadius:4,padding:"4px 7px"}}>
                          <div style={{width:4,height:4,borderRadius:1,background:"#10B981",flexShrink:0,marginTop:5}}/>
                          <span style={{fontSize:9,color:"#334155",lineHeight:1.5,fontFamily:"'JetBrains Mono',monospace",wordBreak:"break-all"}}>{d}</span>
                        </div>
                      ))}
                    </div>

                    {/* Design Notes */}
                    {pageData.designNotes&&(
                      <div>
                        <div style={{fontSize:9,color:"#8B5CF6",letterSpacing:2,marginBottom:7,textTransform:"uppercase"}}>
                          Design Notes
                        </div>
                        {pageData.designNotes.map((n,i)=>(
                          <div key={i} style={{display:"flex",gap:6,marginBottom:5,alignItems:"flex-start"}}>
                            <div style={{width:4,height:4,borderRadius:1,background:"#8B5CF6",flexShrink:0,marginTop:5}}/>
                            <span style={{fontSize:10,color:"#64748B",lineHeight:1.55}}>{n}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {selNode.desc&&(
                      <p style={{margin:"0 0 10px",fontSize:11,color:"#64748B",lineHeight:1.75}}>
                        {selNode.desc}
                      </p>
                    )}
                    {selNode.outcomes&&(
                      <div style={{marginTop:8}}>
                        <div style={{fontSize:9,color:"#F59E0B",letterSpacing:2,marginBottom:6,textTransform:"uppercase"}}>Outcomes</div>
                        {selNode.outcomes.map((o,i)=>(
                          <div key={i} style={{display:"flex",gap:6,marginBottom:5,alignItems:"flex-start"}}>
                            <div style={{width:5,height:5,borderRadius:1,background:"#F59E0B",flexShrink:0,marginTop:3}}/>
                            <span style={{fontSize:10,color:"#94A3B8",lineHeight:1.5}}>{o}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* ── SECTIONS TAB ── */}
            {tab==="sections"&&pageData&&(
              <div>
                <div style={{fontSize:9,color:"#475569",letterSpacing:0.5,marginBottom:10,lineHeight:1.6}}>
                  Click any section to expand its full component inventory and description.
                </div>
                {pageData.sections.map((sec,idx)=>{
                  const isOpen=expandSec===idx;
                  return(
                    <div key={idx} style={{
                      marginBottom:5,borderRadius:5,overflow:"hidden",
                      border:`1px solid ${isOpen?selNode.c+"55":"#0D1520"}`,
                    }}>
                      <button
                        onClick={()=>setExpandSec(isOpen?null:idx)}
                        style={{
                          width:"100%",background:isOpen?"#0D1A30":"#07090F",
                          border:"none",padding:"9px 10px",cursor:"pointer",
                          display:"flex",alignItems:"center",gap:8,textAlign:"left",fontFamily:"inherit"
                        }}
                      >
                        <span style={{fontSize:9,color:selNode.c,fontWeight:700,flexShrink:0,
                          fontFamily:"'JetBrains Mono',monospace",minWidth:22}}>{sec.num}</span>
                        <span style={{fontSize:10,color:isOpen?"#E2E8F0":"#94A3B8",flex:1,fontWeight:isOpen?600:400}}>
                          {sec.name}
                        </span>
                        <span style={{fontSize:10,color:"#1E293B",
                          transform:isOpen?"rotate(180deg)":"none",transition:"transform 0.15s"}}>▾</span>
                      </button>
                      {isOpen&&(
                        <div style={{padding:"10px 12px 12px",background:"#040810",
                          borderTop:`1px solid ${selNode.c}33`}}>
                          <p style={{fontSize:10,color:"#475569",lineHeight:1.68,margin:"0 0 12px"}}>
                            {sec.description}
                          </p>
                          <div style={{fontSize:8,color:selNode.c,letterSpacing:2,marginBottom:8,
                            textTransform:"uppercase"}}>
                            Component Inventory
                          </div>
                          {sec.components.map((comp,ci)=>(
                            <div key={ci} style={{
                              display:"flex",gap:7,marginBottom:6,alignItems:"flex-start",
                              paddingLeft:8,borderLeft:`2px solid ${selNode.c}33`
                            }}>
                              <div style={{width:3,height:3,borderRadius:"50%",background:selNode.c,
                                flexShrink:0,marginTop:6,opacity:0.6}}/>
                              <span style={{fontSize:9,color:"#64748B",lineHeight:1.6}}>{comp}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── FROM TAB ── */}
            {tab==="from"&&(
              <div>
                <div style={{fontSize:9,color:"#F59E0B",letterSpacing:2,marginBottom:8,textTransform:"uppercase"}}>
                  Reached from
                </div>
                {incoming.length===0
                  ? <p style={{color:"#1E293B",fontSize:10,margin:0}}>Entry point — no incoming connections.</p>
                  : incoming.map((e,i)=>{
                      const n=NMAP[e.f]; if(!n) return null;
                      const lc=LANES.find(l=>l.id===n.lane)?.color||"#64748B";
                      return(
                        <button key={i} onClick={()=>setSel(e.f)} style={{
                          width:"100%",background:"#0A1120",
                          border:`1px solid ${lc}30`,borderLeft:`2px solid ${lc}`,
                          borderRadius:4,padding:"6px 8px",cursor:"pointer",
                          display:"flex",alignItems:"center",gap:7,marginBottom:3,textAlign:"left",
                        }}>
                          <span style={{fontSize:10,color:"#94A3B8",flex:1,fontFamily:"inherit",lineHeight:1.3}}>
                            {n.label.replace(/\n/g," ")}
                          </span>
                          {e.label&&<span style={{fontSize:8,color:"#1E293B",whiteSpace:"nowrap"}}>{e.label}</span>}
                        </button>
                      );
                    })
                }
              </div>
            )}

            {/* ── TO TAB ── */}
            {tab==="to"&&(
              <div>
                <div style={{fontSize:9,color:"#38BDF8",letterSpacing:2,marginBottom:8,textTransform:"uppercase"}}>
                  Leads to
                </div>
                {outgoing.length===0
                  ? <p style={{color:"#1E293B",fontSize:10,margin:0}}>Terminal node — no outgoing connections.</p>
                  : outgoing.map((e,i)=>{
                      const n=NMAP[e.t]; if(!n) return null;
                      const lc=LANES.find(l=>l.id===n.lane)?.color||"#64748B";
                      return(
                        <button key={i} onClick={()=>setSel(e.t)} style={{
                          width:"100%",background:"#0A1120",
                          border:`1px solid ${lc}30`,borderLeft:`2px solid ${lc}`,
                          borderRadius:4,padding:"6px 8px",cursor:"pointer",
                          display:"flex",alignItems:"center",gap:7,marginBottom:3,textAlign:"left",
                        }}>
                          <span style={{fontSize:10,color:"#94A3B8",flex:1,fontFamily:"inherit",lineHeight:1.3}}>
                            {n.label.replace(/\n/g," ")}
                          </span>
                          {e.label&&<span style={{fontSize:8,color:"#1E293B",whiteSpace:"nowrap"}}>{e.label}</span>}
                        </button>
                      );
                    })
                }
              </div>
            )}

          </div>

          {/* Close button */}
          <div style={{padding:"0 14px 12px"}}>
            <button onClick={()=>setSel(null)} style={{
              width:"100%",background:"transparent",border:"1px solid #0D1520",
              color:"#1E293B",padding:"6px",borderRadius:4,
              cursor:"pointer",fontSize:10,fontFamily:"inherit",
            }}>Close ✕</button>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════ WIREFRAME MODAL */}
      {wireframeEntry&&wireframeNode&&(
        <div style={{
          position:"fixed",inset:0,zIndex:100,
          background:"rgba(2,5,14,0.88)",
          display:"flex",alignItems:"stretch",justifyContent:"center",
          backdropFilter:"blur(4px)",
          animation:"sli 0.2s ease-out",
        }}>
          <div style={{
            width:"90vw",maxWidth:1000,
            display:"flex",flexDirection:"column",
            background:"#070C18",
            borderRadius:12,
            margin:"28px auto",
            border:`1px solid ${wireframeNode.c}55`,
            overflow:"hidden",
          }}>

            {/* Modal Header */}
            <div style={{
              padding:"14px 20px",
              borderBottom:"1px solid #0D1520",
              display:"flex",alignItems:"center",gap:12,
              background:"#060A14",flexShrink:0,
            }}>
              <div style={{flex:1}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                  <span style={{fontSize:9,color:LANES.find(l=>l.id===wireframeNode.lane)?.color||"#64748B",
                    letterSpacing:2,textTransform:"uppercase"}}>
                    {wireframeEntry.batch}
                  </span>
                  <span style={{fontSize:9,color:"#1E293B"}}>·</span>
                  <span style={{fontSize:9,color:"#334155",fontFamily:"'JetBrains Mono',monospace"}}>
                    {wireframeEntry.url}
                  </span>
                </div>
                <div style={{fontSize:16,fontWeight:700,color:"#E2E8F0"}}>
                  {wireframeNode.label.replace(/\n/g," ")} — Wireframe
                </div>
              </div>

              {/* Relationship summary */}
              <div style={{display:"flex",gap:10,alignItems:"flex-start"}}>
                {wfIncoming.length>0&&(
                  <div style={{fontSize:9,color:"#475569",lineHeight:1.7}}>
                    <div style={{color:"#F59E0B",letterSpacing:1,marginBottom:3,textTransform:"uppercase",fontSize:8}}>Reached from</div>
                    {wfIncoming.slice(0,4).map((e,i)=>{
                      const n=NMAP[e.f]; if(!n) return null;
                      const lc=LANES.find(l=>l.id===n.lane)?.color||"#64748B";
                      return(
                        <div key={i} style={{display:"flex",alignItems:"center",gap:5,marginBottom:3}}>
                          <div style={{width:6,height:6,borderRadius:1,background:lc,flexShrink:0}}/>
                          <span style={{fontSize:9,color:"#475569"}}>{n.label.replace(/\n/g," ")}</span>
                        </div>
                      );
                    })}
                    {wfIncoming.length>4&&<div style={{fontSize:8,color:"#1E293B"}}>+{wfIncoming.length-4} more</div>}
                  </div>
                )}
                {wfOutgoing.length>0&&(
                  <div style={{fontSize:9,color:"#475569",lineHeight:1.7}}>
                    <div style={{color:"#38BDF8",letterSpacing:1,marginBottom:3,textTransform:"uppercase",fontSize:8}}>Leads to</div>
                    {wfOutgoing.slice(0,4).map((e,i)=>{
                      const n=NMAP[e.t]; if(!n) return null;
                      const lc=LANES.find(l=>l.id===n.lane)?.color||"#64748B";
                      return(
                        <div key={i} style={{display:"flex",alignItems:"center",gap:5,marginBottom:3}}>
                          <div style={{width:6,height:6,borderRadius:1,background:lc,flexShrink:0}}/>
                          <span style={{fontSize:9,color:"#475569"}}>{n.label.replace(/\n/g," ")}</span>
                        </div>
                      );
                    })}
                    {wfOutgoing.length>4&&<div style={{fontSize:8,color:"#1E293B"}}>+{wfOutgoing.length-4} more</div>}
                  </div>
                )}
              </div>

              <button onClick={()=>setWireframe(null)} style={{
                background:"#0F172A",border:"1px solid #1E293B",color:"#475569",
                width:32,height:32,borderRadius:6,cursor:"pointer",
                fontSize:16,display:"flex",alignItems:"center",justifyContent:"center",
                flexShrink:0,fontFamily:"inherit",
              }}>✕</button>
            </div>

            {/* Wireframe Content */}
            <div style={{flex:1,overflowY:"auto",background:"#F9FAFB"}}>
              {(()=>{
                const WfComp=wireframeEntry.component;
                return <WfComp/>;
              })()}
            </div>

            {/* Modal Footer */}
            <div style={{
              padding:"10px 20px",borderTop:"1px solid #0D1520",
              display:"flex",justifyContent:"space-between",alignItems:"center",
              background:"#060A14",flexShrink:0,
            }}>
              <div style={{fontSize:9,color:"#1E293B"}}>
                Press <kbd style={{background:"#0F172A",border:"1px solid #1E293B",borderRadius:3,padding:"1px 5px",fontSize:9,color:"#334155"}}>Esc</kbd> to close
              </div>
              <button onClick={()=>setWireframe(null)} style={{
                background:"transparent",border:"1px solid #1E293B",color:"#334155",
                padding:"5px 16px",borderRadius:4,cursor:"pointer",fontSize:10,fontFamily:"inherit",
              }}>Close Wireframe</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════ HINT */}
      <div style={{
        position:"absolute",bottom:10,right:12,zIndex:20,
        fontSize:9,color:"#0F172A",letterSpacing:1,
        textAlign:"right",lineHeight:1.7,
      }}>
        scroll to zoom · drag to pan<br/>
        click step to inspect · double-click for wireframe
      </div>

      {/* ═══════════════════════════════════════════════════════ SVG CANVAS */}
      <svg ref={svgRef} width="100%" height="100%"
        onMouseDown={onMD} onMouseMove={onMM} onMouseUp={onMU} onMouseLeave={onMU}
        onClick={()=>{ setSel(null); setHov(null); }}
        style={{display:"block",cursor:drag?"grabbing":"grab",userSelect:"none"}}>

        <defs>
          <pattern id="fg" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
            <circle cx="20" cy="20" r="0.6" fill="#0D1826"/>
          </pattern>
          {LANES.map(l=>(
            <marker key={l.id} id={`a${l.id}`} markerWidth="7" markerHeight="7" refX="5.5" refY="3.5" orient="auto">
              <polygon points="0,0 7,3.5 0,7" fill={l.color} opacity="0.85"/>
            </marker>
          ))}
          <marker id="aSYS" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <polygon points="0,0 6,3 0,6" fill="#64748B" opacity="0.8"/>
          </marker>
          <marker id="aCAL" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <polygon points="0,0 6,3 0,6" fill="#38BDF8"/>
          </marker>
          <marker id="aCAR" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <polygon points="0,0 6,3 0,6" fill="#F59E0B"/>
          </marker>
          <marker id="aDIM" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto">
            <polygon points="0,0 5,2.5 0,5" fill="#111827"/>
          </marker>
        </defs>

        <rect width="100%" height="100%" fill="#030710"/>
        <rect width="100%" height="100%" fill="url(#fg)"/>

        <g transform={`translate(${pan.x},${pan.y}) scale(${scale})`}>

          {/* ── SWIMLANE BACKGROUNDS ── */}
          {LANES.map(l=>{
            if(filterLane&&filterLane!==l.id) return null;
            const isActive=activeIds?[...activeIds].some(id=>NMAP[id]?.lane===l.id):true;
            return(
              <g key={l.id} opacity={activeIds&&!isActive?0.12:1}>
                <rect x={l.lx} y={30} width={l.lw} height={CANVAS_H}
                  fill={l.color+"06"} stroke={l.color+"20"} strokeWidth={0.8} rx={12}/>
                <rect x={l.lx} y={30} width={l.lw} height={38} fill={l.color+"18"} rx={12}/>
                <text x={l.lx+l.lw/2} y={54} textAnchor="middle"
                  fill={l.color+"CC"} fontSize={11} fontWeight={700}
                  fontFamily="monospace" letterSpacing={2}>{l.label}</text>
              </g>
            );
          })}

          {/* ── BACKGROUND EDGES (faint, no focus) ── */}
          {!activeIds&&EDGES.map((e,i)=>{
            const fn=NMAP[e.f], tn=NMAP[e.t];
            if(!fn||!tn) return null;
            if(filterLane&&fn.lane!==filterLane&&tn.lane!==filterLane) return null;
            const sfn=SZ[fn.s], stn=SZ[tn.s];
            const fx=fn.x+sfn.w/2, fy=fn.y+sfn.h;
            const tx=tn.x+stn.w/2, ty=tn.y;
            const lc=LANES.find(l=>l.id===fn.lane)?.color||"#64748B";
            const path=Math.abs(fx-tx)<10
              ?`M${fx},${fy} L${tx},${ty}`
              :`M${fx},${fy} C${fx},${fy+40} ${tx},${ty-40} ${tx},${ty}`;
            return(
              <path key={`bg${i}`} d={path}
                fill="none" stroke={lc} strokeWidth={0.5} opacity={0.1}
                markerEnd="url(#aDIM)"/>
            );
          })}

          {/* ── ACTIVE EDGES (focus state) ── */}
          {focus&&EDGES.map((e,i)=>{
            const fn=NMAP[e.f], tn=NMAP[e.t];
            if(!fn||!tn) return null;
            const isOut=e.f===focus;
            const isIn=e.t===focus;
            if(!isOut&&!isIn) return null;
            const sfn=SZ[fn.s], stn=SZ[tn.s];
            let fx,fy,tx,ty;
            if(fn.x < tn.x - sfn.w*0.4){
              fx=fn.x+sfn.w; fy=fn.y+sfn.h/2;
              tx=tn.x;        ty=tn.y+stn.h/2;
            } else if(fn.x > tn.x + sfn.w*0.4){
              fx=fn.x;           fy=fn.y+sfn.h/2;
              tx=tn.x+stn.w;    ty=tn.y+stn.h/2;
            } else {
              fx=fn.x+sfn.w/2; fy=fn.y+sfn.h;
              tx=tn.x+stn.w/2; ty=tn.y;
            }
            const edgeCol=isOut?"#38BDF8":"#F59E0B";
            const dx=tx-fx, dy=ty-fy;
            const path=Math.abs(dx)<5
              ?`M${fx},${fy} L${tx},${ty}`
              :`M${fx},${fy} C${fx},${fy+Math.abs(dy)*0.4} ${tx},${ty-Math.abs(dy)*0.4} ${tx},${ty}`;
            const midX=(fx+tx)/2+(dy*0.05);
            const midY=(fy+ty)/2-(dx*0.05);
            const markId=isOut?"aCAL":"aCAR";
            return(
              <g key={`ae${i}`}>
                <path d={path} fill="none"
                  stroke={edgeCol} strokeWidth={isOut?2:1.5}
                  strokeDasharray={isIn?"6,3":undefined}
                  opacity={isOut?0.9:0.65}
                  markerEnd={`url(#${markId})`}/>
                {e.label&&(
                  <text x={midX} y={midY-5} textAnchor="middle"
                    fill={edgeCol} fontSize={8} fontFamily="monospace" opacity={0.85}>
                    {e.label}
                  </text>
                )}
              </g>
            );
          })}

          {/* ── NODES ── */}
          {NODES.map(n=>{
            if(filterLane&&n.lane!==filterLane) return null;
            const {x,y,s,c,label}=n;
            const {w,h}=SZ[s];
            const isSel   = sel===n.id;
            const isHov   = hov===n.id;
            const inA     = activeIds?.has(n.id);
            const isDim   = activeIds&&!inA;
            const isCallee= focus&&EDGES.some(e=>e.f===focus&&e.t===n.id);
            const isCaller= focus&&EDGES.some(e=>e.t===focus&&e.f===n.id);
            const laneColor=LANES.find(l=>l.id===n.lane)?.color||c;
            const nodeC   = c||laneColor;
            const hasWf   = !!WIREFRAMES[n.id];

            const fill   = isSel?nodeC+"2E":isDim?"#040810":isHov?"#0E1930":"#0C1424";
            const stroke = isSel?nodeC:isCallee?"#38BDF8":isCaller?"#F59E0B":isDim?"#0D1520":isHov?nodeC+"88":nodeC+(s==="action"?"44":"55");
            const sw     = isSel?1.8:isCallee||isCaller?1.3:0.75;
            const op     = isDim?0.15:1;

            const lines=label.split("\n");

            return(
              <g key={n.id}
                onClick={e=>handleNodeClick(e,n.id)}
                onMouseEnter={()=>!sel&&setHov(n.id)}
                onMouseLeave={()=>setHov(null)}
                opacity={op}
                style={{cursor:"pointer"}}>

                {/* Glow ring on select */}
                {isSel&&(
                  s==="decision"
                  ?<polygon
                    points={`${x+w/2},${y-6} ${x+w+6},${y+h/2} ${x+w/2},${y+h+6} ${x-6},${y+h/2}`}
                    fill="none" stroke={nodeC} strokeWidth={2.5} opacity={0.6}/>
                  :<rect x={x-5} y={y-5} width={w+10} height={h+10}
                    rx={s==="start"||s==="end"?(h+10)/2:9}
                    fill="none" stroke={nodeC} strokeWidth={2} opacity={0.6}/>
                )}

                {/* Shape */}
                {s==="decision"
                  ?<polygon
                    points={`${x+w/2},${y} ${x+w},${y+h/2} ${x+w/2},${y+h} ${x},${y+h/2}`}
                    fill={fill} stroke={stroke} strokeWidth={sw}/>
                  :<rect x={x} y={y} width={w} height={h}
                    rx={s==="start"||s==="end"?h/2:s==="action"?4:6}
                    fill={fill} stroke={stroke} strokeWidth={sw}
                    strokeDasharray={s==="action"?"4,3":undefined}/>
                }

                {/* Left accent bar (pages only) */}
                {s==="page"&&(
                  <rect x={x} y={y} width={3} height={h} rx={3}
                    fill={nodeC} opacity={isDim?0.1:isSel?1:0.6}/>
                )}

                {/* Relationship highlight bars */}
                {isCallee&&<rect x={x+w-3} y={y} width={3} height={h} rx={3} fill="#38BDF8" opacity={0.8}/>}
                {isCaller&&<rect x={x+w-3} y={y} width={3} height={h} rx={3} fill="#F59E0B" opacity={0.8}/>}

                {/* Wireframe badge (W dot top-right) */}
                {hasWf&&!isDim&&(
                  <circle cx={x+w-4} cy={y+4} r={4}
                    fill="#3B82F622" stroke="#3B82F6" strokeWidth={0.8}/>
                )}
                {hasWf&&!isDim&&(
                  <text x={x+w-4} y={y+4} textAnchor="middle" dominantBaseline="central"
                    fill="#3B82F6" fontSize={4} fontFamily="monospace"
                    style={{pointerEvents:"none"}}>W</text>
                )}

                {/* Label text */}
                {lines.length===1
                  ?<text x={x+w/2} y={y+h/2} textAnchor="middle" dominantBaseline="central"
                    fill={isDim?"#0F172A":isSel?"#F8FAFC":isCallee?"#BAE6FD":isCaller?"#FDE68A":inA?"#CBD5E1":"#64748B"}
                    fontSize={s==="start"||s==="end"?10.5:10}
                    fontWeight={isSel?700:s==="start"||s==="end"?600:400}
                    fontFamily="'JetBrains Mono','Fira Code',monospace"
                    style={{pointerEvents:"none"}}>{label}</text>
                  :<>
                    <text x={x+w/2} y={y+h/2-7} textAnchor="middle" dominantBaseline="central"
                      fill={isDim?"#0F172A":isSel?"#F8FAFC":isCallee?"#BAE6FD":isCaller?"#FDE68A":inA?"#CBD5E1":"#64748B"}
                      fontSize={9} fontWeight={isSel?700:400}
                      fontFamily="'JetBrains Mono','Fira Code',monospace"
                      style={{pointerEvents:"none"}}>{lines[0]}</text>
                    <text x={x+w/2} y={y+h/2+7} textAnchor="middle" dominantBaseline="central"
                      fill={isDim?"#0F172A":isSel?"#CBD5E1":"#475569"}
                      fontSize={8.5} fontFamily="'JetBrains Mono','Fira Code',monospace"
                      style={{pointerEvents:"none"}}>{lines[1]}</text>
                  </>
                }

                {/* Connection count badge */}
                {!isDim&&!isSel&&(()=>{
                  const cnt=EDGES.filter(e=>e.f===n.id||e.t===n.id).length;
                  if(cnt===0) return null;
                  return(
                    <text x={x+w-10} y={y+h-5} textAnchor="middle"
                      fill={nodeC+"55"} fontSize={7} fontFamily="monospace"
                      style={{pointerEvents:"none"}}>{cnt}</text>
                  );
                })()}
              </g>
            );
          })}
        </g>
      </svg>

      <style>{`
        @keyframes sli{from{opacity:0;transform:translateX(14px)}to{opacity:1;transform:translateX(0)}}
        ::-webkit-scrollbar{width:0;height:0}
      `}</style>
    </div>
  );
}