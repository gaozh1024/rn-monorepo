import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  logObservatoryRelease,
  resolveObservatoryReleaseEnv,
  writeObservatoryReleaseManifest,
} from './observatory-release-env.mjs';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(dirname, '..');
const androidRoot = path.join(projectRoot, 'android');
const bundlePath = path.join(
  androidRoot,
  'app/build/generated/assets/createBundleReleaseJsAndAssets/index.android.bundle',
);
const sourcemapPath = path.join(
  androidRoot,
  'app/build/generated/sourcemaps/react/release/index.android.bundle.map',
);
const apkPath = path.join(androidRoot, 'app/build/outputs/apk/release/app-release.apk');
const observatoryReleaseManifestPath = path.join(androidRoot, 'app/build/outputs/observatory-release.json');

const args = process.argv.slice(2);
const envFileArg = readOption(args, '--env-file') ?? '.env.production';
const allowDev = args.includes('--allow-dev');
const envFile = path.resolve(projectRoot, envFileArg);

if (!existsSync(envFile)) {
  fail(`Env file not found: ${path.relative(projectRoot, envFile)}`);
}
if (!existsSync(androidRoot)) {
  fail('Android project not found. Run `npx expo prebuild --platform android` first.');
}

const parsedEnv = parseEnvFile(envFile);
const appEnv = parsedEnv.EXPO_PUBLIC_APP_ENV;

if (!['dev', 'staging', 'prod'].includes(appEnv)) {
  fail('EXPO_PUBLIC_APP_ENV must be one of: dev, staging, prod.');
}
if (appEnv === 'dev' && !allowDev) {
  fail('Refusing to build a release APK with EXPO_PUBLIC_APP_ENV=dev. Pass --allow-dev for local release testing.');
}
if (!parsedEnv.EXPO_PUBLIC_API_BASE_URL) {
  fail('EXPO_PUBLIC_API_BASE_URL is required for release builds.');
}

const observatoryRelease = resolveObservatoryReleaseEnv({ appEnv, parsedEnv, projectRoot });
const shouldAutoPublishObservatory = process.env.APP_OBSERVATORY_AUTO_PUBLISH === 'true';

if (shouldAutoPublishObservatory) {
  const backendReleaseId = createObservatoryRelease(observatoryRelease.release);
  observatoryRelease.release.id = backendReleaseId;
  observatoryRelease.env.EXPO_PUBLIC_APP_HEALTH_RELEASE_ID = backendReleaseId;
}

const childEnv = {
  ...process.env,
  ...parsedEnv,
  ...observatoryRelease.env,
  NODE_ENV: 'production',
  BABEL_ENV: 'production',
};

console.log(`[release] env file: ${path.relative(projectRoot, envFile)}`);
console.log(`[release] app env: ${appEnv}`);
console.log(`[release] api base: ${parsedEnv.EXPO_PUBLIC_API_BASE_URL}`);
logObservatoryRelease('[release]', observatoryRelease.release);
console.log('[release] reminder: release builds inline env values into the JS bundle.');
console.log('[release] reminder: use this npm script for release builds; do not run Gradle assembleRelease directly.');

runGradle([':app:createBundleReleaseJsAndAssets', '--rerun-tasks'], childEnv);
assertNewerThan(bundlePath, envFile, 'Release JS bundle');

runGradle([':app:assembleRelease'], childEnv);
assertNewerThan(apkPath, bundlePath, 'Release APK');
writeObservatoryReleaseManifest(observatoryReleaseManifestPath, observatoryRelease.release);

console.log(`[release] apk: ${path.relative(projectRoot, apkPath)}`);
console.log(`[release] observatory manifest: ${path.relative(projectRoot, observatoryReleaseManifestPath)}`);

if (shouldAutoPublishObservatory) {
  publishObservatorySourcemap(childEnv);
} else {
  console.log('[release] observatory auto publish skipped. Set APP_OBSERVATORY_AUTO_PUBLISH=true in CI to create release and upload sourcemap automatically.');
}

function createObservatoryRelease(release) {
  const apiBase = firstNonEmpty(process.env.APP_OBSERVATORY_BASE_URL);
  const androidVersion = readAndroidVersionMetadata();
  const applicationId = firstNonEmpty(process.env.APPLICATION_ID, process.env.APP_OBSERVATORY_APPLICATION_ID, androidVersion.applicationId);
  const version = firstNonEmpty(process.env.APP_VERSION, androidVersion.versionName);
  const buildNumber = firstNonEmpty(process.env.BUILD_NUMBER, androidVersion.versionCode);

  if (!apiBase || !applicationId || !version || !buildNumber) {
    fail('APP_OBSERVATORY_AUTO_PUBLISH=true requires APP_OBSERVATORY_BASE_URL plus application id, version, and build number.');
  }

  const result = runObservatoryReleaseCli([
    'create-release',
    '--api-base',
    apiBase,
    ...buildObservatoryAuthArgs(),
    '--application-id',
    applicationId,
    '--version',
    version,
    '--build-number',
    buildNumber,
    '--channel',
    release.channel,
    '--commit-sha',
    release.commitSha || '',
  ]);
  const backendReleaseId = firstNonEmpty(result?.release?.id, result?.id);

  if (!backendReleaseId) {
    fail('app-observatory create-release did not return a release id.');
  }

  return backendReleaseId;
}

