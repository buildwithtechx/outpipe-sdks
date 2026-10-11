import { describe, expect, it, vi } from 'vitest';
import type { ExpressTunnel } from '../interfaces/options';
import { tunnelLifecycle, tunnelStatus } from '../services/middleware';

describe('Express tunnel middleware', () => {
  it('returns the current state', () => {
    const tunnel = createTunnel();
    const response = { json: vi.fn() };
    tunnelStatus(tunnel)(
      {} as never,
      response as never,
      (() => undefined) as never,
    );
    expect(response.json).toHaveBeenCalledWith({ status: 'idle' });
  });

  it('starts the tunnel before continuing', async () => {
    const tunnel = createTunnel();
    const next = vi.fn();
    tunnelLifecycle(tunnel)({} as never, {} as never, next);
    await vi.waitFor(() => expect(next).toHaveBeenCalledOnce());
  });
});

function createTunnel(): ExpressTunnel {
  return {
    start: async () => ({ status: 'active' }),
    stop: async () => undefined,
    state: () => ({ status: 'idle' }),
  };
}
