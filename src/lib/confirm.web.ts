// En web, Alert.alert de react-native-web no muestra botones: se usa window.confirm.
export function confirmDestructive(title: string, message: string, _action: string): Promise<boolean> {
  return Promise.resolve(window.confirm(`${title}\n\n${message}`));
}
