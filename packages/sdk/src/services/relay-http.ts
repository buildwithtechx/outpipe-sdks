import {
  absoluteMaxFrameSize,
  type HTTPRequest,
  type HTTPResponse,
} from '../protocol';

type ResponseSender = (response: HTTPResponse) => void;

export async function forwardHttpRequest(
  request: HTTPRequest,
  requestId: string | undefined,
  localPort: number | undefined,
  timeoutMs: number,
  send: ResponseSender,
): Promise<void> {
  if (!requestId) return;
  if (!localPort || typeof fetch !== 'function') {
    sendSafely(send, {
      status_code: 502,
      headers: {},
      error: 'local HTTP forwarding is unavailable',
    });
    return;
  }
  try {
    const headers = new Headers();
    for (const [name, values] of Object.entries(request.headers ?? {})) {
      for (const value of values) headers.append(name, value);
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const response = await fetch(
      `http://127.0.0.1:${localPort}${request.path}`,
      {
        method: request.method,
        headers,
        signal: controller.signal,
        body: request.body
          ? (decodeBase64(request.body).buffer as ArrayBuffer)
          : undefined,
      },
    );
    const responseHeaders: Record<string, string[]> = {};
    const setCookieValues =
      (
        response.headers as Headers & { getSetCookie?: () => string[] }
      ).getSetCookie?.() ?? [];
    response.headers.forEach((value, name) => {
      if (name !== 'set-cookie') responseHeaders[name] = [value];
    });
    if (setCookieValues.length > 0)
      responseHeaders['set-cookie'] = setCookieValues;
    const responseBody = encodeBase64(
      new Uint8Array(await response.arrayBuffer()),
    );
    clearTimeout(timeout);
    if (responseBody.length > absoluteMaxFrameSize - 4096) {
      sendSafely(send, {
        status_code: 502,
        headers: {},
        error: 'local HTTP response exceeds the relay frame size limit',
      });
      return;
    }
    sendSafely(send, {
      status_code: response.status,
      headers: responseHeaders,
      body: responseBody,
    });
  } catch (error) {
    sendSafely(send, {
      status_code: 502,
      headers: {},
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

function sendSafely(send: ResponseSender, response: HTTPResponse): void {
  try {
    send(response);
  } catch {
    return;
  }
}

function decodeBase64(value: string): Uint8Array {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function encodeBase64(value: Uint8Array): string {
  let binary = '';
  for (const byte of value) binary += String.fromCharCode(byte);
  return btoa(binary);
}
