import { describe, expect, it, vi } from 'vitest';
import type { TauriInvoke } from '../interfaces/commands';
import { TauriTunnelClient } from '../services/tunnel-client';

describe('TauriTunnelClient', () => {
  it('maps typed tunnel operations to Tauri commands', async () => {
    const invoke = vi.fn(async <TResult>(command: string) => {
      if (command === 'tunnel_version') {
        return 'dev' as TResult;
      }
      if (command === 'tunnel_start') {
        return { pid: 42, status: 'running' } as TResult;
      }
      if (command === 'tunnel_status') {
        return { pid: 42, status: 'stopped', exit_code: 0 } as TResult;
      }
      return undefined as TResult;
    });
    const client = new TauriTunnelClient(invoke as TauriInvoke);

    await expect(
      client.start({ port: 3000, protocol: 'http' }),
    ).resolves.toMatchObject({ pid: 42 });
    await expect(client.status()).resolves.toMatchObject({ status: 'stopped' });
    await expect(client.version()).resolves.toBe('dev');
    expect(invoke).toHaveBeenCalledWith('tunnel_start', {
      port: 3000,
      protocol: 'http',
    });
  });
});
