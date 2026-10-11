import type { PendingResponse } from '../interfaces/relay';
import type { MessageType, ProtocolEnvelope } from '../protocol';
import { TunnelProtocolError, TunnelSDKError } from '../utils/errors';

export function createRelayRequest<T>(
  type: MessageType,
  payload: unknown,
  expected: MessageType,
  interval: number,
  requestId: string,
  pending: Map<string, PendingResponse>,
  send: (type: MessageType, payload: unknown, requestId: string) => void,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(requestId);
      reject(new TunnelProtocolError(`timed out waiting for ${expected}`));
    }, interval);
    pending.set(requestId, {
      expected,
      resolve: (message: ProtocolEnvelope) => resolve(message.payload as T),
      reject,
      timer,
    });
    try {
      send(type, payload, requestId);
    } catch (error) {
      clearTimeout(timer);
      pending.delete(requestId);
      reject(
        error instanceof Error ? error : new TunnelSDKError(String(error)),
      );
    }
  });
}
