-- Habitat · orden manual de los hábitos en inicio

-- 0, 1, 2… según el último reordenado. null = nunca reordenado: va al final,
-- por fecha de creación (así los hábitos nuevos aparecen al final sin enviarla).
alter table public.habits
  add column position integer;
