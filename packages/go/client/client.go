package client

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"
)

type Config struct {
	BaseURL    string
	APIKey     string
	HTTPClient *http.Client
	APIPrefix  string
}
type Client struct {
	baseURL    string
	apiKey     string
	apiPrefix  string
	httpClient *http.Client
}
type APIError struct {
	StatusCode int
	Message    string
	Body       []byte
}

func (e *APIError) Error() string {
	return fmt.Sprintf("outpipe API request failed with status %d: %s", e.StatusCode, e.Message)
}

func New(cfg Config) (*Client, error) {
	baseURL := strings.TrimRight(strings.TrimSpace(cfg.BaseURL), "/")
	if baseURL == "" {
		baseURL = "https://api.outpipe.dev"
	}
	prefix := strings.Trim(cfg.APIPrefix, "/")
	if prefix == "" {
		prefix = "api/v1"
	}
	httpClient := cfg.HTTPClient
	if httpClient == nil {
		httpClient = &http.Client{Timeout: 15 * time.Second}
	}
	return &Client{baseURL: baseURL, apiKey: cfg.APIKey, apiPrefix: prefix, httpClient: httpClient}, nil
}

func (c *Client) Health(ctx context.Context) (map[string]any, error) {
	var output map[string]any
	return output, c.do(ctx, http.MethodGet, "/healthz", nil, &output)
}
func (c *Client) Ready(ctx context.Context) (map[string]any, error) {
	var output map[string]any
	return output, c.do(ctx, http.MethodGet, "/readyz", nil, &output)
}
func (c *Client) Organizations(ctx context.Context) ([]map[string]any, error) {
	return requestList(ctx, c, "/organizations", nil)
}
func (c *Client) Organization(ctx context.Context, id string) (map[string]any, error) {
	return requestMap(ctx, c, http.MethodGet, "/organizations/"+url.PathEscape(id), nil)
}
func (c *Client) Tunnels(ctx context.Context, organizationID string) ([]map[string]any, error) {
	return requestList(ctx, c, "/organizations/"+url.PathEscape(organizationID)+"/tunnels", nil)
}
func (c *Client) CreateTunnel(ctx context.Context, organizationID string, tunnel map[string]any) (map[string]any, error) {
	return requestMap(ctx, c, http.MethodPost, "/organizations/"+url.PathEscape(organizationID)+"/tunnels", tunnel)
}
func (c *Client) Tunnel(ctx context.Context, tunnelID string) (map[string]any, error) {
	return requestMap(ctx, c, http.MethodGet, "/tunnels/"+url.PathEscape(tunnelID), nil)
}
func (c *Client) SetTunnelStatus(ctx context.Context, tunnelID, status string) error {
	_, err := requestMap(ctx, c, http.MethodPatch, "/tunnels/"+url.PathEscape(tunnelID)+"/status", map[string]string{"status": status})
	return err
}
func (c *Client) RevokeTunnel(ctx context.Context, tunnelID string) error {
	return requestNoContent(ctx, c, http.MethodDelete, "/tunnels/"+url.PathEscape(tunnelID), nil)
}
func (c *Client) RefreshMachineTunnelRelayToken(ctx context.Context, tunnelID string) (map[string]any, error) {
	relay, err := requestMap(ctx, c, http.MethodPost, "/machines/tunnels/"+url.PathEscape(tunnelID)+"/relay-token", nil)
	if err != nil {
		return nil, fmt.Errorf("refresh machine tunnel relay token: %w", err)
	}
	return relay, nil
}
func (c *Client) Domains(ctx context.Context, organizationID string) ([]map[string]any, error) {
	domains, err := requestList(ctx, c, "/organizations/"+url.PathEscape(organizationID)+"/domains", nil)
	if err != nil {
		return nil, fmt.Errorf("list domains: %w", err)
	}
	return domains, nil
}
func (c *Client) CreateDomain(ctx context.Context, organizationID string, domain map[string]any) (map[string]any, error) {
	created, err := requestMap(ctx, c, http.MethodPost, "/organizations/"+url.PathEscape(organizationID)+"/domains", domain)
	if err != nil {
		return nil, fmt.Errorf("create domain: %w", err)
	}
	return created, nil
}
func (c *Client) CreateDomainBundle(ctx context.Context, organizationID string, bundle map[string]any) ([]map[string]any, error) {
	var created []map[string]any
	if err := c.do(ctx, http.MethodPost, "/"+c.apiPrefix+"/organizations/"+url.PathEscape(organizationID)+"/domains/bundle", bundle, &created); err != nil {
		return nil, fmt.Errorf("create domain bundle: %w", err)
	}
	return created, nil
}
func (c *Client) VerifyDomain(ctx context.Context, domainID, token string) error {
	if err := requestNoContent(ctx, c, http.MethodPost, "/domains/"+url.PathEscape(domainID)+"/verify", map[string]string{"token": token}); err != nil {
		return fmt.Errorf("verify domain: %w", err)
	}
	return nil
}
func (c *Client) DeleteDomain(ctx context.Context, domainID string) error {
	if err := requestNoContent(ctx, c, http.MethodDelete, "/domains/"+url.PathEscape(domainID), nil); err != nil {
		return fmt.Errorf("delete domain: %w", err)
	}
	return nil
}
func (c *Client) ListDNSProviders(ctx context.Context, organizationID string) ([]map[string]any, error) {
	providers, err := requestList(ctx, c, "/organizations/"+url.PathEscape(organizationID)+"/dns-providers", nil)
	if err != nil {
		return nil, fmt.Errorf("list DNS providers: %w", err)
	}
	return providers, nil
}
func (c *Client) ConnectDNSProvider(ctx context.Context, organizationID string, credential map[string]any) (map[string]any, error) {
	connected, err := requestMap(ctx, c, http.MethodPost, "/organizations/"+url.PathEscape(organizationID)+"/dns-providers", credential)
	if err != nil {
		return nil, fmt.Errorf("connect DNS provider: %w", err)
	}
	return connected, nil
}
func (c *Client) DeleteDNSProvider(ctx context.Context, organizationID, credentialID string) error {
	if err := requestNoContent(ctx, c, http.MethodDelete, "/organizations/"+url.PathEscape(organizationID)+"/dns-providers/"+url.PathEscape(credentialID), nil); err != nil {
		return fmt.Errorf("delete DNS provider: %w", err)
	}
	return nil
}
func (c *Client) SubscribeToStatusPage(ctx context.Context, slug, email string, componentIDs []string) (map[string]any, error) {
	subscribed, err := requestMap(ctx, c, http.MethodPost, "/status/"+url.PathEscape(slug)+"/subscribe", map[string]any{"email": email, "componentIds": componentIDs})
	if err != nil {
		return nil, fmt.Errorf("subscribe to status page: %w", err)
	}
	return subscribed, nil
}
func (c *Client) ConfirmSubscription(ctx context.Context, slug, token string) (map[string]any, error) {
	confirmed, err := requestMap(ctx, c, http.MethodPost, "/status/"+url.PathEscape(slug)+"/confirm", map[string]string{"token": token})
	if err != nil {
		return nil, fmt.Errorf("confirm subscription: %w", err)
	}
	return confirmed, nil
}
func (c *Client) UnsubscribeFromStatusPage(ctx context.Context, slug, token string) (map[string]any, error) {
	unsubscribed, err := requestMap(ctx, c, http.MethodPost, "/status/"+url.PathEscape(slug)+"/unsubscribe", map[string]string{"token": token})
	if err != nil {
		return nil, fmt.Errorf("unsubscribe from status page: %w", err)
	}
	return unsubscribed, nil
}
func (c *Client) ListSubscribers(ctx context.Context, organizationID string, query url.Values) (map[string]any, error) {
	path := "/organizations/" + url.PathEscape(organizationID) + "/uptime/status-page/subscribers"
	if encoded := query.Encode(); encoded != "" {
		path += "?" + encoded
	}
	var output map[string]any
	if err := c.do(ctx, http.MethodGet, "/"+c.apiPrefix+path, nil, &output); err != nil {
		return nil, fmt.Errorf("list subscribers: %w", err)
	}
	return output, nil
}
func (c *Client) SetSubscriptionsEnabled(ctx context.Context, organizationID string, enabled bool) (map[string]any, error) {
	updated, err := requestMap(ctx, c, http.MethodPatch, "/organizations/"+url.PathEscape(organizationID)+"/uptime/status-page/subscriptions", map[string]bool{"subscriptionsEnabled": enabled})
	if err != nil {
		return nil, fmt.Errorf("update subscriber settings: %w", err)
	}
	return updated, nil
}
func (c *Client) RemoveSubscriber(ctx context.Context, organizationID, subscriberID string) error {
	if err := requestNoContent(ctx, c, http.MethodDelete, "/organizations/"+url.PathEscape(organizationID)+"/uptime/status-page/subscribers/"+url.PathEscape(subscriberID), nil); err != nil {
		return fmt.Errorf("remove subscriber: %w", err)
	}
	return nil
}
func (c *Client) ManagerUnsubscribeSubscriber(ctx context.Context, organizationID, subscriberID string) (map[string]any, error) {
	unsubscribed, err := requestMap(ctx, c, http.MethodPost, "/organizations/"+url.PathEscape(organizationID)+"/uptime/status-page/subscribers/"+url.PathEscape(subscriberID)+"/unsubscribe", nil)
	if err != nil {
		return nil, fmt.Errorf("manager unsubscribe subscriber: %w", err)
	}
	return unsubscribed, nil
}
func (c *Client) SetSubscriberScope(ctx context.Context, organizationID, subscriberID string, componentIDs []string) (map[string]any, error) {
	scoped, err := requestMap(ctx, c, http.MethodPut, "/organizations/"+url.PathEscape(organizationID)+"/uptime/status-page/subscribers/"+url.PathEscape(subscriberID)+"/scope", map[string]any{"componentIds": componentIDs})
	if err != nil {
		return nil, fmt.Errorf("set subscriber scope: %w", err)
	}
	return scoped, nil
}
func (c *Client) ListMachineFleets(ctx context.Context, organizationID string) ([]map[string]any, error) {
	fleets, err := requestList(ctx, c, "/organizations/"+url.PathEscape(organizationID)+"/machine-fleets", nil)
	if err != nil {
		return nil, fmt.Errorf("list machine fleets: %w", err)
	}
	return fleets, nil
}
func (c *Client) CreateMachineFleet(ctx context.Context, organizationID string, fleet map[string]any) (map[string]any, error) {
	created, err := requestMap(ctx, c, http.MethodPost, "/organizations/"+url.PathEscape(organizationID)+"/machine-fleets", fleet)
	if err != nil {
		return nil, fmt.Errorf("create machine fleet: %w", err)
	}
	return created, nil
}
func (c *Client) FleetStatus(ctx context.Context, organizationID, fleetID string) (map[string]any, error) {
	status, err := requestMap(ctx, c, http.MethodGet, "/organizations/"+url.PathEscape(organizationID)+"/machine-fleets/"+url.PathEscape(fleetID), nil)
	if err != nil {
		return nil, fmt.Errorf("fleet status: %w", err)
	}
	return status, nil
}
func (c *Client) DeleteMachineFleet(ctx context.Context, organizationID, fleetID string) error {
	if err := requestNoContent(ctx, c, http.MethodDelete, "/organizations/"+url.PathEscape(organizationID)+"/machine-fleets/"+url.PathEscape(fleetID), nil); err != nil {
		return fmt.Errorf("delete machine fleet: %w", err)
	}
	return nil
}
func (c *Client) BulkCreateFleetTunnels(ctx context.Context, organizationID, fleetID string, specs []map[string]any) ([]map[string]any, error) {
	var created []map[string]any
	if err := c.do(ctx, http.MethodPost, "/"+c.apiPrefix+"/organizations/"+url.PathEscape(organizationID)+"/machine-fleets/"+url.PathEscape(fleetID)+"/tunnels", specs, &created); err != nil {
		return nil, fmt.Errorf("bulk create fleet tunnels: %w", err)
	}
	return created, nil
}
func (c *Client) RotateFleetTokens(ctx context.Context, organizationID, fleetID string) (map[string]any, error) {
	rotated, err := requestMap(ctx, c, http.MethodPost, "/organizations/"+url.PathEscape(organizationID)+"/machine-fleets/"+url.PathEscape(fleetID)+"/rotate", nil)
	if err != nil {
		return nil, fmt.Errorf("rotate fleet tokens: %w", err)
	}
	return rotated, nil
}
func (c *Client) ReconcileFleet(ctx context.Context, organizationID, fleetID string) (map[string]any, error) {
	result, err := requestMap(ctx, c, http.MethodPost, "/organizations/"+url.PathEscape(organizationID)+"/machine-fleets/"+url.PathEscape(fleetID)+"/reconcile", nil)
	if err != nil {
		return nil, fmt.Errorf("reconcile fleet: %w", err)
	}
	return result, nil
}
func (c *Client) PipelineHealth(ctx context.Context, organizationID string) (map[string]any, error) {
	health, err := requestMap(ctx, c, http.MethodGet, "/organizations/"+url.PathEscape(organizationID)+"/observability/pipelines", nil)
	if err != nil {
		return nil, fmt.Errorf("pipeline health: %w", err)
	}
	return health, nil
}
func (c *Client) DeadLetters(ctx context.Context, organizationID string, limit int) ([]map[string]any, error) {
	if limit <= 0 {
		limit = 25
	}
	path := "/organizations/" + url.PathEscape(organizationID) + "/observability/dead-letters?limit=" + strconv.Itoa(limit)
	var letters []map[string]any
	if err := c.do(ctx, http.MethodGet, "/"+c.apiPrefix+path, nil, &letters); err != nil {
		return nil, fmt.Errorf("dead letters: %w", err)
	}
	return letters, nil
}

