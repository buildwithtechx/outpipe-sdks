use outpipe::{Client, CreateAlert, SetAlertStatusPage};
use std::{
    io::{Read, Write},
    net::{TcpListener, TcpStream},
    thread,
};

fn respond(mut stream: TcpStream, body: &str, status: &str) {
    let response = format!(
        "HTTP/1.1 {status}\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{body}",
        body.len()
    );
    stream
        .write_all(response.as_bytes())
        .expect("write response");
}

fn read_request(stream: &mut TcpStream) -> String {
    let mut request = Vec::new();
    let mut buffer = [0; 4096];
    loop {
        let count = stream.read(&mut buffer).expect("read request");
        if count == 0 {
            break;
        }
        request.extend_from_slice(&buffer[..count]);
        let Some(header_end) = request.windows(4).position(|window| window == b"\r\n\r\n") else {
            continue;
        };
        let headers = String::from_utf8_lossy(&request[..header_end]);
        let content_length = headers
            .lines()
            .find(|line| line.to_ascii_lowercase().starts_with("content-length:"))
            .and_then(|line| line.split_once(':'))
            .and_then(|(_, value)| value.trim().parse::<usize>().ok())
            .unwrap_or(0);
        if request.len() >= header_end + 4 + content_length {
            break;
        }
    }
    String::from_utf8(request).expect("request is valid HTTP text")
}

#[tokio::test]
async fn manages_alerts_against_local_http_server() {
    let listener = TcpListener::bind("127.0.0.1:0").expect("bind local server");
    let address = listener.local_addr().expect("local server address");
    let server = thread::spawn(move || {
        let expected = [
            (
                "POST",
                "/api/v1/organizations/org-1/observability/alerts",
                "201 Created",
            ),
            (
                "GET",
                "/api/v1/organizations/org-1/observability/alerts",
                "200 OK",
            ),
            (
                "PATCH",
                "/api/v1/organizations/org-1/observability/alerts/alert-1/status-page",
                "200 OK",
            ),
            (
                "PATCH",
                "/api/v1/organizations/org-1/observability/alerts/alert-1/enabled",
                "200 OK",
            ),
            (
                "DELETE",
                "/api/v1/organizations/org-1/observability/alerts/alert-1",
                "204 No Content",
            ),
        ];
        for (index, (method, path, status)) in expected.iter().enumerate() {
            let (mut stream, _) = listener.accept().expect("accept request");
            let request = read_request(&mut stream);
            let request_line = request.lines().next().expect("request line");
            assert!(
                request_line.starts_with(&format!("{method} {path} HTTP/1.1")),
                "{request_line}"
            );
            assert!(request.contains("authorization: Bearer integration-key"));
            if index == 0 {
                let body = request.split_once("\r\n\r\n").expect("request body").1;
                let payload: serde_json::Value =
                    serde_json::from_str(body).expect("valid JSON request body");
                assert_eq!(payload["name"], "homepage down");
                assert_eq!(payload["monitorIds"], serde_json::json!(["mon-1"]));
            }
            if index == 2 {
                let body = request.split_once("\r\n\r\n").expect("request body").1;
                let payload: serde_json::Value =
                    serde_json::from_str(body).expect("valid JSON request body");
                assert_eq!(payload["publicTitle"], "Homepage");
                assert_eq!(payload["impact"], "outage");
                assert_eq!(payload["componentIds"], serde_json::json!(["mon-1"]));
            }
            if index == 3 {
                let body = request.split_once("\r\n\r\n").expect("request body").1;
                let payload: serde_json::Value =
                    serde_json::from_str(body).expect("valid JSON request body");
                assert_eq!(payload["enabled"], false);
            }
            let body = match index {
                0 => {
                    r#"{"id":"alert-1","organizationId":"org-1","name":"homepage down","monitorIds":"[\"mon-1\"]","consecutiveFailures":3,"consecutiveRecoveries":2,"evalIntervalSeconds":60,"state":"ok","enabled":true,"statusPageTitle":"Homepage","statusPageImpact":"degraded"}"#
                }
                1 => {
                    r#"[{"id":"alert-1","organizationId":"org-1","name":"homepage down","monitorIds":"[\"mon-1\"]","consecutiveFailures":3,"consecutiveRecoveries":2,"evalIntervalSeconds":60,"state":"ok","enabled":true}]"#
                }
                2 => {
                    r#"{"id":"alert-1","organizationId":"org-1","name":"homepage down","monitorIds":"[\"mon-1\"]","consecutiveFailures":3,"consecutiveRecoveries":2,"evalIntervalSeconds":60,"state":"ok","enabled":true,"statusPageImpact":"outage"}"#
                }
                3 => {
                    r#"{"id":"alert-1","organizationId":"org-1","name":"homepage down","monitorIds":"[\"mon-1\"]","consecutiveFailures":3,"consecutiveRecoveries":2,"evalIntervalSeconds":60,"state":"ok","enabled":false}"#
                }
                _ => "",
            };
            respond(stream, body, status);
        }
    });

    let client = Client::builder()
        .base_url(format!("http://{address}"))
        .api_key("integration-key")
        .build()
        .expect("build client");

    let created = client
        .create_alert(
            "org-1",
            &CreateAlert {
                name: "homepage down".into(),
                monitor_ids: vec!["mon-1".into()],
                consecutive_failures: None,
                consecutive_recoveries: None,
                eval_interval_seconds: None,
                status_page_title: None,
                status_page_impact: None,
            },
        )
        .await
        .expect("create alert");
    assert_eq!(created.monitor_ids, "[\"mon-1\"]");
    assert_eq!(created.consecutive_failures, 3);

    let alerts = client.list_alerts("org-1").await.expect("list alerts");
    assert_eq!(alerts.len(), 1);
    assert_eq!(alerts[0].state, "ok");

    let linked = client
        .set_alert_status_page(
            "org-1",
            "alert-1",
            &SetAlertStatusPage {
                public_title: "Homepage".into(),
                impact: "outage".into(),
                component_ids: vec!["mon-1".into()],
            },
        )
        .await
        .expect("set alert status page");
    assert_eq!(linked.status_page_impact.as_deref(), Some("outage"));

    let disabled = client
        .set_alert_enabled("org-1", "alert-1", false)
        .await
        .expect("set alert enabled");
    assert!(!disabled.enabled);

    client
        .delete_alert("org-1", "alert-1")
        .await
        .expect("delete alert");
    server.join().expect("local server completed");
}
