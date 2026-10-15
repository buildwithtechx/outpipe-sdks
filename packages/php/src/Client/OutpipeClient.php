<?php

declare(strict_types=1);

namespace Outpipe\Client;

use Outpipe\Contracts\HttpTransport;
use Outpipe\Contracts\Response;
use Outpipe\Exceptions\ApiException;

final class OutpipeClient
{
    public function __construct(
        private readonly string $baseUrl = 'https://api.outpipe.dev',
        private readonly ?string $apiKey = null,
        private readonly float $timeout = 10.0,
        private readonly ?HttpTransport $transport = null,
    ) {}

    public function health(): array { return $this->request('GET', '/healthz'); }

    public function ready(): array { return $this->request('GET', '/readyz'); }

    public function account(): array { return $this->request('GET', '/api/v1/account'); }

    public function organizations(): array { return $this->request('GET', '/api/v1/organizations'); }

    public function organization(string $organizationId): array { return $this->request('GET', '/api/v1/organizations/' . $this->segment($organizationId)); }

    public function createOrganization(string $name, string $slug): array
    {
        return $this->request('POST', '/api/v1/organizations', ['name' => $name, 'slug' => $slug]);
    }

    public function slugAvailable(string $slug): array
    {
        return $this->request('GET', '/api/v1/organizations/slug-availability', ['slug' => $slug]);
    }

    public function members(string $organizationId): array { return $this->request('GET', '/api/v1/organizations/' . $this->segment($organizationId) . '/members'); }

    public function tunnels(string $organizationId): array { return $this->request('GET', '/api/v1/organizations/' . $this->segment($organizationId) . '/tunnels'); }

    public function createTunnel(string $organizationId, array $tunnel): array
    {
        return $this->request('POST', '/api/v1/organizations/' . $this->segment($organizationId) . '/tunnels', $tunnel);
    }

    public function tunnel(string $tunnelId): array { return $this->request('GET', '/api/v1/tunnels/' . $this->segment($tunnelId)); }

    public function setTunnelStatus(string $tunnelId, string $status): void
    {
        $this->request('PATCH', '/api/v1/tunnels/' . $this->segment($tunnelId) . '/status', ['status' => $status]);
    }

    public function updateTunnelConfiguration(string $tunnelId, array $configuration): array
    {
        return $this->request('PATCH', '/api/v1/tunnels/' . $this->segment($tunnelId) . '/config', $configuration);
    }

    public function revokeTunnel(string $tunnelId): void
    {
        $this->request('DELETE', '/api/v1/tunnels/' . $this->segment($tunnelId));
    }

    public function agents(string $organizationId): array { return $this->request('GET', '/api/v1/organizations/' . $this->segment($organizationId) . '/agents'); }

    public function registerAgent(string $organizationId, array $agent): array
    {
        return $this->request('POST', '/api/v1/organizations/' . $this->segment($organizationId) . '/agents', $agent);
    }

    public function revokeAgent(string $agentId): void
    {
        $this->request('DELETE', '/api/v1/agents/' . $this->segment($agentId));
    }

    public function domains(string $organizationId): array { return $this->request('GET', '/api/v1/organizations/' . $this->segment($organizationId) . '/domains'); }

    public function createDomain(string $organizationId, array $domain): array
    {
        return $this->request('POST', '/api/v1/organizations/' . $this->segment($organizationId) . '/domains', $domain);
    }

    public function verifyDomain(string $domainId, string $token): array
    {
        return $this->request('POST', '/api/v1/domains/' . $this->segment($domainId) . '/verify', ['token' => $token]);
    }

    public function deleteDomain(string $domainId): void
    {
        $this->request('DELETE', '/api/v1/domains/' . $this->segment($domainId));
    }

    public function listDNSProviders(string $organizationId): array
    {
        return $this->request('GET', '/api/v1/organizations/' . $this->segment($organizationId) . '/dns-providers');
    }

    public function connectDNSProvider(string $organizationId, array $credential): array
    {
        return $this->request('POST', '/api/v1/organizations/' . $this->segment($organizationId) . '/dns-providers', $credential);
    }

    public function deleteDNSProvider(string $organizationId, string $credentialId): void
    {
        $this->request('DELETE', '/api/v1/organizations/' . $this->segment($organizationId) . '/dns-providers/' . $this->segment($credentialId));
    }

    public function subscribeToStatusPage(string $slug, string $email, array $componentIds = []): array
    {
        return $this->request('POST', '/api/v1/status/' . $this->segment($slug) . '/subscribe', ['email' => $email, 'componentIds' => $componentIds]);
    }

