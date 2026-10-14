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

describe('TunnelAPIClient status page subscribers', () => {
  it('runs the public double opt-in lifecycle', async () => {
    const requests: CapturedRequest[] = [];
    const client = new TunnelAPIClient({
      apiUrl: 'https://api.outpipe.dev',
      fetch: mockFetch(requests, (url) => {
        if (url.endsWith('/status/team/subscribe'))
          return Response.json({ subscribed: true }, { status: 201 });
        if (url.endsWith('/status/team/confirm'))
          return Response.json({ confirmed: true });
        return Response.json({ unsubscribed: true });
      }) as typeof globalThis.fetch,
    });

    await client.subscribeToStatusPage('team', 'user@example.com', ['mon-1']);
    expect(requests[0]).toMatchObject({
      method: 'POST',
      url: 'https://api.outpipe.dev/api/v1/status/team/subscribe',
      body: { email: 'user@example.com', componentIds: ['mon-1'] },
    });

    const confirmed = await client.confirmSubscription('team', 'confirm-tok');
    expect(confirmed).toEqual({ confirmed: true });

    const left = await client.unsubscribeFromStatusPage('team', 'leave-tok');
    expect(left).toEqual({ unsubscribed: true });
  });

  it('manages subscribers without leaking tokens', async () => {
    const requests: CapturedRequest[] = [];
    const client = new TunnelAPIClient({
      apiUrl: 'https://api.outpipe.dev',
      apiKey: 'key',
      fetch: mockFetch(requests, (url) => {
        if (url.includes('/subscribers?'))
          return Response.json({
            subscribers: [
              {
                id: 'sub-1',
                statusPageId: 'page-1',
                email: 'user@example.com',
                status: 'confirmed',
                confirmed: true,
                createdAt: '2026-10-14T00:00:00Z',
                components: [],
              },
            ],
            counts: { pending: 0, confirmed: 1, unsubscribed: 0 },
            subscriptionsEnabled: true,
          });
        if (url.endsWith('/subscriptions'))
          return Response.json({ subscriptionsEnabled: false });
        return Response.json({
          id: 'sub-1',
          statusPageId: 'page-1',
          email: 'user@example.com',
          status: 'unsubscribed',
          confirmed: false,
          createdAt: '2026-10-14T00:00:00Z',
          components: [],
        });
      }) as typeof globalThis.fetch,
    });

    const listed = await client.listSubscribers('org-1', {
      status: 'confirmed',
      q: 'user',
      limit: 25,
    });
    expect(listed.subscribers).toHaveLength(1);
    expect(listed).not.toHaveProperty('token');
    expect(requests[0]?.url).toContain('status=confirmed');
    expect(requests[0]?.url).toContain('q=user');

    await client.setSubscriptionsEnabled('org-1', false);
    expect(requests[1]).toMatchObject({
      method: 'PATCH',
      body: { subscriptionsEnabled: false },
    });

    await client.managerUnsubscribeSubscriber('org-1', 'sub-1');
    expect(requests[2]).toMatchObject({ method: 'POST' });

    await client.setSubscriberScope('org-1', 'sub-1', ['mon-1']);
    expect(requests[3]).toMatchObject({
      method: 'PUT',
      body: { componentIds: ['mon-1'] },
    });

    await client.removeSubscriber('org-1', 'sub-1');
    expect(requests[4]).toMatchObject({ method: 'DELETE' });
  });
});
