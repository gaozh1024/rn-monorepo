import type { AppHealthErrorPayload } from '../core/types';

export function createFingerprint(error: AppHealthErrorPayload) {
  const topStackLine = error.stack?.split('\n').find(line => line.trim().length > 0) ?? '';
  return hashString(`${error.name ?? ''}|${error.message}|${topStackLine}`);
}

function hashString(input: string) {
  let hash = 5381;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 33) ^ input.charCodeAt(index);
  }
  return `fp_${(hash >>> 0).toString(36)}`;
}
