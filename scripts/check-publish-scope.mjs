#!/usr/bin/env node
// Release-scope gate.
//
// Why this exists: `changeset publish` publishes EVERY non-private workspace package whose local
// version is missing from the registry. The `.changeset/config.json` `ignore` list only affects
// version planning — `publishPackages()` filters on `private` alone (see
// @changesets/cli/dist/changesets-cli.cjs.js), so `ignore` cannot stop a package from being
// swept into a release. A tag-triggered job would therefore publish any package that happens to
// sit at an unpublished version.
//
// This script makes the publish set explicit: it enumerates the workspace, asks the registry
// which versions actually exist, and refuses to continue unless every unpublished package is
// accounted for — either in --expect (to be published now) or in release/holds.json (deliberately
// deferred). With --publish it publishes exactly the --expect set, so the gate and the publish
// command can never drift apart.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_REGISTRY = 'https://registry.npmjs.org';
const HOLDS_FILE = 'release/holds.json';
// Every probe is bounded: a black-holed network must fail the gate, not hang the release job.
const REGISTRY_TIMEOUT_MS = 10_000;

function fail(message, details = []) {
  console.error(`❌ ${message}`);
  for (const detail of details) console.error(`   ${detail}`);
  process.exit(1);
}

function parseArgs(argv) {
  const options = {
    expect: [],
    fromTag: null,
    plan: null,
    requireTag: null,
    registry: DEFAULT_REGISTRY,
    publish: false,
    dryRun: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--expect') options.expect.push(argv[(i += 1)]);
    else if (arg.startsWith('--expect=')) options.expect.push(arg.slice('--expect='.length));
    else if (arg === '--from-tag') options.fromTag = argv[(i += 1)];
    else if (arg.startsWith('--from-tag=')) options.fromTag = arg.slice('--from-tag='.length);
    else if (arg === '--plan') options.plan = argv[(i += 1)];
    else if (arg.startsWith('--plan=')) options.plan = arg.slice('--plan='.length);
    else if (arg === '--require-tag') options.requireTag = argv[(i += 1)];
    else if (arg.startsWith('--require-tag='))
      options.requireTag = arg.slice('--require-tag='.length);
    else if (arg === '--registry') options.registry = argv[(i += 1)];
    else if (arg.startsWith('--registry=')) options.registry = arg.slice('--registry='.length);
    else if (arg === '--publish') options.publish = true;
    else if (arg === '--dry-run') options.dryRun = true;
    else
      fail(`未知参数：${arg}`, [
        '用法：node scripts/check-publish-scope.mjs --expect <name@version> [--publish] [--dry-run]',
        '      node scripts/check-publish-scope.mjs --from-tag v0.7.0 [--publish]',
        '      node scripts/check-publish-scope.mjs --plan release/plan.json --require-tag v0.3.0 [--publish]',
      ]);
  }

  return options;
}

// A plan file declares the WHOLE publish batch in one place: CI tags trigger the run, but the
// publish set comes from the plan, so a single run can ship several differently-versioned
// packages without the gate ever accepting an undeclared package.
function readPlan(planFile) {
  const file = path.resolve(repoRoot, planFile);
  if (!fs.existsSync(file)) fail(`plan 文件不存在：${planFile}`);

  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    fail(`${planFile} 不是合法 JSON`, [String(error?.message || error)]);
  }

  const targets = parsed?.targets;
  if (!Array.isArray(targets) || !targets.length) {
    fail(`${planFile} 缺少非空的 targets 数组`, [
      'targets 应形如 ["@gaozh1024/pkg@1.2.3", ...]；发布完成后清空 targets。',
    ]);
  }
  for (const target of targets) {
    // Scoped names contain '@' (e.g. @gaozh1024/pkg@1.2.3), so split on the LAST '@'.
    const at = target.lastIndexOf('@');
    const version = at > 0 ? target.slice(at + 1) : '';
    if (at <= 0 || !target.slice(0, at) || !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version)) {
      fail(`${planFile} 的 targets 含非法条目`, [JSON.stringify(target)]);
    }
  }
  if (parsed?.tags != null && !Array.isArray(parsed.tags)) {
    fail(`${planFile} 的 tags 应为数组`);
  }

  return { targets: targets.map(item => item.trim()), tags: parsed?.tags ?? [] };
}