function publishObservatorySourcemap(env) {
  const result = spawnSync('node', [
    'scripts/publish-observatory-release.mjs',
    '--platform',
    'android',
    '--env-file',
    path.relative(projectRoot, envFile),
    '--manifest',
    path.relative(projectRoot, observatoryReleaseManifestPath),
    '--file',
    path.relative(projectRoot, sourcemapPath),
    '--release-id',
    env.EXPO_PUBLIC_APP_HEALTH_RELEASE_ID,
    '--skip-create-release',
  ], {
    cwd: projectRoot,
    env,
    stdio: 'inherit',
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function runObservatoryReleaseCli(cliArgs) {
  const result = spawnSync('node', [resolveObservatoryReleaseCliPath(), ...cliArgs], {
    cwd: projectRoot,
    encoding: 'utf8',
  });

  if (result.stderr) process.stderr.write(result.stderr);
  if (result.status !== 0) process.exit(result.status ?? 1);
  if (result.stdout) process.stdout.write(result.stdout);

  try {
    return result.stdout ? JSON.parse(result.stdout) : {};
  } catch {
    return {};
  }
}

function buildObservatoryAuthArgs() {
  const sessionCookie = firstNonEmpty(process.env.APP_OBSERVATORY_SESSION_COOKIE);
  const bearerToken = firstNonEmpty(process.env.APP_OBSERVATORY_ADMIN_TOKEN);
  const adminEmail = firstNonEmpty(process.env.APP_OBSERVATORY_ADMIN_EMAIL);
  const adminPassword = firstNonEmpty(process.env.APP_OBSERVATORY_ADMIN_PASSWORD);

  if (sessionCookie) return ['--session-cookie', sessionCookie];
  if (bearerToken) return ['--admin-token', bearerToken];
  if (adminEmail && adminPassword) return ['--admin-email', adminEmail, '--admin-password', adminPassword];
  fail('APP_OBSERVATORY_AUTO_PUBLISH=true requires admin auth via APP_OBSERVATORY_ADMIN_EMAIL/PASSWORD, APP_OBSERVATORY_SESSION_COOKIE, or APP_OBSERVATORY_ADMIN_TOKEN.');
}

function resolveObservatoryReleaseCliPath() {
  const candidates = [
    path.join(projectRoot, 'node_modules/@gaozh1024/rn-observatory/bin/rn-observatory-release.js'),
    path.join(projectRoot, '.yalc/@gaozh1024/rn-observatory/bin/rn-observatory-release.js'),
  ];
  const cliPath = candidates.find(candidate => existsSync(candidate));
  if (!cliPath) fail('Cannot find rn-observatory-release CLI.');
  return cliPath;
}

function readAndroidVersionMetadata() {
  const buildGradle = path.join(androidRoot, 'app/build.gradle');
  if (!existsSync(buildGradle)) return {};

  const content = readFileSync(buildGradle, 'utf8');
  return {
    applicationId: content.match(/applicationId\s+["']([^"']+)["']/)?.[1] || '',
    versionName: content.match(/versionName\s+["']([^"']+)["']/)?.[1] || '',
    versionCode: content.match(/versionCode\s+(\d+)/)?.[1] || '',
  };
}

function runGradle(gradleArgs, env) {
  const result = spawnSync('./gradlew', gradleArgs, {
    cwd: androidRoot,
    env,
    stdio: 'inherit',
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function assertNewerThan(targetPath, inputPath, label) {
  if (!existsSync(targetPath)) {
    fail(`${label} was not generated: ${path.relative(projectRoot, targetPath)}`);
  }

  const targetTime = statSync(targetPath).mtimeMs;
  const inputTime = statSync(inputPath).mtimeMs;
  if (targetTime + 1000 < inputTime) {
    fail(`${label} is older than ${path.relative(projectRoot, inputPath)}. Build output may be stale.`);
  }
}

function readOption(values, name) {
  const index = values.indexOf(name);
  if (index === -1) return undefined;

  const value = values[index + 1];
  if (!value || value.startsWith('--')) {
    fail(`${name} requires a value.`);
  }
  return value;
}

function parseEnvFile(filePath) {
  const env = {};
  const content = readFileSync(filePath, 'utf8');

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const match = line.match(/^([\w.-]+)\s*=\s*(.*)$/);
    if (!match) continue;

    const [, key, rawValue] = match;
    env[key] = normalizeEnvValue(rawValue);
  }

  return env;
}

function normalizeEnvValue(value) {
  const trimmed = value.trim();
  const quote = trimmed[0];
  if ((quote === '"' || quote === "'") && trimmed.endsWith(quote)) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function firstNonEmpty(...values) {
  for (const value of values) {
    const normalized = String(value ?? '').trim();
    if (normalized) return normalized;
  }
  return '';
}

function fail(message) {
  console.error(`[release] ${message}`);
  process.exit(1);
}
