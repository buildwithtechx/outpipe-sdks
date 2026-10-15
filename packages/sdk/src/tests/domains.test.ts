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

describe('TunnelAPIClient domains and DNS providers', () => {
  it('lists and manages domains', async () => {
    const requests: CapturedRequest[] = [];
    const client = new TunnelAPIClient({
      apiUrl: 'https://api.outpipe.dev',
      apiKey: 'key',
      fetch: mockFetch(requests, (url) => {
        if (url.endsWith('/organizations/org-1/domains')) {
          return Response.json([
            {
              id: 'domain-1',
              hostname: 'app.example.com',
              status: 'pending',
              verificationMethod: 'dns',
            },
          ]);
        }
        return new Response(null, { status: 204 });
      }) as typeof globalThis.fetch,
    });

    const domains = await client.listDomains('org-1');
    expect(domains).toHaveLength(1);
    expect(domains[0]?.hostname).toBe('app.example.com');
    expect(requests[0]).toMatchObject({
      method: 'GET',
      url: 'https://api.outpipe.dev/api/v1/organizations/org-1/domains',
    });

    await client.verifyDomain('domain-1', 'cdv-token');
    expect(requests[1]).toMatchObject({
      method: 'POST',
      url: 'https://api.outpipe.dev/api/v1/domains/domain-1/verify',
      body: { token: 'cdv-token' },
    });

    await client.deleteDomain('domain-1');
    expect(requests[2]).toMatchObject({
      method: 'DELETE',
      url: 'https://api.outpipe.dev/api/v1/domains/domain-1',
    });
  });

  it('creates a domain with a verification method', async () => {
    const requests: CapturedRequest[] = [];
    const client = new TunnelAPIClient({
      apiUrl: 'https://api.outpipe.dev',
      fetch: mockFetch(requests, () =>
        Response.json(
          {
            domain: {
              id: 'domain-2',
              hostname: '*.example.com',
              status: 'pending',
              verificationMethod: 'dns-automation',
              certificateExpiresAt: '2026-01-01T00:00:00Z',
            },
            verificationToken: 'cdv-secret',
          },
          { status: 201 },
        ),
      ) as typeof globalThis.fetch,
    });

    const created = await client.createDomain('org-1', {
      hostname: '*.example.com',
      verificationMethod: 'dns-automation',
    });
    expect(created.domain.verificationMethod).toBe('dns-automation');
    expect(created.domain.certificateExpiresAt).toBe('2026-01-01T00:00:00Z');
    expect(created.verificationToken).toBe('cdv-secret');
    expect(requests[0]).toMatchObject({
      method: 'POST',
      url: 'https://api.outpipe.dev/api/v1/organizations/org-1/domains',
      body: { hostname: '*.example.com', verificationMethod: 'dns-automation' },
    });
  });

  it('manages DNS provider credentials without exposing secrets', async () => {
    const requests: CapturedRequest[] = [];
    const client = new TunnelAPIClient({
      apiUrl: 'https://api.outpipe.dev',
      fetch: mockFetch(requests, (url) => {
        if (url.endsWith('/organizations/org-1/dns-providers')) {
          if (requests.at(-1)?.method === 'POST') {
            return Response.json(
              {
                id: 'cred-1',
                organizationId: 'org-1',
                provider: 'cloudflare',
                label: 'primary',
                lastFour: '1234',
                keyVersion: 1,
              },
              { status: 201 },
            );
          }
          return Response.json([
            {
              id: 'cred-1',
              organizationId: 'org-1',
              provider: 'cloudflare',
              label: 'primary',
              lastFour: '1234',
              keyVersion: 1,
            },
          ]);
        }
        return new Response(null, { status: 204 });
      }) as typeof globalThis.fetch,
    });

    const connected = await client.connectDNSProvider('org-1', {
      provider: 'cloudflare',
      token: 'cf-test-token-1234',
      label: 'primary',
    });
    expect(connected.lastFour).toBe('1234');
    expect(connected).not.toHaveProperty('token');
    expect(requests[0]?.body).toEqual({
      provider: 'cloudflare',
      token: 'cf-test-token-1234',
      label: 'primary',
    });

    const listed = await client.listDNSProviders('org-1');
    expect(listed).toHaveLength(1);
    expect(requests[1]).toMatchObject({ method: 'GET' });

    await client.deleteDNSProvider('org-1', 'cred-1');
    expect(requests[2]).toMatchObject({
      method: 'DELETE',
      url: 'https://api.outpipe.dev/api/v1/organizations/org-1/dns-providers/cred-1',
    });
  });

  it('connects a route53 provider with a JSON credential token', async () => {
    const requests: CapturedRequest[] = [];
    const route53Token = JSON.stringify({
      access_key_id: 'AKIAEXAMPLE',
      secret_access_key: 'secret',
    });
    const client = new TunnelAPIClient({
      apiUrl: 'https://api.outpipe.dev',
      fetch: mockFetch(requests, () =>
        Response.json(
          {
            id: 'cred-2',
            organizationId: 'org-1',
            provider: 'route53',
            lastFour: 'MPLE',
            keyVersion: 1,
          },
          { status: 201 },
        ),
      ) as typeof globalThis.fetch,
    });

    const connected = await client.connectDNSProvider('org-1', {
      provider: 'route53',
      token: route53Token,
    });
    expect(connected.provider).toBe('route53');
    expect(connected.lastFour).toBe('MPLE');
    expect(requests[0]).toMatchObject({
      method: 'POST',
      url: 'https://api.outpipe.dev/api/v1/organizations/org-1/dns-providers',
      body: { provider: 'route53', token: route53Token },
    });
  });

  it('creates a domain bundle with delegation fields', async () => {
    const requests: CapturedRequest[] = [];
    const client = new TunnelAPIClient({
      apiUrl: 'https://api.outpipe.dev',
      apiKey: 'key',
      fetch: mockFetch(requests, () =>
        Response.json(
          [
            {
              id: 'domain-3',
              hostname: 'example.com',
              status: 'pending',
              verificationMethod: 'dns-automation',
              dnsProvider: 'route53',
              bundleGroup: 'bundle-1',
              delegationTarget: '_outpipe.example.com',
            },
          ],
          { status: 201 },
        ),
      ) as typeof globalThis.fetch,
    });

    const bundle = await client.createDomainBundle('org-1', {
      hostname: 'example.com',
      dnsProvider: 'route53',
      wildcard: true,
    });
    expect(bundle).toHaveLength(1);
    expect(bundle[0]?.bundleGroup).toBe('bundle-1');
    expect(bundle[0]?.delegationTarget).toBe('_outpipe.example.com');
    expect(requests[0]).toMatchObject({
      method: 'POST',
      url: 'https://api.outpipe.dev/api/v1/organizations/org-1/domains/bundle',
      body: {
        hostname: 'example.com',
        dnsProvider: 'route53',
        wildcard: true,
      },
    });
  });

  it('renews machine tunnel relay tokens', async () => {
    const requests: CapturedRequest[] = [];
    const client = new TunnelAPIClient({
      apiUrl: 'https://api.outpipe.dev',
      apiKey: 'machine-token',
      fetch: mockFetch(requests, () =>
        Response.json({
          relayToken: 'relay-token',
          expiresAt: '2026-01-01T00:15:00Z',
        }),
      ) as typeof globalThis.fetch,
    });

    const renewed = await client.refreshMachineTunnelRelayToken('tunnel-1');
    expect(renewed.relayToken).toBe('relay-token');
    expect(renewed.expiresAt).toBe('2026-01-01T00:15:00Z');
    expect(requests[0]).toMatchObject({
      method: 'POST',
      url: 'https://api.outpipe.dev/api/v1/machines/tunnels/tunnel-1/relay-token',
    });
  });
});
