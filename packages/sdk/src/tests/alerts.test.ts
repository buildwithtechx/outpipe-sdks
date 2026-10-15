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

const alertPayload = {
  id: 'alert-1',
  organizationId: 'org-1',
  name: 'homepage down',
  monitorIds: '["mon-1"]',
  consecutiveFailures: 3,
  consecutiveRecoveries: 2,
  evalIntervalSeconds: 60,
  state: 'ok',
  enabled: true,
  statusPageTitle: 'Homepage',
  statusPageImpact: 'degraded',
};

describe('TunnelAPIClient observability alerts', () => {
  it('creates and lists alerts while keeping monitorIds encoded', async () => {
    const requests: CapturedRequest[] = [];
    const client = new TunnelAPIClient({
      apiUrl: 'https://api.outpipe.dev',
      apiKey: 'key',
      fetch: mockFetch(requests, (_url, init) => {
        if (init.method === 'POST') {
          return Response.json(alertPayload, { status: 201 });
        }
        return Response.json([alertPayload]);
      }) as typeof globalThis.fetch,
    });

    const created = await client.createAlert('org-1', {
      name: 'homepage down',
      monitorIds: ['mon-1'],
    });
    expect(created.monitorIds).toBe('["mon-1"]');
    expect(requests[0]).toMatchObject({
      method: 'POST',
      url: 'https://api.outpipe.dev/api/v1/organizations/org-1/observability/alerts',
      body: { name: 'homepage down', monitorIds: ['mon-1'] },
    });

    const listed = await client.listAlerts('org-1');
    expect(listed).toHaveLength(1);
    expect(typeof listed[0]?.monitorIds).toBe('string');
    expect(requests[1]).toMatchObject({ method: 'GET' });
  });

  it('updates status page linkage and enabled state, then deletes', async () => {
    const requests: CapturedRequest[] = [];
    const client = new TunnelAPIClient({
      apiUrl: 'https://api.outpipe.dev',
      apiKey: 'key',
      fetch: mockFetch(requests, (url, _init) => {
        if (url.endsWith('/status-page')) {
          return Response.json({ ...alertPayload, statusPageImpact: 'outage' });
        }
        if (url.endsWith('/enabled')) {
          return Response.json({ ...alertPayload, enabled: false });
        }
        return new Response(null, { status: 204 });
      }) as typeof globalThis.fetch,
    });

    const linked = await client.setAlertStatusPage('org-1', 'alert-1', {
      publicTitle: 'Homepage',
      impact: 'outage',
      componentIds: ['mon-1'],
    });
    expect(linked.statusPageImpact).toBe('outage');
    expect(requests[0]).toMatchObject({
      method: 'PATCH',
      url: 'https://api.outpipe.dev/api/v1/organizations/org-1/observability/alerts/alert-1/status-page',
      body: {
        publicTitle: 'Homepage',
        impact: 'outage',
        componentIds: ['mon-1'],
      },
    });

    const disabled = await client.setAlertEnabled('org-1', 'alert-1', false);
    expect(disabled.enabled).toBe(false);
    expect(requests[1]).toMatchObject({
      method: 'PATCH',
      url: 'https://api.outpipe.dev/api/v1/organizations/org-1/observability/alerts/alert-1/enabled',
      body: { enabled: false },
    });

    await client.deleteAlert('org-1', 'alert-1');
    expect(requests[2]).toMatchObject({
      method: 'DELETE',
      url: 'https://api.outpipe.dev/api/v1/organizations/org-1/observability/alerts/alert-1',
    });
  });
});
