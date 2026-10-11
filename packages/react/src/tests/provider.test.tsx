import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { TunnelProvider } from '../services/tunnel-provider';

describe('TunnelProvider', () => {
  it('renders children without connecting during server rendering', () => {
    const markup = renderToStaticMarkup(
      <TunnelProvider
        options={{ relayUrl: 'wss://relay.test', agentToken: 'token' }}
      >
        <span>application</span>
      </TunnelProvider>,
    );
    expect(markup).toContain('application');
  });
});
