package client

import (
	"context"
	"fmt"
	"net/http"
	"net/url"
	"strconv"
)

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
