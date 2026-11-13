import { describe, expect, it, vi } from 'vitest';
import { compareVersion, fetchJsonManifest, resolveUpdateDecisionFromManifest } from './manifest';
import type { HotUpdaterCheckParams, OtaManifest } from './types';

const params: HotUpdaterCheckParams = {
  platform: 'android',
  appVersion: '1.2.3',
  channel: 'production',
  bundleId: 'bundle-current',
  minBundleId: 'bundle-base',
};

const manifest = (overrides: Partial<OtaManifest> = {}): OtaManifest => ({
  schemaVersion: 1,
  platform: 'android',
  channel: 'production',
  updatedAt: '2026-04-25T00:00:00.000Z',
  release: {
    bundleId: 'bundle-next',
    appVersion: '1.2.3',
    minNativeVersion: '1.2.0',
    force: false,
    notes: 'Bug fixes',
    url: 'https://example.com/bundle.zip',
    sha256: 'hash',
  },
  ...overrides,
});

describe('compareVersion', () => {
  it('compares semantic-like versions by major minor patch', () => {
    expect(compareVersion('1.2.3', '1.2.3')).toBe(0);
    expect(compareVersion('1.2.4', '1.2.3')).toBe(1);
    expect(compareVersion('1.2.3', '1.3.0')).toBe(-1);
    expect(compareVersion('2.0', '1.9.9')).toBe(1);
  });
});

describe('resolveUpdateDecisionFromManifest', () => {
  it('returns manifest-missing when manifest is null', () => {
    const decision = resolveUpdateDecisionFromManifest(null, params);
    expect(decision.reason).toBe('manifest-missing');
    expect(decision.update).toBeNull();
  });

  it('returns release-missing when release is absent', () => {
    const decision = resolveUpdateDecisionFromManifest(manifest({ release: null }), params);
    expect(decision.reason).toBe('release-missing');
    expect(decision.update).toBeNull();
  });

  it('does not update when a release is disabled', () => {
    const decision = resolveUpdateDecisionFromManifest(
      manifest({ release: { ...manifest().release!, disabled: true, force: true } }),
      params
    );
    expect(decision.reason).toBe('release-disabled');
    expect(decision.update).toBeNull();
  });

  it('rejects platform, channel, and app version mismatches', () => {
    expect(resolveUpdateDecisionFromManifest(manifest({ platform: 'ios' }), params).reason).toBe(
      'platform-mismatch'
    );
    expect(resolveUpdateDecisionFromManifest(manifest({ channel: 'staging' }), params).reason).toBe(
      'channel-mismatch'
    );
    expect(
      resolveUpdateDecisionFromManifest(
        manifest({ release: { ...manifest().release!, appVersion: '9.9.9' } }),
        params
      ).reason
    ).toBe('app-version-mismatch');
  });

  it('rejects releases requiring a newer native app version', () => {
    const decision = resolveUpdateDecisionFromManifest(
      manifest({ release: { ...manifest().release!, minNativeVersion: '1.3.0' } }),
      params
    );
    expect(decision.reason).toBe('min-native-version-not-satisfied');
    expect(decision.update).toBeNull();
  });

  it('does not update when the bundle is already installed', () => {
    const decision = resolveUpdateDecisionFromManifest(
      manifest({ release: { ...manifest().release!, bundleId: params.bundleId } }),
      params
    );
    expect(decision.reason).toBe('bundle-already-installed');
    expect(decision.update).toBeNull();
  });

  it('maps an enabled release to update info', () => {
    const decision = resolveUpdateDecisionFromManifest(manifest(), params);
    expect(decision.reason).toBe('update-available');
    expect(decision.update).toEqual({
      id: 'bundle-next',
      shouldForceUpdate: false,
      status: 'UPDATE',
      fileUrl: 'https://example.com/bundle.zip',
      fileHash: 'hash',
      message: 'Bug fixes',
    });
  });

  it('treats omitted force as non-force update', () => {
    const release = { ...manifest().release! };
    delete release.force;

    const decision = resolveUpdateDecisionFromManifest(manifest({ release }), params);

    expect(decision.reason).toBe('update-available');
    expect(decision.update?.shouldForceUpdate).toBe(false);
  });
});

describe('fetchJsonManifest', () => {
  it('returns null for a missing manifest', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('', { status: 404 }))
    );
    await expect(fetchJsonManifest('https://example.com/missing.json')).resolves.toBeNull();
    vi.unstubAllGlobals();
  });

  it('keeps other HTTP errors as failures', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('', { status: 500 }))
    );
    await expect(fetchJsonManifest('https://example.com/error.json')).rejects.toThrow('500');
    vi.unstubAllGlobals();
  });
});
