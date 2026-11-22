-- KIDUVA Supabase-first backend. Run ONCE in Supabase > SQL Editor > New query.
-- This replaces Shopify as source of truth. NEVER operate two independent stock stores.
create extension if not exists pgcrypto;

create table if not exists public.kiduva_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','manager','inventory'))
);

create table if not exists public.kiduva_products (
  id uuid primary key default gen_random_uuid(),
  name text not null check(length(trim(name)) between 2 and 160),
  category text not null,
  description text not null default '',
  price numeric(12,2) not null check(price >= 0),
  sku text not null unique,
  image_url text,
  status text not null default 'draft' check(status in ('draft','active','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.kiduva_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.kiduva_products(id) on delete cascade,
  size text not null,
  colour text not null,
  sku text not null unique,
  stock integer not null default 0 check(stock >= 0),
  low_stock_threshold integer not null default 5 check(low_stock_threshold >= 0),
  unique(product_id,size,colour)
);

create table if not exists public.kiduva_inventory_history (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid references public.kiduva_variants(id) on delete set null,
  product_name text not null,
  variant_label text not null,
  previous_quantity integer not null,
  adjustment integer not null,
  new_quantity integer not null,
  reason text not null,
  admin_id uuid not null references auth.users(id),
  changed_at timestamptz not null default now()
);

create or replace function public.kiduva_is_admin()
returns boolean language sql stable security definer set search_path = ''
as $$ select exists(select 1 from public.kiduva_admins where user_id=auth.uid()) $$;
revoke all on function public.kiduva_is_admin() from public;
grant execute on function public.kiduva_is_admin() to anon, authenticated;

alter table public.kiduva_admins enable row level security;
alter table public.kiduva_products enable row level security;
alter table public.kiduva_variants enable row level security;
alter table public.kiduva_inventory_history enable row level security;

create policy "kiduva_admin_read_self" on public.kiduva_admins for select to authenticated using(user_id=auth.uid());
create policy "kiduva_products_public_read_active" on public.kiduva_products for select to anon, authenticated using(status='active' or public.kiduva_is_admin());
create policy "kiduva_products_admin_insert" on public.kiduva_products for insert to authenticated with check(public.kiduva_is_admin());
create policy "kiduva_products_admin_update" on public.kiduva_products for update to authenticated using(public.kiduva_is_admin()) with check(public.kiduva_is_admin());
create policy "kiduva_products_admin_delete" on public.kiduva_products for delete to authenticated using(public.kiduva_is_admin());

create policy "kiduva_variants_public_read_active" on public.kiduva_variants for select to anon,authenticated using(
  exists(select 1 from public.kiduva_products p where p.id=product_id and (p.status='active' or public.kiduva_is_admin()))
);
create policy "kiduva_variants_admin_insert" on public.kiduva_variants for insert to authenticated with check(public.kiduva_is_admin());
create policy "kiduva_variants_admin_delete" on public.kiduva_variants for delete to authenticated using(public.kiduva_is_admin());
-- No direct UPDATE policy: stock adjustment must use audited function.
create policy "kiduva_history_admin_read" on public.kiduva_inventory_history for select to authenticated using(public.kiduva_is_admin());

create or replace function public.kiduva_adjust_stock(p_variant_id uuid,p_delta integer,p_reason text)
returns integer language plpgsql security definer set search_path = ''
as $$
declare previous_qty integer; next_qty integer; label_name text; product_title text;
begin
 if not public.kiduva_is_admin() then raise exception 'Not an admin'; end if;
 if p_delta is null or p_delta=0 or length(trim(coalesce(p_reason,''))) < 3 then raise exception 'Adjustment and reason required'; end if;
 select v.stock, v.size||' / '||v.colour, p.name into previous_qty,label_name,product_title
   from public.kiduva_variants v join public.kiduva_products p on p.id=v.product_id
   where v.id=p_variant_id for update of v;
 if not found then raise exception 'Variant not found'; end if;
 next_qty := previous_qty + p_delta;
 if next_qty<0 then raise exception 'Stock cannot be negative'; end if;
 update public.kiduva_variants set stock=next_qty where id=p_variant_id;
 insert into public.kiduva_inventory_history(variant_id,product_name,variant_label,previous_quantity,adjustment,new_quantity,reason,admin_id)
 values(p_variant_id,product_title,label_name,previous_qty,p_delta,next_qty,p_reason,auth.uid());
 return next_qty;
end $$;
revoke all on function public.kiduva_adjust_stock(uuid,integer,text) from public;
grant execute on function public.kiduva_adjust_stock(uuid,integer,text) to authenticated;

-- Public product-photo bucket. Images in this bucket are intentionally public.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('kiduva-products','kiduva-products',true,5242880,array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;
create policy "kiduva_admin_upload_photos" on storage.objects for insert to authenticated
  with check(bucket_id='kiduva-products' and public.kiduva_is_admin());

-- FIRST OWNER (run separately only after creating an Auth user with their own strong password):
-- insert into public.kiduva_admins(user_id,role) values ('AUTH_USER_UUID_HERE','owner');

-- No real orders / checkout in this stage. Do not accept customer payments yet.
