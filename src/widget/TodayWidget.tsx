import { FlexWidget, IconWidget, ListWidget, TextWidget, type HexColor } from 'react-native-android-widget';
import glyphs from '@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/Ionicons.json';
import { iconName } from '@/components/icons';
import type { WidgetRow } from '@/lib/widget';
import { blend, palettes, type Scheme } from '@/theme/tokens';

// Fuentes copiadas al APK por el plugin (app.json): se nombran por el archivo.
const ICON_FONT = 'Ionicons';
const TEXT_FONT = 'BricolageGrotesque_500Medium';

/** Toque que marca o desmarca hoy (lo atiende el task handler). */
export const TOGGLE = 'TOGGLE';

type Props = {
  scheme: Scheme;
  /** null: sin sesión o sin datos todavía. */
  rows: WidgetRow[] | null;
  summary: { done: number; total: number };
};

const hex = (c: string) => c as HexColor;

function glyph(name: string): string {
  const code = (glyphs as Record<string, number>)[name];
  return code ? String.fromCodePoint(code) : '';
}

export function TodayWidget({ scheme, rows, summary }: Props) {
  const p = palettes[scheme];

  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'column',
        backgroundColor: hex(p.card),
        borderRadius: 24,
        padding: 12,
      }}
    >
      <FlexWidget
        clickAction="OPEN_APP"
        style={{
          width: 'match_parent',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingHorizontal: 4,
          paddingBottom: 6,
        }}
      >
        <TextWidget text="Hoy" style={{ fontSize: 17, fontFamily: TEXT_FONT, color: hex(p.text) }} />
        {rows && summary.total > 0 && (
          <TextWidget
            text={`${summary.done}/${summary.total}`}
            style={{ fontSize: 14, fontFamily: TEXT_FONT, color: hex(p.muted) }}
          />
        )}
      </FlexWidget>

      {rows && rows.length > 0 ? (
        <ListWidget style={{ height: 'match_parent', width: 'match_parent' }}>
          {rows.map((row) => (
            <Row key={row.id} row={row} scheme={scheme} />
          ))}
        </ListWidget>
      ) : (
        <FlexWidget
          clickAction="OPEN_APP"
          style={{ height: 'match_parent', width: 'match_parent', justifyContent: 'center', alignItems: 'center' }}
        >
          <TextWidget
            text={rows ? 'Nada pendiente hoy' : 'Abre Habitat para empezar'}
            style={{ fontSize: 14, fontFamily: TEXT_FONT, color: hex(p.muted) }}
          />
        </FlexWidget>
      )}
    </FlexWidget>
  );
}

function Row({ row, scheme }: { row: WidgetRow; scheme: Scheme }) {
  const p = palettes[scheme];
  const open = { clickAction: 'OPEN_URI', clickActionData: { uri: `habitat://habit/${row.id}` } };
  const press =
    row.action === 'toggle' ? { clickAction: TOGGLE, clickActionData: { habitId: row.id } } : open;
  // Como CheckButton: la recaída en gris, para que el color siga significando éxito.
  const accent = row.quit ? p.muted : row.color;

  return (
    <FlexWidget {...open} style={{ width: 'match_parent', flexDirection: 'row', alignItems: 'center', paddingVertical: 5 }}>
      <FlexWidget
        style={{
          width: 36,
          height: 36,
          borderRadius: 12,
          backgroundColor: hex(blend(row.color, p.card, 0.17)),
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <IconWidget font={ICON_FONT} icon={glyph(iconName(row.icon))} size={18} style={{ color: hex(row.color) }} />
      </FlexWidget>
      <FlexWidget style={{ flex: 1, flexDirection: 'column', marginHorizontal: 10 }}>
        <TextWidget
          text={row.name}
          maxLines={1}
          truncate="END"
          style={{ fontSize: 15, fontFamily: TEXT_FONT, color: hex(p.text) }}
        />
        <TextWidget
          text={row.detail}
          maxLines={1}
          truncate="END"
          style={{ fontSize: 12, fontFamily: TEXT_FONT, color: hex(p.muted) }}
        />
      </FlexWidget>
      <FlexWidget
        {...press}
        accessibilityLabel={label(row)}
        style={{
          width: 40,
          height: 40,
          borderRadius: 13,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: hex(row.done ? accent : blend(accent, p.card, row.quit ? 0.08 : 0.12)),
          borderWidth: row.done ? 0 : 1.5,
          borderColor: hex(blend(accent, p.card, row.quit ? 0.3 : 0.45)),
        }}
      >
        <IconWidget
          font={ICON_FONT}
          icon={glyph(row.quit ? 'close' : 'checkmark')}
          size={22}
          style={{ color: hex(row.done ? p.card : blend(accent, p.card, row.quit ? 0.6 : 0.55)) }}
        />
      </FlexWidget>
    </FlexWidget>
  );
}

function label(row: WidgetRow): string {
  if (row.quit) return row.done ? `${row.name}: recaída hoy` : `${row.name}: abrir`;
  if (row.action === 'open') return `${row.name}: elegir subtipo`;
  return row.done ? `${row.name}: hecho hoy` : `${row.name}: marcar como hecho hoy`;
}
