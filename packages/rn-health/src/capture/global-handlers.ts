import type { AppHealthReporter } from '../core/types';

interface ErrorUtilsLike {
  getGlobalHandler?: () => ((error: unknown, isFatal?: boolean) => void) | undefined;
  setGlobalHandler?: (handler: (error: unknown, isFatal?: boolean) => void) => void;
}

interface GlobalWithErrorUtils {
  ErrorUtils?: ErrorUtilsLike;
}

export interface GlobalErrorHandlerOptions {
  captureGlobalErrors?: boolean;
  captureUnhandledRejections?: boolean;
}

export function installGlobalErrorHandlers(
  reporter: AppHealthReporter,
  options: GlobalErrorHandlerOptions = {}
) {
  const disposers: Array<() => void> = [];

  if (options.captureGlobalErrors ?? true) {
    installReactNativeErrorHandler(reporter, disposers);
    installWebErrorHandler(reporter, disposers);
  }

  if (options.captureUnhandledRejections ?? true) {
    installWebUnhandledRejectionHandler(reporter, disposers);
  }

  return () => {
    disposers.reverse().forEach(dispose => dispose());
  };
}

function installReactNativeErrorHandler(reporter: AppHealthReporter, disposers: Array<() => void>) {
  const errorUtils = (globalThis as GlobalWithErrorUtils).ErrorUtils;
  if (!errorUtils?.setGlobalHandler) return;

  const previousHandler = errorUtils.getGlobalHandler?.();
  errorUtils.setGlobalHandler((error, isFatal) => {
    void reporter.captureException(error, {
      type: 'js_error',
      level: isFatal ? 'fatal' : 'error',
      source: 'global_error_utils',
      extra: { isFatal: Boolean(isFatal) },
    });
    previousHandler?.(error, isFatal);
  });

  disposers.push(() => {
    if (previousHandler) errorUtils.setGlobalHandler?.(previousHandler);
  });
}

function installWebErrorHandler(reporter: AppHealthReporter, disposers: Array<() => void>) {
  if (typeof window === 'undefined') return;

  const handleError = (event: ErrorEvent) => {
    void reporter.captureException(event.error ?? event.message, {
      type: 'js_error',
      level: 'fatal',
      source: 'window.onerror',
      extra: {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      },
    });
  };

  window.addEventListener('error', handleError);
  disposers.push(() => window.removeEventListener('error', handleError));
}

function installWebUnhandledRejectionHandler(
  reporter: AppHealthReporter,
  disposers: Array<() => void>
) {
  if (typeof window === 'undefined') return;

  const handleRejection = (event: PromiseRejectionEvent) => {
    void reporter.captureException(event.reason, {
      type: 'unhandled_rejection',
      level: 'error',
      source: 'window.onunhandledrejection',
    });
  };

  window.addEventListener('unhandledrejection', handleRejection);
  disposers.push(() => window.removeEventListener('unhandledrejection', handleRejection));
}
