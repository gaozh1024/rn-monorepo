import { describe, expect, it } from 'vitest';
import { defaultAppObservatorySanitizer } from '..';
import type { AppObservatoryEvent } from '..';

describe('defaultAppObservatorySanitizer', () => {
  it('redacts sensitive fields recursively', () => {
    const event: AppObservatoryEvent = {
      id: 'evt',
      type: 'custom',
      level: 'info',
      timestamp: 1,
      app: {},
      device: { platform: 'ios' },
      session: { id: 'sess', startedAt: 1 },
      extra: {
        token: 'secret',
        nested: { password: '123456', keep: 'ok' },
      },
      breadcrumbs: [
        {
          message: 'api',
          data: { authorization: 'Bearer abc' },
        },
      ],
    };

    expect(defaultAppObservatorySanitizer(event)).toMatchObject({
      extra: { token: '[REDACTED]', nested: { password: '[REDACTED]', keep: 'ok' } },
      breadcrumbs: [{ data: { authorization: '[REDACTED]' } }],
    });
  });
});
