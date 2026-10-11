package protocol

import "encoding/json"

const Version = 1
const MinSupportedVersion = 1
const MaxSupportedVersion = 1

const DefaultMaxFrameSize int64 = 16 * 1024 * 1024
const AbsoluteMaxFrameSize int64 = 32 * 1024 * 1024
const DefaultIdleTimeoutSeconds int = 60
const DefaultConnectionTimeoutSeconds int = 30

type MessageType string

const (
	MessageTypeAuth                MessageType = "auth"
	MessageTypeAuthResponse        MessageType = "auth_response"
	MessageTypeVersionNegotiate    MessageType = "version_negotiate"
	MessageTypeVersionNegotiateAck MessageType = "version_negotiate_ack"
	MessageTypeFlowControl         MessageType = "flow_control"
	MessageTypeOpenTunnel          MessageType = "open_tunnel"
	MessageTypeOpenTunnelAck       MessageType = "open_tunnel_ack"
	MessageTypeCloseTunnel         MessageType = "close_tunnel"
	MessageTypeData                MessageType = "data"
	MessageTypeHeartbeat           MessageType = "heartbeat"
	MessageTypeError               MessageType = "error"
	MessageTypeHTTPRequest         MessageType = "http_request"
	MessageTypeHTTPResponse        MessageType = "http_response"
	MessageTypeTCPData             MessageType = "tcp_data"
	MessageTypeTCPClose            MessageType = "tcp_close"
	MessageTypeUDPData             MessageType = "udp_data"
	MessageTypeUDPResponse         MessageType = "udp_response"
)

type Envelope struct {
	Version   int             `json:"version"`
	Type      MessageType     `json:"type"`
	RequestID string          `json:"request_id,omitempty"`
	Payload   json.RawMessage `json:"payload,omitempty"`
}

type AuthRequest struct {
	Token                 string   `json:"token"`
	AgentID               string   `json:"agent_id,omitempty"`
	RequestedCapabilities []string `json:"requested_capabilities,omitempty"`
}

type AuthResponse struct {
	Authenticated       bool     `json:"authenticated"`
	AgentID             string   `json:"agent_id,omitempty"`
	OrganizationID      string   `json:"organization_id,omitempty"`
	GrantedCapabilities []string `json:"granted_capabilities,omitempty"`
	Error               string   `json:"error,omitempty"`
}

type VersionNegotiate struct {
	MinVersion    int    `json:"min_version"`
	MaxVersion    int    `json:"max_version"`
	ClientName    string `json:"client_name,omitempty"`
	ClientVersion string `json:"client_version,omitempty"`
}

type VersionNegotiateAck struct {
	NegotiatedVersion int    `json:"negotiated_version"`
	SupportedVersions []int  `json:"supported_versions"`
	ServerName        string `json:"server_name,omitempty"`
	ServerVersion     string `json:"server_version,omitempty"`
}

type FlowControl struct {
	StreamID   string `json:"stream_id"`
	Action     string `json:"action"`
	WindowSize int64  `json:"window_size,omitempty"`
}

type OpenTunnel struct {
	Token        string `json:"token"`
	TunnelID     string `json:"tunnel_id,omitempty"`
	LocalPort    int    `json:"local_port"`
	Subdomain    string `json:"subdomain,omitempty"`
	Protocol     string `json:"protocol"`
	CustomDomain string `json:"custom_domain,omitempty"`
	Password     string `json:"password,omitempty"`
}

type OpenTunnelAck struct {
	TunnelID   string `json:"tunnel_id"`
	PublicURL  string `json:"public_url"`
	PublicPort int    `json:"public_port,omitempty"`
}

type CloseTunnel struct {
	TunnelID string `json:"tunnel_id"`
	Reason   string `json:"reason,omitempty"`
}

type Data struct {
	TunnelID string `json:"tunnel_id"`
	StreamID string `json:"stream_id"`
	Data     []byte `json:"data"`
}

type Heartbeat struct {
	Timestamp int64 `json:"timestamp"`
}

type ErrorMessage struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

type HTTPRequest struct {
	Method  string              `json:"method"`
	Path    string              `json:"path"`
	Headers map[string][]string `json:"headers"`
	Body    string              `json:"body,omitempty"`
}

type HTTPResponse struct {
	StatusCode int                 `json:"status_code"`
	Headers    map[string][]string `json:"headers"`
	Body       string              `json:"body,omitempty"`
	Error      string              `json:"error,omitempty"`
}

type TCPData struct {
	TunnelID     string `json:"tunnel_id,omitempty"`
	ConnectionID string `json:"connection_id"`
	Data         string `json:"data"`
}

type TCPClose struct {
	TunnelID     string `json:"tunnel_id,omitempty"`
	ConnectionID string `json:"connection_id"`
	Reason       string `json:"reason,omitempty"`
}

type UDPData struct {
	TunnelID      string `json:"tunnel_id,omitempty"`
	PacketID      string `json:"packet_id"`
	SourceAddress string `json:"source_address"`
	SourcePort    int    `json:"source_port"`
	Data          string `json:"data"`
}

type UDPResponse struct {
	TunnelID      string `json:"tunnel_id,omitempty"`
	PacketID      string `json:"packet_id"`
	TargetAddress string `json:"target_address"`
	TargetPort    int    `json:"target_port"`
	Data          string `json:"data"`
}