    public function confirmSubscription(string $slug, string $token): array
    {
        return $this->request('POST', '/api/v1/status/' . $this->segment($slug) . '/confirm', ['token' => $token]);
    }

    public function unsubscribeFromStatusPage(string $slug, string $token): array
    {
        return $this->request('POST', '/api/v1/status/' . $this->segment($slug) . '/unsubscribe', ['token' => $token]);
    }

    public function listSubscribers(string $organizationId, array $query = []): array
    {
        return $this->request('GET', '/api/v1/organizations/' . $this->segment($organizationId) . '/uptime/status-page/subscribers', $query);
    }

    public function setSubscriptionsEnabled(string $organizationId, bool $enabled): array
    {
        return $this->request('PATCH', '/api/v1/organizations/' . $this->segment($organizationId) . '/uptime/status-page/subscriptions', ['subscriptionsEnabled' => $enabled]);
    }

    public function removeSubscriber(string $organizationId, string $subscriberId): void
    {
        $this->request('DELETE', '/api/v1/organizations/' . $this->segment($organizationId) . '/uptime/status-page/subscribers/' . $this->segment($subscriberId));
    }

    public function managerUnsubscribeSubscriber(string $organizationId, string $subscriberId): array
    {
        return $this->request('POST', '/api/v1/organizations/' . $this->segment($organizationId) . '/uptime/status-page/subscribers/' . $this->segment($subscriberId) . '/unsubscribe');
    }

    public function setSubscriberScope(string $organizationId, string $subscriberId, array $componentIds): array
    {
        return $this->request('PUT', '/api/v1/organizations/' . $this->segment($organizationId) . '/uptime/status-page/subscribers/' . $this->segment($subscriberId) . '/scope', ['componentIds' => $componentIds]);
    }

    public function refreshMachineTunnelRelayToken(string $tunnelId): array
    {
        return $this->request('POST', '/api/v1/machines/tunnels/' . $this->segment($tunnelId) . '/relay-token');
    }

    public function listMachineFleets(string $organizationId): array
    {
        return $this->request('GET', '/api/v1/organizations/' . $this->segment($organizationId) . '/machine-fleets');
    }

    public function createMachineFleet(string $organizationId, array $fleet): array
    {
        return $this->request('POST', '/api/v1/organizations/' . $this->segment($organizationId) . '/machine-fleets', $fleet);
    }

    public function fleetStatus(string $organizationId, string $fleetId): array
    {
        return $this->request('GET', '/api/v1/organizations/' . $this->segment($organizationId) . '/machine-fleets/' . $this->segment($fleetId));
    }

    public function reconcileFleet(string $organizationId, string $fleetId): array
    {
        return $this->request('POST', '/api/v1/organizations/' . $this->segment($organizationId) . '/machine-fleets/' . $this->segment($fleetId) . '/reconcile');
    }

    public function pipelineHealth(string $organizationId): array
    {
        return $this->request('GET', '/api/v1/organizations/' . $this->segment($organizationId) . '/observability/pipelines');
    }

    public function deadLetters(string $organizationId, int $limit = 25): array
    {
        return $this->request('GET', '/api/v1/organizations/' . $this->segment($organizationId) . '/observability/dead-letters', ['limit' => $limit]);
    }

    public function listAlerts(string $organizationId): array
    {
        return $this->request('GET', '/api/v1/organizations/' . $this->segment($organizationId) . '/observability/alerts');
    }

    public function createAlert(string $organizationId, array $alert): array
    {
        return $this->request('POST', '/api/v1/organizations/' . $this->segment($organizationId) . '/observability/alerts', $alert);
    }

    public function deleteAlert(string $organizationId, string $alertId): void
    {
        $this->request('DELETE', '/api/v1/organizations/' . $this->segment($organizationId) . '/observability/alerts/' . $this->segment($alertId));
    }

    public function setAlertStatusPage(string $organizationId, string $alertId, array $statusPage): array
    {
        return $this->request('PATCH', '/api/v1/organizations/' . $this->segment($organizationId) . '/observability/alerts/' . $this->segment($alertId) . '/status-page', $statusPage);
    }

    public function setAlertEnabled(string $organizationId, string $alertId, bool $enabled): array
    {
        return $this->request('PATCH', '/api/v1/organizations/' . $this->segment($organizationId) . '/observability/alerts/' . $this->segment($alertId) . '/enabled', ['enabled' => $enabled]);
    }

    public function createDomainBundle(string $organizationId, array $bundle): array
    {
        return $this->request('POST', '/api/v1/organizations/' . $this->segment($organizationId) . '/domains/bundle', $bundle);
    }

    public function usageSnapshot(string $organizationId, array $query = []): array
    {
        return $this->request('GET', '/api/v1/organizations/' . $this->segment($organizationId) . '/usage/snapshot', $query);
    }

