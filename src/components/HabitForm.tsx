import { useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { randomUUID } from 'expo-crypto';
import { iconKeys, iconName } from './icons';
import { SUBTYPE_NAME_MAX, activeSubtypes, addSubtype, archiveSubtype } from '@/lib/subtypes';
import { openSystemSettings, remindersSupported, requestPermission } from '@/lib/notifications';
import { DESCRIPTION_MAX, NAME_MAX, shiftTime, validateHabit } from '@/lib/validation';
import { fonts, habitColors, sizes, useTokens, withAlpha } from '@/theme/tokens';
import type { HabitInput } from '@/store/habits';
import type { Frequency } from '@/types';

type Props = {
  title: string;
  initial?: HabitInput;
  onSubmit: (input: HabitInput) => void;
  onCancel: () => void;
  onDelete?: () => void;
};

const DEFAULTS: HabitInput = {
  name: '',
  description: '',
  color: habitColors[0],
  icon: iconKeys[0]!,
  frequency: 'daily',
  days: [],
  timesPerWeek: 3,
  reminderEnabled: false,
  reminderTime: '08:00',
  subtypes: [],
};

const FREQUENCIES: { value: Frequency; label: string }[] = [
  { value: 'daily', label: 'Cada día' },
  { value: 'days', label: 'Días concretos' },
  { value: 'week', label: 'Veces por semana' },
];

const DAY_LABELS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const DAY_NAMES = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];

