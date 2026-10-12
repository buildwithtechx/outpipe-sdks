import { beforeEach, expect, it, vi } from 'vitest';
import { createTanStackStartServerEntry } from '../src/server';

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

it('starts the tunnel before delegating to the app handler', async () => {
  const handler = vi
    .fn()
    .mockResolvedValue(new Response('app-response', { status: 201 }));
  const entry = createTanStackStartServerEntry({
    relayUrl: 'ws://example.com',
    localPort: 3000,
    handler,
  });
  const response = await entry.fetch(new Request('https://app.test/orders'));

  expect(handler).toHaveBeenCalledOnce();
  expect(response.status).toBe(201);
  expect(await response.text()).toBe('app-response');
  expect(relay.openTunnel).toHaveBeenCalledWith({
    local_port: 3000,
    protocol: 'http',
    subdomain: undefined,
    password: undefined,
  });
  expect(entry.tunnel.state().status).toBe('active');
});

it('skips automatic startup when autoStart is disabled', async () => {
  const entry = createTanStackStartServerEntry({
    relayUrl: 'ws://example.com',
    localPort: 3000,
    autoStart: false,
    handler: () => new Response('ok'),
  });

  await entry.fetch(new Request('https://app.test/health'));
  expect(relay.openTunnel).not.toHaveBeenCalled();
  expect(entry.tunnel.state().status).toBe('idle');
});

it('keeps error states metadata-only when recordExceptions is false', async () => {
  relay.openTunnel.mockRejectedValueOnce(new Error('private-start-failure'));
  const entry = createTanStackStartServerEntry({
    relayUrl: 'ws://example.com',
    localPort: 3000,
    recordExceptions: false,
    handler: () => new Response('ok'),
  });

  await expect(
    entry.fetch(new Request('https://app.test/orders')),
  ).rejects.toThrow('private-start-failure');
  expect(entry.tunnel.state()).toEqual({ status: 'error' });
});
