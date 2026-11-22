# KIDUVA production integration plan

Current React UI is **sample mode**. It does not have secure admin authentication, persistent product data, image uploads, variant stock, real orders or payment processing.

## Permanent product management
A Postgres/Supabase starter schema is in `supabase/schema.sql`. It supports products, categories, product images, size+colour variants, role-gated admin access, and atomic audited stock adjustments. It is not deployed or wired to the UI. Before production: set up Supabase Auth, create the first super_admin using a verified user UUID, configure a private media-upload flow with restricted storage policies, add authenticated admin pages, test RLS and checkout concurrency.

**Architecture decision:** Original requirements named Shopify as the product/inventory/order source of truth. If Shopify is retained, do **not** operate the Supabase catalogue as a second independent stock database. Instead, implement server-side Shopify Admin API writes and use Shopify inventory controls. Supabase may hold CMS data and admin app metadata. If replacing Shopify entirely, this Postgres schema can be expanded into the sole inventory backend with server-side reservation and order transactions.

## Razorpay: last phase
Payment integration is intentionally pending. Production Razorpay requires an approved merchant account, credentials, backend-generated order, server-side signature verification, webhook signature validation, idempotent payment event handling, refund/reconciliation support, and fulfilment only after verified payment. Never put Razorpay key secrets in frontend variables. Do not enable checkout before legal, tax, shipping and inventory policies are ready.

## Official logo
The uploaded logo artwork must be copied as an **unchanged image asset** to `public/kiduva-logo.png` before it is used in the header and footer. Do not redraw or recreate it. The owner-supplied image has the tagline “Little Joys, Lovely Styles.”
