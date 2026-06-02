#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

function usage() {
  return [
    'rn-observatory-release',
    '',
    'Usage:',
    '  rn-observatory-release create-release --api-base <url> --admin-email <email> --admin-password <password> --application-id <id> --version <v> --build-number <n> [--channel <c>] [--commit-sha <sha>]',
    '  rn-observatory-release upload-artifact --api-base <url> --admin-email <email> --admin-password <password> --release-id <id> --kind <kind> --platform <platform> --file <path> [--bundle-file-name <name>]',
    '  rn-observatory-release upload-sourcemap --api-base <url> --admin-email <email> --admin-password <password> --release-id <id> --platform <platform> --file <path> [--bundle-file-name <name>]',
    '',
    'Environment fallbacks:',
    '  APP_OBSERVATORY_BASE_URL',
    '  APP_OBSERVATORY_ADMIN_EMAIL',
    '  APP_OBSERVATORY_ADMIN_PASSWORD',
    '  APP_OBSERVATORY_SESSION_COOKIE',
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

async function requestJson(url, { method = 'GET', auth, body } = {}) {
  const authHeaders = authHeadersFor(auth);
  const response = await fetch(url, {
    method,
    headers: {
      ...(body ? { 'content-type': 'application/json' } : {}),
      ...authHeaders,
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

function authHeadersFor(auth) {
  if (!auth) return {};
  if (auth.sessionCookie) return { cookie: normalizeSessionCookie(auth.sessionCookie) };
  if (auth.bearerToken) return { authorization: `Bearer ${auth.bearerToken}` };
  return {};
}

function normalizeSessionCookie(value) {
  return value.includes('=') ? value : `app_health_session=${value}`;
}

function extractSessionCookie(response) {
  const getSetCookie = response.headers.getSetCookie?.bind(response.headers);
  const setCookieHeaders = getSetCookie
    ? getSetCookie()
    : [response.headers.get('set-cookie')].filter(Boolean);
  const sessionCookie = setCookieHeaders
    .flatMap(header => String(header).split(/,(?=\s*app_health_session=)/))
    .map(header => header.trim())
    .find(header => header.startsWith('app_health_session='));
  if (!sessionCookie) return '';
  return sessionCookie.split(';')[0];
}

async function login(apiBase, email, password) {
  const response = await fetch(`${apiBase.replace(/\/$/, '')}/api/app-observatory/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Login failed with status ${response.status}${text ? `: ${text}` : ''}`);
  }
  const sessionCookie = extractSessionCookie(response);
  if (!sessionCookie) {
    throw new Error('Login succeeded but no app_health_session cookie was returned.');
  }
  return sessionCookie;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0];
  const apiBase = args.apiBase || args.baseUrl || process.env.APP_OBSERVATORY_BASE_URL;
  const email = args.adminEmail || args.email || process.env.APP_OBSERVATORY_ADMIN_EMAIL;
  const password =
    args.adminPassword || args.password || process.env.APP_OBSERVATORY_ADMIN_PASSWORD;
  const sessionCookie = args.sessionCookie || process.env.APP_OBSERVATORY_SESSION_COOKIE;
  const bearerToken = args.adminToken || args.token || process.env.APP_OBSERVATORY_ADMIN_TOKEN;

  if (!command || args.help || args.h || command === '--help' || command === '-h') {
    process.stdout.write(`${usage()}\n`);
    return;
  }

  if (!apiBase || (!sessionCookie && !(email && password) && !bearerToken)) {
    throw new Error(
      'Missing --api-base/--base-url/APP_OBSERVATORY_BASE_URL and admin auth. Provide --admin-email plus --admin-password, --session-cookie, or legacy --admin-token.'
    );
  }

  const auth = sessionCookie
    ? { sessionCookie }
    : email && password
      ? { sessionCookie: await login(apiBase, email, password) }
      : { bearerToken };

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
      auth,
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
        auth,
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
        auth,
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
