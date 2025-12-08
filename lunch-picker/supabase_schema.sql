-- Create Restaurants Table
create table public.restaurants (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  name text not null,
  last_selected_at timestamptz,
  is_active boolean default true
);

-- Enable Row Level Security (RLS)
alter table public.restaurants enable row level security;

-- Create Policy: Allow Public Read (Anonymous users can see the list)
create policy "Public can view restaurants"
on public.restaurants for select
to anon
using (true);

-- Create Policy: Allow Anonymous Insert/Update/Delete (For this simple demo app)
-- In a real production app, you might restrict this to authenticated users only,
-- but since we are using a client-side "password" for admin actions, 
-- we need to allow the anon key to perform these operations.
create policy "Anon can modify restaurants"
on public.restaurants for all
to anon
using (true)
with check (true);

-- Create Settings Table (for Cooldown)
create table public.settings (
  id serial primary key,
  cooldown_days int default 30
);

alter table public.settings enable row level security;

create policy "Public can view settings"
on public.settings for select
to anon
using (true);

create policy "Anon can update settings"
on public.settings for update
to anon
using (true)
with check (true);

-- Insert default setting
insert into public.settings (id, cooldown_days) values (1, 30);
