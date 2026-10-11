import type { MessageType, ProtocolEnvelope } from '../interfaces/messages';
import {
  absoluteMaxFrameSize,
  maxSupportedVersion,
  messageTypes,
  minSupportedVersion,
  protocolVersion,
} from './constants';

export const encodeMessage = <TPayload>(
  message: ProtocolEnvelope<TPayload>,
): string => {
  const result = JSON.stringify(message);
  if (result.length > absoluteMaxFrameSize) {
    throw new Error(
      `frame size ${result.length} exceeds maximum allowed frame size ${absoluteMaxFrameSize}`,
    );
  }
  return result;
};

export const decodeMessage = <TPayload>(
  value: string,
): ProtocolEnvelope<TPayload> => {
  if (value.length > absoluteMaxFrameSize) {
    throw new Error(
      `frame size ${value.length} exceeds maximum allowed frame size ${absoluteMaxFrameSize}`,
    );
  }
  const message = JSON.parse(value) as ProtocolEnvelope<TPayload>;
  if (
    message.version < minSupportedVersion ||
    message.version > maxSupportedVersion ||
    !messageTypes.includes(message.type)
  ) {
    throw new Error('unsupported tunnel protocol message');
  }
  return message;
};

export const isMessageType = (value: string): value is MessageType =>
  messageTypes.includes(value as MessageType);

export { protocolVersion };
