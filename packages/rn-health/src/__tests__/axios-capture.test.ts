import { describe, expect, it, vi } from 'vitest';
import { installAxiosHealthInterceptor } from '..';
import type { AppHealthReporter, AxiosLike } from '..';

function reporter(): AppHealthReporter {
  return {
    captureException: vi.fn(async () => undefined),
    captureMessage: vi.fn(async () => undefined),
    addBreadcrumb: vi.fn(),
    setUser: vi.fn(),
    setTags: vi.fn(),
    flush: vi.fn(async () => undefined),
  };
}

function axiosLike() {
  let rejected: ((error: unknown) => unknown) | undefined;
  const instance: AxiosLike = {
    interceptors: {
      response: {
        use: vi.fn((_fulfilled, onRejected) => {
          rejected = onRejected;
          return 7;
        }),
        eject: vi.fn(),
      },
    },
  };
  return { instance, reject: (error: unknown) => rejected?.(error) };
}

describe('installAxiosHealthInterceptor', () => {
  it('captures 5xx axios response errors', async () => {
    const health = reporter();
    const { instance, reject } = axiosLike();
    installAxiosHealthInterceptor(instance, health, { tags: { api: 'orders' } });
    const error = {
      message: 'server down',
      config: { baseURL: 'https://api.example.com', method: 'post', url: '/orders?token=secret' },
      response: { status: 500 },
    };

    await expect(reject(error)).rejects.toBe(error);

    expect(health.captureException).toHaveBeenCalledWith(
      error,
      expect.objectContaining({
        type: 'api_error',
        level: 'error',
        source: 'axios',
        tags: { api: 'orders', status: '500' },
        extra: { method: 'POST', status: 500, url: 'https://api.example.com/orders' },
      })
    );
  });

  it('skips 4xx axios errors by default', async () => {
    const health = reporter();
    const { instance, reject } = axiosLike();
    installAxiosHealthInterceptor(instance, health);
    const error = { response: { status: 404 }, config: { method: 'get', url: '/missing' } };

    await expect(reject(error)).rejects.toBe(error);

    expect(health.captureException).not.toHaveBeenCalled();
  });

  it('captures network errors and ejects interceptor on dispose', async () => {
    const health = reporter();
    const { instance, reject } = axiosLike();
    const dispose = installAxiosHealthInterceptor(instance, health);
    const error = { message: 'network down', config: { method: 'get', url: '/orders' } };

    await expect(reject(error)).rejects.toBe(error);
    dispose();

    expect(health.captureException).toHaveBeenCalledWith(
      error,
      expect.objectContaining({ source: 'axios' })
    );
    expect(instance.interceptors.response.eject).toHaveBeenCalledWith(7);
  });
});
