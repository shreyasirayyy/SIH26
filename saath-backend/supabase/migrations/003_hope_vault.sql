create table if not exists hope_vault (
  id uuid default gen_random_uuid() primary key,
  victim_token text not null,
  type text not null check (type in ('photo', 'memory', 'message', 'achievement')),
  title text not null,
  content text,
  image_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table hope_vault enable row level security;

-- Policy: Users can only see their own hope vault items
create policy "Users can view their own hope vault items" on hope_vault
  for select using (auth.uid()::text = victim_token);

create policy "Users can insert their own hope vault items" on hope_vault
  for insert with check (auth.uid()::text = victim_token);

create policy "Users can delete their own hope vault items" on hope_vault
  for delete using (auth.uid()::text = victim_token);
