import { describe, expect, it } from 'vitest';
import { TunnelAPIClient } from '../services/api-client';

type CapturedRequest = {
  method: string;
  url: string;
  body: unknown;
};

function mockFetch(
  requests: CapturedRequest[],
  respond: (url: string, init: RequestInit) => Response,
) {
  return async (url: string | URL | Request, init?: RequestInit) => {
    const request = new Request(url, init);
    requests.push({
      method: request.method,
      url: request.url,
      body: init?.body ? JSON.parse(init.body as string) : undefined,
    });
    return respond(request.url, init ?? {});
  };
}

describe('TunnelAPIClient machine fleets and pipelines', () => {
  it('manages fleets from creation to reconcile', async () => {
    const requests: CapturedRequest[] = [];
    const client = new TunnelAPIClient({
      apiUrl: 'https://api.outpipe.dev',
      apiKey: 'key',
      fetch: mockFetch(requests, (url, init) => {
        if (url.endsWith('/organizations/org-1/machine-fleets'))
          return init.method === 'POST'
            ? Response.json({ id: 'fleet-1', name: 'edge' }, { status: 201 })
            : Response.json([{ id: 'fleet-1', name: 'edge' }]);
        if (url.endsWith('/machine-fleets/fleet-1'))
          return Response.json({
            fleet: { id: 'fleet-1', name: 'edge' },
            tokens: [],
            desiredTunnels: [],
            liveTunnels: [],
            drift: [],
          });
        if (url.endsWith('/rotate'))
          return Response.json({
            rotated: [{ id: 'tok-2', name: 'fleet-token-rotated', raw: 'raw' }],
          });
        return Response.json({ reactivated: 1, recreated: 0, skipped: 0 });
      }) as typeof globalThis.fetch,
    });

    const created = await client.createMachineFleet('org-1', { name: 'edge' });
    expect(created).toMatchObject({ name: 'edge' });
    expect(requests[0]).toMatchObject({
      method: 'POST',
      body: { name: 'edge' },
    });

    const status = await client.getFleetStatus('org-1', 'fleet-1');
    expect(status.drift).toEqual([]);

    await client.bulkCreateFleetTunnels('org-1', 'fleet-1', [
      { name: 'node-a', targetHost: '127.0.0.1', targetPort: 3000 },
    ]);
    expect(requests[2]).toMatchObject({ method: 'POST' });

    const rotated = await client.rotateFleetTokens('org-1', 'fleet-1');
    expect(rotated.rotated).toHaveLength(1);

    const result = await client.reconcileFleet('org-1', 'fleet-1');
    expect(result).toMatchObject({ reactivated: 1 });

    await client.deleteMachineFleet('org-1', 'fleet-1');
    expect(requests[5]).toMatchObject({ method: 'DELETE' });
  });

  it('reads pipeline health and dead letters', async () => {
    const requests: CapturedRequest[] = [];
    const client = new TunnelAPIClient({
      apiUrl: 'https://api.outpipe.dev',
      apiKey: 'key',
      fetch: mockFetch(requests, (url) => {
        if (url.includes('/pipelines'))
          return Response.json({
            organizationId: 'org-1',
            queues: [
              {
                queue: 'webhook-deliveries',
                depth: 2,
                deadLettered: 1,
                healthy: false,
              },
            ],
            healthy: false,
            checkedAt: '2026-10-14T00:00:00Z',
          });
        return Response.json([
          {
            queue: 'telemetry-exports',
            id: 'job-1',
            eventType: 'captures',
            attempts: 5,
            lastError: 'analytics down',
            updatedAt: '2026-10-14T00:00:00Z',
          },
        ]);
      }) as typeof globalThis.fetch,
    });

    const health = await client.getPipelineHealth('org-1');
    expect(health.healthy).toBe(false);
    expect(health.queues[0]).toMatchObject({ queue: 'webhook-deliveries' });

    const letters = await client.listDeadLetters('org-1');
    expect(letters).toHaveLength(1);
    expect(letters[0]).toMatchObject({ queue: 'telemetry-exports' });
    expect(requests[1]?.url).toContain('limit=25');
  });
});
