-- User API keys for agent chat
create table user_agent_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  provider text not null check (provider in ('openai', 'anthropic', 'groq', 'gemini')),
  api_key text not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  unique(user_id, provider)
);

-- RLS policies
alter table user_agent_keys enable row level security;

-- Users can only see/manage their own keys
create policy "Users can view their own agent keys"
  on user_agent_keys for select
  using (auth.uid() = user_id);

create policy "Users can insert their own agent keys"
  on user_agent_keys for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own agent keys"
  on user_agent_keys for update
  using (auth.uid() = user_id);

create policy "Users can delete their own agent keys"
  on user_agent_keys for delete
  using (auth.uid() = user_id);

-- Updated at trigger
create trigger set_updated_at
  before update on user_agent_keys
  for each row
  execute function update_updated_at_column();