function readHolds() {
  const file = path.join(repoRoot, HOLDS_FILE);
  if (!fs.existsSync(file)) return [];

  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    fail(`${HOLDS_FILE} 不是合法 JSON`, [String(error?.message || error)]);
  }

  const holds = parsed?.holds;
  if (!Array.isArray(holds)) fail(`${HOLDS_FILE} 缺少 holds 数组`);

  return holds.map(entry => {
    if (!entry?.package || !entry?.version) {
      fail(`${HOLDS_FILE} 存在缺少 package/version 的条目`, [JSON.stringify(entry)]);
    }
    return {
      target: `${entry.package}@${entry.version}`,
      reason: entry.reason || '（未填写原因）',
    };
  });
}

function readWorkspaceProjects() {
  let raw;
  try {
    raw = execFileSync('pnpm', ['list', '-r', '--depth', '-1', '--json'], {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (error) {
    fail('无法枚举 workspace（pnpm list 执行失败）', [String(error?.message || error)]);
  }

  let projects;
  try {
    projects = JSON.parse(raw);
  } catch (error) {
    fail('pnpm list 输出不是合法 JSON', [String(error?.message || error)]);
  }

  // The workspace root is listed too; it is private and has no version.
  return projects.filter(project => !project.private && project.name && project.version);
}

async function probeRegistry(registry, project) {
  const base = registry.replace(/\/+$/, '');
  const url = `${base}/${encodeURIComponent(project.name)}/${project.version}`;
  let lastError = null;

  // A network failure is an unknown state, not "unpublished" — retry once, then block.
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { accept: 'application/json' },
        signal: AbortSignal.timeout(REGISTRY_TIMEOUT_MS),
      });
      if (response.status === 200) return 'published';
      if (response.status === 404) return 'unpublished';
      throw new Error(`registry 返回 HTTP ${response.status}（${url}）`);
    } catch (error) {
      lastError = error;
    }
  }

  fail(`无法判定 ${project.name}@${project.version} 的发布状态，拒绝继续`, [
    String(lastError?.message || lastError),
    `每次请求超时上限 ${REGISTRY_TIMEOUT_MS}ms，重试 1 次；超时按未知状态处理。`,
    '网络异常时不得默认按「未发布」处理，否则可能重复发布或漏判范围。',
  ]);
}

function expectedFromTag(tag, projects) {
  const version = String(tag || '').replace(/^v/, '');
  if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version)) {
    fail(`无法从 tag 解析版本号：${tag}`, ['期望形如 v0.7.0 的 tag。']);
  }

  return projects
    .filter(project => project.version === version)
    .map(project => `${project.name}@${project.version}`);
}

function diffSets(actual, expected) {
  const actualSet = new Set(actual);
  const expectedSet = new Set(expected);
  return {
    extra: [...actualSet].filter(item => !expectedSet.has(item)).sort(),
    missing: [...expectedSet].filter(item => !actualSet.has(item)).sort(),
  };
}

const options = parseArgs(process.argv.slice(2));
const projects = readWorkspaceProjects();

if (!options.expect.length && !options.fromTag && !options.plan) {
  fail('必须通过 --expect、--from-tag 或 --plan 指定本次发布目标', [
    '例：--expect @gaozh1024/rn-kit@0.7.0',
  ]);
}
if (options.requireTag && !options.plan) {
  fail('--require-tag 需要配合 --plan 使用', ['tag 白名单声明在 plan 文件的 tags 数组里。']);
}

let plan = null;
if (options.plan) {
  plan = readPlan(options.plan);
  if (options.requireTag && !plan.tags.includes(options.requireTag)) {
    fail(`tag ${options.requireTag} 不在 ${options.plan} 的 tags 白名单中`, [
      `plan.tags：${plan.tags.join(', ') || '（空）'}`,
      '若确要用该 tag 触发本次发布，先把 tag 名加进 plan 文件的 tags 数组。',
    ]);
  }
}

let expected;
if (plan) {
  expected = plan.targets;
} else if (options.fromTag) {
  expected = expectedFromTag(options.fromTag, projects);
} else {
  expected = options.expect.filter(Boolean).map(item => item.trim());
}

