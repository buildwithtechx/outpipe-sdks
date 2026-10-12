import type {
  TanStackStartServerEntry,
  TanStackStartServerOptions,
} from './interfaces/options';
import { tunnelLifecycle } from './services/middleware';
import { createTanStackStartTunnel } from './services/tunnel';

export function createTanStackStartServerEntry(
  options: TanStackStartServerOptions,
): TanStackStartServerEntry {
  const { handler, ...tunnelOptions } = options;
  const tunnel = createTanStackStartTunnel(tunnelOptions);
  return {
    tunnel,
    fetch: (request) => tunnelLifecycle(tunnel, () => handler(request)),
  };
}

export type {
  TanStackStartServerEntry,
  TanStackStartServerOptions,
} from './interfaces/options';
