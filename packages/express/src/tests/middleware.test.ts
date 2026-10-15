import { describe, expect, it, vi } from 'vitest';
import type { ExpressTunnel } from '../interfaces/options';
import {
  tunnelLifecycle,
  tunnelPayloadCapture,
  tunnelStatus,
} from '../services/middleware';

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

  it('forwards the capture policy without evaluating it when disabled', () => {
    const predicate = vi.fn(() => false);
    const handler = tunnelPayloadCapture(false, {
      shouldCapturePayloads: predicate,
    });
    const next = vi.fn();
    handler({} as never, {} as never, next);
    expect(next).toHaveBeenCalledOnce();
    expect(predicate).not.toHaveBeenCalled();
  });

  it('evaluates the policy per request when capture is enabled', () => {
    const predicate = vi.fn(() => true);
    const handler = tunnelPayloadCapture(true, {
      shouldCapturePayloads: predicate,
    });
    const next = vi.fn();
    const req = {
      method: 'GET',
      url: '/healthz',
      headers: {},
    } as never;
    const res = {
      write: () => true,
      end: () => undefined,
      getHeaders: () => ({}),
    } as never;
    handler(req, res, next);
    expect(next).toHaveBeenCalledOnce();
    expect(predicate).toHaveBeenCalledWith({
      pathname: '/healthz',
      method: 'GET',
    });
    expect(
      (req as unknown as { outpipePayloads?: unknown }).outpipePayloads,
    ).toBeDefined();
  });
});

function createTunnel(): ExpressTunnel {
  return {
    start: async () => ({ status: 'active' }),
    stop: async () => undefined,
    state: () => ({ status: 'idle' }),
  };
}
