import type {
  ConnectDNSProviderRequest,
  CreateDomainRequest,
  CreateDomainResponse,
  DeadLetter,
  DNSProviderCredential,
  Domain,
  FleetReconcileResult,
  FleetStatus,
  FleetTunnelSpec,
  ListSubscribersRequest,
  MachineFleet,
  PipelineHealth,
  RelayTokenResponse,
  StatusPageSubscriber,
  SubscriberListResult,
  Tunnel,
  TunnelAPIClientOptions,
} from '../interfaces/api';
import { TunnelAPIError } from '../utils/errors';

export class TunnelAPIClient {
  private readonly apiUrl: string;
  private readonly apiKey?: string;
  private readonly apiPrefix: string;
  private readonly request: typeof globalThis.fetch;

  constructor(options: TunnelAPIClientOptions = {}) {
    this.apiUrl = (options.apiUrl ?? 'https://api.outpipe.dev').replace(
      /\/$/,
      '',
    );
    this.apiKey = options.apiKey;
    this.apiPrefix = `/${(options.apiPrefix ?? 'api/v1').replace(/^\/+|\/+$/g, '')}`;
    this.request = options.fetch ?? globalThis.fetch;
    if (!this.request) {
      throw new TunnelAPIError(0, 'fetch is not available in this runtime');
    }
  }

  async createTunnel(
    organizationId: string,
    request: Record<string, unknown>,
  ): Promise<Tunnel> {
    const tunnel = await this.call<Tunnel>(
      `/organizations/${encodeURIComponent(organizationId)}/tunnels`,
      { method: 'POST', body: JSON.stringify(request) },
    );
    return normalizeTunnel(tunnel);
  }

  async listTunnels(organizationId: string): Promise<Tunnel[]> {
    const tunnels = await this.call<Tunnel[]>(
      `/organizations/${encodeURIComponent(organizationId)}/tunnels`,
      { method: 'GET' },
    );
    return tunnels.map(normalizeTunnel);
  }

  async inspectTunnel(tunnelId: string): Promise<Tunnel> {
    const tunnel = await this.call<Tunnel>(
      `/tunnels/${encodeURIComponent(tunnelId)}`,
      {
        method: 'GET',
      },
    );
    return normalizeTunnel(tunnel);
  }

  async closeTunnel(tunnelId: string): Promise<void> {
    await this.call<void>(`/tunnels/${encodeURIComponent(tunnelId)}`, {
      method: 'DELETE',
    });
  }

  async listDomains(organizationId: string): Promise<Domain[]> {
    return this.call<Domain[]>(
      `/organizations/${encodeURIComponent(organizationId)}/domains`,
      { method: 'GET' },
    );
  }

  async createDomain(
    organizationId: string,
    request: CreateDomainRequest,
  ): Promise<CreateDomainResponse> {
    return this.call<CreateDomainResponse>(
      `/organizations/${encodeURIComponent(organizationId)}/domains`,
      { method: 'POST', body: JSON.stringify(request) },
    );
  }

