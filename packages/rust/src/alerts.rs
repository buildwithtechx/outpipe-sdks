use crate::{
    client::{encode, Client},
    models::{Alert, CreateAlert, SetAlertStatusPage},
    Result,
};
use reqwest::Method;

impl Client {
    pub async fn list_alerts(&self, organization_id: &str) -> Result<Vec<Alert>> {
        self.send(
            Method::GET,
            &format!(
                "api/v1/organizations/{}/observability/alerts",
                encode(organization_id)
            ),
            None::<&()>,
            None::<&()>,
        )
        .await
    }

    pub async fn create_alert(&self, organization_id: &str, alert: &CreateAlert) -> Result<Alert> {
        self.send(
            Method::POST,
            &format!(
                "api/v1/organizations/{}/observability/alerts",
                encode(organization_id)
            ),
            Some(alert),
            None::<&()>,
        )
        .await
    }

    pub async fn delete_alert(&self, organization_id: &str, alert_id: &str) -> Result<()> {
        self.send_empty(
            Method::DELETE,
            &format!(
                "api/v1/organizations/{}/observability/alerts/{}",
                encode(organization_id),
                encode(alert_id)
            ),
            &(),
        )
        .await
    }

    pub async fn set_alert_status_page(
        &self,
        organization_id: &str,
        alert_id: &str,
        status_page: &SetAlertStatusPage,
    ) -> Result<Alert> {
        self.send(
            Method::PATCH,
            &format!(
                "api/v1/organizations/{}/observability/alerts/{}/status-page",
                encode(organization_id),
                encode(alert_id)
            ),
            Some(status_page),
            None::<&()>,
        )
        .await
    }

    pub async fn set_alert_enabled(
        &self,
        organization_id: &str,
        alert_id: &str,
        enabled: bool,
    ) -> Result<Alert> {
        self.send(
            Method::PATCH,
            &format!(
                "api/v1/organizations/{}/observability/alerts/{}/enabled",
                encode(organization_id),
                encode(alert_id)
            ),
            Some(&serde_json::json!({"enabled": enabled})),
            None::<&()>,
        )
        .await
    }
}
