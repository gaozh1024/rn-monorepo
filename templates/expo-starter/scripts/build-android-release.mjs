import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(dirname, '..');
const androidRoot = path.join(projectRoot, 'android');
const bundlePath = path.join(
  androidRoot,
  'app/build/generated/assets/createBundleReleaseJsAndAssets/index.android.bundle'
);
const apkPath = path.join(androidRoot, 'app/build/outputs/apk/release/app-release.apk');

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
  fail(
    'Refusing to build a release APK with EXPO_PUBLIC_APP_ENV=dev. Pass --allow-dev for local release testing.'
  );
}
if (!parsedEnv.EXPO_PUBLIC_API_BASE_URL) {
  fail('EXPO_PUBLIC_API_BASE_URL is required for release builds.');
}

const childEnv = {
  ...process.env,
  ...parsedEnv,
  NODE_ENV: 'production',
  BABEL_ENV: 'production',
};

console.log(`[release] env file: ${path.relative(projectRoot, envFile)}`);
console.log(`[release] app env: ${appEnv}`);
console.log(`[release] api base: ${parsedEnv.EXPO_PUBLIC_API_BASE_URL}`);
console.log('[release] reminder: release builds inline env values into the JS bundle.');
console.log(
  '[release] reminder: use this npm script for release builds; do not run Gradle assembleRelease directly.'
);

runGradle([':app:createBundleReleaseJsAndAssets', '--rerun-tasks'], childEnv);
assertNewerThan(bundlePath, envFile, 'Release JS bundle');

runGradle([':app:assembleRelease'], childEnv);
assertNewerThan(apkPath, bundlePath, 'Release APK');

console.log(`[release] apk: ${path.relative(projectRoot, apkPath)}`);

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
    fail(
      `${label} is older than ${path.relative(projectRoot, inputPath)}. Build output may be stale.`
    );
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

function fail(message) {
  console.error(`[release] ${message}`);
  process.exit(1);
}
