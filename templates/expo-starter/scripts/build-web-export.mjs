import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  logObservatoryRelease,
  resolveObservatoryReleaseEnv,
  writeObservatoryReleaseManifest,
} from './observatory-release-env.mjs';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(dirname, '..');
const distDir = path.join(projectRoot, 'dist');
const observatoryReleaseManifestPath = path.join(distDir, 'observatory-release.json');
const localEnvPath = path.join(projectRoot, '.env.local');
const appJsonPath = path.join(projectRoot, 'app.json');

const args = process.argv.slice(2);
const envFileArg = readOption(args, '--env-file') ?? '.env.production';
const clear = args.includes('--clear');
const envFile = path.resolve(projectRoot, envFileArg);

if (!existsSync(envFile)) {
  fail(`Env file not found: ${path.relative(projectRoot, envFile)}`);
}

const parsedEnv = parseEnvFile(envFile);
const appEnv = parsedEnv.EXPO_PUBLIC_APP_ENV;

if (!['staging', 'prod'].includes(appEnv)) {
  fail('Web export only supports EXPO_PUBLIC_APP_ENV=staging or prod.');
}
if (!parsedEnv.EXPO_PUBLIC_API_BASE_URL) {
  fail('EXPO_PUBLIC_API_BASE_URL is required for web exports.');
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

const restoreEnv = backupLocalEnv();

try {
  copyFileSync(envFile, localEnvPath);

  console.log(`[web:build] env file: ${path.relative(projectRoot, envFile)}`);
  console.log(`[web:build] app env: ${appEnv}`);
  console.log(`[web:build] api base: ${parsedEnv.EXPO_PUBLIC_API_BASE_URL}`);
  logObservatoryRelease('[web:build]', observatoryRelease.release);
  console.log('[web:build] output dir: dist');

  const exportArgs = ['expo', 'export', '--platform', 'web', '--output-dir', 'dist'];
  if (clear) exportArgs.push('--clear');

  const result = spawnSync('npx', exportArgs, {
    cwd: projectRoot,
    env: childEnv,
    stdio: 'inherit',
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
  if (!existsSync(distDir)) {
    fail('Web export did not generate dist/.');
  }

  writeObservatoryReleaseManifest(observatoryReleaseManifestPath, observatoryRelease.release);

  console.log(`[web:build] done: ${path.relative(projectRoot, distDir)}`);
  console.log(`[web:build] observatory manifest: ${path.relative(projectRoot, observatoryReleaseManifestPath)}`);

  if (shouldAutoPublishObservatory) {
    publishObservatorySourcemap(childEnv);
  } else {
    console.log('[web:build] observatory auto publish skipped. Set APP_OBSERVATORY_AUTO_PUBLISH=true in CI to create release and upload sourcemap automatically.');
  }
} finally {
  restoreEnv();
}

function createObservatoryRelease(release) {
  const apiBase = firstNonEmpty(process.env.APP_OBSERVATORY_BASE_URL);
  const appMetadata = readExpoAppMetadata();
  const applicationId = firstNonEmpty(process.env.APPLICATION_ID, process.env.APP_OBSERVATORY_APPLICATION_ID, appMetadata.applicationId);
  const version = firstNonEmpty(process.env.APP_VERSION, appMetadata.version);
  const buildNumber = firstNonEmpty(process.env.BUILD_NUMBER, process.env.GITHUB_RUN_NUMBER, process.env.CI_PIPELINE_IID, 'web');

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
  const sourcemapPath = findWebSourcemapPath();
  if (!sourcemapPath) {
    fail('Web sourcemap not found in dist/. Ensure expo export emits JavaScript source maps.');
  }

  const bundleFileName = path.basename(sourcemapPath).replace(/\.map$/, '');
  const result = spawnSync('node', [
    'scripts/publish-observatory-release.mjs',
    '--platform',
    'web',
    '--env-file',
    path.relative(projectRoot, envFile),
    '--manifest',
    path.relative(projectRoot, observatoryReleaseManifestPath),
    '--file',
    path.relative(projectRoot, sourcemapPath),
    '--bundle-file-name',
    bundleFileName,
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

function findWebSourcemapPath() {
  const candidates = [];
  collectFiles(distDir, candidates);
  const sourceMaps = candidates
    .filter(filePath => filePath.endsWith('.js.map') || filePath.endsWith('.bundle.map'))
    .sort((left, right) => scoreWebSourcemap(right) - scoreWebSourcemap(left));

  return sourceMaps[0];
}

function collectFiles(dir, output) {
  if (!existsSync(dir)) return;

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectFiles(entryPath, output);
    } else if (entry.isFile()) {
      output.push(entryPath);
    }
  }
}

function scoreWebSourcemap(filePath) {
  const normalized = filePath.split(path.sep).join('/');
  let score = 0;
  if (normalized.includes('/js/')) score += 4;
  if (normalized.includes('index')) score += 2;
  if (normalized.includes('web')) score += 1;
  return score;
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

function readExpoAppMetadata() {
  if (!existsSync(appJsonPath)) return {};

  try {
    const parsed = JSON.parse(readFileSync(appJsonPath, 'utf8'));
    return {
      applicationId: parsed?.expo?.android?.package || parsed?.expo?.ios?.bundleIdentifier || parsed?.expo?.slug || '',
      version: parsed?.expo?.version || '',
    };
  } catch {
    return {};
  }
}

function backupLocalEnv() {
  if (!existsSync(localEnvPath)) {
    return () => {
      if (existsSync(localEnvPath)) rmSync(localEnvPath);
    };
  }

  const original = readFileSync(localEnvPath);
  return () => {
    writeFileSync(localEnvPath, original);
  };
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
  console.error(`[web:build] ${message}`);
  process.exit(1);
}
