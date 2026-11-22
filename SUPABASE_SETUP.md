# Connect KIDUVA.IN to Supabase (free development setup)

This is the **Supabase-first** direction. Shopify is no longer intended as the active source of product and stock data. Legacy Shopify API files remain in the repo, but the new storefront and `/admin` use Supabase **when the two Vite environment variables below are configured**.

## Step 1 — Create a Supabase project
Sign in at https://supabase.com/dashboard and choose **New project**. Select an organization, name the project `kiduva`, create a strong database password, and choose a nearby region. Do not share the database password in chat or commit it to GitHub.

## Step 2 — Create the tables safely
Open **SQL Editor > New query**. Copy the full contents of [supabase/kiduva_live_setup.sql](supabase/kiduva_live_setup.sql), paste, then run it **once** on this new project.

The script creates:
- `kiduva_products` (names, categories, prices, status, image URLs)
- `kiduva_variants` (size, colour, SKU, stock, low-stock threshold)
- `kiduva_admins` (real owner authorization)
- `kiduva_inventory_history` (audited stock changes)
- `kiduva-products` Storage bucket for product photos
- Row-level security policies and an atomic stock-adjustment function

**Do not run `supabase/schema.sql` instead.** That older file is from the abandoned Shopify-first prototype, not the active Supabase product implementation.

## Step 3 — Create the OWNER account (adult account holder)
In Supabase go to **Authentication > Users**. Create an owner email/password user using Supabase's admin controls. Pick a long, unique password. Never use the earlier `Shifad` demo password for real business data. Verify the email where required.

Copy that user's UUID from Authentication > Users (the UUID is not a password).

Then go to **SQL Editor > New query**, replacing the placeholder with the actual UUID:

```sql
insert into public.kiduva_admins (user_id, role)
values ('THE-AUTH-USER-UUID', 'owner');
```

Run the statement. Only accounts listed in `kiduva_admins` can edit product data.

## Step 4 — Connect Vercel (public keys ONLY)
In Supabase **Project Settings > API / API Keys**, find:
- Project URL
- Publishable key (or the legacy `anon` key if your project uses it)

In Vercel > KIDUVA project > Settings > Environment Variables, add:

```text
VITE_SUPABASE_URL = https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY = YOUR_PUBLISHABLE_KEY
```

Set the variables for the environment you are deploying (Production, and Preview if desired) and **redeploy** the latest `main` commit. These values are intended to be public to the browser. Never use `service_role`, `sb_secret_...`, or database passwords in a `VITE_` variable.

## Step 5 — Test on Vercel
1. Open `https://kiduva.vercel.app/admin`.
2. Sign in with the email/password from Supabase Authentication.
3. Add a product with name, category, unique SKU, price, sizes, colours, and optional photo. Start with `Draft` until ready.
4. In Inventory, choose a variant, enter a nonzero quantity adjustment, and supply a reason.
5. Set the product to `Active` when its details and stock are verified.
6. Open the storefront and confirm the active product appears. Draft products must not appear publicly.
7. Test sign-out and anonymous access: only published products should be readable; product modifications should be denied.

## Important limits / work remaining
- Supabase makes product records persistent and shared across devices. The old demo localStorage is **not** the permanent source of truth when configured.
- Each newly created variant starts at **zero stock** for safety; use Inventory to add actual quantities.
- The current admin supports creating size/colour combinations. Existing variant combinations cannot yet be restructured in place.
- The initial image-upload flow accepts PNG, JPEG and WebP under 5 MB.
- Cart and checkout remain **preview only**. Do not accept real orders or payments yet.
- Before launch, add transactional order handling, payment verification (Razorpay), reservations, returns/refunds, rate limiting, staff RBAC, backup/restore tests and compliance policies.
- Test the database and storage policies with unauthorized users before handling real business or customer data.

## Troubleshooting
- If the admin still says **Demo** or asks for `Shifad`, Vercel environment variables are missing or the new deployment hasn't completed.
- If sign-in succeeds but says the user has no permission, check the UUID in `kiduva_admins`.
- If a table or function is missing, run the new setup SQL in the correct Supabase project.
- If photos fail, confirm the `kiduva-products` bucket exists, storage policies were created, and images are below 5 MB.

**Do not share secrets in this conversation.** The public project URL and publishable key can be entered directly in Vercel.
