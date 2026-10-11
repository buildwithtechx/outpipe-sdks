import type {
  AuthResponse,
  CloseTunnel,
  MessageType,
  OpenTunnel,
  OpenTunnelAck,
  ProtocolEnvelope,
  VersionNegotiateAck,
} from '../protocol';

export type WebSocketLike = {
  readonly readyState: number;
  send(data: string): void;
  close(code?: number, reason?: string): void;
  addEventListener(
    type: string,
    listener: (event: WebSocketEvent) => void,
  ): void;
  removeEventListener(
    type: string,
    listener: (event: WebSocketEvent) => void,
  ): void;
};

export type WebSocketEvent = {
  data?: unknown;
  message?: string;
  code?: number;
  reason?: string;
};

export type WebSocketFactory = (url: string) => WebSocketLike;

export type RelayConnectionOptions = {
  relayUrl: string;
  agentToken: string;
  localPort?: number;
  agentId?: string;
  clientName?: string;
  clientVersion?: string;
  webSocket?: WebSocketFactory;
  heartbeatIntervalMs?: number;
  reconnect?: boolean;
  reconnectDelayMs?: number;
  maxReconnectAttempts?: number;
  localRequestTimeoutMs?: number;
};

export type RelayEvents = {
  authenticated: AuthResponse;
  connected: VersionNegotiateAck;
  disconnected: CloseEvent | ErrorEvent | undefined;
  reconnect_exhausted: undefined;
  error: Error;
  message: ProtocolEnvelope;
  tunnel_opened: OpenTunnelAck;
  tunnel_closed: CloseTunnel;
};

export type RelayMessage =
  | ProtocolEnvelope<OpenTunnel>
  | ProtocolEnvelope<CloseTunnel>
  | ProtocolEnvelope<unknown>;

export type PendingResponse = {
  expected: MessageType;
  resolve: (message: ProtocolEnvelope) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
};