  async verifyDomain(domainId: string, token: string): Promise<void> {
    await this.call<void>(`/domains/${encodeURIComponent(domainId)}/verify`, {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  }

  async deleteDomain(domainId: string): Promise<void> {
    await this.call<void>(`/domains/${encodeURIComponent(domainId)}`, {
      method: 'DELETE',
    });
  }

  async listDNSProviders(
    organizationId: string,
  ): Promise<DNSProviderCredential[]> {
    return this.call<DNSProviderCredential[]>(
      `/organizations/${encodeURIComponent(organizationId)}/dns-providers`,
      { method: 'GET' },
    );
  }

  async connectDNSProvider(
    organizationId: string,
    request: ConnectDNSProviderRequest,
  ): Promise<DNSProviderCredential> {
    return this.call<DNSProviderCredential>(
      `/organizations/${encodeURIComponent(organizationId)}/dns-providers`,
      { method: 'POST', body: JSON.stringify(request) },
    );
  }

  async deleteDNSProvider(
    organizationId: string,
    credentialId: string,
  ): Promise<void> {
    await this.call<void>(
      `/organizations/${encodeURIComponent(organizationId)}/dns-providers/${encodeURIComponent(credentialId)}`,
      { method: 'DELETE' },
    );
  }

  async refreshMachineTunnelRelayToken(
    tunnelId: string,
  ): Promise<RelayTokenResponse> {
    return this.call<RelayTokenResponse>(
      `/machines/tunnels/${encodeURIComponent(tunnelId)}/relay-token`,
      { method: 'POST' },
    );
  }

  async subscribeToStatusPage(
    slug: string,
    email: string,
    componentIds?: string[],
  ): Promise<{ subscribed: boolean }> {
    return this.call<{ subscribed: boolean }>(
      `/status/${encodeURIComponent(slug)}/subscribe`,
      {
        method: 'POST',
        body: JSON.stringify({ email, componentIds }),
      },
    );
  }

  async confirmSubscription(
    slug: string,
    token: string,
  ): Promise<{ confirmed: boolean }> {
    return this.call<{ confirmed: boolean }>(
      `/status/${encodeURIComponent(slug)}/confirm`,
      { method: 'POST', body: JSON.stringify({ token }) },
    );
  }

  async unsubscribeFromStatusPage(
    slug: string,
    token: string,
  ): Promise<{ unsubscribed: boolean }> {
    return this.call<{ unsubscribed: boolean }>(
      `/status/${encodeURIComponent(slug)}/unsubscribe`,
      { method: 'POST', body: JSON.stringify({ token }) },
    );
  }

  async listSubscribers(
    organizationId: string,
    request: ListSubscribersRequest = {},
  ): Promise<SubscriberListResult> {
    const params = new URLSearchParams();
    if (request.q) params.set('q', request.q);
    if (request.status) params.set('status', request.status);
    if (request.limit) params.set('limit', String(request.limit));
    if (request.cursor) params.set('cursor', request.cursor);
    const query = params.toString();
    return this.call<SubscriberListResult>(
      `/organizations/${encodeURIComponent(organizationId)}/uptime/status-page/subscribers${query ? `?${query}` : ''}`,
      { method: 'GET' },
    );
  }

  async setSubscriptionsEnabled(
    organizationId: string,
    enabled: boolean,
  ): Promise<{ subscriptionsEnabled: boolean }> {
    return this.call<{ subscriptionsEnabled: boolean }>(
      `/organizations/${encodeURIComponent(organizationId)}/uptime/status-page/subscriptions`,
      {
        method: 'PATCH',
        body: JSON.stringify({ subscriptionsEnabled: enabled }),
      },
    );
  }

  async removeSubscriber(
    organizationId: string,
    subscriberId: string,
  ): Promise<void> {
    await this.call<void>(
      `/organizations/${encodeURIComponent(organizationId)}/uptime/status-page/subscribers/${encodeURIComponent(subscriberId)}`,
      { method: 'DELETE' },
    );
  }

  async managerUnsubscribeSubscriber(
    organizationId: string,
    subscriberId: string,
  ): Promise<StatusPageSubscriber> {
    return this.call<StatusPageSubscriber>(
      `/organizations/${encodeURIComponent(organizationId)}/uptime/status-page/subscribers/${encodeURIComponent(subscriberId)}/unsubscribe`,
      { method: 'POST' },
    );
  }

  async setSubscriberScope(
    organizationId: string,
    subscriberId: string,
    componentIds: string[],
  ): Promise<StatusPageSubscriber> {
    return this.call<StatusPageSubscriber>(
      `/organizations/${encodeURIComponent(organizationId)}/uptime/status-page/subscribers/${encodeURIComponent(subscriberId)}/scope`,
      { method: 'PUT', body: JSON.stringify({ componentIds }) },
    );
  }

  async listMachineFleets(organizationId: string): Promise<MachineFleet[]> {
    return this.call<MachineFleet[]>(
      `/organizations/${encodeURIComponent(organizationId)}/machine-fleets`,
      { method: 'GET' },
    );
  }

  async createMachineFleet(
    organizationId: string,
    request: { name: string; description?: string },
  ): Promise<MachineFleet> {
    return this.call<MachineFleet>(
      `/organizations/${encodeURIComponent(organizationId)}/machine-fleets`,
      { method: 'POST', body: JSON.stringify(request) },
    );
  }

  async getFleetStatus(
    organizationId: string,
    fleetId: string,
  ): Promise<FleetStatus> {
    return this.call<FleetStatus>(
      `/organizations/${encodeURIComponent(organizationId)}/machine-fleets/${encodeURIComponent(fleetId)}`,
      { method: 'GET' },
    );
  }

  async deleteMachineFleet(
    organizationId: string,
    fleetId: string,
  ): Promise<void> {
    await this.call<void>(
      `/organizations/${encodeURIComponent(organizationId)}/machine-fleets/${encodeURIComponent(fleetId)}`,
      { method: 'DELETE' },
    );
  }

  async bulkCreateFleetTunnels(
    organizationId: string,
    fleetId: string,
    specs: FleetTunnelSpec[],
  ): Promise<unknown[]> {
    return this.call<unknown[]>(
      `/organizations/${encodeURIComponent(organizationId)}/machine-fleets/${encodeURIComponent(fleetId)}/tunnels`,
      { method: 'POST', body: JSON.stringify(specs) },
    );
  }

  async rotateFleetTokens(
    organizationId: string,
    fleetId: string,
  ): Promise<{ rotated: { id: string; name: string; raw: string }[] }> {
    return this.call<{ rotated: { id: string; name: string; raw: string }[] }>(
      `/organizations/${encodeURIComponent(organizationId)}/machine-fleets/${encodeURIComponent(fleetId)}/rotate`,
      { method: 'POST' },
    );
  }

  async reconcileFleet(
    organizationId: string,
    fleetId: string,
  ): Promise<FleetReconcileResult> {
    return this.call<FleetReconcileResult>(
      `/organizations/${encodeURIComponent(organizationId)}/machine-fleets/${encodeURIComponent(fleetId)}/reconcile`,
      { method: 'POST' },
    );
  }

  async getPipelineHealth(organizationId: string): Promise<PipelineHealth> {
    return this.call<PipelineHealth>(
      `/organizations/${encodeURIComponent(organizationId)}/observability/pipelines`,
      { method: 'GET' },
    );
  }

  async listDeadLetters(
    organizationId: string,
    limit = 25,
  ): Promise<DeadLetter[]> {
    return this.call<DeadLetter[]>(
      `/organizations/${encodeURIComponent(organizationId)}/observability/dead-letters?limit=${limit}`,
      { method: 'GET' },
    );
  }

  private async call<T>(path: string, init: RequestInit): Promise<T> {
    const headers = new Headers(init.headers);
    headers.set('Accept', 'application/json');
    if (init.body) {
      headers.set('Content-Type', 'application/json');
    }
    if (this.apiKey) {
      headers.set('Authorization', `Bearer ${this.apiKey}`);
    }
    const response = await this.request(
      `${this.apiUrl}${this.apiPrefix}${path}`,
      { ...init, headers },
    );
    if (!response.ok) {
      const body = await response.text();
      let message = body;
      try {
        const payload = JSON.parse(body) as {
          message?: unknown;
          error?: unknown;
        };
        if (typeof payload.message === 'string' && payload.message !== '') {
          message = payload.message;
        } else if (typeof payload.error === 'string' && payload.error !== '') {
          message = payload.error;
        }
      } catch {
        // Preserve non-JSON error bodies as the exception message.
      }
      throw new TunnelAPIError(response.status, message);
    }
    if (response.status === 204) {
      return undefined as T;
    }
    return (await response.json()) as T;
  }
}

function normalizeTunnel(tunnel: Tunnel): Tunnel {
  if (tunnel.publicHostname) {
    return tunnel;
  }

  const legacyHostname = tunnel.public_url ?? tunnel.publicUrl;
  if (!legacyHostname) {
    return tunnel;
  }

  return { ...tunnel, publicHostname: legacyHostname };
}
