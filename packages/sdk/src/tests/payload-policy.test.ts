import { describe, expect, it, vi } from 'vitest';
import {
  createNodeHttpPayloadCaptureMiddleware,
  type HttpPayloadCapturePolicy,
  resolveHttpPayloadCapture,
} from '../utils/http-payload-capture';

function drive(
  setting: Parameters<typeof createNodeHttpPayloadCaptureMiddleware>[0],
  policy?: HttpPayloadCapturePolicy,
  url = '/api/tunnels?key=1',
) {
  const next = vi.fn();
  const req = {
    method: 'POST',
    url,
    headers: { authorization: 'secret', 'content-type': 'application/json' },
    body: { safe: 'yes' },
  } as never;
  const res = {
    write: vi.fn(() => true),
    end: vi.fn(),
    getHeaders: () => ({}),
  } as never;
  createNodeHttpPayloadCaptureMiddleware(setting, policy)(req, res, next);
  return { next, req: req as unknown as { outpipePayloads?: unknown } };
}

describe('payload capture policy', () => {
  it('captures only when the predicate explicitly returns true', () => {
    const seen: Array<{ pathname: string; method?: string }> = [];
    const { next, req } = drive(true, {
      shouldCapturePayloads: (context) => {
        seen.push(context);
        return true;
      },
    });
    expect(next).toHaveBeenCalledOnce();
    expect(seen).toEqual([{ pathname: '/api/tunnels', method: 'POST' }]);
    expect(req.outpipePayloads).toMatchObject({
      requestHeaders: { authorization: '[REDACTED]' },
    });
  });

  it('skips capture when the predicate returns false or undefined', () => {
    for (const decision of [false, undefined]) {
      const predicate = vi.fn(() => decision as boolean);
      const { next, req } = drive(true, {
        shouldCapturePayloads: predicate,
      });
      expect(next).toHaveBeenCalledOnce();
      expect(req.outpipePayloads).toBeUndefined();
      expect(predicate).toHaveBeenCalledOnce();
    }
  });

  it('fails closed on truthy non-true decisions and async predicates', async () => {
    for (const decision of [1, 'yes', Promise.resolve(true)]) {
      const { next, req } = drive(true, {
        shouldCapturePayloads: () => decision as unknown as boolean,
      });
      expect(next).toHaveBeenCalledOnce();
      expect(req.outpipePayloads).toBeUndefined();
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(resolveHttpPayloadCapture(true, { pathname: '/' }, undefined)).toBe(
      true,
    );
  });

  it('fails closed when the predicate throws and never throws into the app', () => {
    const { next, req } = drive(true, {
      shouldCapturePayloads: () => {
        throw new Error('policy failure');
      },
    });
    expect(next).toHaveBeenCalledOnce();
    expect(req.outpipePayloads).toBeUndefined();
  });

  it('never calls the predicate when capture is disabled', () => {
    const predicate = vi.fn(() => true);
    const { next, req } = drive(false, {
      shouldCapturePayloads: predicate,
    });
    expect(next).toHaveBeenCalledOnce();
    expect(predicate).not.toHaveBeenCalled();
    expect(req.outpipePayloads).toBeUndefined();
  });
});
