create table public.manual_tasks (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  notes text,
  priority int check (priority between 1 and 4) default 3,
  due_date timestamptz,
  status text default 'open',
  archived_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.manual_tasks enable row level security;
create policy "own manual_tasks" on public.manual_tasks for all using (auth.uid() = user_id);
create index idx_manual_tasks_user on public.manual_tasks(user_id, status, due_date);
