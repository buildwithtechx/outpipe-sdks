use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Deserialize, Serialize, PartialEq)]
pub struct Organization {
    pub id: String,
    pub name: String,
    pub slug: String,
    #[serde(rename = "ownerId")]
    pub owner_id: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize, PartialEq)]
pub struct Tunnel {
    pub id: String,
    pub name: String,
    pub protocol: String,
    pub status: String,
    #[serde(rename = "publicHostname")]
    pub public_hostname: Option<String>,
    #[serde(rename = "publicPort")]
    pub public_port: Option<u16>,
    #[serde(rename = "targetHost")]
    pub target_host: String,
    #[serde(rename = "targetPort")]
    pub target_port: u16,
}

#[derive(Debug, Clone, Deserialize, Serialize, Default, PartialEq)]
pub struct CreateTunnel {
    pub name: String,
    pub protocol: String,
    #[serde(rename = "targetHost")]
    pub target_host: String,
    #[serde(rename = "targetPort")]
    pub target_port: u16,
    #[serde(rename = "publicHostname", skip_serializing_if = "Option::is_none")]
    pub public_hostname: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub password: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize, PartialEq)]
pub struct Domain {
    pub id: String,
    pub hostname: String,
    pub status: String,
    #[serde(rename = "verificationMethod")]
    pub verification_method: String,
    #[serde(rename = "organizationId")]
    pub organization_id: Option<String>,
    #[serde(rename = "tunnelId")]
    pub tunnel_id: Option<String>,
    #[serde(rename = "verifiedAt")]
    pub verified_at: Option<String>,
    #[serde(rename = "certificateStatus")]
    pub certificate_status: Option<String>,
    #[serde(rename = "certificateExpiresAt")]
    pub certificate_expires_at: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize, PartialEq)]
pub struct CreateDomain {
    pub hostname: String,
    #[serde(rename = "verificationMethod")]
    pub verification_method: String,
    #[serde(rename = "tunnelId", skip_serializing_if = "Option::is_none")]
    pub tunnel_id: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize, PartialEq)]
pub struct CreateDomainResponse {
    pub domain: Domain,
    #[serde(rename = "verificationToken")]
    pub verification_token: String,
}

#[derive(Debug, Clone, Deserialize, Serialize, PartialEq)]
pub struct DnsProviderCredential {
    pub id: String,
    #[serde(rename = "organizationId")]
    pub organization_id: String,
    pub provider: String,
    pub label: Option<String>,
    #[serde(rename = "lastFour")]
    pub last_four: Option<String>,
    #[serde(rename = "keyVersion")]
    pub key_version: Option<i32>,
}

#[derive(Debug, Clone, Deserialize, Serialize, PartialEq)]
pub struct ConnectDnsProvider {
    pub provider: String,
    pub token: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub label: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize, PartialEq)]
pub struct RelayTokenResponse {
    #[serde(rename = "relayToken")]
    pub relay_token: String,
    #[serde(rename = "expiresAt")]
    pub expires_at: String,
}

#[derive(Debug, Clone, Deserialize, Serialize, PartialEq)]
pub struct StatusPageSubscriber {
    pub id: String,
    #[serde(rename = "statusPageId")]
    pub status_page_id: String,
    pub email: String,
    pub status: String,
    pub confirmed: bool,
    #[serde(rename = "confirmedAt")]
    pub confirmed_at: Option<String>,
    #[serde(rename = "unsubscribedAt")]
    pub unsubscribed_at: Option<String>,
    #[serde(rename = "lastSentAt")]
    pub last_sent_at: Option<String>,
    #[serde(rename = "createdAt")]
    pub created_at: String,
    pub components: Vec<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize, PartialEq)]
pub struct SubscriberCounts {
    pub pending: i64,
    pub confirmed: i64,
    pub unsubscribed: i64,
}

#[derive(Debug, Clone, Deserialize, Serialize, PartialEq)]
pub struct SubscriberListResult {
    pub subscribers: Vec<StatusPageSubscriber>,
    pub counts: SubscriberCounts,
    #[serde(rename = "nextCursor")]
    pub next_cursor: Option<String>,
    #[serde(rename = "subscriptionsEnabled")]
    pub subscriptions_enabled: bool,
}

#[derive(Debug, Clone, Deserialize, Serialize, PartialEq)]
pub struct MachineFleet {
    pub id: String,
    #[serde(rename = "organizationId")]
    pub organization_id: String,
    pub name: String,
    pub description: String,
}

#[derive(Debug, Clone, Deserialize, Serialize, PartialEq)]
pub struct FleetDrift {
    #[serde(rename = "tunnelId")]
    pub tunnel_id: String,
    pub name: String,
    pub want: String,
    pub got: String,
    #[serde(rename = "machineOwned")]
    pub machine_owned: bool,
    #[serde(rename = "credentialOk")]
    pub credential_ok: bool,
}

#[derive(Debug, Clone, Deserialize, Serialize, PartialEq)]
pub struct FleetStatus {
    pub fleet: MachineFleet,
    pub drift: Vec<FleetDrift>,
}

#[derive(Debug, Clone, Deserialize, Serialize, PartialEq)]
pub struct QueueHealth {
    pub queue: String,
    pub depth: i64,
    #[serde(rename = "oldestAgeSecs")]
    pub oldest_age_secs: Option<i64>,
    #[serde(rename = "deadLettered")]
    pub dead_lettered: i64,
    pub healthy: bool,
}

#[derive(Debug, Clone, Deserialize, Serialize, PartialEq)]
pub struct PipelineHealth {
    #[serde(rename = "organizationId")]
    pub organization_id: String,
    pub queues: Vec<QueueHealth>,
    pub healthy: bool,
}

#[derive(Debug, Clone, Deserialize, Serialize, PartialEq)]
pub struct DeadLetter {
    pub queue: String,
    pub id: String,
    #[serde(rename = "eventType")]
    pub event_type: String,
    pub attempts: i64,
    #[serde(rename = "lastError")]
    pub last_error: String,
}
