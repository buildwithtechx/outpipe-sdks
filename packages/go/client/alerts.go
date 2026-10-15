package client

import (
	"context"
	"fmt"
	"net/http"
	"net/url"
)

func (c *Client) ListAlerts(ctx context.Context, organizationID string) ([]map[string]any, error) {
	alerts, err := requestList(ctx, c, "/organizations/"+url.PathEscape(organizationID)+"/observability/alerts", nil)
	if err != nil {
		return nil, fmt.Errorf("list alerts: %w", err)
	}
	return alerts, nil
}

func (c *Client) CreateAlert(ctx context.Context, organizationID string, alert map[string]any) (map[string]any, error) {
	created, err := requestMap(ctx, c, http.MethodPost, "/organizations/"+url.PathEscape(organizationID)+"/observability/alerts", alert)
	if err != nil {
		return nil, fmt.Errorf("create alert: %w", err)
	}
	return created, nil
}

func (c *Client) DeleteAlert(ctx context.Context, organizationID, alertID string) error {
	if err := requestNoContent(ctx, c, http.MethodDelete, "/organizations/"+url.PathEscape(organizationID)+"/observability/alerts/"+url.PathEscape(alertID), nil); err != nil {
		return fmt.Errorf("delete alert: %w", err)
	}
	return nil
}

func (c *Client) SetAlertStatusPage(ctx context.Context, organizationID, alertID string, statusPage map[string]any) (map[string]any, error) {
	updated, err := requestMap(ctx, c, http.MethodPatch, "/organizations/"+url.PathEscape(organizationID)+"/observability/alerts/"+url.PathEscape(alertID)+"/status-page", statusPage)
	if err != nil {
		return nil, fmt.Errorf("set alert status page: %w", err)
	}
	return updated, nil
}

func (c *Client) SetAlertEnabled(ctx context.Context, organizationID, alertID string, enabled bool) (map[string]any, error) {
	updated, err := requestMap(ctx, c, http.MethodPatch, "/organizations/"+url.PathEscape(organizationID)+"/observability/alerts/"+url.PathEscape(alertID)+"/enabled", map[string]bool{"enabled": enabled})
	if err != nil {
		return nil, fmt.Errorf("set alert enabled: %w", err)
	}
	return updated, nil
}
