package client

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestConnectRoute53Provider(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var body map[string]any
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			t.Errorf("decode request body: %v", err)
		}
		if body["provider"] != "route53" {
			t.Errorf("provider = %#v", body["provider"])
		}
		token, _ := body["token"].(string)
		var credential map[string]any
		if err := json.Unmarshal([]byte(token), &credential); err != nil {
			t.Errorf("route53 token must be a JSON string: %v", err)
		}
		if credential["access_key_id"] != "AKIAEXAMPLE" || credential["secret_access_key"] != "secret" {
			t.Errorf("route53 credential = %#v", credential)
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusCreated)
		_, _ = w.Write([]byte(`{"id":"cred-2","organizationId":"org-1","provider":"route53","lastFour":"MPLE","keyVersion":1}`))
	}))
	defer server.Close()
	client, err := New(Config{BaseURL: server.URL, APIKey: "key"})
	if err != nil {
		t.Fatal(err)
	}
	connected, err := client.ConnectDNSProvider(context.Background(), "org-1", map[string]any{
		"provider": "route53",
		"token":    `{"access_key_id":"AKIAEXAMPLE","secret_access_key":"secret"}`,
	})
	if err != nil {
		t.Fatal(err)
	}
	if connected["provider"] != "route53" || connected["lastFour"] != "MPLE" {
		t.Fatalf("connected provider = %#v", connected)
	}
}

func TestCreateDomainBundle(t *testing.T) {
	type captured struct {
		method string
		path   string
		body   map[string]any
	}
	var requests []captured
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var body map[string]any
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			t.Errorf("decode request body: %v", err)
		}
		requests = append(requests, captured{method: r.Method, path: r.URL.EscapedPath(), body: body})
		if body["hostname"] != "example.com" || body["dnsProvider"] != "route53" || body["wildcard"] != true {
			t.Errorf("create bundle body = %#v", body)
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusCreated)
		_, _ = w.Write([]byte(`[{"id":"domain-3","hostname":"example.com","status":"pending","verificationMethod":"dns-automation","dnsProvider":"route53","bundleGroup":"bundle-1","delegationTarget":"_outpipe.example.com"}]`))
	}))
	defer server.Close()
	client, err := New(Config{BaseURL: server.URL, APIKey: "key"})
	if err != nil {
		t.Fatal(err)
	}
	bundle, err := client.CreateDomainBundle(context.Background(), "org-1", map[string]any{
		"hostname": "example.com", "dnsProvider": "route53", "wildcard": true,
	})
	if err != nil {
		t.Fatal(err)
	}
	if len(bundle) != 1 || bundle[0]["bundleGroup"] != "bundle-1" || bundle[0]["delegationTarget"] != "_outpipe.example.com" {
		t.Fatalf("domain bundle = %#v", bundle)
	}
	if len(requests) != 1 || requests[0].method+" "+requests[0].path != "POST /api/v1/organizations/org-1/domains/bundle" {
		t.Fatalf("requests = %#v", requests)
	}
}
