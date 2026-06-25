import { describe, it, expect, beforeEach } from 'vitest';
import { SseHub, type SseClient } from '@/lib/sse/hub';

function makeClient(): SseClient & { received: string[] } {
  const received: string[] = [];
  return {
    received,
    enqueue: (chunk: string) => received.push(chunk),
    close: () => undefined,
  };
}

describe('SseHub', () => {
  let hub: SseHub;

  beforeEach(() => {
    hub = new SseHub();
  });

  it('adds and counts clients per project', () => {
    hub.addClient(1, makeClient());
    hub.addClient(1, makeClient());
    hub.addClient(2, makeClient());

    expect(hub.getClientCount(1)).toBe(2);
    expect(hub.getClientCount(2)).toBe(1);
    expect(hub.getClientCount(999)).toBe(0);
  });

  it('removes a client', () => {
    const c = makeClient();
    hub.addClient(1, c);
    hub.removeClient(1, c);
    expect(hub.getClientCount(1)).toBe(0);
  });

  it('broadcasts only to clients of the target project', () => {
    const a1 = makeClient();
    const a2 = makeClient();
    const b1 = makeClient();
    hub.addClient(1, a1);
    hub.addClient(1, a2);
    hub.addClient(2, b1);

    hub.broadcast(1, {
      type: 'chat.message.created',
      data: {
        projectId: 1,
        message: { id: 1, attachments: [] } as never,
      },
    });

    expect(a1.received).toHaveLength(1);
    expect(a2.received).toHaveLength(1);
    expect(b1.received).toHaveLength(0);
    expect(a1.received[0]).toContain('chat.message.created');
  });

  it('broadcast payload is SSE formatted (data: ...\\n\\n)', () => {
    const c = makeClient();
    hub.addClient(1, c);
    hub.broadcast(1, {
      type: 'chat.message.deleted',
      data: { projectId: 1, id: 5 },
    });

    expect(c.received[0]).toMatch(/^data: .+\n\n$/);
    const parsed = JSON.parse(
      c.received[0].replace(/^data: /, '').replace(/\n\n$/, '')
    );
    expect(parsed.type).toBe('chat.message.deleted');
    expect(parsed.data.id).toBe(5);
  });

  it('does nothing when there are no clients for the project', () => {
    expect(() =>
      hub.broadcast(42, {
        type: 'note.updated',
        data: { projectId: 42 },
      })
    ).not.toThrow();
  });

  it('removes a client that throws on enqueue', () => {
    const broken: SseClient = {
      enqueue: () => {
        throw new Error('disconnected');
      },
      close: () => undefined,
    };
    hub.addClient(1, broken);
    hub.broadcast(1, { type: 'note.updated', data: { projectId: 1 } });
    expect(hub.getClientCount(1)).toBe(0);
  });
});
