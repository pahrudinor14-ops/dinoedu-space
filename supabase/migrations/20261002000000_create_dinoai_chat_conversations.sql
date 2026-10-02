create table if not exists public.dinoai_chat_conversations (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 80),
  messages jsonb not null default '[]'::jsonb
    check (jsonb_typeof(messages) = 'array'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists dinoai_chat_conversations_user_updated_idx
  on public.dinoai_chat_conversations (user_id, updated_at desc);

alter table public.dinoai_chat_conversations enable row level security;

drop policy if exists "Users can read own DinoAI conversations"
  on public.dinoai_chat_conversations;
create policy "Users can read own DinoAI conversations"
  on public.dinoai_chat_conversations
  for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can create own DinoAI conversations"
  on public.dinoai_chat_conversations;
create policy "Users can create own DinoAI conversations"
  on public.dinoai_chat_conversations
  for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own DinoAI conversations"
  on public.dinoai_chat_conversations;
create policy "Users can update own DinoAI conversations"
  on public.dinoai_chat_conversations
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own DinoAI conversations"
  on public.dinoai_chat_conversations;
create policy "Users can delete own DinoAI conversations"
  on public.dinoai_chat_conversations
  for delete to authenticated
  using (auth.uid() = user_id);

grant select, insert, update, delete
  on public.dinoai_chat_conversations to authenticated;