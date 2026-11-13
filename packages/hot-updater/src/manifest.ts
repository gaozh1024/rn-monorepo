import type { HotUpdaterCheckParams, HotUpdaterUpdateInfo, OtaManifest } from './types';

export interface ResolveUpdateDecision {
  update: HotUpdaterUpdateInfo | null;
  reason:
    | 'manifest-missing'
    | 'release-missing'
    | 'platform-mismatch'
    | 'channel-mismatch'
    | 'app-version-mismatch'
    | 'min-native-version-not-satisfied'
    | 'release-disabled'
    | 'bundle-already-installed'
    | 'update-available';
  details: Record<string, unknown>;
}

function normalizeVersion(version: string) {
  return version
    .split('.')
    .map(part => Number.parseInt(part, 10) || 0)
    .slice(0, 3);
}

export function compareVersion(left: string, right: string) {
  const leftParts = normalizeVersion(left);
  const rightParts = normalizeVersion(right);

  for (let index = 0; index < 3; index += 1) {
    if (leftParts[index] > rightParts[index]) return 1;
    if (leftParts[index] < rightParts[index]) return -1;
  }

  return 0;
}

export function resolveUpdateDecisionFromManifest(
  manifest: OtaManifest | null,
  params: HotUpdaterCheckParams
): ResolveUpdateDecision {
  if (!manifest) {
    return {
      update: null,
      reason: 'manifest-missing',
      details: {
        platform: params.platform,
        channel: params.channel,
        appVersion: params.appVersion,
        bundleId: params.bundleId,
        minBundleId: params.minBundleId,
      },
    };
  }

  const release = manifest.release;
  if (!release) {
    return {
      update: null,
      reason: 'release-missing',
      details: {
        manifestPlatform: manifest.platform,
        manifestChannel: manifest.channel,
        updatedAt: manifest.updatedAt,
      },
    };
  }

  if (release.disabled === true) {
    return {
      update: null,
      reason: 'release-disabled',
      details: {
        bundleId: release.bundleId,
        appVersion: release.appVersion,
        platform: manifest.platform,
        channel: manifest.channel,
      },
    };
  }

  if (manifest.platform !== params.platform) {
    return {
      update: null,
      reason: 'platform-mismatch',
      details: {
        expectedPlatform: params.platform,
        actualPlatform: manifest.platform,
      },
    };
  }

  if (manifest.channel !== params.channel) {
    return {
      update: null,
      reason: 'channel-mismatch',
      details: {
        expectedChannel: params.channel,
        actualChannel: manifest.channel,
      },
    };
  }

  if (release.appVersion !== params.appVersion) {
    return {
      update: null,
      reason: 'app-version-mismatch',
      details: {
        expectedAppVersion: params.appVersion,
        actualAppVersion: release.appVersion,
      },
    };
  }

  if (compareVersion(params.appVersion, release.minNativeVersion) < 0) {
    return {
      update: null,
      reason: 'min-native-version-not-satisfied',
      details: {
        currentAppVersion: params.appVersion,
        minNativeVersion: release.minNativeVersion,
      },
    };
  }

  if (release.bundleId === params.bundleId) {
    return {
      update: null,
      reason: 'bundle-already-installed',
      details: {
        bundleId: params.bundleId,
      },
    };
  }

  return {
    update: {
      id: release.bundleId,
      shouldForceUpdate: release.force === true,
      status: 'UPDATE',
      fileUrl: release.url,
      fileHash: release.sha256 ?? null,
      message: release.notes ?? null,
    },
    reason: 'update-available',
    details: {
      bundleId: release.bundleId,
      force: release.force === true,
      url: release.url,
      appVersion: release.appVersion,
      minNativeVersion: release.minNativeVersion,
    },
  };
}

export function resolveUpdateFromManifest(
  manifest: OtaManifest | null,
  params: HotUpdaterCheckParams
): HotUpdaterUpdateInfo | null {
  return resolveUpdateDecisionFromManifest(manifest, params).update;
}

export async function fetchJsonManifest(url: string, requestHeaders?: Record<string, string>) {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      ...(requestHeaders ?? {}),
    },
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Manifest 请求失败: ${response.status}`);
  }

  return (await response.json()) as OtaManifest;
}
