import type { AppHealthErrorPayload } from '../core/types';

export function serializeError(error: unknown): AppHealthErrorPayload {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message || String(error),
      stack: error.stack,
    };
  }

  if (typeof error === 'object' && error !== null) {
    const maybe = error as { name?: unknown; message?: unknown; stack?: unknown };
    return {
      name: typeof maybe.name === 'string' ? maybe.name : undefined,
      message: typeof maybe.message === 'string' ? maybe.message : safeStringify(error),
      stack: typeof maybe.stack === 'string' ? maybe.stack : undefined,
    };
  }

  return { message: String(error) };
}

function safeStringify(value: unknown) {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}
