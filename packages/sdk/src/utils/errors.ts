export class TunnelSDKError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TunnelSDKError';
  }
}

export class TunnelAPIError extends TunnelSDKError {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'TunnelAPIError';
    this.status = status;
  }
}

export class TunnelProtocolError extends TunnelSDKError {
  readonly code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.name = 'TunnelProtocolError';
    this.code = code;
  }
}
