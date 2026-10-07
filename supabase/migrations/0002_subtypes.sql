-- Habitat · subtipos de hábito (p. ej. "Gym", "Pádel" dentro de "Ejercicio")

-- Lista ordenada de subtipos: [{ "id": uuid, "name": text, "archived"?: bool }].
alter table public.habits
  add column subtypes jsonb not null default '[]'::jsonb;

-- Un día puede tener varios registros: uno por subtipo, o uno sin subtipo (null).
-- El día cuenta como hecho si tiene al menos uno.
alter table public.habit_logs
  add column subtype_id uuid;

alter table public.habit_logs
  drop constraint habit_logs_habit_id_day_key;

alter table public.habit_logs
  add constraint habit_logs_habit_day_subtype_key unique nulls not distinct (habit_id, day, subtype_id);
