package client

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestAlertLifecycle(t *testing.T) {
	type captured struct {
		method string
		path   string
		body   map[string]any
	}
	var requests []captured
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var body map[string]any
		if (r.Method == http.MethodPost || r.Method == http.MethodPatch) && r.ContentLength != 0 {
			if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
				t.Errorf("decode request body: %v", err)
			}
		}
		requests = append(requests, captured{method: r.Method, path: r.URL.EscapedPath(), body: body})
		w.Header().Set("Content-Type", "application/json")
		switch r.Method + " " + r.URL.EscapedPath() {
		case "POST /api/v1/organizations/org-1/observability/alerts":
			if body["name"] != "homepage down" {
				t.Errorf("create alert body = %#v", body)
			}
			w.WriteHeader(http.StatusCreated)
			_, _ = w.Write([]byte(`{"id":"alert-1","organizationId":"org-1","name":"homepage down","monitorIds":"[\"mon-1\"]","consecutiveFailures":3,"consecutiveRecoveries":2,"evalIntervalSeconds":60,"state":"ok","enabled":true,"statusPageTitle":"Homepage","statusPageImpact":"degraded"}`))
		case "GET /api/v1/organizations/org-1/observability/alerts":
			_, _ = w.Write([]byte(`[{"id":"alert-1","organizationId":"org-1","name":"homepage down","monitorIds":"[\"mon-1\"]","consecutiveFailures":3,"consecutiveRecoveries":2,"evalIntervalSeconds":60,"state":"ok","enabled":true}]`))
		case "PATCH /api/v1/organizations/org-1/observability/alerts/alert-1/status-page":
			if body["publicTitle"] != "Homepage" || body["impact"] != "outage" {
				t.Errorf("set alert status page body = %#v", body)
			}
			_, _ = w.Write([]byte(`{"id":"alert-1","organizationId":"org-1","name":"homepage down","monitorIds":"[\"mon-1\"]","consecutiveFailures":3,"consecutiveRecoveries":2,"evalIntervalSeconds":60,"state":"ok","enabled":true,"statusPageImpact":"outage"}`))
		case "PATCH /api/v1/organizations/org-1/observability/alerts/alert-1/enabled":
			if body["enabled"] != false {
				t.Errorf("set alert enabled body = %#v", body)
			}
			_, _ = w.Write([]byte(`{"id":"alert-1","organizationId":"org-1","name":"homepage down","monitorIds":"[\"mon-1\"]","consecutiveFailures":3,"consecutiveRecoveries":2,"evalIntervalSeconds":60,"state":"ok","enabled":false}`))
		case "DELETE /api/v1/organizations/org-1/observability/alerts/alert-1":
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

	created, err := client.CreateAlert(ctx, "org-1", map[string]any{"name": "homepage down", "monitorIds": []string{"mon-1"}})
	if err != nil {
		t.Fatal(err)
	}
	if created["monitorIds"] != `["mon-1"]` {
		t.Fatalf("created alert monitorIds = %#v", created["monitorIds"])
	}
	alerts, err := client.ListAlerts(ctx, "org-1")
	if err != nil {
		t.Fatal(err)
	}
	if len(alerts) != 1 || alerts[0]["state"] != "ok" {
		t.Fatalf("alerts = %#v", alerts)
	}
	if _, ok := alerts[0]["monitorIds"].(string); !ok {
		t.Fatalf("alert monitorIds must stay encoded: %#v", alerts[0])
	}
	linked, err := client.SetAlertStatusPage(ctx, "org-1", "alert-1", map[string]any{"publicTitle": "Homepage", "impact": "outage", "componentIds": []string{"mon-1"}})
	if err != nil {
		t.Fatal(err)
	}
	if linked["statusPageImpact"] != "outage" {
		t.Fatalf("linked alert = %#v", linked)
	}
	disabled, err := client.SetAlertEnabled(ctx, "org-1", "alert-1", false)
	if err != nil {
		t.Fatal(err)
	}
	if disabled["enabled"] != false {
		t.Fatalf("disabled alert = %#v", disabled)
	}
	if err := client.DeleteAlert(ctx, "org-1", "alert-1"); err != nil {
		t.Fatal(err)
	}
	want := []string{
		"POST /api/v1/organizations/org-1/observability/alerts",
		"GET /api/v1/organizations/org-1/observability/alerts",
		"PATCH /api/v1/organizations/org-1/observability/alerts/alert-1/status-page",
		"PATCH /api/v1/organizations/org-1/observability/alerts/alert-1/enabled",
		"DELETE /api/v1/organizations/org-1/observability/alerts/alert-1",
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
