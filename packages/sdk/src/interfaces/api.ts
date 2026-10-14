export type TunnelAPIClientOptions = {
  apiUrl?: string;
  apiKey?: string;
  fetch?: typeof globalThis.fetch;
  apiPrefix?: string;
};

export type Tunnel = {
  id: string;
  publicHostname?: string;
  /** @deprecated Relay protocol messages use public_url; HTTP API responses use publicHostname. */
  public_url?: string;
  /** @deprecated Use publicHostname for HTTP API responses. */
  publicUrl?: string;
  status: string;
  [key: string]: unknown;
};

export type DomainVerificationMethod = 'dns' | 'http' | 'dns-automation';

export type Domain = {
  id: string;
  organizationId?: string;
  tunnelId?: string;
  hostname: string;
  status: string;
  verificationMethod: DomainVerificationMethod;
  verifiedAt?: string;
  certificateStatus?: string;
  certificateExpiresAt?: string;
  [key: string]: unknown;
};

export type CreateDomainRequest = {
  hostname: string;
  verificationMethod: DomainVerificationMethod;
  tunnelId?: string;
};

export type CreateDomainResponse = {
  domain: Domain;
  verificationToken: string;
};

export type DNSProviderCredential = {
  id: string;
  organizationId: string;
  provider: string;
  label?: string;
  lastFour?: string;
  keyVersion?: number;
  [key: string]: unknown;
};

export type ConnectDNSProviderRequest = {
  provider: string;
  token: string;
  label?: string;
};

export type RelayTokenResponse = {
  relayToken: string;
  expiresAt: string;
};

export type SubscriberStatus = 'pending' | 'confirmed' | 'unsubscribed';

export type StatusPageSubscriber = {
  id: string;
  statusPageId: string;
  email: string;
  status: SubscriberStatus;
  confirmed: boolean;
  confirmedAt?: string;
  unsubscribedAt?: string;
  lastSentAt?: string;
  createdAt: string;
  components: string[];
};

export type SubscriberListResult = {
  subscribers: StatusPageSubscriber[];
  counts: { pending: number; confirmed: number; unsubscribed: number };
  nextCursor?: string;
  subscriptionsEnabled: boolean;
};

export type ListSubscribersRequest = {
  q?: string;
  status?: SubscriberStatus | 'all';
  limit?: number;
  cursor?: string;
};

export type MachineFleet = {
  id: string;
  organizationId: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
};

export type FleetDrift = {
  tunnelId: string;
  name: string;
  want: string;
  got: string;
  machineOwned: boolean;
  credentialOk: boolean;
};

export type FleetStatus = {
  fleet: MachineFleet;
  tokens: { id: string; name: string; revokedAt?: string }[];
  desiredTunnels: { tunnelId: string; name: string }[];
  liveTunnels: { id: string; name: string; status: string }[];
  drift: FleetDrift[];
};

export type FleetTunnelSpec = {
  name: string;
  protocol?: string;
  targetHost: string;
  targetPort: number;
  publicHostname?: string;
  desiredStatus?: string;
};

export type FleetReconcileResult = {
  reactivated: number;
  recreated: number;
  skipped: number;
  errors?: string[];
};

export type QueueHealth = {
  queue: string;
  depth: number;
  oldestAgeSecs?: number;
  deadLettered: number;
  healthy: boolean;
};

export type PipelineHealth = {
  organizationId: string;
  queues: QueueHealth[];
  healthy: boolean;
  checkedAt: string;
};

export type DeadLetter = {
  queue: string;
  id: string;
  eventType: string;
  attempts: number;
  lastError: string;
  updatedAt: string;
};
