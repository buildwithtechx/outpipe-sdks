import type { NextTunnel } from '../interfaces/options';

export function createTunnelRoute(tunnel: NextTunnel) {
  return {
    GET: () => {
      const state = tunnel.state();
      return Response.json({ ...state, error: state.error?.message });
    },
    DELETE: async () => {
      await tunnel.stop('route requested shutdown');
      return new Response(null, { status: 204 });
    },
  };
}
