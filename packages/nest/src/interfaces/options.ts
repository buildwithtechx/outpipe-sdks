import type {
  HttpPayloadCapturePolicy,
  HttpPayloadCaptureSetting,
  RelayConnectionOptions,
} from '@outpipe/sdk';

export const OUTPIPE_OPTIONS = Symbol('OUTPIPE_OPTIONS');

export const OUTPIPE_PAYLOAD_CAPTURE_OPTIONS = Symbol(
  'OUTPIPE_PAYLOAD_CAPTURE_OPTIONS',
);

export type OutpipePayloadCaptureOptions = {
  capturePayloads?: HttpPayloadCaptureSetting;
  shouldCapturePayloads?: HttpPayloadCapturePolicy['shouldCapturePayloads'];
};

export type NestTunnelOptions = RelayConnectionOptions & {
  localPort: number;
  subdomain?: string;
  password?: string;
  autoStart?: boolean;
  payloadCapture?: OutpipePayloadCaptureOptions;
};
