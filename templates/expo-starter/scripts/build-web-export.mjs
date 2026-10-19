import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(dirname, '..');
const distDir = path.join(projectRoot, 'dist');
const localEnvPath = path.join(projectRoot, '.env.local');

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

const childEnv = {
  ...process.env,
  ...parsedEnv,
  NODE_ENV: 'production',
  BABEL_ENV: 'production',
};

const restoreEnv = backupLocalEnv();

try {
  copyFileSync(envFile, localEnvPath);

  console.log(`[web:build] env file: ${path.relative(projectRoot, envFile)}`);
  console.log(`[web:build] app env: ${appEnv}`);
  console.log(`[web:build] api base: ${parsedEnv.EXPO_PUBLIC_API_BASE_URL}`);
  console.log(`[web:build] output dir: ${path.relative(projectRoot, distDir)}`);

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
} finally {
  restoreEnv();
}

console.log(`[web:build] done: ${path.relative(projectRoot, distDir)}`);

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

function fail(message) {
  console.error(`[web:build] ${message}`);
  process.exit(1);
}
