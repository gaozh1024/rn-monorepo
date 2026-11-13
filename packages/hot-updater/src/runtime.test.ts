import { afterEach, describe, expect, it, vi } from 'vitest';
import { createOssHotUpdater } from './runtime';
import type { OtaManifest } from './types';

vi.mock('react-native', () => ({
  Alert: { alert: vi.fn() },
  Platform: { OS: 'android' },
  ActivityIndicator: () => null,
  Text: () => null,
  View: () => null,
}));

vi.mock('@hot-updater/react-native', () => ({
  HotUpdater: {
    getChannel: vi.fn(() => 'production-cn'),
    getDefaultChannel: vi.fn(() => 'production-cn'),
    getAppVersion: vi.fn(() => '1.3.0'),
    getBundleId: vi.fn(() => 'bundle-current'),
    getMinBundleId: vi.fn(() => 'bundle-base'),
    isChannelSwitched: vi.fn(() => false),
  },
}));

const manifest: OtaManifest = {
  schemaVersion: 1,
  platform: 'android',
  channel: 'production-cn',
  updatedAt: '2026-11-13T00:00:00Z',
  release: {
    bundleId: 'bundle-next',
    appVersion: '1.3.0',
    minNativeVersion: '1.3.0',
    force: false,
    notes: '',
    url: 'https://example.com/bundle.zip',
    sha256: 'hash',
  },
};

afterEach(() => vi.unstubAllGlobals());

describe('createOssHotUpdater manifest addressing', () => {
  it('reads the app-versioned manifest before using the legacy path', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response('', { status: 404 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(manifest), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const updater = createOssHotUpdater({
      manifestBaseURL: 'https://example.com/ota/manifest',
      appVersion: '1.3.0',
      defaultChannel: 'production-cn',
      getChannel: () => 'production-cn',
    });

    await expect(updater.previewManifest()).resolves.toEqual(manifest);
    expect(fetchMock.mock.calls.map(call => new URL(call[0] as string).pathname)).toEqual([
      '/ota/manifest/android/production-cn/1.3.0.json',
      '/ota/manifest/android/production-cn.json',
    ]);
  });

  it('rejects a legacy manifest for another native app version', async () => {
    const otherVersion = { ...manifest, release: { ...manifest.release!, appVersion: '1.2.1' } };
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(new Response('', { status: 404 }))
        .mockResolvedValueOnce(new Response(JSON.stringify(otherVersion), { status: 200 }))
    );
    const updater = createOssHotUpdater({
      manifestBaseURL: 'https://example.com/ota/manifest',
      appVersion: '1.3.0',
      defaultChannel: 'production-cn',
      getChannel: () => 'production-cn',
    });

    await expect(updater.previewManifest()).resolves.toBeNull();
  });
});
