import type { AppHealthReporter } from '../core/types';

interface ErrorUtilsLike {
  getGlobalHandler?: () => ((error: unknown, isFatal?: boolean) => void) | undefined;
  setGlobalHandler?: (handler: (error: unknown, isFatal?: boolean) => void) => void;
}

interface EventTargetLike {
  addEventListener?: (type: string, listener: (event: unknown) => void) => void;
  removeEventListener?: (type: string, listener: (event: unknown) => void) => void;
}

interface RejectionCallbackGlobal {
  onunhandledrejection?: ((event: unknown) => unknown) | null;
}

interface GlobalWithErrorUtils extends EventTargetLike, RejectionCallbackGlobal {
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
    installUnhandledRejectionHandler(reporter, disposers);
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

function installUnhandledRejectionHandler(
  reporter: AppHealthReporter,
  disposers: Array<() => void>
) {
  const target = getUnhandledRejectionEventTarget();
  if (target?.addEventListener && target.removeEventListener) {
    const handleRejection = (event: unknown) => {
      void reporter.captureException(getRejectionReason(event), {
        type: 'unhandled_rejection',
        level: 'error',
        source:
          typeof window !== 'undefined' && target === window
            ? 'window.onunhandledrejection'
            : 'global.onunhandledrejection',
      });
    };

    target.addEventListener('unhandledrejection', handleRejection);
    disposers.push(() => target.removeEventListener?.('unhandledrejection', handleRejection));
    return;
  }

  installCallbackUnhandledRejectionHandler(reporter, disposers);
}

function getUnhandledRejectionEventTarget() {
  if (typeof window !== 'undefined') return window;

  const globalTarget = globalThis as GlobalWithErrorUtils;
  if (globalTarget.addEventListener && globalTarget.removeEventListener) return globalTarget;

  return undefined;
}

function installCallbackUnhandledRejectionHandler(
  reporter: AppHealthReporter,
  disposers: Array<() => void>
) {
  const globalTarget = globalThis as GlobalWithErrorUtils;
  const previousHandler = globalTarget.onunhandledrejection;

  globalTarget.onunhandledrejection = event => {
    void reporter.captureException(getRejectionReason(event), {
      type: 'unhandled_rejection',
      level: 'error',
      source: 'global.onunhandledrejection',
    });
    return previousHandler?.(event);
  };

  disposers.push(() => {
    globalTarget.onunhandledrejection = previousHandler ?? null;
  });
}

function getRejectionReason(event: unknown) {
  if (event && typeof event === 'object' && 'reason' in event) {
    return (event as { reason?: unknown }).reason;
  }
  return event;
}
