use outpipe::{Client, ConnectDnsProvider, CreateDomainBundle};
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
async fn connects_route53_with_json_token_and_creates_domain_bundle() {
    let listener = TcpListener::bind("127.0.0.1:0").expect("bind local server");
    let address = listener.local_addr().expect("local server address");
    let server = thread::spawn(move || {
        let expected = [
            (
                "POST",
                "/api/v1/organizations/org-1/dns-providers",
                "201 Created",
            ),
            (
                "POST",
                "/api/v1/organizations/org-1/domains/bundle",
                "201 Created",
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
            let body = request.split_once("\r\n\r\n").expect("request body").1;
            let payload: serde_json::Value =
                serde_json::from_str(body).expect("valid JSON request body");
            let response = if index == 0 {
                assert_eq!(payload["provider"], "route53");
                let token: serde_json::Value =
                    serde_json::from_str(payload["token"].as_str().expect("token is a string"))
                        .expect("route53 token holds a JSON object");
                assert_eq!(token["access_key_id"], "AKIAEXAMPLE");
                assert_eq!(token["secret_access_key"], "secret");
                r#"{"id":"cred-2","organizationId":"org-1","provider":"route53","lastFour":"MPLE","keyVersion":1}"#
            } else {
                assert_eq!(payload["hostname"], "example.com");
                assert_eq!(payload["dnsProvider"], "route53");
                assert_eq!(payload["wildcard"], true);
                r#"[{"id":"domain-3","hostname":"example.com","status":"pending","verificationMethod":"dns-automation","organizationId":"org-1","dnsProvider":"route53","bundleGroup":"bundle-1","delegationTarget":"_outpipe.example.com"}]"#
            };
            respond(stream, response, status);
        }
    });

    let client = Client::builder()
        .base_url(format!("http://{address}"))
        .api_key("integration-key")
        .build()
        .expect("build client");

    let connected = client
        .connect_dns_provider(
            "org-1",
            &ConnectDnsProvider {
                provider: "route53".into(),
                token: r#"{"access_key_id":"AKIAEXAMPLE","secret_access_key":"secret"}"#.into(),
                label: None,
            },
        )
        .await
        .expect("connect route53 provider");
    assert_eq!(connected.provider, "route53");
    assert_eq!(connected.last_four.as_deref(), Some("MPLE"));

    let bundle = client
        .create_domain_bundle(
            "org-1",
            &CreateDomainBundle {
                hostname: "example.com".into(),
                tunnel_id: None,
                dns_provider: Some("route53".into()),
                wildcard: Some(true),
                delegated: None,
            },
        )
        .await
        .expect("create domain bundle");
    assert_eq!(bundle.len(), 1);
    assert_eq!(bundle[0].bundle_group.as_deref(), Some("bundle-1"));
    assert_eq!(
        bundle[0].delegation_target.as_deref(),
        Some("_outpipe.example.com")
    );
    server.join().expect("local server completed");
}
