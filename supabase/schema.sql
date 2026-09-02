-- Run this in the Supabase SQL editor (Project -> SQL Editor -> New query)

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  group_id uuid,
  created_at timestamptz not null default now()
);

create table groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text not null unique,
  weekly_goal_minutes int not null default 300,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

-- profiles.group_id references groups, but groups didn't exist yet when profiles was created above.
alter table profiles
  add constraint profiles_group_id_fkey
  foreign key (group_id) references groups(id) on delete set null;

create table activity_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  group_id uuid references groups(id) on delete set null,
  sport_type text not null check (sport_type in ('running', 'cycling', 'badminton', 'table_tennis', 'other')),
  duration_minutes int not null check (duration_minutes > 0),
  distance_km numeric,
  activity_date date not null,
  created_at timestamptz not null default now()
);

create index activity_logs_group_id_idx on activity_logs(group_id);
create index activity_logs_user_id_idx on activity_logs(user_id);

alter table profiles enable row level security;
alter table groups enable row level security;
alter table activity_logs enable row level security;

-- profiles: anyone signed in can read any profile (needed to show names on the leaderboard),
-- but can only edit their own row.
create policy "profiles are readable by any authenticated user"
  on profiles for select
  to authenticated
  using (true);

create policy "users can insert their own profile"
  on profiles for insert
  to authenticated
  with check (id = auth.uid());

create policy "users can update their own profile"
  on profiles for update
  to authenticated
  using (id = auth.uid());

-- groups: any authenticated user can read (needed to look up a group by invite code before joining)
-- and create a group. No update/delete in v1.
create policy "groups are readable by any authenticated user"
  on groups for select
  to authenticated
  using (true);

create policy "authenticated users can create a group"
  on groups for insert
  to authenticated
  with check (created_by = auth.uid());

-- activity_logs: users can insert their own logs, and read logs belonging to their own group
-- (or their own logs if not in a group yet).
create policy "users can insert their own activity logs"
  on activity_logs for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "users can read logs from their own group"
  on activity_logs for select
  to authenticated
  using (
    user_id = auth.uid()
    or group_id = (select group_id from profiles where id = auth.uid())
  );

-- auto-create a profile row when a new auth user signs up
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
