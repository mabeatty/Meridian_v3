create extension if not exists "uuid-ossp";

create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  display_name text,
  location_lat float,
  location_lng float,
  location_name text,
  timezone text default 'America/Chicago',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, split_part(new.email, '@', 1));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create table public.oauth_tokens (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  provider text not null,
  access_token text not null,
  refresh_token text,
  expires_at timestamptz,
  scope text,
  metadata jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, provider)
);

create table public.goals (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  description text,
  category text not null,
  target_value float,
  current_value float default 0,
  unit text,
  due_date date,
  status text default 'active',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.journal_entries (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  content text not null,
  mood int check (mood between 1 and 10),
  energy int check (energy between 1 and 10),
  tags text[] default '{}',
  entry_date date default current_date,
  created_at timestamptz default now()
);

create table public.health_metrics (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  metric_date date not null,
  source text not null,
  recovery_score int,
  hrv float,
  resting_hr int,
  sleep_hours float,
  sleep_quality int,
  strain float,
  steps int,
  active_calories int,
  weight float,
  body_fat float,
  raw jsonb default '{}',
  created_at timestamptz default now(),
  unique(user_id, metric_date, source)
);

create table public.financial_snapshots (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  snapshot_date date not null,
  accounts jsonb not null default '[]',
  net_worth float,
  total_cash float,
  total_investments float,
  total_credit_balance float,
  created_at timestamptz default now(),
  unique(user_id, snapshot_date)
);

create table public.news_feeds (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  url text not null,
  category text default 'general',
  enabled boolean default true,
  created_at timestamptz default now(),
  unique(user_id, url)
);

create table public.widget_cache (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  widget_key text not null,
  data jsonb not null default '{}',
  fetched_at timestamptz default now(),
  unique(user_id, widget_key)
);

alter table public.profiles enable row level security;
alter table public.oauth_tokens enable row level security;
alter table public.goals enable row level security;
alter table public.journal_entries enable row level security;
alter table public.health_metrics enable row level security;
alter table public.financial_snapshots enable row level security;
alter table public.news_feeds enable row level security;
alter table public.widget_cache enable row level security;

create policy "own profile" on public.profiles for all using (auth.uid() = id);
create policy "own tokens" on public.oauth_tokens for all using (auth.uid() = user_id);
create policy "own goals" on public.goals for all using (auth.uid() = user_id);
create policy "own journal" on public.journal_entries for all using (auth.uid() = user_id);
create policy "own health" on public.health_metrics for all using (auth.uid() = user_id);
create policy "own snapshots" on public.financial_snapshots for all using (auth.uid() = user_id);
create policy "own feeds" on public.news_feeds for all using (auth.uid() = user_id);
create policy "own cache" on public.widget_cache for all using (auth.uid() = user_id);

create index idx_health_user_date on public.health_metrics(user_id, metric_date desc);
create index idx_journal_user_date on public.journal_entries(user_id, entry_date desc);
create index idx_cache_user_key on public.widget_cache(user_id, widget_key);

create or replace function public.handle_new_profile()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.news_feeds (user_id, name, url, category) values
    (new.id, 'Hacker News', 'https://hnrss.org/frontpage', 'tech'),
    (new.id, 'The Verge', 'https://www.theverge.com/rss/index.xml', 'tech'),
    (new.id, 'NYT Health', 'https://rss.nytimes.com/services/xml/rss/nyt/Health.xml', 'health');
  return new;
end;
$$;

create trigger on_profile_created
  after insert on public.profiles
  for each row execute procedure public.handle_new_profile();
