import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  Inject,
  Injectable,
  type NestMiddleware,
  Optional,
} from '@nestjs/common';
import { createNodeHttpPayloadCaptureMiddleware } from '@outpipe/sdk';
import {
  OUTPIPE_PAYLOAD_CAPTURE_OPTIONS,
  type OutpipePayloadCaptureOptions,
} from '../interfaces/options';

@Injectable()
export class OutpipePayloadCaptureMiddleware implements NestMiddleware {
  private readonly handler: ReturnType<
    typeof createNodeHttpPayloadCaptureMiddleware
  >;

  constructor(
    @Optional()
    @Inject(OUTPIPE_PAYLOAD_CAPTURE_OPTIONS)
    options?: OutpipePayloadCaptureOptions,
  ) {
    this.handler = createNodeHttpPayloadCaptureMiddleware(
      options?.capturePayloads,
      options?.shouldCapturePayloads
        ? { shouldCapturePayloads: options.shouldCapturePayloads }
        : undefined,
    );
  }

  use(
    req: IncomingMessage,
    res: ServerResponse,
    next: (error?: unknown) => void,
  ): void {
    this.handler(req, res, next);
  }
}
