package client

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"reflect"
	"testing"
)

type httpTunnelContract struct {
	Authentication string         `json:"authentication"`
	Tunnel         map[string]any `json:"tunnel"`
	Routes         map[string]struct {
		Method  string         `json:"method"`
		Path    string         `json:"path"`
		Request map[string]any `json:"request"`
		Status  int            `json:"status"`
	} `json:"routes"`
}

func TestHostedEndpointDefault(t *testing.T) {
	client, err := New(Config{APIKey: "key"})
	if err != nil {
		t.Fatalf("create hosted client: %v", err)
	}
	if client.baseURL != "https://api.outpipe.dev" {
		t.Fatalf("unexpected hosted endpoint: %s", client.baseURL)
	}
}

func loadHTTPContract(t *testing.T) httpTunnelContract {
	t.Helper()
	data, err := os.ReadFile("../../../protocol/fixtures/http_tunnel_contract.json")
	if err != nil {
		t.Fatal(err)
	}
	var contract httpTunnelContract
	if err := json.Unmarshal(data, &contract); err != nil {
		t.Fatal(err)
	}
	return contract
}

func TestCreateTunnel(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.EscapedPath() != "/api/v1/organizations/org%2Fone/tunnels" {
			t.Fatalf("path = %s", r.URL.EscapedPath())
		}
		if r.Header.Get("Authorization") != "Bearer key" {
			t.Fatalf("missing authorization")
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"id":"tunnel-1"}`))
	}))
	defer server.Close()
	client, err := New(Config{BaseURL: server.URL, APIKey: "key"})
	if err != nil {
		t.Fatal(err)
	}
	tunnel, err := client.CreateTunnel(context.Background(), "org/one", map[string]any{"name": "preview"})
	if err != nil {
		t.Fatal(err)
	}
	if tunnel["id"] != "tunnel-1" {
		t.Fatalf("tunnel = %#v", tunnel)
	}
}

func TestTunnelLifecycleAgainstHTTPServer(t *testing.T) {
	contract := loadHTTPContract(t)
	var requests []string
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requests = append(requests, r.Method+" "+r.URL.EscapedPath())
		if r.Header.Get("Authorization") != contract.Authentication+" integration-key" {
			t.Errorf("authorization = %q", r.Header.Get("Authorization"))
		}
		if r.URL.Path == "/api/v1/organizations/error/401/tunnels" {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusUnauthorized)
			_, _ = w.Write([]byte(`{"message":"authentication required"}`))
			return
		}
		route, ok := contractRoute(contract, r.Method, r.URL.EscapedPath())
		if !ok {
			http.NotFound(w, r)
			return
		}
		if r.Method == http.MethodPost {
			var payload map[string]any
			if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
				t.Errorf("decode request body: %v", err)
			}
			if !reflect.DeepEqual(payload, route.Request) {
				t.Errorf("request payload = %#v", payload)
			}
		}
		if r.Method == http.MethodDelete {
			w.WriteHeader(route.Status)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(route.Status)
		if r.Method == http.MethodGet && r.URL.Path == "/api/v1/tunnels/tunnel-1" {
			body, _ := json.Marshal(contract.Tunnel)
			_, _ = w.Write(body)
			return
		}
		if r.Method == http.MethodGet {
			body, _ := json.Marshal([]map[string]any{contract.Tunnel})
			_, _ = w.Write(body)
			return
		}
		body, _ := json.Marshal(contract.Tunnel)
		_, _ = w.Write(body)
	}))
	defer server.Close()

	client, err := New(Config{BaseURL: server.URL, APIKey: "integration-key"})
	if err != nil {
		t.Fatal(err)
	}
	ctx := context.Background()
	created, err := client.CreateTunnel(ctx, "org/one", contract.Routes["create"].Request)
	if err != nil {
		t.Fatal(err)
	}
	listed, err := client.Tunnels(ctx, "org/one")
	if err != nil {
		t.Fatal(err)
	}
	inspected, err := client.Tunnel(ctx, "tunnel-1")
	if err != nil {
		t.Fatal(err)
	}
	if err := client.RevokeTunnel(ctx, "tunnel-1"); err != nil {
		t.Fatal(err)
	}

	if created["publicHostname"] != "preview.outpipe.app" || len(listed) != 1 || inspected["status"] != "active" {
		t.Fatalf("unexpected lifecycle result: created=%#v listed=%#v inspected=%#v", created, listed, inspected)
	}
	want := []string{contract.Routes["create"].Method + " " + contract.Routes["create"].Path, contract.Routes["list"].Method + " " + contract.Routes["list"].Path, contract.Routes["inspect"].Method + " " + contract.Routes["inspect"].Path, contract.Routes["revoke"].Method + " " + contract.Routes["revoke"].Path}
	if len(requests) != len(want) {
		t.Fatalf("requests = %#v, want %#v", requests, want)
	}
	for index := range want {
		if requests[index] != want[index] {
			t.Errorf("request[%d] = %q, want %q", index, requests[index], want[index])
		}
	}
	_, err = client.Tunnels(ctx, "error/401")
	if apiErr, ok := err.(*APIError); !ok || apiErr.StatusCode != http.StatusUnauthorized || apiErr.Message != "authentication required" {
		t.Fatalf("unauthorized error = %#v", err)
	}
}

func TestDomainAndDNSProviderLifecycle(t *testing.T) {
	type captured struct {
		method string
		path   string
		body   map[string]any
	}
	var requests []captured
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var body map[string]any
		if r.Method == http.MethodPost && r.ContentLength != 0 {
			if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
				t.Errorf("decode request body: %v", err)
			}
		}
		requests = append(requests, captured{method: r.Method, path: r.URL.EscapedPath(), body: body})
		w.Header().Set("Content-Type", "application/json")
		switch r.Method + " " + r.URL.EscapedPath() {
		case "GET /api/v1/organizations/org-1/domains":
			_, _ = w.Write([]byte(`[{"id":"domain-1","hostname":"app.example.com","status":"pending","verificationMethod":"dns","certificateExpiresAt":"2026-01-01T00:00:00Z"}]`))
		case "POST /api/v1/organizations/org-1/domains":
			if body["hostname"] != "*.example.com" || body["verificationMethod"] != "dns-automation" {
				t.Errorf("create domain body = %#v", body)
			}
			w.WriteHeader(http.StatusCreated)
			_, _ = w.Write([]byte(`{"domain":{"id":"domain-2","hostname":"*.example.com","status":"pending","verificationMethod":"dns-automation"},"verificationToken":"cdv-secret"}`))
		case "POST /api/v1/domains/domain-1/verify":
			if body["token"] != "cdv-token" {
				t.Errorf("verify domain body = %#v", body)
			}
			w.WriteHeader(http.StatusNoContent)
		case "DELETE /api/v1/domains/domain-1":
			w.WriteHeader(http.StatusNoContent)
		case "GET /api/v1/organizations/org-1/dns-providers":
			_, _ = w.Write([]byte(`[{"id":"cred-1","organizationId":"org-1","provider":"cloudflare","label":"primary","lastFour":"1234","keyVersion":1}]`))
		case "POST /api/v1/organizations/org-1/dns-providers":
			if body["provider"] != "cloudflare" || body["token"] != "cf-test-token-1234" || body["label"] != "primary" {
				t.Errorf("connect DNS provider body = %#v", body)
			}
			w.WriteHeader(http.StatusCreated)
			_, _ = w.Write([]byte(`{"id":"cred-1","organizationId":"org-1","provider":"cloudflare","label":"primary","lastFour":"1234","keyVersion":1}`))
		case "DELETE /api/v1/organizations/org-1/dns-providers/cred-1":
			w.WriteHeader(http.StatusNoContent)
		case "POST /api/v1/machines/tunnels/tunnel-1/relay-token":
			_, _ = w.Write([]byte(`{"relayToken":"relay-token","expiresAt":"2026-01-01T00:15:00Z"}`))
		default:
			http.NotFound(w, r)
		}
	}))
	defer server.Close()
	client, err := New(Config{BaseURL: server.URL, APIKey: "key"})
	if err != nil {
		t.Fatal(err)
	}
	ctx := context.Background()

	domains, err := client.Domains(ctx, "org-1")
	if err != nil {
		t.Fatal(err)
	}
	if len(domains) != 1 || domains[0]["hostname"] != "app.example.com" {
		t.Fatalf("domains = %#v", domains)
	}
	created, err := client.CreateDomain(ctx, "org-1", map[string]any{"hostname": "*.example.com", "verificationMethod": "dns-automation"})
	if err != nil {
		t.Fatal(err)
	}
	if created["verificationToken"] != "cdv-secret" {
		t.Fatalf("created domain = %#v", created)
	}
	if err := client.VerifyDomain(ctx, "domain-1", "cdv-token"); err != nil {
		t.Fatal(err)
	}
	if err := client.DeleteDomain(ctx, "domain-1"); err != nil {
		t.Fatal(err)
	}
	providers, err := client.ListDNSProviders(ctx, "org-1")
	if err != nil {
		t.Fatal(err)
	}
	if len(providers) != 1 || providers[0]["provider"] != "cloudflare" {
		t.Fatalf("dns providers = %#v", providers)
	}
	if _, ok := providers[0]["token"]; ok {
		t.Fatalf("credential secret leaked: %#v", providers[0])
	}
	connected, err := client.ConnectDNSProvider(ctx, "org-1", map[string]any{"provider": "cloudflare", "token": "cf-test-token-1234", "label": "primary"})
	if err != nil {
		t.Fatal(err)
	}
	if connected["lastFour"] != "1234" {
		t.Fatalf("connected provider = %#v", connected)
	}
	if err := client.DeleteDNSProvider(ctx, "org-1", "cred-1"); err != nil {
		t.Fatal(err)
	}
	relay, err := client.RefreshMachineTunnelRelayToken(ctx, "tunnel-1")
	if err != nil {
		t.Fatal(err)
	}
	if relay["relayToken"] != "relay-token" || relay["expiresAt"] != "2026-01-01T00:15:00Z" {
		t.Fatalf("relay token = %#v", relay)
	}
	want := []string{
		"GET /api/v1/organizations/org-1/domains",
		"POST /api/v1/organizations/org-1/domains",
		"POST /api/v1/domains/domain-1/verify",
		"DELETE /api/v1/domains/domain-1",
		"GET /api/v1/organizations/org-1/dns-providers",
		"POST /api/v1/organizations/org-1/dns-providers",
		"DELETE /api/v1/organizations/org-1/dns-providers/cred-1",
		"POST /api/v1/machines/tunnels/tunnel-1/relay-token",
	}
	if len(requests) != len(want) {
		t.Fatalf("requests = %#v, want %#v", requests, want)
	}
	for index := range want {
		if got := requests[index].method + " " + requests[index].path; got != want[index] {
			t.Errorf("request[%d] = %q, want %q", index, got, want[index])
		}
	}
}

func TestSubscriberLifecycle(t *testing.T) {
	type captured struct {
		method string
		path   string
		query  string
		body   map[string]any
	}
	var requests []captured
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var body map[string]any
		if r.Method != http.MethodGet && r.Method != http.MethodDelete && r.ContentLength != 0 {
			if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
				t.Errorf("decode request body: %v", err)
			}
		}
		requests = append(requests, captured{method: r.Method, path: r.URL.EscapedPath(), query: r.URL.RawQuery, body: body})
		w.Header().Set("Content-Type", "application/json")
		switch r.Method + " " + r.URL.EscapedPath() {
		case "POST /api/v1/status/team/subscribe":
			if body["email"] != "user@example.com" {
				t.Errorf("subscribe body = %#v", body)
			}
			w.WriteHeader(http.StatusCreated)
			_, _ = w.Write([]byte(`{"subscribed":true}`))
		case "POST /api/v1/status/team/confirm":
			if body["token"] != "confirm-token" {
				t.Errorf("confirm body = %#v", body)
			}
			_, _ = w.Write([]byte(`{"confirmed":true}`))
		case "POST /api/v1/status/team/unsubscribe":
			_, _ = w.Write([]byte(`{"unsubscribed":true}`))
		case "GET /api/v1/organizations/org-1/uptime/status-page/subscribers":
			_, _ = w.Write([]byte(`{"subscribers":[{"id":"sub-1","statusPageId":"page-1","email":"user@example.com","status":"confirmed","confirmed":true,"createdAt":"2026-10-14T00:00:00Z","components":[]}],"counts":{"pending":0,"confirmed":1,"unsubscribed":0},"subscriptionsEnabled":true}`))
		case "PATCH /api/v1/organizations/org-1/uptime/status-page/subscriptions":
			_, _ = w.Write([]byte(`{"subscriptionsEnabled":false}`))
		case "POST /api/v1/organizations/org-1/uptime/status-page/subscribers/sub-1/unsubscribe":
			_, _ = w.Write([]byte(`{"id":"sub-1","statusPageId":"page-1","email":"user@example.com","status":"unsubscribed","confirmed":false,"createdAt":"2026-10-14T00:00:00Z","components":[]}`))
		case "PUT /api/v1/organizations/org-1/uptime/status-page/subscribers/sub-1/scope":
			_, _ = w.Write([]byte(`{"id":"sub-1","statusPageId":"page-1","email":"user@example.com","status":"confirmed","confirmed":true,"createdAt":"2026-10-14T00:00:00Z","components":["mon-1"]}`))
		case "DELETE /api/v1/organizations/org-1/uptime/status-page/subscribers/sub-1":
			w.WriteHeader(http.StatusNoContent)
		default:
			http.NotFound(w, r)
		}
	}))
	defer server.Close()
	client, err := New(Config{BaseURL: server.URL, APIKey: "key"})
	if err != nil {
		t.Fatal(err)
	}
	ctx := context.Background()
	if _, err := client.SubscribeToStatusPage(ctx, "team", "user@example.com", []string{"mon-1"}); err != nil {
		t.Fatal(err)
	}
	if _, err := client.ConfirmSubscription(ctx, "team", "confirm-token"); err != nil {
		t.Fatal(err)
	}
	if _, err := client.UnsubscribeFromStatusPage(ctx, "team", "leave-token"); err != nil {
		t.Fatal(err)
	}
	listed, err := client.ListSubscribers(ctx, "org-1", url.Values{"status": []string{"confirmed"}, "q": []string{"user"}})
	if err != nil {
		t.Fatal(err)
	}
	if _, ok := listed["token"]; ok {
		t.Fatalf("subscriber list leaked token: %#v", listed)
	}
	if _, err := client.SetSubscriptionsEnabled(ctx, "org-1", false); err != nil {
		t.Fatal(err)
	}
	if _, err := client.ManagerUnsubscribeSubscriber(ctx, "org-1", "sub-1"); err != nil {
		t.Fatal(err)
	}
	if _, err := client.SetSubscriberScope(ctx, "org-1", "sub-1", []string{"mon-1"}); err != nil {
		t.Fatal(err)
	}
	if err := client.RemoveSubscriber(ctx, "org-1", "sub-1"); err != nil {
		t.Fatal(err)
	}
	want := []string{
		"POST /api/v1/status/team/subscribe",
		"POST /api/v1/status/team/confirm",
		"POST /api/v1/status/team/unsubscribe",
		"GET /api/v1/organizations/org-1/uptime/status-page/subscribers",
		"PATCH /api/v1/organizations/org-1/uptime/status-page/subscriptions",
		"POST /api/v1/organizations/org-1/uptime/status-page/subscribers/sub-1/unsubscribe",
		"PUT /api/v1/organizations/org-1/uptime/status-page/subscribers/sub-1/scope",
		"DELETE /api/v1/organizations/org-1/uptime/status-page/subscribers/sub-1",
	}
	if len(requests) != len(want) {
		t.Fatalf("requests = %#v, want %#v", requests, want)
	}
	for index := range want {
		if got := requests[index].method + " " + requests[index].path; got != want[index] {
			t.Errorf("request[%d] = %q, want %q", index, got, want[index])
		}
	}
}

func contractRoute(contract httpTunnelContract, method, path string) (struct {
	Method  string         `json:"method"`
	Path    string         `json:"path"`
	Request map[string]any `json:"request"`
	Status  int            `json:"status"`
}, bool) {
	for _, route := range contract.Routes {
		if route.Method == method && route.Path == path {
			return route, true
		}
	}
	return struct {
		Method  string         `json:"method"`
		Path    string         `json:"path"`
		Request map[string]any `json:"request"`
		Status  int            `json:"status"`
	}{}, false
}
