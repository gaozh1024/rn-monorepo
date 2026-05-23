import type { AppObservatoryReporter } from '../core/types';

export interface AxiosLike {
  interceptors: {
    response: {
      use: (
        onFulfilled?: (value: unknown) => unknown,
        onRejected?: (error: unknown) => unknown
      ) => number;
      eject: (id: number) => void;
    };
  };
}

export interface AxiosObservatoryInterceptorOptions {
  capture4xx?: boolean;
  sanitizeUrl?: (url: string) => string;
  shouldCapture?: (error: unknown) => boolean;
  tags?: Record<string, string>;
}

interface AxiosErrorLike {
  message?: string;
  config?: { method?: string; url?: string; baseURL?: string };
  response?: { status?: number; config?: { method?: string; url?: string; baseURL?: string } };
}

export function installAxiosObservatoryInterceptor(
  axiosInstance: AxiosLike,
  reporter: AppObservatoryReporter,
  options: AxiosObservatoryInterceptorOptions = {}
) {
  const interceptorId = axiosInstance.interceptors.response.use(
    value => value,
    async error => {
      if (shouldCaptureAxiosError(error, options)) {
        const status = getAxiosStatus(error);
        const method = getAxiosMethod(error);
        const url = sanitizeAxiosUrl(error, options.sanitizeUrl);
        await reporter.captureException(error, {
          type: 'api_error',
          level: status && status < 500 ? 'warning' : 'error',
          source: 'axios',
          tags: { ...options.tags, ...(status ? { status: String(status) } : {}) },
          extra: { method, status, url },
        });
      }
      throw error;
    }
  );

  return () => axiosInstance.interceptors.response.eject(interceptorId);
}

function shouldCaptureAxiosError(error: unknown, options: AxiosObservatoryInterceptorOptions) {
  if (options.shouldCapture) return options.shouldCapture(error);
  const status = getAxiosStatus(error);
  if (!status) return true;
  return status >= 500 || Boolean(options.capture4xx && status >= 400);
}

function getAxiosStatus(error: unknown) {
  const maybe = error as AxiosErrorLike;
  return typeof maybe.response?.status === 'number' ? maybe.response.status : undefined;
}

function getAxiosMethod(error: unknown) {
  const config = getAxiosConfig(error);
  return (config.method ?? 'GET').toUpperCase();
}

function sanitizeAxiosUrl(error: unknown, sanitizer?: (url: string) => string) {
  const config = getAxiosConfig(error);
  const rawUrl = joinUrl(config.baseURL, config.url);
  return sanitizer ? sanitizer(rawUrl) : stripQuery(rawUrl);
}

function getAxiosConfig(error: unknown) {
  const maybe = error as AxiosErrorLike;
  return maybe.config ?? maybe.response?.config ?? {};
}

function joinUrl(baseURL = '', url = '') {
  if (!baseURL) return url;
  if (!url) return baseURL;
  if (/^https?:\/\//i.test(url)) return url;
  return `${baseURL.replace(/\/$/, '')}/${url.replace(/^\//, '')}`;
}

function stripQuery(rawUrl: string) {
  try {
    const url = new URL(rawUrl);
    url.search = '';
    url.hash = '';
    return url.toString();
  } catch {
    return rawUrl.split('?')[0] ?? rawUrl;
  }
}
