-- KIDUVA permanent catalogue and inventory schema (Supabase/Postgres).
-- Run only after creating a Supabase project. Shopify integration, if enabled,
-- should replace these catalogue writes with Shopify as the inventory source of truth.
create extension if not exists pgcrypto;
create table if not exists public.store_admins (
 user_id uuid primary key references auth.users(id) on delete cascade,
 role text not null check(role in ('super_admin','store_manager','inventory_manager','content_manager'))
);
create table if not exists public.categories (
 id uuid primary key default gen_random_uuid(),
 name text not null unique,
 slug text not null unique,
 active boolean not null default true,
 sort_order integer not null default 0
);
create table if not exists public.products (
 id uuid primary key default gen_random_uuid(),
 category_id uuid references public.categories(id) on delete set null,
 name text not null,
 description text not null default '',
 sku text not null unique,
 price_paise integer not null check(price_paise >= 0),
 compare_price_paise integer check(compare_price_paise >= 0),
 status text not null default 'draft' check(status in ('draft','active','archived')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table if not exists public.product_images (
 id uuid primary key default gen_random_uuid(),
 product_id uuid not null references public.products(id) on delete cascade,
 storage_path text not null,
 alt_text text not null default '',
 sort_order integer not null default 0
);
create table if not exists public.product_variants (
 id uuid primary key default gen_random_uuid(),
 product_id uuid not null references public.products(id) on delete cascade,
 size text not null,
 color text not null,
 sku text not null unique,
 stock integer not null default 0 check(stock >= 0),
 low_stock_threshold integer not null default 5 check(low_stock_threshold >= 0),
 unique(product_id,size,color)
);
create table if not exists public.inventory_history (
 id uuid primary key default gen_random_uuid(),
 variant_id uuid not null references public.product_variants(id),
 previous_stock integer not null,
 adjustment integer not null,
 new_stock integer not null,
 reason text not null,
 changed_by uuid not null references auth.users(id),
 created_at timestamptz not null default now()
);
create or replace function public.is_store_admin(required_roles text[])
returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from public.store_admins
 where user_id=auth.uid() and role=any(required_roles))
$$;
revoke all on function public.is_store_admin(text[]) from public;
grant execute on function public.is_store_admin(text[]) to authenticated;
alter table public.store_admins enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.product_variants enable row level security;
alter table public.inventory_history enable row level security;
create policy "admins read own role" on public.store_admins for select to authenticated using(user_id=auth.uid());
create policy "public view categories" on public.categories for select using(active or public.is_store_admin(array['super_admin','store_manager','content_manager']));
create policy "public view published products" on public.products for select using(status='active' or public.is_store_admin(array['super_admin','store_manager','inventory_manager','content_manager']));
create policy "public view published images" on public.product_images for select using(exists(select 1 from public.products p where p.id=product_id and p.status='active') or public.is_store_admin(array['super_admin','store_manager','content_manager']));
create policy "public view published variants" on public.product_variants for select using(exists(select 1 from public.products p where p.id=product_id and p.status='active') or public.is_store_admin(array['super_admin','store_manager','inventory_manager']));
create policy "admins manage categories" on public.categories for all to authenticated using(public.is_store_admin(array['super_admin','store_manager','content_manager'])) with check(public.is_store_admin(array['super_admin','store_manager','content_manager']));
create policy "admins manage products" on public.products for all to authenticated using(public.is_store_admin(array['super_admin','store_manager'])) with check(public.is_store_admin(array['super_admin','store_manager']));
create policy "admins manage images" on public.product_images for all to authenticated using(public.is_store_admin(array['super_admin','store_manager'])) with check(public.is_store_admin(array['super_admin','store_manager']));
-- Stock mutations are exclusively through the audited RPC below.
create policy "admins read history" on public.inventory_history for select to authenticated using(public.is_store_admin(array['super_admin','store_manager','inventory_manager']));
create or replace function public.adjust_inventory(p_variant_id uuid,p_delta integer,p_reason text)
returns integer language plpgsql security definer set search_path=public as $$
declare old_qty integer; new_qty integer;
begin
 if not public.is_store_admin(array['super_admin','store_manager','inventory_manager']) then raise exception 'Unauthorized'; end if;
 if p_delta = 0 or length(trim(coalesce(p_reason,''))) < 3 then raise exception 'Nonzero adjustment and reason required'; end if;
 select stock into old_qty from public.product_variants where id=p_variant_id for update;
 if not found then raise exception 'Variant not found'; end if;
 new_qty:=old_qty+p_delta;
 if new_qty < 0 then raise exception 'Insufficient stock'; end if;
 update public.product_variants set stock=new_qty where id=p_variant_id;
 insert into public.inventory_history(variant_id,previous_stock,adjustment,new_stock,reason,changed_by)
 values(p_variant_id,old_qty,p_delta,new_qty,p_reason,auth.uid());
 return new_qty;
end $$;
revoke all on function public.adjust_inventory(uuid,integer,text) from public;
grant execute on function public.adjust_inventory(uuid,integer,text) to authenticated;
-- First admin must be provisioned manually using a verified auth.users UUID.
-- Never put service-role keys in Vite environment variables.
