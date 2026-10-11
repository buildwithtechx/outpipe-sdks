import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { decodeMessage, minSupportedVersion, negotiateVersion } from '../index';

type FixtureItem = {
  name: string;
  valid: boolean;
  raw: string;
};

type FixturesFile = {
  fixtures: FixtureItem[];
};

describe('Protocol Conformance', () => {
  it('passes all language-neutral fixtures', () => {
    const fixturePath = resolve(
      __dirname,
      '../../../../../protocol/fixtures/conformance_fixtures.json',
    );
    const content = readFileSync(fixturePath, 'utf-8');
    const file = JSON.parse(content) as FixturesFile;

    for (const fixture of file.fixtures) {
      if (fixture.valid) {
        const decoded = decodeMessage(fixture.raw);
        expect(decoded.version).toBeGreaterThanOrEqual(minSupportedVersion);
      } else {
        expect(() => decodeMessage(fixture.raw)).toThrow();
      }
    }
  });

  it('negotiates protocol versions correctly', () => {
    const ack = negotiateVersion({
      min_version: 1,
      max_version: 1,
      client_name: 'ts-sdk',
      client_version: '0.1.0',
    });
    expect(ack.negotiated_version).toBe(1);

    expect(() =>
      negotiateVersion({ min_version: 2, max_version: 5 }),
    ).toThrow();
  });
});
