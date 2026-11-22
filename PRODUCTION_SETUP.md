# KIDUVA Shopify deployment setup

The `main` branch now contains **server-side Shopify Admin API routes**, an admin sign-in flow, catalogue reads and draft product create/update/delete operations, a size/colour **option creation endpoint**, location listing and inventory adjustment. The app still needs end-to-end testing with a real Shopify store. The interface is not production-ready.

## Vercel environment variables (server-side only)
- `SHOPIFY_SHOP_DOMAIN`: `your-store.myshopify.com`
- `SHOPIFY_ADMIN_ACCESS_TOKEN`: token from a properly installed Shopify app with appropriate scopes; **never** prefix with `VITE_`
- `ADMIN_PASSWORD`: randomly generated password, minimum 16 characters
- `ADMIN_SESSION_SECRET`: independent cryptographically random secret, minimum 32 characters

Deploy these as **server-side** Vercel environment variables. Never commit them or share them in chat. Shopify Admin API permissions must include products, inventory, and locations as required by the actual operations. Vercel functions must be enabled, and Shopify API schema/version compatibility must be verified against your store.

## Admin endpoints
- `POST /api/admin/login`, `POST /api/admin/logout`, `GET /api/admin/session`
- `GET/POST/PATCH/DELETE /api/admin/products`
- `POST /api/admin/variants` currently creates Shopify size/colour **options only**, not inventory-bearing variants
- `GET /api/admin/locations`
- `POST /api/admin/inventory` adjusts a specific Shopify inventory item at a selected location
- `GET /api/store/products` reads Shopify active products

All Admin API calls are server-side. The storefront uses sample data until the Shopify connection succeeds. New products are created as **drafts** to avoid accidentally selling incomplete listings.

## Must finish before launch
1. Replace the temporary single-password admin login with identity-based accounts, MFA, role-based authorization, login rate limiting, CSRF protection, audit logs and safe session revocation. The current password login is a development bridge only.
2. Complete Shopify variant bulk creation, editing and deletion, per-variant inventory adjustments, stock history and SKU validation.
3. Complete secure image uploads using Shopify staged uploads and product media creation, with validation, limits and appropriate storage permissions. The current UI accepts image URLs only.
4. Add product status/publish controls, categories/collections, order and customer views, cart and Shopify checkout.
5. Test Shopify Admin GraphQL API version and mutations with your actual shop; errors must not be treated as successful writes.
6. Use the exact owner-supplied original logo asset in `public/`; the existing temporary wordmark is **not** the official logo.
7. Razorpay **last**: confirm whether Razorpay is supported for the merchant's Shopify checkout configuration. If supported, configure it through Shopify's approved payment integration. Do not create an independent Razorpay checkout that bypasses Shopify order and inventory accounting.

## Security
Do not put Shopify Admin tokens or Razorpay secrets in the browser. No live payment functionality is implemented. Do not accept real customer orders until checkout, privacy, shipping, taxes and inventory have been tested.
