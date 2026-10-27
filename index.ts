// Entrada del bundle: registra el widget de Android antes de arrancar expo-router,
// para que sus toques se atiendan también sin la app abierta.
import { registerWidget } from './src/widget';
import 'expo-router/entry';

registerWidget();
