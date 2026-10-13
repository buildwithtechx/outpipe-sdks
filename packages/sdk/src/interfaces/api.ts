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
