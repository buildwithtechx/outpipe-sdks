import type { RelayConnectionOptions } from '@outpipe/sdk';

export type TanStackStartTunnelOptions = RelayConnectionOptions & {
  localPort: number;
  subdomain?: string;
  password?: string;
  autoStart?: boolean;
  recordExceptions?: boolean;
};

export type TanStackStartTunnel = {
  autoStart?: boolean;
  start: () => Promise<TanStackStartTunnelState>;
  stop: (reason?: string) => Promise<void>;
  state: () => TanStackStartTunnelState;
};

export type TanStackStartTunnelState = {
  status: 'idle' | 'connecting' | 'active' | 'closed' | 'error';
  tunnelId?: string;
  publicUrl?: string;
  publicPort?: number;
  error?: Error;
};

export type TanStackStartServerOptions = TanStackStartTunnelOptions & {
  handler: (request: Request) => Response | Promise<Response>;
};

export type TanStackStartServerEntry = {
  tunnel: TanStackStartTunnel;
  fetch: (request: Request) => Promise<Response>;
};
