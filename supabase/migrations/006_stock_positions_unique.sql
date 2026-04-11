-- Add unique constraint on user_id + ticker so upsert works correctly
alter table public.stock_positions
  drop constraint if exists stock_positions_user_id_ticker_key;

alter table public.stock_positions
  add constraint stock_positions_user_id_ticker_key unique (user_id, ticker);
