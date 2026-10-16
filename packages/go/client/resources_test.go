package client

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"net/url"
	"testing"
)

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

func TestFleetAndPipelineLifecycle(t *testing.T) {
	type captured struct {
		method string
		path   string
	}
	var requests []captured
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requests = append(requests, captured{method: r.Method, path: r.URL.EscapedPath()})
		w.Header().Set("Content-Type", "application/json")
		switch r.Method + " " + r.URL.EscapedPath() {
		case "POST /api/v1/organizations/org-1/machine-fleets":
			w.WriteHeader(http.StatusCreated)
			_, _ = w.Write([]byte(`{"id":"fleet-1","name":"edge"}`))
		case "GET /api/v1/organizations/org-1/machine-fleets/fleet-1":
			_, _ = w.Write([]byte(`{"fleet":{"id":"fleet-1","name":"edge"},"tokens":[],"desiredTunnels":[],"liveTunnels":[],"drift":[]}`))
		case "POST /api/v1/organizations/org-1/machine-fleets/fleet-1/tunnels":
			w.WriteHeader(http.StatusCreated)
			_, _ = w.Write([]byte(`[{"id":"t-1"}]`))
		case "POST /api/v1/organizations/org-1/machine-fleets/fleet-1/rotate":
			_, _ = w.Write([]byte(`{"rotated":[{"id":"tok-2","name":"fleet-token-rotated","raw":"raw-token"}]}`))
		case "POST /api/v1/organizations/org-1/machine-fleets/fleet-1/reconcile":
			_, _ = w.Write([]byte(`{"reactivated":1,"recreated":0,"skipped":0}`))
		case "DELETE /api/v1/organizations/org-1/machine-fleets/fleet-1":
			w.WriteHeader(http.StatusNoContent)
		case "GET /api/v1/organizations/org-1/observability/pipelines":
			_, _ = w.Write([]byte(`{"organizationId":"org-1","queues":[],"healthy":true,"checkedAt":"2026-10-14T00:00:00Z"}`))
		case "GET /api/v1/organizations/org-1/observability/dead-letters":
			_, _ = w.Write([]byte(`[{"queue":"telemetry-exports","id":"job-1","eventType":"captures","attempts":5,"lastError":"down","updatedAt":"2026-10-14T00:00:00Z"}]`))
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
	if _, err := client.CreateMachineFleet(ctx, "org-1", map[string]any{"name": "edge"}); err != nil {
		t.Fatal(err)
	}
	if _, err := client.FleetStatus(ctx, "org-1", "fleet-1"); err != nil {
		t.Fatal(err)
	}
	if _, err := client.BulkCreateFleetTunnels(ctx, "org-1", "fleet-1", []map[string]any{{"name": "node-a"}}); err != nil {
		t.Fatal(err)
	}
	rotated, err := client.RotateFleetTokens(ctx, "org-1", "fleet-1")
	if err != nil {
		t.Fatal(err)
	}
	if _, ok := rotated["rotated"]; !ok {
		t.Fatalf("rotated = %#v", rotated)
	}
	if _, err := client.ReconcileFleet(ctx, "org-1", "fleet-1"); err != nil {
		t.Fatal(err)
	}
	if err := client.DeleteMachineFleet(ctx, "org-1", "fleet-1"); err != nil {
		t.Fatal(err)
	}
	if _, err := client.PipelineHealth(ctx, "org-1"); err != nil {
		t.Fatal(err)
	}
	letters, err := client.DeadLetters(ctx, "org-1", 25)
	if err != nil {
		t.Fatal(err)
	}
	if len(letters) != 1 {
		t.Fatalf("letters = %#v", letters)
	}
	want := []string{
		"POST /api/v1/organizations/org-1/machine-fleets",
		"GET /api/v1/organizations/org-1/machine-fleets/fleet-1",
		"POST /api/v1/organizations/org-1/machine-fleets/fleet-1/tunnels",
		"POST /api/v1/organizations/org-1/machine-fleets/fleet-1/rotate",
		"POST /api/v1/organizations/org-1/machine-fleets/fleet-1/reconcile",
		"DELETE /api/v1/organizations/org-1/machine-fleets/fleet-1",
		"GET /api/v1/organizations/org-1/observability/pipelines",
		"GET /api/v1/organizations/org-1/observability/dead-letters",
	}
	if len(requests) != len(want) {
		t.Fatalf("requests = %#v, want %#v", requests, want)
	}
	for i := range want {
		if got := requests[i].method + " " + requests[i].path; got != want[i] {
			t.Errorf("request[%d] = %q, want %q", i, got, want[i])
		}
	}
}
