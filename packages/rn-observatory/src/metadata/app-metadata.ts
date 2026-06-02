import type { AppObservatoryClientConfig } from '../core/types';
import { resolveExpoAppMetadata, type ExpoConstantsLike } from './expo';
import { resolveReactNativeAppMetadata, type NativeModulesLike } from './react-native';

export interface AppObservatoryResolvedAppMetadata {
  appId?: string;
  version?: string;
  buildNumber?: string;
}

export interface AppObservatoryMetadataSources {
  expoConstants?: ExpoConstantsLike;
  nativeModules?: NativeModulesLike;
}

export function resolveAppMetadata(
  config: Pick<AppObservatoryClientConfig, 'appId' | 'appVersion' | 'buildNumber'>,
  sources: AppObservatoryMetadataSources = {}
): AppObservatoryResolvedAppMetadata {
  const expoMetadata = resolveExpoAppMetadata(sources.expoConstants);
  const nativeMetadata = resolveReactNativeAppMetadata(sources.nativeModules);

  return {
    appId: firstPresent(config.appId, expoMetadata.appId, nativeMetadata.appId),
    version: firstPresent(config.appVersion, expoMetadata.version, nativeMetadata.version),
    buildNumber: firstPresent(
      config.buildNumber,
      expoMetadata.buildNumber,
      nativeMetadata.buildNumber
    ),
  };
}

export function createMissingAppIdError() {
  return new Error(
    'rn-observatory could not resolve appId automatically. Register the app in App Observatory and ensure RNObservatoryMetadata native module is available, or pass appId explicitly from the app metadata layer.'
  );
}

function firstPresent(...values: Array<unknown>) {
  for (const value of values) {
    const compacted = compactString(value);
    if (compacted) return compacted;
  }
  return undefined;
}

function compactString(value: unknown) {
  if (value === undefined || value === null) return undefined;
  const text = String(value).trim();
  return text === '' ? undefined : text;
}
