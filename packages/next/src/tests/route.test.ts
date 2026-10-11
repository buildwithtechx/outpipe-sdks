import { describe, expect, it } from 'vitest';
import type { NextTunnel } from '../interfaces/options';
import { createTunnelRoute } from '../services/route';

describe('createTunnelRoute', () => {
  it('returns tunnel state and stops the tunnel on DELETE', async () => {
    let stopped = false;
    const tunnel: NextTunnel = {
      start: async () => ({ status: 'active', tunnelId: 'tunnel-1' }),
      stop: async () => {
        stopped = true;
      },
      state: () => ({
        status: 'active',
        tunnelId: 'tunnel-1',
        publicUrl: 'https://tunnel.test',
      }),
    };
    const route = createTunnelRoute(tunnel);
    const response = await route.GET();
    expect(await response.json()).toMatchObject({
      status: 'active',
      tunnelId: 'tunnel-1',
    });
    expect((await route.DELETE()).status).toBe(204);
    expect(stopped).toBe(true);
  });
});
