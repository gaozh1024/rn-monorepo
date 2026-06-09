import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const RELEASE_ID_ENV = 'EXPO_PUBLIC_APP_HEALTH_RELEASE_ID';
const RELEASE_CHANNEL_ENV = 'EXPO_PUBLIC_APP_HEALTH_RELEASE_CHANNEL';
const RELEASE_COMMIT_SHA_ENV = 'EXPO_PUBLIC_APP_HEALTH_RELEASE_COMMIT_SHA';

export function resolveObservatoryReleaseEnv({ appEnv, parsedEnv, projectRoot }) {
  const channel = firstNonEmpty(
    parsedEnv[RELEASE_CHANNEL_ENV],
    process.env[RELEASE_CHANNEL_ENV],
    process.env.APP_OBSERVATORY_RELEASE_CHANNEL,
    mapAppEnvToReleaseChannel(appEnv),
  );
  const commitSha = firstNonEmpty(
    parsedEnv[RELEASE_COMMIT_SHA_ENV],
    process.env[RELEASE_COMMIT_SHA_ENV],
    process.env.APP_OBSERVATORY_COMMIT_SHA,
    process.env.GITHUB_SHA,
    process.env.CI_COMMIT_SHA,
    resolveGitCommitSha(projectRoot),
  );
  const releaseId = firstNonEmpty(
    parsedEnv[RELEASE_ID_ENV],
    process.env[RELEASE_ID_ENV],
    process.env.APP_OBSERVATORY_RELEASE_ID,
    buildFallbackReleaseId({ appEnv, channel, commitSha, projectRoot }),
  );

  return {
    env: {
      [RELEASE_ID_ENV]: releaseId,
      [RELEASE_CHANNEL_ENV]: channel,
      [RELEASE_COMMIT_SHA_ENV]: commitSha,
    },
    release: {
      id: releaseId,
      channel,
      commitSha,
    },
  };
}

export function writeObservatoryReleaseManifest(filePath, release) {
  const dir = path.dirname(filePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  writeFileSync(filePath, `${JSON.stringify({ release }, null, 2)}\n`);
}

export function logObservatoryRelease(prefix, release) {
  console.log(`${prefix} observatory release id: ${release.id}`);
  console.log(`${prefix} observatory release channel: ${release.channel}`);
  console.log(`${prefix} observatory release commit: ${release.commitSha || '<missing>'}`);
}

function mapAppEnvToReleaseChannel(appEnv) {
  if (appEnv === 'prod') return 'production';
  if (appEnv === 'staging') return 'staging';
  return 'development';
}

function buildFallbackReleaseId({ appEnv, channel, commitSha, projectRoot }) {
  const appSlug = readExpoAppSlug(projectRoot);
  const shortSha = commitSha ? commitSha.slice(0, 12) : 'no-sha';
  const buildNumber = firstNonEmpty(
    process.env.GITHUB_RUN_NUMBER,
    process.env.CI_PIPELINE_IID,
    process.env.BUILD_NUMBER,
    new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14),
  );
  return `${appSlug}-${channel || appEnv}-${buildNumber}-${shortSha}`;
}

function readExpoAppSlug(projectRoot) {
  const appJsonPath = path.join(projectRoot, 'app.json');
  if (!existsSync(appJsonPath)) return 'expo-app';

  try {
    const parsed = JSON.parse(readFileSync(appJsonPath, 'utf8'));
    return String(parsed?.expo?.slug || parsed?.expo?.name || 'expo-app')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'expo-app';
  } catch {
    return 'expo-app';
  }
}

function resolveGitCommitSha(projectRoot) {
  const result = spawnSync('git', ['rev-parse', 'HEAD'], {
    cwd: projectRoot,
    encoding: 'utf8',
  });

  if (result.status !== 0) return '';
  return result.stdout.trim();
}

function firstNonEmpty(...values) {
  for (const value of values) {
    const normalized = String(value ?? '').trim();
    if (normalized) return normalized;
  }
  return '';
}