func (c *Client) do(ctx context.Context, method, path string, input any, output any) error {
	var body io.Reader
	if input != nil {
		encoded, err := json.Marshal(input)
		if err != nil {
			return fmt.Errorf("encode request: %w", err)
		}
		body = bytes.NewReader(encoded)
	}
	request, err := http.NewRequestWithContext(ctx, method, c.baseURL+path, body)
	if err != nil {
		return fmt.Errorf("create request: %w", err)
	}
	request.Header.Set("Accept", "application/json")
	if input != nil {
		request.Header.Set("Content-Type", "application/json")
	}
	if c.apiKey != "" {
		request.Header.Set("Authorization", "Bearer "+c.apiKey)
	}
	response, err := c.httpClient.Do(request)
	if err != nil {
		return fmt.Errorf("send request: %w", err)
	}
	defer response.Body.Close()
	data, readErr := io.ReadAll(io.LimitReader(response.Body, 32*1024*1024))
	if readErr != nil {
		return fmt.Errorf("read response: %w", readErr)
	}
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		return &APIError{StatusCode: response.StatusCode, Message: apiErrorMessage(data), Body: data}
	}
	if output == nil || response.StatusCode == http.StatusNoContent || len(data) == 0 {
		return nil
	}
	if err := json.Unmarshal(data, output); err != nil {
		return fmt.Errorf("decode response: %w", err)
	}
	return nil
}

func apiErrorMessage(data []byte) string {
	var payload struct {
		Message string `json:"message"`
		Error   string `json:"error"`
	}
	if err := json.Unmarshal(data, &payload); err == nil {
		if strings.TrimSpace(payload.Message) != "" {
			return payload.Message
		}
		if strings.TrimSpace(payload.Error) != "" {
			return payload.Error
		}
	}
	return strings.TrimSpace(string(data))
}

func requestMap(ctx context.Context, c *Client, method, path string, input any) (map[string]any, error) {
	var output map[string]any
	return output, c.do(ctx, method, "/"+c.apiPrefix+path, input, &output)
}
func requestList(ctx context.Context, c *Client, path string, input any) ([]map[string]any, error) {
	var output []map[string]any
	return output, c.do(ctx, http.MethodGet, "/"+c.apiPrefix+path, input, &output)
}
func requestNoContent(ctx context.Context, c *Client, method, path string, input any) error {
	return c.do(ctx, method, "/"+c.apiPrefix+path, input, nil)
}
