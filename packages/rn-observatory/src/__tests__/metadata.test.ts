import { afterEach, describe, expect, it, vi } from 'vitest';
import { NativeModules } from 'react-native';
import {
  createAppObservatoryClient,
  MemoryObservatoryStorage,
  resolveAppMetadata,
  type AppObservatoryEvent,
} from '..';

const nativeModules = NativeModules as typeof NativeModules & {
  RNObservatoryMetadata?: {
    appId?: string;
    packageName?: string;
    version?: string;
    buildNumber?: string | number;
    getConstantsSync?: () => Record<string, unknown>;
  };
};

describe('app metadata resolution', () => {
  afterEach(() => {
    nativeModules.RNObservatoryMetadata = undefined;
    vi.restoreAllMocks();
  });

  it('prefers explicit config over automatically resolved metadata', () => {
    const metadata = resolveAppMetadata(
      { appId: 'manual-app', appVersion: '9.9.9', buildNumber: '999' },
      {
        expoConstants: {
          expoConfig: {
            slug: 'expo-slug',
            version: '1.0.0',
            ios: { bundleIdentifier: 'expo.ios', buildNumber: '10' },
          },
        },
        nativeModules: {
          RNObservatoryMetadata: {
            appId: 'native-app',
            version: '2.0.0',
            buildNumber: '20',
          },
        },
      }
    );

    expect(metadata).toEqual({ appId: 'manual-app', version: '9.9.9', buildNumber: '999' });
  });

  it('resolves Expo metadata when explicit config is absent', () => {
    const metadata = resolveAppMetadata(
      {},
      {
        expoConstants: {
          expoConfig: {
            slug: 'demo-app',
            version: '1.2.3',
            ios: { bundleIdentifier: 'com.demo.ios', buildNumber: '45' },
            android: { package: 'com.demo.android', versionCode: 46 },
          },
        },
      }
    );

    expect(metadata).toEqual({ appId: 'com.demo.ios', version: '1.2.3', buildNumber: '45' });
  });

  it('resolves React Native native module metadata', async () => {
    nativeModules.RNObservatoryMetadata = {
      packageName: 'com.demo.native',
      version: '2.3.4',
      buildNumber: 67,
    };
    const delivered: AppObservatoryEvent[] = [];
    const client = await createAppObservatoryClient({
      consent: { analytics: true },
      flushIntervalMs: 0,
      storage: new MemoryObservatoryStorage(),
      transports: [events => delivered.push(...events)],
    });
    await client.flush();
    delivered.length = 0;

    await client.trackEvent('metadata.native');
    await client.flush();

    expect(delivered.find(event => event.type === 'analytics_event')?.app).toEqual({
      id: 'com.demo.native',
      version: '2.3.4',
      buildNumber: '67',
      environment: undefined,
    });
  });

  it('reports missing app id without preventing local event creation', async () => {
    const errors: unknown[] = [];
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    (globalThis as { __DEV__?: boolean }).__DEV__ = true;

    const delivered: AppObservatoryEvent[] = [];
    const client = await createAppObservatoryClient({
      consent: { analytics: true },
      flushIntervalMs: 0,
      onError: error => errors.push(error),
      storage: new MemoryObservatoryStorage(),
      transports: [events => delivered.push(...events)],
    });
    await client.flush();
    delivered.length = 0;

    await client.trackEvent('metadata.missing');
    await client.flush();

    expect(errors.some(error => error instanceof Error && error.message.includes('appId'))).toBe(
      true
    );
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('appId'));
    expect(delivered.find(event => event.type === 'analytics_event')?.app.id).toBeUndefined();

    delete (globalThis as { __DEV__?: boolean }).__DEV__;
  });
});
