import type {
  PendingResponse,
  RelayConnectionOptions,
  RelayEvents,
  WebSocketLike,
} from '../interfaces/relay';
import type { MessageType, ProtocolEnvelope } from '../protocol';
import {
  absoluteMaxFrameSize,
  encodeMessage,
  protocolVersion,
} from '../protocol';
import { TunnelProtocolError, TunnelSDKError } from '../utils/errors';

const websocketOpenState = 1;

export class RelayConnectionBase {
  protected readonly options: Required<
    Pick<
      RelayConnectionOptions,
      | 'heartbeatIntervalMs'
      | 'reconnect'
      | 'reconnectDelayMs'
      | 'maxReconnectAttempts'
      | 'localRequestTimeoutMs'
    >
  > &
    RelayConnectionOptions;
  protected readonly listeners = new Map<
    keyof RelayEvents,
    Set<(value: never) => void>
  >();
  protected readonly pending = new Map<string, PendingResponse>();
  protected socket?: WebSocketLike;
  protected heartbeatTimer?: ReturnType<typeof setInterval>;
  protected reconnectTimer?: ReturnType<typeof setTimeout>;
  protected connectPromise?: Promise<void>;
  protected openResolve?: () => void;
  protected openReject?: (error: Error) => void;
  protected reconnectAttempts = 0;
  protected requestCounter = 0;
  protected closedByUser = false;
  protected authenticated = false;

  constructor(options: RelayConnectionOptions) {
    this.options = {
      ...options,
      heartbeatIntervalMs: options.heartbeatIntervalMs ?? 20_000,
      reconnect: options.reconnect ?? true,
      reconnectDelayMs: options.reconnectDelayMs ?? 2_000,
      maxReconnectAttempts: options.maxReconnectAttempts ?? 10,
      localRequestTimeoutMs: options.localRequestTimeoutMs ?? 30_000,
    };
    if (!this.options.relayUrl.trim() || !this.options.agentToken.trim()) {
      throw new TunnelSDKError('relay URL and agent token are required');
    }
  }

  on<TKey extends keyof RelayEvents>(
    event: TKey,
    listener: (value: RelayEvents[TKey]) => void,
  ): () => void {
    const listeners =
      this.listeners.get(event) ?? new Set<(value: never) => void>();
    listeners.add(listener as (value: never) => void);
    this.listeners.set(event, listeners);
    return () => listeners.delete(listener as (value: never) => void);
  }

  protected send<TPayload>(
    type: MessageType,
    payload: TPayload,
    requestId?: string,
  ): void {
    if (!this.socket || this.socket.readyState !== websocketOpenState) {
      throw new TunnelSDKError('relay connection is not open');
    }
    const message: ProtocolEnvelope<TPayload> = {
      version: protocolVersion,
      type,
      request_id: requestId,
      payload,
    };
    const encoded = encodeMessage(message);
    if (encoded.length > absoluteMaxFrameSize) {
      throw new TunnelProtocolError(
        'relay message exceeds the maximum frame size',
      );
    }
    this.socket.send(encoded);
  }

  protected emit<TKey extends keyof RelayEvents>(
    event: TKey,
    value: RelayEvents[TKey],
  ): void {
    for (const listener of this.listeners.get(event) ?? []) {
      listener(value as never);
    }
  }
}
