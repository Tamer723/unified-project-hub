-- Drop old tables
drop table if exists public.donations cascade;
drop table if exists public.campaigns cascade;

-- Products
create table public.products (
  id uuid primary key default gen_random_uuid(),
  name_ar text not null,
  name_tr text not null,
  name_en text not null,
  description_ar text,
  description_tr text,
  description_en text,
  image_url text,
  base_price integer not null,
  currency text not null default 'USD',
  pricing_type text not null check (pricing_type in ('fixed', 'matrix')),
  active boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.products enable row level security;

create policy "Public can view active products"
  on public.products for select
  to anon, authenticated
  using (active = true);

create policy "Admins can manage products"
  on public.products for all
  to authenticated
  using (public.has_role('admin'))
  with check (public.has_role('admin'));

-- Price matrix
create table public.product_price_matrix (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  country_code text not null,
  country_ar text not null,
  country_tr text not null,
  country_en text not null,
  animal_ar text not null,
  animal_tr text not null,
  animal_en text not null,
  price integer not null,
  currency text not null default 'USD',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.product_price_matrix enable row level security;

create policy "Public can view active matrix"
  on public.product_price_matrix for select
  to anon, authenticated
  using (active = true);

create policy "Admins can manage matrix"
  on public.product_price_matrix for all
  to authenticated
  using (public.has_role('admin'))
  with check (public.has_role('admin'));

-- Orders
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id),
  matrix_id uuid references public.product_price_matrix(id),
  donor_name text not null,
  donor_email text not null,
  donor_phone text,
  quantity integer not null default 1 check (quantity > 0),
  intention text,
  unit_price integer not null,
  total_amount integer not null,
  currency text not null,
  status text not null default 'pending'
    check (status in ('pending','success','failed','refunded')),
  provider_ref text,
  payment_url text,
  expires_at timestamptz,
  metadata jsonb,
  created_at timestamptz not null default now()
);

alter table public.orders enable row level security;

create policy "Anyone can create order"
  on public.orders for insert
  to anon, authenticated
  with check (true);

create policy "Admins can view orders"
  on public.orders for select
  to authenticated
  using (public.has_role('admin'));

create policy "Admins can update orders"
  on public.orders for update
  to authenticated
  using (public.has_role('admin'));

-- Seed products
insert into public.products
(name_ar, name_tr, name_en, description_ar, description_tr, description_en,
 pricing_type, base_price, currency, display_order)
values
('انحر سنّة، وأطعم غزة',
 'Sünnet üzere kes, Gazze''yi doyur',
 'Sacrifice & Feed Gaza',
 'تُذبح أضحيتك في إفريقيا إحياءً للسنة، وبقيمة التبرع ذاتها نُطعم أسرة محاصرة في غزة يوم العيد.',
 'Kurbanınız Afrika''da Sünnet olarak kesilir, aynı bağış değeriyle Gazze''de kuşatılmış bir aileyi Bayram''da doyururuz.',
 'Your sacrifice is slaughtered in Africa reviving the Sunnah, and with the same donation value we feed a besieged family in Gaza on Eid.',
 'fixed', 10000, 'USD', 1),
('أضحيتك تعبر الحصار',
 'Kurbanın Ablukayı Aşıyor',
 'Your Sacrifice Breaks the Siege',
 'تُذبح أضحيتك وتُعلَّب وتُعقَّم في مصانع معتمدة، ثم تُشحن مباشرة إلى غزة — 12 علبة لحم تصل لمستحقيها.',
 'Kurbanınız kesilir, onaylı fabrikalarda konservelenir ve sterilize edilir, ardından doğrudan Gazze''ye gönderilir.',
 'Your sacrifice is slaughtered, canned and sterilized in certified factories, then shipped directly to Gaza — 12 cans of meat reach those in need.',
 'fixed', 17500, 'USD', 2),
('الأضاحي الحيّة',
 'Canlı Kurban',
 'Live Sacrifice',
 'ذبح حي مباشر في البلد الذي تختاره، مع توثيق ميداني يطمئنك على بلوغ أمانتك لمستحقيها.',
 'Seçtiğiniz ülkede doğrudan canlı kesim, emanetinizin hak sahiplerine ulaştığından emin olmanız için saha belgelendirmesiyle.',
 'Live direct slaughter in the country of your choice, with field documentation to assure you your trust has reached its recipients.',
 'matrix', 11500, 'USD', 3);

-- Seed matrix
insert into public.product_price_matrix
(product_id, country_code, country_ar, country_tr, country_en,
 animal_ar, animal_tr, animal_en, price, currency)
select
  p.id,
  c.code, c.ar, c.tr, c.en,
  a.ar, a.tr, a.en,
  a.price,
  'USD'
from public.products p
cross join (values
  ('SY', 'سوريا', 'Suriye', 'Syria'),
  ('EG', 'مصر', 'Mısır', 'Egypt'),
  ('SD', 'السودان', 'Sudan', 'Sudan'),
  ('TD', 'تشاد', 'Çad', 'Chad'),
  ('LB', 'لبنان', 'Lübnan', 'Lebanon'),
  ('YE', 'اليمن', 'Yemen', 'Yemen')
) as c(code, ar, tr, en)
cross join (values
  ('خروف / ماعز', 'Koyun / Keçi', 'Sheep / Goat', 11500),
  ('بقرة (سبع)', 'İnek (yedide bir)', 'Cow (1/7 share)', 25000)
) as a(ar, tr, en, price)
where p.display_order = 3;