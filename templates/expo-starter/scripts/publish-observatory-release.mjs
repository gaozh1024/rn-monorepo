import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(dirname, '..');
const androidBuildGradlePath = path.join(projectRoot, 'android/app/build.gradle');

const args = parseArgs(process.argv.slice(2));
const platform = args.platform || 'android';
const envFile = path.resolve(projectRoot, args.envFile || '.env.production');
const parsedEnv = existsSync(envFile) ? parseEnvFile(envFile) : {};
const manifestPath = path.resolve(projectRoot, args.manifest || defaultManifestPath(platform));
const sourcemapPath = path.resolve(projectRoot, args.file || defaultSourcemapPath(platform));
const bundleFileName = args.bundleFileName || defaultBundleFileName(platform);
const manifest = readReleaseManifest(manifestPath);
const androidVersion = readAndroidVersionMetadata();

const apiBase = firstNonEmpty(args.apiBase, process.env.APP_OBSERVATORY_BASE_URL);
const applicationId = firstNonEmpty(
  args.applicationId,
  process.env.APPLICATION_ID,
  process.env.APP_OBSERVATORY_APPLICATION_ID,
  androidVersion.applicationId,
);
const version = firstNonEmpty(args.version, process.env.APP_VERSION, androidVersion.versionName);
const buildNumber = firstNonEmpty(args.buildNumber, process.env.BUILD_NUMBER, androidVersion.versionCode);
const releaseChannel = firstNonEmpty(args.channel, process.env.RELEASE_CHANNEL, manifest.release.channel);
const commitSha = firstNonEmpty(args.commitSha, process.env.COMMIT_SHA, manifest.release.commitSha);
const skipCreateRelease = args.skipCreateRelease === true;
const skipUploadSourcemap = args.skipUploadSourcemap === true;

if (!apiBase) {
  fail('Missing APP_OBSERVATORY_BASE_URL or --api-base.');
}
if (!existsSync(sourcemapPath) && !skipUploadSourcemap) {
  fail(`Source map not found: ${path.relative(projectRoot, sourcemapPath)}`);
}

const cliPath = resolveReleaseCliPath();
const authArgs = buildAuthArgs(args);
let uploadReleaseId = firstNonEmpty(args.releaseId, manifest.release.id);

if (!skipCreateRelease) {
  if (!applicationId || !version || !buildNumber) {
    fail('create-release requires applicationId, version, and buildNumber. Pass --application-id, --version, and --build-number when defaults are unavailable.');
  }

  const createResult = runReleaseCli([
    'create-release',
    '--api-base',
    apiBase,
    ...authArgs,
    '--application-id',
    applicationId,
    '--version',
    version,
    '--build-number',
    buildNumber,
    '--channel',
    releaseChannel,
    '--commit-sha',
    commitSha,
  ]);
  const serverReleaseId = firstNonEmpty(createResult?.release?.id, createResult?.id);

  if (serverReleaseId) {
    if (uploadReleaseId && uploadReleaseId !== serverReleaseId) {
      console.warn(`[observatory] backend release id ${serverReleaseId} differs from runtime release id ${uploadReleaseId}.`);
      console.warn('[observatory] Uploading sourcemap with backend id; runtime events can still fall back through version/build metadata.');
    }
    uploadReleaseId = serverReleaseId;
  }
}

if (!uploadReleaseId) {
  fail('Missing release id. Provide --release-id or build a manifest with release.id.');
}

if (!skipUploadSourcemap) {
  runReleaseCli([
    'upload-sourcemap',
    '--api-base',
    apiBase,
    ...authArgs,
    '--release-id',
    uploadReleaseId,
    '--platform',
    platform,
    '--file',
    sourcemapPath,
    '--bundle-file-name',
    bundleFileName,
  ]);
}

console.log(`[observatory] release id: ${uploadReleaseId}`);
console.log(`[observatory] platform: ${platform}`);
console.log(`[observatory] sourcemap: ${path.relative(projectRoot, sourcemapPath)}`);

function runReleaseCli(cliArgs) {
  const result = spawnSync('node', [cliPath, ...cliArgs], {
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

function buildAuthArgs(values) {
  const sessionCookie = firstNonEmpty(values.sessionCookie, process.env.APP_OBSERVATORY_SESSION_COOKIE);
  const bearerToken = firstNonEmpty(values.adminToken, process.env.APP_OBSERVATORY_ADMIN_TOKEN);
  const adminEmail = firstNonEmpty(values.adminEmail, process.env.APP_OBSERVATORY_ADMIN_EMAIL);
  const adminPassword = firstNonEmpty(values.adminPassword, process.env.APP_OBSERVATORY_ADMIN_PASSWORD);

  if (sessionCookie) return ['--session-cookie', sessionCookie];
  if (bearerToken) return ['--admin-token', bearerToken];
  if (adminEmail && adminPassword) return ['--admin-email', adminEmail, '--admin-password', adminPassword];
  fail('Missing admin auth. Provide APP_OBSERVATORY_ADMIN_EMAIL/PASSWORD, APP_OBSERVATORY_SESSION_COOKIE, or APP_OBSERVATORY_ADMIN_TOKEN.');
}

function resolveReleaseCliPath() {
  const candidates = [
    path.join(projectRoot, 'node_modules/@gaozh1024/rn-observatory/bin/rn-observatory-release.js'),
    path.join(projectRoot, '.yalc/@gaozh1024/rn-observatory/bin/rn-observatory-release.js'),
  ];
  const cli = candidates.find(candidate => existsSync(candidate));
  if (!cli) fail('Cannot find rn-observatory-release CLI.');
  return cli;
}

function readReleaseManifest(filePath) {
  if (!existsSync(filePath)) {
    fail(`Observatory release manifest not found: ${path.relative(projectRoot, filePath)}`);
  }

  try {
    const parsed = JSON.parse(readFileSync(filePath, 'utf8'));
    if (!parsed?.release || typeof parsed.release !== 'object') {
      throw new Error('missing release object');
    }
    return parsed;
  } catch (error) {
    fail(`Invalid observatory release manifest: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function readAndroidVersionMetadata() {
  if (!existsSync(androidBuildGradlePath)) return {};

  const content = readFileSync(androidBuildGradlePath, 'utf8');
  return {
    applicationId: content.match(/applicationId\s+["']([^"']+)["']/)?.[1] || '',
    versionName: content.match(/versionName\s+["']([^"']+)["']/)?.[1] || '',
    versionCode: content.match(/versionCode\s+(\d+)/)?.[1] || '',
  };
}

function defaultManifestPath(value) {
  if (value === 'web') return 'dist/observatory-release.json';
  return 'android/app/build/outputs/observatory-release.json';
}

function defaultSourcemapPath(value) {
  if (value === 'web') return 'dist/index.web.bundle.map';
  return 'android/app/build/generated/sourcemaps/react/release/index.android.bundle.map';
}

function defaultBundleFileName(value) {
  if (value === 'web') return 'index.web.bundle';
  return 'index.android.bundle';
}

function parseArgs(values) {
  const output = {};
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (!value.startsWith('--')) continue;

    const key = toCamelCase(value.slice(2));
    const next = values[index + 1];
    if (!next || next.startsWith('--')) {
      output[key] = true;
      continue;
    }

    output[key] = next;
    index += 1;
  }
  return output;
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

function toCamelCase(value) {
  return value.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}

function firstNonEmpty(...values) {
  for (const value of values) {
    const normalized = String(value ?? '').trim();
    if (normalized) return normalized;
  }
  return '';
}

function fail(message) {
  console.error(`[observatory] ${message}`);
  process.exit(1);
}
