
-- Enum
create type public.user_role as enum ('admin');

-- Campaigns
create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  title_ar text not null,
  title_tr text not null,
  title_en text not null,
  description_ar text,
  description_tr text,
  description_en text,
  image_url text,
  goal_amount integer not null check (goal_amount > 0),
  raised_amount integer not null default 0 check (raised_amount >= 0),
  currency text not null default 'USD',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Donations
create table public.donations (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references public.campaigns(id) on delete set null,
  donor_name text not null,
  donor_email text not null,
  donor_phone text,
  amount integer not null check (amount > 0),
  currency text not null,
  status text not null default 'pending',
  provider_ref text,
  payment_url text,
  expires_at timestamptz,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index idx_donations_campaign on public.donations(campaign_id);
create index idx_donations_status on public.donations(status);

-- User roles
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role public.user_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

-- has_role function (security definer, recommended signature)
create or replace function public.has_role(_user_id uuid, _role public.user_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  )
$$;

-- Enable RLS
alter table public.campaigns enable row level security;
alter table public.donations enable row level security;
alter table public.user_roles enable row level security;

-- campaigns policies
create policy "Public can view active campaigns"
  on public.campaigns for select
  using (active = true);

create policy "Admins can view all campaigns"
  on public.campaigns for select
  to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create policy "Admins can insert campaigns"
  on public.campaigns for insert
  to authenticated
  with check (public.has_role(auth.uid(), 'admin'));

create policy "Admins can update campaigns"
  on public.campaigns for update
  to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create policy "Admins can delete campaigns"
  on public.campaigns for delete
  to authenticated
  using (public.has_role(auth.uid(), 'admin'));

-- donations policies
create policy "Anyone can create a donation"
  on public.donations for insert
  with check (true);

create policy "Admins can view donations"
  on public.donations for select
  to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create policy "Admins can update donations"
  on public.donations for update
  to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create policy "Admins can delete donations"
  on public.donations for delete
  to authenticated
  using (public.has_role(auth.uid(), 'admin'));

-- user_roles policies
create policy "Users can view their own roles"
  on public.user_roles for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Admins can view all roles"
  on public.user_roles for select
  to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create policy "Admins can insert roles"
  on public.user_roles for insert
  to authenticated
  with check (public.has_role(auth.uid(), 'admin'));

create policy "Admins can update roles"
  on public.user_roles for update
  to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create policy "Admins can delete roles"
  on public.user_roles for delete
  to authenticated
  using (public.has_role(auth.uid(), 'admin'));

-- Atomic increment for raised_amount
create or replace function public.increment_raised(_campaign_id uuid, _amount integer)
returns void
language sql
security definer
set search_path = public
as $$
  update public.campaigns
  set raised_amount = raised_amount + _amount
  where id = _campaign_id;
$$;

-- Seed 3 campaigns
insert into public.campaigns (title_ar, title_tr, title_en, description_ar, description_tr, description_en, image_url, goal_amount, raised_amount, currency, active) values
('مساعدات شتوية للأسر المحتاجة', 'İhtiyaç Sahibi Aileler İçin Kış Yardımı', 'Winter Aid for Families in Need',
 'حملة لتوفير الدفء والملابس الشتوية لألف أسرة.', 'Bin aileye sıcaklık ve kışlık kıyafet sağlama kampanyası.', 'A campaign to provide warmth and winter clothing to 1,000 families.',
 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=800', 5000000, 1250000, 'USD', true),
('إفطار الصائم', 'İftar Sofrası', 'Iftar Meals',
 'توفير وجبات إفطار للصائمين في رمضان.', 'Ramazan ayı boyunca iftar yemekleri sağlama.', 'Providing iftar meals during Ramadan.',
 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800', 3000000, 800000, 'USD', true),
('كفالة يتيم', 'Yetim Sponsorluğu', 'Orphan Sponsorship',
 'كفالة شهرية لمئة طفل يتيم.', 'Yüz yetim çocuk için aylık sponsorluk.', 'Monthly sponsorship for 100 orphaned children.',
 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=800', 10000000, 3500000, 'USD', true);
