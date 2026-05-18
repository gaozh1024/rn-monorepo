import type { AppHealthEvent, AppHealthSanitizer } from '../core/types';

const SENSITIVE_KEYS = [
  'password',
  'token',
  'accessToken',
  'refreshToken',
  'authorization',
  'cookie',
  'phone',
  'idCard',
  'email',
];

const REDACTED = '[REDACTED]';

export const defaultAppHealthSanitizer: AppHealthSanitizer = event =>
  redactSensitiveValue(event) as AppHealthEvent;

export function redactSensitiveValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(item => redactSensitiveValue(item));
  }

  if (!value || typeof value !== 'object') return value;

  const output: Record<string, unknown> = {};
  Object.entries(value).forEach(([key, item]) => {
    if (isSensitiveKey(key)) {
      output[key] = REDACTED;
      return;
    }
    output[key] = redactSensitiveValue(item);
  });
  return output;
}

function isSensitiveKey(key: string) {
  const normalized = key.toLowerCase();
  return SENSITIVE_KEYS.some(sensitive => normalized.includes(sensitive.toLowerCase()));
}
