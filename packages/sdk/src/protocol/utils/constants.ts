import type { MessageType } from '../interfaces/messages';

export const protocolVersion = 1 as const;
export const minSupportedVersion = 1 as const;
export const maxSupportedVersion = 1 as const;

export const defaultMaxFrameSize = 16 * 1024 * 1024;
export const absoluteMaxFrameSize = 32 * 1024 * 1024;
export const defaultIdleTimeoutSeconds = 60;
export const defaultConnectionTimeoutSeconds = 30;

export const messageTypes: readonly MessageType[] = [
  'auth',
  'auth_response',
  'version_negotiate',
  'version_negotiate_ack',
  'flow_control',
  'open_tunnel',
  'open_tunnel_ack',
  'close_tunnel',
  'data',
  'heartbeat',
  'error',
  'http_request',
  'http_response',
  'tcp_data',
  'tcp_close',
  'udp_data',
  'udp_response',
];
