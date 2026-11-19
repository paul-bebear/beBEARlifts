-- ai_usage_take sums both tables for today on every AI call. Both primary keys start with user_id,
-- so without these indexes the sum reads every row ever written.
-- Old rows stay: the onboard cap counts a user's rows of every day.
create index if not exists ai_usage_day on public.ai_usage (day);
create index if not exists ai_usage_kinds_day on public.ai_usage_kinds (day);
