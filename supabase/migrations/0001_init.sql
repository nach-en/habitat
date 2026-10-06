-- Habitat · esquema inicial (HABITAT.md §4)

create table public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  description text not null default '',
  color text not null,                      -- hex, ej. '#8b8cf5'
  icon text not null,                       -- clave del mapa de iconos
  frequency text not null check (frequency in ('daily','days','week')),
  days smallint[] not null default '{}',    -- 0=lunes ... 6=domingo (solo si 'days')
  times_per_week smallint not null default 3,
  reminder_enabled boolean not null default false,
  reminder_time time not null default '08:00',
  created_on date not null default current_date,  -- la app envía la fecha local
  archived_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.habit_logs (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null references public.habits(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  day date not null,
  unique (habit_id, day)
);

create index habits_user_id_idx on public.habits (user_id);
create index habit_logs_user_id_idx on public.habit_logs (user_id);

alter table public.habits enable row level security;
alter table public.habit_logs enable row level security;

create policy "own habits" on public.habits
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Además de ser del usuario, el registro debe apuntar a un hábito suyo.
create policy "own logs" on public.habit_logs
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.habits h
      where h.id = habit_id and h.user_id = (select auth.uid())
    )
  );
