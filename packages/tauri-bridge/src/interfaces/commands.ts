export type TunnelProtocol = 'http' | 'https' | 'tcp' | 'udp';

export type StartTunnelRequest = {
  port: number;
  protocol: TunnelProtocol;
  subdomain?: string;
  password?: string;
};

export type TunnelProcess = {
  pid: number;
  status: 'starting' | 'running' | 'stopped';
  exit_code?: number;
};

export type TunnelProcessStatus = TunnelProcess & {
  exitCode?: number;
};

export type TauriInvoke = <TResult>(
  command: string,
  args?: Record<string, unknown>,
) => Promise<TResult>;
