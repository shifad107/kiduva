# KIDUVA.IN

Premium baby & kidswear storefront starter.

## Current status
- Phase 1 storefront and admin UI starter.
- The interface is in clearly labelled **sample preview mode**.
- No real products, inventory, orders, customers, payments, or sales are represented.
- Shopify integration is pending. Do not use this preview for live commerce.

## Run locally
```bash
npm install
npm run dev
```

## Next production steps
1. Upload the official KIDUVA logo and replace the logo placeholder.
2. Create a Shopify store and configure Storefront API access.
3. Implement secure server-side Shopify Admin API routes and webhook verification.
4. Add administrator authentication, server-side RBAC, audit logs, and persistent data.
5. Test checkout, inventory reservations, refunds, privacy, and security before launch.

See `.env.example`. Never place Shopify Admin API tokens in browser code.
