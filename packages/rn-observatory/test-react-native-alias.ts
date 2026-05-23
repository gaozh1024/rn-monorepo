export const Platform = {
  OS: 'ios',
  Version: '17.0',
  select: (mapping: Record<string, unknown>) => mapping.ios ?? mapping.default,
};

const listeners = new Set<(state: string) => void>();

export const AppState = {
  currentState: 'active',
  addEventListener: (_event: string, listener: (state: string) => void) => {
    listeners.add(listener);
    return {
      remove: () => listeners.delete(listener),
    };
  },
  __emit: (state: string) => {
    AppState.currentState = state;
    listeners.forEach(listener => listener(state));
  },
};
