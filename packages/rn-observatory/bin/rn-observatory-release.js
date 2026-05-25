#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

function usage() {
  return [
    'rn-observatory-release',
    '',
    'Usage:',
    '  rn-observatory-release create-release --api-base <url> --admin-token <token> --application-id <id> --version <v> --build-number <n> [--channel <c>] [--commit-sha <sha>]',
    '  rn-observatory-release upload-artifact --api-base <url> --admin-token <token> --release-id <id> --kind <kind> --platform <platform> --file <path> [--bundle-file-name <name>]',
    '  rn-observatory-release upload-sourcemap --api-base <url> --admin-token <token> --release-id <id> --platform <platform> --file <path> [--bundle-file-name <name>]',
    '',
    'Environment fallbacks:',
    '  APP_OBSERVATORY_BASE_URL',
    '  APP_OBSERVATORY_ADMIN_TOKEN',
  ].join('\n');
}

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const current = argv[i];
    if (!current.startsWith('--')) {
      args._.push(current);
      continue;
    }
    const next = argv[i + 1];
    const key = current.slice(2).replace(/-([a-z])/g, (_, char) => char.toUpperCase());
    if (!next || next.startsWith('--')) {
      args[key] = true;
      continue;
    }
    args[key] = next;
    i += 1;
  }
  return args;
}

async function requestJson(url, { method = 'GET', token, body } = {}) {
  const response = await fetch(url, {
    method,
    headers: {
      ...(body ? { 'content-type': 'application/json' } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  let parsed;
  try {
    parsed = text ? JSON.parse(text) : {};
  } catch {
    parsed = { raw: text };
  }

  if (!response.ok) {
    const error = new Error(
      `Request failed with status ${response.status}${parsed?.message ? `: ${parsed.message}` : ''}`
    );
    error.response = parsed;
    throw error;
  }

  return parsed;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0];
  const apiBase = args.apiBase || args.baseUrl || process.env.APP_OBSERVATORY_BASE_URL;
  const token = args.adminToken || args.token || process.env.APP_OBSERVATORY_ADMIN_TOKEN;

  if (!command || args.help || args.h || command === '--help' || command === '-h') {
    process.stdout.write(`${usage()}\n`);
    return;
  }

  if (!apiBase || !token) {
    throw new Error(
      'Missing --api-base/--base-url/APP_OBSERVATORY_BASE_URL or --admin-token/--token/APP_OBSERVATORY_ADMIN_TOKEN.'
    );
  }

  if (command === 'create-release') {
    const applicationId = args.applicationId;
    const version = args.version;
    const buildNumber = args.buildNumber;
    if (!applicationId || !version || !buildNumber) {
      throw new Error('create-release requires --application-id, --version, and --build-number.');
    }
    const payload = {
      applicationId,
      version,
      buildNumber,
      channel: args.channel || '',
      commitSha: args.commitSha || '',
    };
    const result = await requestJson(`${apiBase.replace(/\/$/, '')}/api/app-observatory/releases`, {
      method: 'POST',
      token,
      body: payload,
    });
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }

  if (command === 'upload-artifact') {
    const releaseId = args.releaseId;
    const kind = args.kind || 'source-map';
    const platform = args.platform;
    const file = args.file;
    if (!releaseId || !platform || !file) {
      throw new Error('upload-artifact requires --release-id, --platform, and --file.');
    }
    const filePath = path.resolve(process.cwd(), file);
    const content = fs.readFileSync(filePath, 'utf8');
    const payload = {
      kind,
      platform,
      fileName: path.basename(filePath),
      bundleFileName: args.bundleFileName || '',
      content,
    };
    const result = await requestJson(
      `${apiBase.replace(/\/$/, '')}/api/app-observatory/releases/${encodeURIComponent(releaseId)}/artifacts`,
      {
        method: 'POST',
        token,
        body: payload,
      }
    );
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }

  if (command === 'upload-sourcemap') {
    const releaseId = args.releaseId;
    const platform = args.platform;
    const file = args.file;
    if (!releaseId || !platform || !file) {
      throw new Error('upload-sourcemap requires --release-id, --platform, and --file.');
    }
    const filePath = path.resolve(process.cwd(), file);
    const content = fs.readFileSync(filePath, 'utf8');
    const payload = {
      kind: 'source-map',
      platform,
      fileName: path.basename(filePath),
      bundleFileName: args.bundleFileName || '',
      content,
    };
    const result = await requestJson(
      `${apiBase.replace(/\/$/, '')}/api/app-observatory/releases/${encodeURIComponent(releaseId)}/artifacts`,
      {
        method: 'POST',
        token,
        body: payload,
      }
    );
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }

  throw new Error(`Unknown command: ${command}\n\n${usage()}`);
}

main().catch(error => {
  process.stderr.write(`${error.message || String(error)}\n`);
  if (error.response) {
    process.stderr.write(`${JSON.stringify(error.response, null, 2)}\n`);
  }
  process.exitCode = 1;
});
