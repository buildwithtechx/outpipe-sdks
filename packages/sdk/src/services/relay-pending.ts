import type { PendingResponse } from '../interfaces/relay';
import type { ProtocolEnvelope } from '../protocol';
import { TunnelProtocolError } from '../utils/errors';

export function resolveRelayPending(
  message: ProtocolEnvelope,
  pending: Map<string, PendingResponse>,
): void {
  const requestId = message.request_id;
  if (!requestId) return;
  const request = pending.get(requestId);
  if (!request) return;
  pending.delete(requestId);
  clearTimeout(request.timer);
  if (message.type !== request.expected) {
    request.reject(
      new TunnelProtocolError(
        `expected ${request.expected}, received ${message.type}`,
      ),
    );
    return;
  }
  request.resolve(message);
}
