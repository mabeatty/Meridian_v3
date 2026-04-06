-- Add dip_trigger and target_allocation to stock_positions
-- so tickers are fully dynamic and not hardcoded in code
alter table public.stock_positions
  add column if not exists dip_trigger float,
  add column if not exists target_allocation float;

-- Ensure RLS is on (may already be set)
alter table public.stock_positions enable row level security;
alter table public.stock_prices enable row level security;
alter table public.war_chest enable row level security;

-- RLS policies (safe to run even if they exist)
do $$ begin
  create policy "own stock_positions" on public.stock_positions for all using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "own war_chest" on public.war_chest for all using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "read stock_prices" on public.stock_prices for select using (true);
exception when duplicate_object then null; end $$;
