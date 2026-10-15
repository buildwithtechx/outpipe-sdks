import type { DynamicModule } from '@nestjs/common';
import { Module } from '@nestjs/common';
import {
  type NestTunnelOptions,
  OUTPIPE_OPTIONS,
  OUTPIPE_PAYLOAD_CAPTURE_OPTIONS,
} from '../interfaces/options';
import { OutpipeService } from './tunnel.service';

@Module({})
export class OutpipeModule {
  static forRoot(options: NestTunnelOptions): DynamicModule {
    return {
      module: OutpipeModule,
      providers: [
        { provide: OUTPIPE_OPTIONS, useValue: options },
        {
          provide: OUTPIPE_PAYLOAD_CAPTURE_OPTIONS,
          useValue: options.payloadCapture,
        },
        OutpipeService,
      ],
      exports: [OutpipeService],
    };
  }
}
