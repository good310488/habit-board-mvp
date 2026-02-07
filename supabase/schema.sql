create extension if not exists "uuid-ossp";

create table if not exists boards (
  id uuid primary key,
  name text not null,
  owner_id uuid not null references auth.users(id) default auth.uid(),
  created_at timestamp with time zone default now()
);

create table if not exists members (
  id uuid primary key,
  board_id uuid references boards(id) on delete cascade not null,
  user_id uuid not null references auth.users(id) default auth.uid(),
  name text not null,
  color text not null,
  created_at timestamp with time zone default now(),
  unique (board_id, user_id)
);

create table if not exists habits (
  id uuid primary key,
  board_id uuid references boards(id) on delete cascade not null,
  member_id uuid references members(id) on delete cascade not null,
  title text not null,
  archived boolean not null default false,
  archived_at timestamp with time zone,
  order_index bigint not null default 0,
  created_at timestamp with time zone default now()
);

create table if not exists entries (
  id uuid primary key,
  board_id uuid references boards(id) on delete cascade not null,
  habit_id uuid references habits(id) on delete cascade not null,
  date date not null,
  created_at timestamp with time zone default now(),
  unique (habit_id, date)
);

create index if not exists entries_board_date_idx on entries(board_id, date);
create index if not exists members_board_idx on members(board_id);
create index if not exists members_user_idx on members(user_id);
create index if not exists habits_board_idx on habits(board_id);
create index if not exists habits_member_idx on habits(member_id);

alter table boards enable row level security;
alter table members enable row level security;
alter table habits enable row level security;
alter table entries enable row level security;

create or replace function public.set_board_owner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.owner_id := auth.uid();
  return new;
end;
$$;

create or replace function public.set_member_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.user_id := auth.uid();
  return new;
end;
$$;

drop trigger if exists set_board_owner on boards;
create trigger set_board_owner
before insert on boards
for each row
execute function public.set_board_owner();

drop trigger if exists set_member_user on members;
create trigger set_member_user
before insert on members
for each row
execute function public.set_member_user();

create or replace function public.is_board_member(board_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.members m
    where m.board_id = is_board_member.board_id
      and m.user_id = auth.uid()
  );
$$;

create or replace function public.is_board_owner(board_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.boards b
    where b.id = is_board_owner.board_id
      and b.owner_id = auth.uid()
  );
$$;

create policy "Boards are viewable by members" on boards
for select using (
  public.is_board_member(id)
);

create policy "Boards can be inserted by owner" on boards
for insert with check (
  auth.uid() is not null
);

create policy "Boards can be updated by owner" on boards
for update using (
  auth.uid() = owner_id
) with check (
  auth.uid() = owner_id
);

create policy "Boards can be deleted by owner" on boards
for delete using (
  auth.uid() = owner_id
);

create policy "Members are viewable by board members" on members
for select using (
  public.is_board_member(board_id)
);

create policy "Users can join boards" on members
for insert with check (
  auth.uid() is not null
);

create policy "Users can update their member profile" on members
for update using (
  auth.uid() = user_id
) with check (
  auth.uid() = user_id
);

create policy "Users can leave boards" on members
for delete using (
  auth.uid() = user_id
);

create policy "Habits are viewable by board members" on habits
for select using (
  public.is_board_member(board_id)
);

create policy "Users can insert own habits" on habits
for insert with check (
  exists (
    select 1 from members m
    where m.id = habits.member_id and m.user_id = auth.uid()
  )
);

create policy "Users can update own habits" on habits
for update using (
  exists (
    select 1 from members m
    where m.id = habits.member_id and m.user_id = auth.uid()
  )
) with check (
  exists (
    select 1 from members m
    where m.id = habits.member_id and m.user_id = auth.uid()
  )
);

create policy "Users can delete own habits" on habits
for delete using (
  exists (
    select 1 from members m
    where m.id = habits.member_id and m.user_id = auth.uid()
  )
);

create policy "Entries are viewable by board members" on entries
for select using (
  public.is_board_member(board_id)
);

create policy "Users can insert entries for own habits" on entries
for insert with check (
  exists (
    select 1
    from habits h
    join members m on m.id = h.member_id
    where h.id = entries.habit_id
      and m.user_id = auth.uid()
      and h.board_id = entries.board_id
  )
);

create policy "Users can delete entries for own habits" on entries
for delete using (
  exists (
    select 1
    from habits h
    join members m on m.id = h.member_id
    where h.id = entries.habit_id
      and m.user_id = auth.uid()
      and h.board_id = entries.board_id
  )
);
