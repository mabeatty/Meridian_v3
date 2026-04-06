-- Drop the old single-provider unique constraint
alter table public.oauth_tokens drop constraint if exists oauth_tokens_user_id_provider_key;

-- Add item_id column if it doesn't exist
alter table public.oauth_tokens add column if not exists item_id text;

-- Add new constraint that supports multiple Plaid institutions per user
alter table public.oauth_tokens add constraint oauth_tokens_user_provider_item_key
  unique (user_id, provider, item_id);
