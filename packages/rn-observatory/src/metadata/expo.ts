import { Platform } from 'react-native';

export interface ExpoConstantsLike {
  expoConfig?: {
    slug?: string;
    version?: string;
    ios?: {
      bundleIdentifier?: string;
      buildNumber?: string;
    };
    android?: {
      package?: string;
      versionCode?: number | string;
    };
  };
  manifest?: {
    slug?: string;
    version?: string;
    ios?: {
      bundleIdentifier?: string;
      buildNumber?: string;
    };
    android?: {
      package?: string;
      versionCode?: number | string;
    };
  };
}

type ExpoConstantsModule = ExpoConstantsLike & { default?: ExpoConstantsLike };

export function resolveExpoAppMetadata(constants?: ExpoConstantsLike | ExpoConstantsModule) {
  const maybeModule = constants as ExpoConstantsModule | undefined;
  const resolvedConstants = maybeModule?.default ?? constants;
  const config = resolvedConstants?.expoConfig ?? resolvedConstants?.manifest;
  if (!config) return {};

  return {
    appId: compactString(
      Platform.select({
        ios: config.ios?.bundleIdentifier,
        android: config.android?.package,
        default: config.slug,
      })
    ),
    version: compactString(config.version),
    buildNumber: compactString(
      Platform.select({
        ios: config.ios?.buildNumber,
        android: config.android?.versionCode,
        default: undefined,
      })
    ),
  };
}

function compactString(value: unknown) {
  if (value === undefined || value === null) return undefined;
  const text = String(value).trim();
  return text === '' ? undefined : text;
}
