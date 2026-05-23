import { AppState } from 'react-native';

export interface AppStateMonitorOptions {
  onForeground?: () => void;
  onBackground?: () => void;
}

export function installAppStateMonitor(options: AppStateMonitorOptions) {
  let currentState = AppState.currentState;

  const subscription = AppState.addEventListener('change', nextState => {
    const wasBackground = currentState === 'background' || currentState === 'inactive';
    const isBackground = nextState === 'background' || nextState === 'inactive';

    if (wasBackground && nextState === 'active') {
      options.onForeground?.();
    }

    if (!wasBackground && isBackground) {
      options.onBackground?.();
    }

    currentState = nextState;
  });

  return () => subscription.remove();
}
