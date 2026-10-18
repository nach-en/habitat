-- Habitat · hábitos a dejar (éxito = no hacerlo)

-- 'build': hábito a construir; 'quit': hábito a dejar. En 'quit' un registro es una recaída.
alter table public.habits
  add column goal text not null default 'build' check (goal in ('build', 'quit'));
