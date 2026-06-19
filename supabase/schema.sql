-- ============================================================
-- Cherrys Bakery POS — Supabase Schema
-- Run this in the Supabase SQL Editor
-- ============================================================

-- 1. Settings
create table if not exists settings (
  id uuid primary key default gen_random_uuid(),
  restaurant_name text not null default 'Cherrys Bakery',
  gst_number text not null default '',
  gst_percentage numeric(5,2) not null default 5.00,
  admin_pin text not null default '1234',
  printer_width text not null default '80mm' check (printer_width in ('58mm', '80mm')),
  created_at timestamptz not null default now()
);

-- Insert default row on first run
insert into settings (restaurant_name, gst_number, gst_percentage, admin_pin)
values ('Cherrys Bakery', '', 5.00, '1234')
on conflict do nothing;

-- 2. Categories
create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sort_order integer not null default 0
);

-- Seed default categories
insert into categories (name, sort_order) values
  ('Cakes', 1),
  ('Pastries', 2),
  ('Sandwiches', 3),
  ('Beverages', 4),
  ('Snacks', 5)
on conflict do nothing;

-- 3. Products
create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references categories(id) on delete set null,
  name text not null,
  price numeric(10,2) not null check (price >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- 4. Sales
create table if not exists sales (
  id uuid primary key default gen_random_uuid(),
  bill_number text not null unique,
  subtotal numeric(10,2) not null,
  gst_amount numeric(10,2) not null,
  total_amount numeric(10,2) not null,
  payment_method text not null check (payment_method in ('cash', 'upi', 'card')),
  created_at timestamptz not null default now()
);

-- 5. Sale Items
create table if not exists sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references sales(id) on delete cascade,
  product_name text not null,
  quantity integer not null check (quantity > 0),
  unit_price numeric(10,2) not null,
  line_total numeric(10,2) not null
);

-- ============================================================
-- Row Level Security
-- Option A: Disable RLS (simplest for internal POS system)
-- ============================================================
alter table settings disable row level security;
alter table categories disable row level security;
alter table products disable row level security;
alter table sales disable row level security;
alter table sale_items disable row level security;

-- ============================================================
-- Option B: Enable RLS with permissive policies
-- Uncomment below if you want RLS enabled
-- ============================================================
-- alter table settings enable row level security;
-- create policy "allow_all_settings" on settings for all using (true) with check (true);

-- alter table categories enable row level security;
-- create policy "allow_all_categories" on categories for all using (true) with check (true);

-- alter table products enable row level security;
-- create policy "allow_all_products" on products for all using (true) with check (true);

-- alter table sales enable row level security;
-- create policy "allow_all_sales" on sales for all using (true) with check (true);

-- alter table sale_items enable row level security;
-- create policy "allow_all_sale_items" on sale_items for all using (true) with check (true);

-- ============================================================
-- Indexes for performance
-- ============================================================
create index if not exists idx_products_category on products(category_id);
create index if not exists idx_products_active on products(active);
create index if not exists idx_sales_created_at on sales(created_at);
create index if not exists idx_sale_items_sale_id on sale_items(sale_id);

-- ============================================================
-- Grants — required even with RLS disabled
-- Without these, the anon/service_role cannot read or write
-- ============================================================
grant usage on schema public to anon, authenticated, service_role;

grant all privileges on table settings   to anon, authenticated, service_role;
grant all privileges on table categories to anon, authenticated, service_role;
grant all privileges on table products   to anon, authenticated, service_role;
grant all privileges on table sales      to anon, authenticated, service_role;
grant all privileges on table sale_items to anon, authenticated, service_role;

grant all privileges on all sequences in schema public to anon, authenticated, service_role;
