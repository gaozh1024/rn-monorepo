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
type RequireLike = (id: string) => unknown;

declare const require: RequireLike | undefined;

export function resolveExpoAppMetadata(constants = loadExpoConstants()) {
  const config = constants?.expoConfig ?? constants?.manifest;
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

function loadExpoConstants(): ExpoConstantsLike | undefined {
  const packageRequire = getPackageRequire();
  if (!packageRequire) return undefined;

  try {
    const loaded = packageRequire('expo-constants') as ExpoConstantsModule;
    return loaded.default ?? loaded;
  } catch {
    return undefined;
  }
}

function getPackageRequire() {
  try {
    return typeof require === 'function' ? require : undefined;
  } catch {
    return undefined;
  }
}

function compactString(value: unknown) {
  if (value === undefined || value === null) return undefined;
  const text = String(value).trim();
  return text === '' ? undefined : text;
}
