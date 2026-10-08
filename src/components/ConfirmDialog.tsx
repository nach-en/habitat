import { useEffect, useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { answerConfirm, subscribeConfirm, type ConfirmRequest } from '@/lib/confirmQueue';
import { fonts, sizes, useTokens } from '@/theme/tokens';

const DANGER = '#e5484d';

/** Diálogo de confirmación destructiva para web (en nativo se usa Alert). */
export function ConfirmDialog() {
  const t = useTokens();
  const [req, setReq] = useState<ConfirmRequest | null>(null);
  useEffect(() => subscribeConfirm(setReq), []);

  return (
    <Modal visible={req !== null} transparent animationType="fade" onRequestClose={() => answerConfirm(false)}>
      <Pressable
        onPress={() => answerConfirm(false)}
        accessibilityLabel="Cancelar"
        className="flex-1 items-center justify-center px-6"
        style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      >
        {req && (
          <Pressable
            onPress={() => {}}
            accessible={false}
            accessibilityRole="alert"
            style={{ backgroundColor: t.card, borderRadius: sizes.cardRadius, padding: 20, gap: 8, width: '100%', maxWidth: 400 }}
          >
            <Text style={{ fontFamily: fonts.bold, fontSize: 18, color: t.text }}>{req.title}</Text>
            <Text style={{ fontFamily: fonts.regular, fontSize: 15, color: t.muted, lineHeight: 21 }}>{req.message}</Text>
            <View className="flex-row" style={{ gap: 10, marginTop: 12 }}>
              <Pressable
                onPress={() => answerConfirm(false)}
                accessibilityRole="button"
                className="flex-1 items-center justify-center rounded-2xl"
                style={{ minHeight: 48, backgroundColor: t.bg }}
              >
                <Text style={{ fontFamily: fonts.medium, fontSize: 16, color: t.text }}>Cancelar</Text>
              </Pressable>
              <Pressable
                onPress={() => answerConfirm(true)}
                accessibilityRole="button"
                className="flex-1 items-center justify-center rounded-2xl"
                style={{ minHeight: 48, backgroundColor: DANGER }}
              >
                <Text style={{ fontFamily: fonts.medium, fontSize: 16, color: '#ffffff' }}>{req.action}</Text>
              </Pressable>
            </View>
          </Pressable>
        )}
      </Pressable>
    </Modal>
  );
}
