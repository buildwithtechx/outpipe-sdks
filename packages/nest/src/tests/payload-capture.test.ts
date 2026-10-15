import { describe, expect, it, vi } from 'vitest';
import { OutpipePayloadCaptureMiddleware } from '../services/payload-capture.middleware';

function request(url = '/api/tunnels') {
  return {
    method: 'GET',
    url,
    headers: { authorization: 'secret' },
  } as never;
}

function response() {
  return {
    write: () => true,
    end: () => undefined,
    getHeaders: () => ({}),
  } as never;
}

describe('OutpipePayloadCaptureMiddleware', () => {
  it('captures with default options when nothing is injected', () => {
    const middleware = new OutpipePayloadCaptureMiddleware(undefined);
    const next = vi.fn();
    const req = request() as unknown as { outpipePayloads?: unknown };
    middleware.use(req as never, response(), next);
    expect(next).toHaveBeenCalledOnce();
    expect(req.outpipePayloads).toMatchObject({
      requestHeaders: { authorization: '[REDACTED]' },
    });
  });

  it('forwards an injected policy instead of capturing unconditionally', () => {
    const predicate = vi.fn(() => false);
    const middleware = new OutpipePayloadCaptureMiddleware({
      capturePayloads: true,
      shouldCapturePayloads: predicate,
    });
    const next = vi.fn();
    const req = request() as unknown as { outpipePayloads?: unknown };
    middleware.use(req as never, response(), next);
    expect(next).toHaveBeenCalledOnce();
    expect(predicate).toHaveBeenCalledWith({
      pathname: '/api/tunnels',
      method: 'GET',
    });
    expect(req.outpipePayloads).toBeUndefined();
  });

  it('never evaluates the policy when injected capture is disabled', () => {
    const predicate = vi.fn(() => true);
    const middleware = new OutpipePayloadCaptureMiddleware({
      capturePayloads: false,
      shouldCapturePayloads: predicate,
    });
    const next = vi.fn();
    const req = request() as unknown as { outpipePayloads?: unknown };
    middleware.use(req as never, response(), next);
    expect(next).toHaveBeenCalledOnce();
    expect(predicate).not.toHaveBeenCalled();
    expect(req.outpipePayloads).toBeUndefined();
  });
});