export function HabitForm({ title, initial, onSubmit, onCancel, onDelete }: Props) {
  const t = useTokens();
  const insets = useSafeAreaInsets();
  const [form, setForm] = useState<HabitInput>(initial ?? DEFAULTS);
  const [submitted, setSubmitted] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const errors = validateHabit(form);
  const valid = Object.keys(errors).length === 0;

  const set = <K extends keyof HabitInput>(k: K, v: HabitInput[K]) => setForm((f) => ({ ...f, [k]: v }));

  const submit = () => {
    setSubmitted(true);
    if (!valid) return;
    onSubmit({ ...form, name: form.name.trim(), description: form.description.trim() });
  };

  // El permiso se pide la primera vez que se activa un recordatorio (§7).
  const toggleReminder = async (on: boolean) => {
    if (!on) return set('reminderEnabled', false);
    set('reminderEnabled', true);
    if ((await requestPermission()) === 'granted') {
      setPermissionDenied(false);
    } else {
      set('reminderEnabled', false);
      setPermissionDenied(true);
    }
  };

  const [subtypeName, setSubtypeName] = useState('');
  const [subtypeError, setSubtypeError] = useState<string | null>(null);
  const addSubtypeFromInput = () => {
    const r = addSubtype(form.subtypes, subtypeName, randomUUID());
    if ('error' in r) return setSubtypeError(r.error);
    set('subtypes', r.list);
    setSubtypeName('');
    setSubtypeError(null);
  };

  const toggleDay = (d: number) =>
    set('days', form.days.includes(d) ? form.days.filter((x) => x !== d) : [...form.days, d].sort());

  const inputStyle = {
    fontFamily: fonts.regular,
    fontSize: 16,
    color: t.text,
    backgroundColor: t.card,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: sizes.minTouch,
  };

  return (
    <KeyboardAvoidingView className="flex-1 bg-bg" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Barra superior */}
      <View
        className="flex-row items-center justify-between px-2"
        style={{ paddingTop: insets.top + 4, paddingBottom: 4 }}
      >
        <HeaderButton label="Cancelar" onPress={onCancel} color={t.muted} />
        <Text style={{ fontFamily: fonts.bold, fontSize: 17, color: t.text }}>{title}</Text>
        <HeaderButton label="Guardar" onPress={submit} color={form.color} bold />
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32, gap: 22 }}
      >
        {/* Vista previa del icono */}
        <View className="items-center">
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: 20,
              backgroundColor: withAlpha(form.color, 0.17),
            }}
            className="items-center justify-center"
          >
            <Ionicons name={iconName(form.icon)} size={32} color={form.color} />
          </View>
        </View>

        <Field label="Nombre" error={submitted ? errors.name : undefined}>
          <TextInput
            value={form.name}
            onChangeText={(v) => set('name', v)}
            placeholder="Ej. Beber agua"
            placeholderTextColor={t.muted}
            maxLength={NAME_MAX}
            autoFocus={!initial}
            returnKeyType="next"
            style={inputStyle}
            accessibilityLabel="Nombre del hábito"
          />
        </Field>

        <Field label="Descripción">
          <TextInput
            value={form.description}
            onChangeText={(v) => set('description', v)}
            placeholder="Opcional"
            placeholderTextColor={t.muted}
            maxLength={DESCRIPTION_MAX}
            style={inputStyle}
            accessibilityLabel="Descripción"
          />
        </Field>

        <Field label="Color">
          <View className="flex-row justify-between">
            {habitColors.map((c) => {
              const selected = c === form.color;
              return (
                <Pressable
                  key={c}
                  onPress={() => set('color', c)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  accessibilityLabel={`Color ${c}`}
                  style={{
                    width: sizes.minTouch,
                    height: sizes.minTouch,
                    borderRadius: sizes.minTouch / 2,
                    borderWidth: 2.5,
                    borderColor: selected ? c : 'transparent',
                  }}
                  className="items-center justify-center"
                >
                  <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: c }} />
                </Pressable>
              );
            })}
          </View>
        </Field>

        <Field label="Icono">
          <View className="flex-row justify-between">
            {iconKeys.map((k) => {
              const selected = k === form.icon;
              return (
                <Pressable
                  key={k}
                  onPress={() => set('icon', k)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  accessibilityLabel={`Icono ${k}`}
                  style={{
                    width: sizes.minTouch,
                    height: sizes.minTouch,
                    borderRadius: sizes.iconTileRadius,
                    backgroundColor: selected ? withAlpha(form.color, 0.17) : t.card,
                    borderWidth: selected ? 1.5 : 0,
                    borderColor: form.color,
                  }}
                  className="items-center justify-center"
                >
                  <Ionicons name={iconName(k)} size={22} color={selected ? form.color : t.muted} />
                </Pressable>
              );
            })}
          </View>
        </Field>

        <Field label="Frecuencia" error={submitted ? (errors.days ?? errors.timesPerWeek) : undefined}>
          <View className="flex-row rounded-2xl bg-card p-1" style={{ gap: 4 }}>
            {FREQUENCIES.map(({ value, label }) => {
              const selected = value === form.frequency;
              return (
                <Pressable
                  key={value}
                  onPress={() => set('frequency', value)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  className="flex-1 items-center justify-center rounded-xl"
                  style={{ minHeight: sizes.minTouch, backgroundColor: selected ? form.color : 'transparent' }}
                >
                  <Text
                    style={{
                      fontFamily: fonts.medium,
                      fontSize: 13.5,
                      color: selected ? t.card : t.text,
                      textAlign: 'center',
                    }}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {form.frequency === 'days' && (
            <View className="mt-3 flex-row justify-between">
              {DAY_LABELS.map((l, d) => {
                const selected = form.days.includes(d);
                return (
                  <Pressable
                    key={d}
                    onPress={() => toggleDay(d)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: selected }}
                    accessibilityLabel={DAY_NAMES[d]}
                    style={{
                      width: sizes.minTouch,
                      height: sizes.minTouch,
                      borderRadius: sizes.minTouch / 2,
                      backgroundColor: selected ? form.color : t.card,
                    }}
                    className="items-center justify-center"
                  >
                    <Text style={{ fontFamily: fonts.medium, color: selected ? t.card : t.text }}>{l}</Text>
                  </Pressable>
                );
              })}
            </View>
          )}

          {form.frequency === 'week' && (
            <View className="mt-3 flex-row items-center justify-between rounded-2xl bg-card px-4 py-1">
              <Text style={{ fontFamily: fonts.regular, fontSize: 16, color: t.text }}>Veces por semana</Text>
              <Stepper
                value={String(form.timesPerWeek)}
                onMinus={() => set('timesPerWeek', Math.max(1, form.timesPerWeek - 1))}
                onPlus={() => set('timesPerWeek', Math.min(7, form.timesPerWeek + 1))}
                label="veces por semana"
              />
            </View>
          )}
        </Field>

        <Field label="Subtipos" error={subtypeError ?? undefined}>
          {activeSubtypes(form.subtypes).length > 0 && (
            <View className="flex-row flex-wrap" style={{ gap: 8 }}>
              {activeSubtypes(form.subtypes).map((s) => (
                <View
                  key={s.id}
                  className="flex-row items-center rounded-full"
                  style={{ backgroundColor: withAlpha(form.color, 0.14), paddingLeft: 14 }}
                >
                  <Text style={{ fontFamily: fonts.medium, fontSize: 15, color: t.text }}>{s.name}</Text>
                  <Pressable
                    onPress={() => set('subtypes', archiveSubtype(form.subtypes, s.id))}
                    accessibilityRole="button"
                    accessibilityLabel={`Quitar ${s.name}`}
                    className="items-center justify-center"
                    style={{ width: 40, height: 40 }}
                  >
                    <Ionicons name="close" size={18} color={t.muted} />
                  </Pressable>
                </View>
              ))}
            </View>
          )}
          <View className="flex-row" style={{ gap: 8 }}>
            <TextInput
              value={subtypeName}
              onChangeText={(v) => {
                setSubtypeName(v);
                setSubtypeError(null);
              }}
              onSubmitEditing={addSubtypeFromInput}
              submitBehavior="submit"
              placeholder="Opcional. Ej. Gym, Pádel…"
              placeholderTextColor={t.muted}
              maxLength={SUBTYPE_NAME_MAX}
              returnKeyType="done"
              style={[inputStyle, { flex: 1 }]}
              accessibilityLabel="Nuevo subtipo"
            />
            <Pressable
              onPress={addSubtypeFromInput}
              accessibilityRole="button"
              accessibilityLabel="Añadir subtipo"
              className="items-center justify-center rounded-2xl bg-card"
              style={{ width: sizes.minTouch + 4, minHeight: sizes.minTouch }}
            >
              <Ionicons name="add" size={22} color={form.color} />
            </Pressable>
          </View>
        </Field>

        <Field label="Recordatorio">
          <View className="rounded-2xl bg-card px-4 py-1">
            <View className="flex-row items-center justify-between" style={{ minHeight: sizes.minTouch }}>
              <Text style={{ fontFamily: fonts.regular, fontSize: 16, color: t.text }}>Avisarme</Text>
              <Switch
                value={form.reminderEnabled}
                onValueChange={(v) => void toggleReminder(v)}
                trackColor={{ false: withAlpha(t.muted, 0.35), true: form.color }}
                thumbColor="#ffffff"
                accessibilityLabel="Activar recordatorio"
              />
            </View>
            {form.reminderEnabled && (
              <View className="flex-row items-center justify-between" style={{ minHeight: sizes.minTouch }}>
                <Text style={{ fontFamily: fonts.regular, fontSize: 16, color: t.text }}>Hora</Text>
                <View className="flex-row items-center" style={{ gap: 12 }}>
                  <Stepper
                    value={form.reminderTime.slice(0, 2)}
                    onMinus={() => set('reminderTime', shiftTime(form.reminderTime, -60))}
                    onPlus={() => set('reminderTime', shiftTime(form.reminderTime, 60))}
                    label="hora"
                  />
                  <Text style={{ fontFamily: fonts.bold, color: t.text }}>:</Text>
                  <Stepper
                    value={form.reminderTime.slice(3, 5)}
                    onMinus={() => set('reminderTime', shiftTime(form.reminderTime, -5))}
                    onPlus={() => set('reminderTime', shiftTime(form.reminderTime, 5))}
                    label="minutos"
                  />
                </View>
              </View>
            )}
          </View>
        </Field>

        {!remindersSupported && form.reminderEnabled && (
          <Note text="Los recordatorios llegan en la app de Android. Aquí solo se guarda la hora." />
        )}
        {permissionDenied && (
          <View style={{ gap: 8 }}>
            <Note text="Habitat no tiene permiso para enviarte notificaciones. Actívalo en los ajustes del sistema para usar recordatorios." />
            <Pressable
              onPress={openSystemSettings}
              accessibilityRole="button"
              className="items-center justify-center rounded-2xl bg-card"
              style={{ minHeight: sizes.minTouch }}
            >
              <Text style={{ fontFamily: fonts.medium, fontSize: 15, color: t.text }}>Abrir ajustes</Text>
            </Pressable>
          </View>
        )}

        {onDelete && (
          <Pressable
            onPress={onDelete}
            accessibilityRole="button"
            className="items-center justify-center rounded-2xl bg-card"
            style={{ minHeight: 52 }}
          >
            <Text style={{ fontFamily: fonts.medium, fontSize: 16, color: '#e5484d' }}>Eliminar hábito</Text>
          </Pressable>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  const t = useTokens();
  return (
    <View style={{ gap: 8 }}>
      <Text style={{ fontFamily: fonts.medium, fontSize: 13.5, color: t.muted }}>{label}</Text>
      {children}
      {error && <Text style={{ fontFamily: fonts.regular, fontSize: 13.5, color: '#e5484d' }}>{error}</Text>}
    </View>
  );
}

function Note({ text }: { text: string }) {
  const t = useTokens();
  return (
    <View className="flex-row rounded-2xl bg-card px-4 py-3" style={{ gap: 10, marginTop: -10 }}>
      <Ionicons name="information-circle-outline" size={18} color={t.muted} />
      <Text style={{ flex: 1, fontFamily: fonts.regular, fontSize: 13.5, color: t.muted, lineHeight: 19 }}>{text}</Text>
    </View>
  );
}

function HeaderButton({
  label,
  onPress,
  color,
  bold,
}: {
  label: string;
  onPress: () => void;
  color: string;
  bold?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      className="justify-center px-3"
      style={{ minHeight: sizes.minTouch, minWidth: sizes.minTouch }}
    >
      <Text style={{ fontFamily: bold ? fonts.bold : fonts.regular, fontSize: 16, color }}>{label}</Text>
    </Pressable>
  );
}

function Stepper({
  value,
  onMinus,
  onPlus,
  label,
}: {
  value: string;
  onMinus: () => void;
  onPlus: () => void;
  label: string;
}) {
  const t = useTokens();
  const btn = (icon: 'remove' | 'add', onPress: () => void, a11y: string) => (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={a11y}
      style={{ width: sizes.minTouch, height: sizes.minTouch }}
      className="items-center justify-center"
    >
      <Ionicons name={icon} size={20} color={t.muted} />
    </Pressable>
  );
  return (
    <View className="flex-row items-center">
      {btn('remove', onMinus, `Menos ${label}`)}
      <Text
        style={{ fontFamily: fonts.medium, fontSize: 17, color: t.text, minWidth: 24, textAlign: 'center' }}
        accessibilityLabel={`${value} ${label}`}
      >
        {value}
      </Text>
      {btn('add', onPlus, `Más ${label}`)}
    </View>
  );
}
