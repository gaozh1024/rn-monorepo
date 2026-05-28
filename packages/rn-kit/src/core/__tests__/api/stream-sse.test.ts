import { describe, expect, it, vi } from 'vitest';
import { readApiSSEStream } from '../../api/stream-sse';

describe('readApiSSEStream', () => {
  it('parses event and JSON data frames', async () => {
    const payload = `event: conversation.message.delta\ndata: {"content":"hello"}\n\n`;
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(payload));
        controller.close();
      },
    });

    const onEvent = vi.fn();
    const onDone = vi.fn();

    await readApiSSEStream(stream, { onEvent, onDone });

    expect(onEvent).toHaveBeenCalledWith({
      event: 'conversation.message.delta',
      rawData: '{"content":"hello"}',
      data: { content: 'hello' },
    });
    expect(onDone).toHaveBeenCalled();
  });

  it('keeps plain text data when JSON parsing is disabled', async () => {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('event: ping\ndata: ok\n\n'));
        controller.close();
      },
    });

    const onEvent = vi.fn();
    await readApiSSEStream(stream, { onEvent, parseJson: false });

    expect(onEvent).toHaveBeenCalledWith({
      event: 'ping',
      rawData: 'ok',
      data: 'ok',
    });
  });
});
