import { describe, expect, it } from 'vitest';
import type { WebSocketEvent, WebSocketLike } from '../interfaces/relay';
import {
  decodeMessage,
  encodeMessage,
  type ProtocolEnvelope,
} from '../protocol';
import { RelayConnection } from '../services/relay-connection';

class FakeSocket implements WebSocketLike {
  readonly readyState = 1;
  private readonly listeners = new Map<
    string,
    Set<(event: WebSocketEvent) => void>
  >();

  constructor() {
    queueMicrotask(() => this.emit('open', {}));
  }

  send(data: string): void {
    const message = decodeMessage(data);
    if (message.type === 'version_negotiate') {
      this.respond('version_negotiate_ack', message.request_id, {
        negotiated_version: 1,
        supported_versions: [1],
      });
    }
    if (message.type === 'auth') {
      this.respond('auth_response', message.request_id, {
        authenticated: true,
        agent_id: 'agent-1',
        organization_id: 'org-1',
      });
    }
    if (message.type === 'open_tunnel') {
      this.respond('open_tunnel_ack', message.request_id, {
        tunnel_id: 'tunnel-1',
        public_url: 'https://tunnel.example.test',
      });
    }
    if (message.type === 'close_tunnel') {
      this.respond('close_tunnel', message.request_id, message.payload);
    }
  }

  close(): void {
    this.emit('close', { code: 1000, reason: 'closed' });
  }

  addEventListener(
    type: string,
    listener: (event: WebSocketEvent) => void,
  ): void {
    const listeners = this.listeners.get(type) ?? new Set();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }

  removeEventListener(
    type: string,
    listener: (event: WebSocketEvent) => void,
  ): void {
    this.listeners.get(type)?.delete(listener);
  }

  private respond(
    type: ProtocolEnvelope['type'],
    requestId: string | undefined,
    payload: unknown,
  ): void {
    queueMicrotask(() =>
      this.emit('message', {
        data: encodeMessage({
          version: 1,
          type,
          request_id: requestId,
          payload,
        }),
      }),
    );
  }

  private emit(type: string, event: WebSocketEvent): void {
    for (const listener of this.listeners.get(type) ?? []) {
      listener(event);
    }
  }
}

describe('RelayConnection', () => {
  it('negotiates, authenticates, and opens a tunnel', async () => {
    const connection = new RelayConnection({
      relayUrl: 'wss://relay.test',
      agentToken: 'token',
      webSocket: () => new FakeSocket(),
      heartbeatIntervalMs: 60_000,
    });
    await connection.connect();
    await expect(
      connection.openTunnel({ local_port: 3000, protocol: 'http' }),
    ).resolves.toMatchObject({ tunnel_id: 'tunnel-1' });
    connection.close();
  });
});