    public function usageEvents(string $organizationId, array $query = []): array
    {
        return $this->request('GET', '/api/v1/organizations/' . $this->segment($organizationId) . '/usage/events', $query);
    }

    public function usageRequests(string $organizationId, array $query = []): array
    {
        return $this->request('GET', '/api/v1/organizations/' . $this->segment($organizationId) . '/usage/requests', $query);
    }

    public function auditLogs(string $organizationId, array $query = []): array
    {
        return $this->request('GET', '/api/v1/organizations/' . $this->segment($organizationId) . '/audit-logs', $query);
    }

    public function apiKeys(string $organizationId): array { return $this->request('GET', '/api/v1/organizations/' . $this->segment($organizationId) . '/api-keys'); }

    public function createApiKey(string $organizationId, array $key): array
    {
        return $this->request('POST', '/api/v1/organizations/' . $this->segment($organizationId) . '/api-keys', $key);
    }

    public function revokeApiKey(string $organizationId, string $keyId): void
    {
        $this->request('DELETE', '/api/v1/organizations/' . $this->segment($organizationId) . '/api-keys/' . $this->segment($keyId));
    }

    public function webhooks(string $organizationId): array { return $this->request('GET', '/api/v1/organizations/' . $this->segment($organizationId) . '/webhooks'); }

    public function createWebhook(string $organizationId, array $webhook): array
    {
        return $this->request('POST', '/api/v1/organizations/' . $this->segment($organizationId) . '/webhooks', $webhook);
    }

    public function deleteWebhook(string $organizationId, string $webhookId): void
    {
        $this->request('DELETE', '/api/v1/organizations/' . $this->segment($organizationId) . '/webhooks/' . $this->segment($webhookId));
    }

    public function webhookDeliveries(string $organizationId, string $webhookId): array
    {
        return $this->request('GET', '/api/v1/organizations/' . $this->segment($organizationId) . '/webhooks/' . $this->segment($webhookId) . '/deliveries');
    }

    public function billing(string $organizationId): array { return $this->request('GET', '/api/v1/organizations/' . $this->segment($organizationId) . '/billing'); }

    public function plans(string $organizationId): array { return $this->request('GET', '/api/v1/organizations/' . $this->segment($organizationId) . '/billing/plans'); }

    public function invoices(string $organizationId): array { return $this->request('GET', '/api/v1/organizations/' . $this->segment($organizationId) . '/billing/invoices'); }

    public function checkout(string $organizationId, array $checkout): array
    {
        return $this->request('POST', '/api/v1/organizations/' . $this->segment($organizationId) . '/billing/checkout', $checkout);
    }

    public function billingPortal(string $organizationId): array { return $this->request('GET', '/api/v1/organizations/' . $this->segment($organizationId) . '/billing/portal'); }

    public function cancelBilling(string $organizationId): void { $this->request('POST', '/api/v1/organizations/' . $this->segment($organizationId) . '/billing/cancel'); }

    public function resumeBilling(string $organizationId): void { $this->request('POST', '/api/v1/organizations/' . $this->segment($organizationId) . '/billing/resume'); }

    public function deleteAccount(): void { $this->request('DELETE', '/api/v1/account'); }

    public function transferOwnership(string $organizationId, string $userId): void
    {
        $this->request('POST', '/api/v1/organizations/' . $this->segment($organizationId) . '/transfer', ['userId' => $userId]);
    }

    private function request(string $method, string $path, ?array $payload = null): array
    {
        $query = $method === 'GET' && $payload !== null ? '?' . http_build_query($payload) : '';
        $url = rtrim($this->baseUrl, '/') . $path . $query;
        $headers = ['Accept: application/json', 'Content-Type: application/json'];

        if ($this->apiKey !== null && $this->apiKey !== '') {
            $headers[] = 'Authorization: Bearer ' . $this->apiKey;
        }

        $body = $method === 'GET' || $payload === null ? null : json_encode($payload, JSON_THROW_ON_ERROR);
        $response = ($this->transport ?? new CurlTransport())->send($method, $url, $headers, $body, $this->timeout);

        if ($response->status < 200 || $response->status >= 300) {
            throw new ApiException(self::message($response), $response->status, $response->json());
        }

        return $response->json();
    }

    private function segment(string $value): string
    {
        return rawurlencode($value);
    }

    private static function message(Response $response): string
    {
        $payload = $response->json();
        $message = $payload['message'] ?? $payload['error'] ?? null;

        return is_string($message) && $message !== '' ? $message : "Outpipe API request failed with status {$response->status}.";
    }
}
