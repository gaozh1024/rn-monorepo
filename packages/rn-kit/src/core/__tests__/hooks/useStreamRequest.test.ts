import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useStreamRequest } from '../../hooks/useStreamRequest';

describe('useStreamRequest', () => {
  it('starts a stream request and stores the resolved data', async () => {
    const abort = vi.fn();
    const factory = vi.fn(async () => ({
      data: { stream: 'ok' },
      abort,
    }));

    const { result } = renderHook(() => useStreamRequest(factory));

    await act(async () => {
      await result.current.start();
    });

    expect(factory).toHaveBeenCalled();
    expect(result.current.data).toEqual({ stream: 'ok' });
    expect(result.current.loading).toBe(false);
  });

  it('stops the active request through abort', async () => {
    const abort = vi.fn();
    const factory = vi.fn(async () => ({
      data: { stream: 'ok' },
      abort,
    }));

    const { result } = renderHook(() => useStreamRequest(factory));

    await act(async () => {
      await result.current.start();
    });

    act(() => {
      result.current.stop();
    });

    expect(abort).toHaveBeenCalled();
    expect(result.current.loading).toBe(false);
  });
});
