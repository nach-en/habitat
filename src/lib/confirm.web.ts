import { requestConfirm } from './confirmQueue';

// En web, Alert.alert de react-native-web no muestra botones y window.confirm
// no siempre aparece: se usa el diálogo propio (ConfirmDialog, montado en el layout).
export function confirmDestructive(title: string, message: string, action: string): Promise<boolean> {
  return requestConfirm(title, message, action);
}
