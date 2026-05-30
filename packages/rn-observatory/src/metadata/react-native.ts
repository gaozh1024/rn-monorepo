import { NativeModules } from 'react-native';

export interface NativeAppMetadataLike {
  appId?: string;
  bundleIdentifier?: string;
  packageName?: string;
  version?: string;
  appVersion?: string;
  buildNumber?: string | number;
  versionCode?: string | number;
  getConstantsSync?: () => NativeAppMetadataLike;
}

export interface NativeModulesLike {
  RNObservatoryMetadata?: NativeAppMetadataLike;
}

export function resolveReactNativeAppMetadata(nativeModules: NativeModulesLike = NativeModules) {
  const source = nativeModules.RNObservatoryMetadata;
  const constants = source?.getConstantsSync?.() ?? source;
  if (!constants) return {};

  return {
    appId: compactString(constants.appId ?? constants.bundleIdentifier ?? constants.packageName),
    version: compactString(constants.version ?? constants.appVersion),
    buildNumber: compactString(constants.buildNumber ?? constants.versionCode),
  };
}

function compactString(value: unknown) {
  if (value === undefined || value === null) return undefined;
  const text = String(value).trim();
  return text === '' ? undefined : text;
}
