import type {
  ApiMethod,
  ApiStreamFetcher,
  ApiStreamRequestOptions,
  ApiStreamResponse,
} from './types';

function isBodyInitLike(value: unknown): value is BodyInit {
  if (typeof value === 'string' || value instanceof ArrayBuffer || ArrayBuffer.isView(value)) {
    return true;
  }

  if (typeof Blob !== 'undefined' && value instanceof Blob) return true;
  if (typeof FormData !== 'undefined' && value instanceof FormData) return true;
  if (typeof URLSearchParams !== 'undefined' && value instanceof URLSearchParams) return true;
  if (typeof ReadableStream !== 'undefined' && value instanceof ReadableStream) return true;
  return false;
}

function createFallbackReadableStream(text: string) {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(text);

  return new ReadableStream<Uint8Array>({
    start(controller) {
      if (bytes.length > 0) {
        controller.enqueue(bytes);
      }
      controller.close();
    },
  });
}

function createAbortBridge(
  timeoutMs: number | undefined,
  externalSignal?: AbortSignal
): { signal: AbortSignal; abort: () => void } {
  const controller = new AbortController();

  if (externalSignal) {
    if (externalSignal.aborted) {
      controller.abort();
    } else {
      externalSignal.addEventListener('abort', () => controller.abort(), { once: true });
    }
  }

  const timeout =
    timeoutMs && timeoutMs > 0 ? setTimeout(() => controller.abort(), timeoutMs) : undefined;

  return {
    signal: controller.signal,
    abort: () => {
      if (timeout) clearTimeout(timeout);
      controller.abort();
    },
  };
}

function normalizeRequestBody(body: ApiStreamRequestOptions['body']) {
  if (body === undefined) return undefined;
  if (isBodyInitLike(body)) return body;
  return JSON.stringify(body);
}

function normalizeMethod(method?: ApiMethod) {
  return (method ?? 'POST') as ApiMethod;
}

function toExpoFetchInit(init: RequestInit) {
  return {
    method: init.method,
    headers: init.headers,
    body: init.body ?? undefined,
    signal: init.signal ?? undefined,
    credentials: init.credentials,
    redirect: init.redirect,
    integrity: init.integrity,
    keepalive: init.keepalive,
    mode: init.mode,
    referrer: init.referrer,
  };
}

async function getDefaultStreamFetcher(): Promise<ApiStreamFetcher> {
  const { fetch: expoFetch } = await import('expo/fetch');
  return async (url, init) => expoFetch(url, init ? toExpoFetchInit(init) : undefined);
}

export async function createApiStreamRequest(
  url: string,
  options: ApiStreamRequestOptions = {}
): Promise<ApiStreamResponse> {
  const method = normalizeMethod(options.method);
  const fetcher = options.fetcher ?? (await getDefaultStreamFetcher());
  const headers = new Headers(options.headers);
  const body = normalizeRequestBody(options.body);
  const isJsonRecord =
    body !== undefined &&
    !isBodyInitLike(options.body) &&
    typeof options.body === 'object' &&
    options.body !== null;

  if (!headers.has('accept')) {
    headers.set('accept', options.protocol === 'sse' ? 'text/event-stream' : '*/*');
  }

  if (isJsonRecord && !headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }

  const abortBridge = createAbortBridge(options.timeoutMs, options.signal);

  const requestInit: RequestInit = {
    method,
    headers,
    body,
    signal: abortBridge.signal,
  };

  const response = await fetcher(url, requestInit);

  if (!response.ok) {
    abortBridge.abort();
    throw new Error(`Stream request failed with status ${response.status}`);
  }

  let stream: ReadableStream<Uint8Array> | null = null;

  try {
    stream = response.body as ReadableStream<Uint8Array> | null;
  } catch {
    stream = null;
  }

  if (!stream) {
    const text = await response.text();
    stream = createFallbackReadableStream(text);
  }

  return {
    stream,
    response,
    abort: abortBridge.abort,
  };
}
