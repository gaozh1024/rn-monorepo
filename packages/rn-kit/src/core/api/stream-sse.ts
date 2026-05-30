import type { ApiSSEMessage, ApiSSEReaderOptions } from './types';

function coerceData<T>(rawData: string, parseJson: boolean): T | string {
  if (!parseJson) return rawData;

  try {
    return JSON.parse(rawData) as T;
  } catch {
    return rawData;
  }
}

function normalizeLineEndings(value: string) {
  return value.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

export async function readApiSSEStream<T = unknown>(
  stream: ReadableStream<Uint8Array>,
  options: ApiSSEReaderOptions<T> = {}
) {
  const reader = stream.getReader();
  const decoder = new TextDecoder('utf-8');
  const parseJson = options.parseJson ?? true;
  let buffer = '';

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;

      buffer = normalizeLineEndings(buffer + decoder.decode(value, { stream: true }));
      const frames = buffer.split('\n\n');
      buffer = frames.pop() ?? '';

      for (const frame of frames) {
        const message = parseSSEFrame<T>(frame, parseJson);
        if (message) {
          options.onEvent?.(message);
          options.onMessage?.(message.event, message.rawData, message);
        }
      }
    }

    const finalChunk = decoder.decode();
    if (finalChunk) {
      buffer += finalChunk;
    }

    if (buffer.trim()) {
      const message = parseSSEFrame<T>(buffer, parseJson);
      if (message) {
        options.onEvent?.(message);
        options.onMessage?.(message.event, message.rawData, message);
      }
    }

    options.onDone?.();
  } catch (error) {
    options.onError?.(error);
    throw error;
  } finally {
    reader.releaseLock();
  }
}

function parseSSEFrame<T>(frame: string, parseJson: boolean): ApiSSEMessage<T> | null {
  const lines = frame
    .split('\n')
    .map(line => line.trimEnd())
    .filter(Boolean);

  if (!lines.length) return null;

  let event = 'message';
  const dataLines: string[] = [];

  for (const line of lines) {
    if (line.startsWith(':')) continue;
    if (line.startsWith('event:')) {
      event = line.slice('event:'.length).trim();
      continue;
    }
    if (line.startsWith('data:')) {
      dataLines.push(line.slice('data:'.length).trimStart());
    }
  }

  const rawData = dataLines.join('\n');

  return {
    event,
    rawData,
    data: coerceData<T>(rawData, parseJson),
  };
}
