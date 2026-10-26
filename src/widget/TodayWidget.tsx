import { FlexWidget, IconWidget, ListWidget, TextWidget, type HexColor } from 'react-native-android-widget';
import glyphs from '@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/Ionicons.json';
import { iconName } from '@/components/icons';
import { chipLines, type WidgetChip, type WidgetRow } from '@/lib/widget';
import { blend, palettes, type Scheme } from '@/theme/tokens';

// Fuentes copiadas al APK por el plugin (app.json): se nombran por el archivo.
const ICON_FONT = 'Ionicons';
const TEXT_FONT = 'BricolageGrotesque_500Medium';

/** Toque que marca o desmarca (lo atiende el task handler). */
export const TOGGLE = 'TOGGLE';

const WIDGET_PADDING = 12;
const ICON_TILE = 36;
const NAME_GAP = 10;
const CHECK_SIZE = 40;

type Props = {
  scheme: Scheme;
  /** null: sin sesión o sin datos todavía. */
  rows: WidgetRow[] | null;
  summary: { done: number; total: number };
  /** Anchura del widget en dp, para repartir los chips en líneas. */
  width: number;
};

const hex = (c: string) => c as HexColor;

function glyph(name: string): string {
  const code = (glyphs as Record<string, number>)[name];
  return code ? String.fromCodePoint(code) : '';
}

export function TodayWidget({ scheme, rows, summary, width }: Props) {
  const p = palettes[scheme];

  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'column',
        backgroundColor: hex(p.card),
        borderRadius: 24,
        padding: WIDGET_PADDING,
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
            <Row key={row.id} row={row} scheme={scheme} width={width} />
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

function Row({ row, scheme, width }: { row: WidgetRow; scheme: Scheme; width: number }) {
  const p = palettes[scheme];
  // Como CheckButton: la recaída en gris, para que el color siga significando éxito.
  const accent = row.quit ? p.muted : row.color;
  // Los chips van bajo el nombre, entre el icono y el check.
  const lines = chipLines(row.subtypes, width - WIDGET_PADDING * 2 - ICON_TILE - NAME_GAP * 2 - CHECK_SIZE);

  return (
    <FlexWidget style={{ width: 'match_parent', flexDirection: 'column', paddingVertical: 5 }}>
      <FlexWidget
        clickAction="OPEN_URI"
        clickActionData={{ uri: `habitat://habit/${row.id}` }}
        style={{ width: 'match_parent', flexDirection: 'row', alignItems: 'center' }}
      >
        <FlexWidget
          style={{
            width: ICON_TILE,
            height: ICON_TILE,
            borderRadius: 12,
            backgroundColor: hex(blend(row.color, p.card, 0.17)),
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <IconWidget font={ICON_FONT} icon={glyph(iconName(row.icon))} size={18} style={{ color: hex(row.color) }} />
        </FlexWidget>
        <FlexWidget style={{ flex: 1, flexDirection: 'column', marginHorizontal: NAME_GAP }}>
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
          clickAction={TOGGLE}
          clickActionData={{ habitId: row.id }}
          accessibilityLabel={label(row)}
          style={{
            width: CHECK_SIZE,
            height: CHECK_SIZE,
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

      {lines.map((line, i) => (
        <FlexWidget
          key={i}
          style={{ flexDirection: 'row', marginTop: 6, marginLeft: ICON_TILE + NAME_GAP, flexGap: 6 }}
        >
          {line.map((chip) => (
            <Chip key={chip.id} chip={chip} row={row} scheme={scheme} />
          ))}
        </FlexWidget>
      ))}
    </FlexWidget>
  );
}

function Chip({ chip, row, scheme }: { chip: WidgetChip; row: WidgetRow; scheme: Scheme }) {
  const p = palettes[scheme];
  return (
    <FlexWidget
      clickAction={TOGGLE}
      clickActionData={{ habitId: row.id, subtypeId: chip.id }}
      accessibilityLabel={`${row.name}, ${chip.name}: ${chip.on ? 'quitar' : 'marcar'} hoy`}
      style={{
        paddingHorizontal: 9,
        paddingVertical: 4,
        borderRadius: 10,
        backgroundColor: hex(chip.on ? row.color : blend(row.color, p.card, 0.12)),
        borderWidth: chip.on ? 0 : 1,
        borderColor: hex(blend(row.color, p.card, 0.35)),
      }}
    >
      <TextWidget
        text={chip.name}
        maxLines={1}
        style={{ fontSize: 12, fontFamily: TEXT_FONT, color: hex(chip.on ? p.card : p.text) }}
      />
    </FlexWidget>
  );
}

function label(row: WidgetRow): string {
  if (row.quit) return row.done ? `${row.name}: quitar la recaída de hoy` : `${row.name}: marcar recaída hoy`;
  return row.done ? `${row.name}: desmarcar hoy` : `${row.name}: marcar como hecho hoy`;
}
