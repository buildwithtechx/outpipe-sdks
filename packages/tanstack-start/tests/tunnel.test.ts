import { beforeEach, expect, it, vi } from 'vitest';
import { createTanStackStartTunnel } from '../src/services/tunnel';

const relay = vi.hoisted(() => ({
  openTunnel: vi.fn(),
  closeTunnel: vi.fn(),
  close: vi.fn(),
  on: vi.fn(),
}));
vi.mock('@outpipe/sdk', () => ({
  RelayConnection: class {
    openTunnel = relay.openTunnel;
    closeTunnel = relay.closeTunnel;
    close = relay.close;
    on = relay.on;
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  relay.openTunnel.mockResolvedValue({
    tunnel_id: 'tunnel',
    public_url: 'https://example.com',
  });
  relay.closeTunnel.mockResolvedValue(undefined);
});

it('allows explicit startup with autoStart disabled and restart after stop', async () => {
  const tunnel = createTanStackStartTunnel({
    relayUrl: 'ws://example.com',
    localPort: 3000,
    autoStart: false,
  });
  expect((await tunnel.start()).status).toBe('active');
  await tunnel.stop();
  expect(tunnel.state().status).toBe('closed');
  expect((await tunnel.start()).status).toBe('active');
  expect(relay.openTunnel).toHaveBeenCalledTimes(2);
});

it('records exception details on start failure by default', async () => {
  relay.openTunnel.mockRejectedValueOnce(new Error('private-start-failure'));
  const tunnel = createTanStackStartTunnel({
    relayUrl: 'ws://example.com',
    localPort: 3000,
    autoStart: false,
  });
  await expect(tunnel.start()).rejects.toThrow('private-start-failure');
  const state = tunnel.state();
  expect(state.status).toBe('error');
  expect(state.error?.message).toBe('private-start-failure');
});

it('keeps error states metadata-only when recordExceptions is false', async () => {
  relay.openTunnel.mockRejectedValueOnce(new Error('private-start-failure'));
  const tunnel = createTanStackStartTunnel({
    relayUrl: 'ws://example.com',
    localPort: 3000,
    autoStart: false,
    recordExceptions: false,
  });
  await expect(tunnel.start()).rejects.toThrow('private-start-failure');
  expect(tunnel.state()).toEqual({ status: 'error' });

  const errorCall = relay.on.mock.calls.find((call) => call[0] === 'error');
  const handleError = errorCall?.[1] as ((error: unknown) => void) | undefined;
  handleError?.(new Error('private-connection-failure'));
  expect(tunnel.state()).toEqual({ status: 'error' });
});
