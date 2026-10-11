import { invoke } from '@tauri-apps/api/core';
import type {
  StartTunnelRequest,
  TauriInvoke,
  TunnelProcess,
  TunnelProcessStatus,
} from '../interfaces/commands';

export class TauriTunnelClient {
  private readonly call: TauriInvoke;

  constructor(call: TauriInvoke = invoke) {
    this.call = call;
  }

  start(request: StartTunnelRequest): Promise<TunnelProcess> {
    return this.call<TunnelProcess>('tunnel_start', request);
  }

  stop(): Promise<TunnelProcessStatus> {
    return this.call<TunnelProcessStatus>('tunnel_stop');
  }

  status(): Promise<TunnelProcessStatus> {
    return this.call<TunnelProcessStatus>('tunnel_status');
  }

  version(): Promise<string> {
    return this.call<string>('tunnel_version');
  }
}