if (!expected.length) {
  fail(`未能解析出任何发布目标（tag：${options.fromTag ?? 'n/a'}）`, [
    '若本次 tag 对应的包版本与 tag 不一致，请改用 --expect <name@version> 显式声明。',
  ]);
}

const holds = readHolds();
const heldTargets = holds.map(hold => hold.target);
const doubled = expected.filter(target => heldTargets.includes(target));
if (doubled.length) {
  fail(`同一个包不能同时出现在 --expect 与 ${HOLDS_FILE} 中：${doubled.join(', ')}`);
}

const unknownTargets = expected.filter(
  target => !projects.some(project => `${project.name}@${project.version}` === target)
);
if (unknownTargets.length) {
  fail(`发布目标在 workspace 中不存在（或版本不匹配）：${unknownTargets.join(', ')}`, [
    'plan/expect 里的 name@version 必须与 workspace package.json 完全一致。',
  ]);
}

const states = await Promise.all(projects.map(project => probeRegistry(options.registry, project)));
const unpublished = projects
  .filter((_, index) => states[index] === 'unpublished')
  .map(project => `${project.name}@${project.version}`);
const { extra, missing } = diffSets(unpublished, [...expected, ...heldTargets]);

console.log(`registry：${options.registry}`);
if (plan) console.log(`plan 文件：${options.plan}（tags：${plan.tags.join(', ') || '（无）'}）`);
console.log(
  `workspace 非私有包：${projects.length} 个（已发布 ${projects.length - unpublished.length} 个）`
);
console.log(`本次发布：${expected.slice().sort().join(', ') || '（无）'}`);
if (holds.length) {
  console.log(`本次按住（${HOLDS_FILE}）：`);
  for (const hold of holds) console.log(`  - ${hold.target}：${hold.reason}`);
}

if (extra.length || missing.length) {
  const details = [];
  if (extra.length) {
    details.push(`registry 上尚无、但既不在发布目标也不在 holds 中：${extra.join(', ')}`);
    details.push('这些包会被「全仓 publish」扫出去。要么把它们声明为本次发布目标，要么在');
    details.push(`${HOLDS_FILE} 里显式登记为按住（写明原因），不得默认忽略。`);
  }
  const missingPublish = missing.filter(target => expected.includes(target));
  const staleHolds = missing.filter(target => heldTargets.includes(target));
  if (missingPublish.length) {
    details.push(`声明要发布，但 registry 上已存在该版本：${missingPublish.join(', ')}`);
    details.push('版本号可能没有 bump，或该包已在别处发布过。');
  }
  if (staleHolds.length) {
    details.push(`holds 中登记的版本已在 registry 上：${staleHolds.join(', ')}`);
    details.push(`${HOLDS_FILE} 存在失效条目，请删除后重跑。`);
  }
  fail('发布范围与声明不一致，已中止', details);
}

console.log(
  `✅ 发布范围精确匹配：发布 ${expected.join(', ') || '（无）'}${holds.length ? `；按住 ${heldTargets.join(', ')}` : ''}`
);

if (options.publish) {
  for (const target of expected.slice().sort()) {
    const project = projects.find(item => `${item.name}@${item.version}` === target);
    // Pass the same --registry the gate probed. Without it the check could pass against a
    // mirror while the publish silently lands on the default registry.
    const args = [
      'publish',
      '--access',
      'public',
      '--no-git-checks',
      '--registry',
      options.registry,
    ];
    if (options.dryRun) args.push('--dry-run');

    console.log(`\n▶ pnpm ${args.join(' ')}  (cwd: ${path.relative(repoRoot, project.path)})`);
    try {
      execFileSync('pnpm', args, { cwd: project.path, stdio: 'inherit' });
    } catch (error) {
      // Publishing is not transactional: earlier packages in the loop are already on the
      // registry. Stop loudly and make the operator check the real state by hand.
      fail(`发布 ${target} 失败，已中止`, [
        error?.status != null ? `pnpm 退出码：${error.status}` : String(error?.message || error),
        '已成功发布的包不会自动回滚，请先核对 registry 上的实际版本再决定是否重跑。',
      ]);
    }
  }

  console.log(`\n✅ 已发布：${expected.join(', ')}`);
}
