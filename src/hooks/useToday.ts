import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { addDays, startOfDay } from 'date-fns';
import { toKey } from '@/lib/dates';
import type { DayKey } from '@/types';

/** Clave del día de hoy; se actualiza a medianoche y al volver a la app. */
export function useToday(): DayKey {
  const [today, setToday] = useState(() => toKey(new Date()));

  useEffect(() => {
    const refresh = () => setToday(toKey(new Date()));
    const msToMidnight = addDays(startOfDay(new Date()), 1).getTime() - Date.now();
    const timer = setTimeout(refresh, msToMidnight + 1000);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => {
      clearTimeout(timer);
      sub.remove();
    };
  }, [today]);

  return today;
}
