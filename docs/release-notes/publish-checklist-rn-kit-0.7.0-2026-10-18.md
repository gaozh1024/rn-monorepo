# rn-kit 0.7.0 发布方案 v15（npm README 兼容范围 + 门禁 registry/超时加固；放行执行）

> Date: 2026-10-18
> 状态：**放行执行**。v14 已复核通过；发布前复审又发现 1×P1 + 2×P2 + 3 项低优先级，v15 处置（标 🔧¹⁵）：
> ① **P1 npm README 仍宣传旧范围**：`packages/rn-kit/README.md` 写 `0.6.x` / `expo <56` / `RN <0.84`，与 package peer（`>=54 <58` / `>=0.81 <0.87`）、AI 文档、0.7.0 发版说明全部冲突 → 按实际 peer 重写兼容性段落，并补"验证基线 SDK 55 / 54 未复验 / 56·57 无真机证据"的诚实声明。同类残留：模板 README 的 `rn-kit 0.6.x` 一并对齐（模板 package.json 已是 `^0.7.0`）。
> ② **P2 `--registry` 只用于查询**：门禁查的是自定义 registry，`pnpm publish` 却会落到默认 npm → 发布命令补 `--registry <同一 registry>`，并用 stub 实测证明 pnpm 真的把包推往该 registry。
> ③ **P2 registry 查询无超时**：`fetch` 无 `AbortSignal`，网络黑洞会让发布工作流挂死 → 每次请求 10s 超时、重试 1 次，超时按"未知状态"fail-closed。
> ④ 低优先级：清单执行流程标题 v13 → v14；两个脚本补过 Prettier；`docs/README.md` 删除指向已迁出包的 `packages/rn-observatory/README.md` 死链。
> v14 已处置（回顾，详见 §修订历史 v13 → v14）：发布范围门禁 `check-publish-scope` + `release/holds.json`（photo-picker 0.3.1 按住不发）；AI 生成器改走仓库自身 Prettier；发版说明按验证基线 SDK 55 重写。
> 关联：吾滴侧升级方案 `/Users/gzh/Projects/wudi/wudi/docs/开发设计/38-Expo-SDK57升级设计方案.md` §6.1 / §6.6 / §7。⚠️ 38 号文档目标版本写的是 `expo@57.0.27`，**npm registry 无此版本（实测 E404）**，57 线最新为 **57.0.26**（RN 0.86.3）——38 号文档需在 mobile 侧先行勘误并 grep 验证（见 §mobile 侧联动）。

## Package

- Package: `@gaozh1024/rn-kit`
- Version: `0.6.6` → **`0.7.0`**（minor：peer 范围放宽属兼容性扩展）
- Access: public
- 🔧¹⁴ Publish scope & 路径：**对齐实际 CI 工作流**（`.github/workflows/release.yml`，tag `v*` 触发：`pnpm install --frozen-lockfile` → `pnpm verify:release` → **`check:publish-scope`** → 按门禁结果发布 → GitHub Release）。v4 的"本地 `pnpm release`"仅为 CI 不可用时的降级路径。**注意：`.changeset/config.json` 的 `ignore` 只作用于版本规划，`changeset publish` 不读它**，发布面由 `check-publish-scope` 单独守（见 §P1-1 处置决策记录）
- 分支：`release/rn-kit-0.7.0`，复核通过后由 §执行流程 第 0 步创建（基于 `main` @ `ed1952b`）
- 🔧¹⁵ npm 页面内容：`files` 白名单含 `README.md`，包页面上展示的就是仓库里的这份 README，因此它的兼容范围必须与 `peerDependencies` 一致（v15 已修正：旧文案还停留在 `0.6.x` / `expo <56` / `RN <0.84`）

## 为什么发版（审核要点 1）

两个事实（2026-10-18 盘点）：

1. **runOnJS 修复已在源码里但从未发版**：`bf35abe`（2026-09-16）给以下两处 `Gesture.Pan()` 补了 `.runOnJS(true)`：
   - `packages/rn-kit/src/ui/motion/hooks/useSheetMotion.ts:207`
   - `packages/rn-kit/src/ui/actions/SwipeActionRow.tsx:164`

   npm `latest` 仍是 0.6.6（早于该提交），吾滴 mobile 侧靠 patch 续命（路径见 §mobile 侧联动）。本地 `dist/` 产物已验证均含 `runOnJS(true)` ×2——**代码零改动，只差版本号与发布**。

2. **peer 范围锁死 Expo 57 升级**：`expo >=54 <56`、`react-native >=0.81 <0.84`。吾滴升 Expo 57 时 `npm install expo@57` 会直接 ERESOLVE 失败。不放开 peer，38 号方案第一步就走不通。

## Release Scope（本版全部内容）

1. `packages/rn-kit/package.json`：version → 0.7.0（changeset version 自动）+ **peerDependencies 四字段手改**（changesets 不会按 summary 改 peer，显式修改并校验）
2. 收编 `bf35abe` runOnJS 修复（随 build 产物自然带出，无源码改动）
3. changesets ignore **临时**配置（收敛 release plan；发布确认后 revert，见 §P0-2 处置决策与第 12 步）。⚠️ 它只影响 plan，不影响发布面
4. 模板 `templates/expo-starter` 依赖范围 `^0.6.1` → `^0.7.0`（0.x caret 语义：`^0.6.1` = `>=0.6.1 <0.7.0`，不自动兼容 0.7.0）+ lockfile 同步。🔧⁵ **时序移到 `version-packages` 之后**（workspace rn-kit 变为 0.7.0 后才满足 `^0.7.0`，避免 lockfile 与 workspace 不一致导致 CI `--frozen-lockfile` 失败）
5. 文档与 AI 侧：release note、docs/README 链接、`ai/overrides/rn-kit.json` **两处**（🔧⁵ `requiredProjectSetup` + `compatibilityNotes`，实测后者仍有 3 条旧范围声明）、`ai:generate` 全量刷新
6. 🔧⁶ CI 门禁增强：`verify:release` 并入 `ai:check`（**只读校验**；不用 `ai:verify`——它含 generate，会令 CI 静默生成未提交产物后继续发布。生成由本地第 8 步完成并随 PR 提交）
7. 🔧¹⁴ **发布范围显式化**：新增 `scripts/check-publish-scope.mjs`（枚举 workspace → 查 registry → 断言每个未发布包都被显式声明为「发布」或「按住」）+ `release/holds.json`（按住登记，含原因）；CI 发布步骤改为「门禁 + 按门禁结果发布」，`release` 脚本同样改为门禁驱动。photo-picker 0.3.1 本次按住，待其独立发版时删除 holds 条目

## 执行流程（v15，整块粘贴执行；分步执行见块首 `set -euo pipefail` 说明）

```bash
# 🔧¹⁰ 全块 fail-fast：任一命令失败立即中止（否则 Node 的 process.exit(1) 只退出 Node 进程，
#      父 shell 会继续执行后续步骤，发布门禁形同虚设）。
# ⚠️ 注意：set 只在当前 shell 生效——若你按步骤分段粘贴到**新开**终端，需各自重新执行本行，
#          或整块一次性粘贴执行（推荐后者，门禁语义最完整）。
set -euo pipefail

# ── 第 0 步：建分支 + 环境校验 ──
git switch main && git pull
git rev-parse --short HEAD        # 期望 ed1952b
git status --short                # 期望除本清单外无未提交变更
git switch -c release/rn-kit-0.7.0

# ── 第 1 步：changesets ignore 临时配置（P0-2，生命周期见第 12 步）──
# .changeset/config.json 增补（临时配置，发布确认后必须 revert）：
#   "ignore": ["@gaozh1024/hot-updater", "@gaozh1024/expo-starter"]
# 🔧¹⁰ 改为显式门禁（裸 `jq -r '.ignore[]'` 在字段缺失时只抛 "Cannot iterate over null" 且无中文提示）：
test "$(jq -r '.ignore // [] | length' .changeset/config.json)" = "2" \
  || { echo "❌ .changeset/config.json 的 ignore 未配置两项，中止"; exit 1; }
jq -r '.ignore[]' .changeset/config.json
# 期望逐行输出：@gaozh1024/hot-updater、@gaozh1024/expo-starter

# ── 第 2 步：手写两个 changeset 文件 ──
cat > .changeset/rn-kit-0-7-0-runonjs.md <<'EOF'
---
'@gaozh1024/rn-kit': minor
---

收编 `bf35abe` runOnJS 手势修复（随构建产物带出，源码行为与 0.6.6+patch 一致）。
EOF
cat > .changeset/rn-kit-0-7-0-peer-widen.md <<'EOF'
---
'@gaozh1024/rn-kit': minor
---

peerDependencies 放宽：`expo` / `react-native` / `expo-image` / `expo-linear-gradient` 上限提高，无 breaking。
EOF
# ⚠️ 实测记录（2026-10-18）：`pnpm changeset add` 参数式在本仓 @changesets/cli 下不可用
# （--help 也被忽略，直接进交互式 prompt），交互式仅作人工 UI 备选，不入清单步骤。
# 🔧⁶ 目录清点（硬门禁：计数 + 定名文件双重校验，失败即中止）：
test "$(find .changeset -maxdepth 1 -name '*.md' ! -name 'README.md' | wc -l | tr -d ' ')" -eq 2 \
  && test -f .changeset/rn-kit-0-7-0-runonjs.md \
  && test -f .changeset/rn-kit-0-7-0-peer-widen.md \
  && echo "✅ changeset 目录恰好两个定名文件" || { echo "❌ changeset 数量/命名异常，中止"; exit 1; }

# ── 第 3 步：手改 peerDependencies（changesets 不会替你改 peer）──
# 编辑 packages/rn-kit/package.json，按 §peer 决策表第一档修改四个字段：
#   "expo":                 ">=54 <56" → ">=54 <58"
#   "react-native":         ">=0.81 <0.84" → ">=0.81 <0.87"
#   "expo-image":           ">=3 <56" → ">=3 <58"
#   "expo-linear-gradient": ">=15 <56" → ">=15 <58"
jq -r '.peerDependencies | ."expo", ."react-native", ."expo-image", ."expo-linear-gradient"' packages/rn-kit/package.json
# ⚠️ 上一行仅用于人眼过目，不构成门禁。🔧⁹ 以下才是 fail-fast 断言（未改到新值即中止）：
node - <<'EOF'
const p = require('./packages/rn-kit/package.json').peerDependencies;
const expected = {
  expo: '>=54 <58',
  'react-native': '>=0.81 <0.87',
  'expo-image': '>=3 <58',
  'expo-linear-gradient': '>=15 <58',
};
let bad = 0;
for (const [name, value] of Object.entries(expected)) {
  if (p[name] !== value) {
    console.error(`❌ ${name}: expected "${value}", got "${p[name]}"`);
    bad = 1;
  }
}
if (bad) { console.error('❌ peerDependencies 未按决策表修改，中止'); process.exit(1); }
console.log('✅ peerDependencies 四字段范围正确');
EOF

# ── 第 4 步：文档与 AI 侧（changeset version 不会生成这些）──
# 4a. 新建 docs/release-notes/rn-kit-0.7.0.md（含 no-breaking 声明，见 §变更明细 #5）
# 🔧¹⁰ 补显式提示（set -e 下裸 test/grep 失败会静默中止，看不出哪一步挂了）：
test -f docs/release-notes/rn-kit-0.7.0.md \
  || { echo "❌ docs/release-notes/rn-kit-0.7.0.md 不存在，请先创建"; exit 1; }
echo "✅ release note 存在"
# 4b. docs/README.md 增补 0.7.0 发版说明与本清单链接
# 🔧¹¹ ⚠️ 不可用 `grep "a\|b"`：macOS BSD grep 的 BRE 不支持 `\|` 交替，会把它当**字面量**
#      （实测：`grep "a\|b"` 匹配的是文本 `a|b`），导致链接明明正确也 exit 1，再被 set -e 中止。
#      改 `grep -E` 或拆成两条独立 `grep -q`——后者更严：两处链接**分别**校验，缺一即停。
grep -q 'rn-kit-0\.7\.0' docs/README.md \
  || { echo "❌ docs/README.md 未链接 0.7.0 发版说明（docs/release-notes/rn-kit-0.7.0.md）"; exit 1; }
grep -q 'publish-checklist-rn-kit-0\.7\.0' docs/README.md \
  || { echo "❌ docs/README.md 未链接本清单（publish-checklist-rn-kit-0.7.0-*）"; exit 1; }
grep -En 'rn-kit-0\.7\.0|publish-checklist-rn-kit-0\.7\.0' docs/README.md   # 人眼过目：应命中两处
echo "✅ docs/README.md 两处链接齐全"
# 4c. ai/overrides/rn-kit.json 两处更新（🔧⁵ 由 1 处扩为 2 处，缺一 ai:generate 后仍带旧范围）：
#   ① requiredProjectSetup："For Expo SDK 54 ... for Expo SDK 55 ..." → 覆盖 54–57（57 用 RN 0.86.3 原生依赖集）
#   ② compatibilityNotes 前 3 条（实测仍为旧范围，必须改）：
#      - "Current compatibility guidance targets Expo >=54 <56 and React Native >=0.81 <0.84."
#        → "... targets Expo >=54 <58 and React Native >=0.81 <0.87."
#      - "Expo SDK 54 maps to React Native 0.81; Expo SDK 55 maps to React Native 0.83."
#        → 追加 "；Expo SDK 57 maps to React Native 0.86 (requires rn-kit >=0.7.0)."
#      - "Use react-native-worklets 0.5.x on Expo SDK 54 and 0.7.x on Expo SDK 55 through expo install."
#        → 🔧⁸ 重写整句（不可用"追加"——旧句保留会被下方 fail-fast 门禁命中）：
#          🔧⁹ 不得给未验证的 SDK 56 写确定映射（与 §残余风险声明冲突），新句为：
#          "Use react-native-worklets 0.5.x on Expo SDK 54, 0.7.x on Expo SDK 55, and the RN 0.86.3
#           native dependency set on Expo SDK 57 via expo install. Expo SDK 56 (RN 0.85) is covered
#           by the supported range but not yet verified."
#          （即：55/57 给确定版本映射，56 显式声明"范围内但未验证"）
# 🔧⁶ 旧范围硬门禁（覆盖 peer 数字 + worklets/SDK55 旧文案 + 文件存在性，失败即退出）：
test -f ai/overrides/rn-kit.json || { echo "❌ override 文件不存在"; exit 1; }
if rg -q '>=54 <56|>=0\.81 <0\.84|0\.5\.x on Expo SDK 54 and 0\.7\.x on Expo SDK 55 through expo install' ai/overrides/rn-kit.json; then
  echo "❌ 仍存在旧范围文案，中止"; exit 1
else
  echo "✅ 旧范围已清零（requiredProjectSetup + compatibilityNotes 双覆盖）"
fi
# 4d. （ai:generate 推迟到第 8 步，version-packages 之后跑才能带上 0.7.0 版本号）

# ── 第 5 步：release plan 门禁 ──
pnpm changeset status --verbose
# 期望输出（人眼过目）：
#   patch:   NO packages
#   minor:   @gaozh1024/rn-kit 0.7.0（两个 changeset 文件）
#   major:   NO packages
# 🔧¹⁰ 精确断言改造（--output 已实测可用）。三个已实测的坑：
#   ① `pnpm changeset status` 失败必须显式 `|| exit 1`，否则旧代码会继续拿老文件断言；
#   ② 固定路径 /tmp/rn-kit-plan.json 会读到上一次运行的陈旧结果 → 用 mktemp 唯一文件；
#   ③ ⚠️ macOS BSD mktemp **不支持**「XXXXXX 后带后缀」（`mktemp /tmp/x.XXXXXX.json` 会原样
#      返回字面量路径，等于没隔离），故模板不加 .json 后缀，改用 fs.readFileSync 解析。
#   另：ignore 生效后被忽略包会以 type:"none" 出现在 releases 中，必须先过滤 none，
#      否则正确配置下也会误判失败（实测确认）。
plan_file="$(mktemp "${TMPDIR:-/tmp}/rn-kit-plan.XXXXXX")"
trap 'rm -f "${plan_file:-}"' EXIT     # 无论成功失败都清理；`:-` 防止 set -u 下未赋值报错
pnpm changeset status --output="$plan_file" >/dev/null 2>&1 \
  || { echo "❌ changeset status 执行失败（changeset 文件缺失或 config 损坏）"; exit 1; }
test -s "$plan_file" || { echo "❌ release plan 输出为空或未生成：$plan_file"; exit 1; }
node -e '
const fs = require("fs");
const all = JSON.parse(fs.readFileSync(process.argv[1], "utf8")).releases;
const bumped = all.filter(r => r.type !== "none").map(r => r.name + "@" + r.newVersion + " " + r.type).sort();
const want = ["@gaozh1024/rn-kit@0.7.0 minor"];
const frozen = all.filter(r => r.type === "none").map(r => r.name + "@" + r.oldVersion).sort();
const wantFrozen = ["@gaozh1024/expo-starter@0.3.2", "@gaozh1024/hot-updater@0.2.0"];
let bad = false;
if (JSON.stringify(bumped) !== JSON.stringify(want)) {
  console.error("❌ 待发布包不符（多余包 = ignore 未生效或误带其他 changeset）");
  console.error("   got :", bumped); console.error("   want:", want); bad = true;
}
if (JSON.stringify(frozen) !== JSON.stringify(wantFrozen)) {
  console.error("❌ 被忽略包版本异常（ignore 未生效或已被动过）");
  console.error("   got :", frozen); console.error("   want:", wantFrozen); bad = true;
}
if (bad) process.exit(1);
console.log("✅ release plan 精确匹配：仅 rn-kit 0.7.0 minor；两包保持 0.3.2 / 0.2.0 未动");
' "$plan_file"
# 实测留痕（2026-10-18，六项全验）：
#   有 ignore → exit 0；去掉 ignore → exit 1（打印 expo-starter@0.3.3 patch / hot-updater@1.0.0 major）
#   损坏 config → 命中 "changeset status 执行失败" 分支 exit 1
#   预置脏 /tmp/rn-kit-plan.json → 仍 exit 0（证明未读旧文件）
#   node 失败后后续 echo 未执行（set -e 生效）；trap 清理后无临时文件残留

# ── 第 6 步：消费 changeset → 版本号与 CHANGELOG ──
pnpm version-packages
# 期望：rn-kit version=0.7.0；CHANGELOG 顶部 "## 0.7.0 / ### Minor Changes" 下两条 bullet（每文件一条）
# 期望：两个 .changeset/*.md 已被消费删除（消费后不存在属预期）
# 期望：忽略中的 hot-updater / expo-starter 版本未动（git status 核对）

# ── 第 7 步：模板依赖范围（🔧⁵ 移到 version-packages 之后：此时 workspace rn-kit 已是 0.7.0）──
# templates/expo-starter/package.json: "@gaozh1024/rn-kit": "^0.6.1" → "^0.7.0"
pnpm install --lockfile-only      # 只同步 lockfile，不触发实际安装解析
git diff --stat pnpm-lock.yaml    # 确认变更仅为该 importers 的 specifier
pnpm install --frozen-lockfile    # 模拟 CI 校验，必须通过（否则 release.yml 会挂）

# ── 第 8 步：AI 产物全量刷新 ──
pnpm ai:generate                  # 会同时更新根 llms.txt 与各包 AI 文件
pnpm ai:check
# 🔧¹⁴ P1-2 格式一致性门禁：生成器已用仓库自身 Prettier 配置输出，此处独立复核。
#   缺了这一步，pre-commit 的 `prettier --write` 会改写 AI 文件，提交后 CI 的 ai:check 必红。
#   llms.txt 无 Prettier parser，不纳入（也不在 lint-staged 的 *.md/*.json 匹配内）。
pnpm exec prettier --check "packages/*/AI_USAGE.md" "packages/*/ai-manifest.json" \
  "templates/*/AI_USAGE.md" "templates/*/ai-manifest.json" \
  || { echo "❌ 生成产物不符合 Prettier 格式，提交后会被改写并使 CI ai:check 失败"; exit 1; }
echo "✅ AI 产物与 Prettier 格式一致"
git diff --stat                   # 人工过目波及面，超出 rn-kit 相关文件需说明
# 🔧⁷ 提交前工作区检查（P2-5：人工核对，非自动白名单断言）：
git diff --check
git status --short                # 逐行过目：仅预期文件（变更明细 #1-#10、#13-#14）为 M/A；发现意外文件先说明再继续

# ── 第 9 步：CI 门禁增强 + 本地验证 ──
# 9a. 根 package.json 的 verify:release 末尾追加 "&& pnpm ai:check"
#     🔧⁶ 修正：CI 只跑只读的 ai:check（不跑 ai:verify——它含 ai:generate，会在 CI
#     工作区静默生成未提交的 AI 文件后继续发布，无法证明 tag 中提交的产物是最新的）。
#     生成责任在第 8 步本地完成并随 PR 提交；CI 的 ai:check 只验证"已提交产物是否最新"。
# 🔧⁷ 结构化断言（P2-3：可靠校验 verify:release 已并入只读 ai:check）：
node -e "const p=require('./package.json'); const s=p.scripts['verify:release']; if (!s.includes('pnpm ai:check') || s.includes('ai:verify')) { console.error('❌ verify:release 未正确并入只读 ai:check'); process.exit(1) }" && echo "✅ verify:release 门禁正确"
# 9b. 本地全量验证（见 §Verification 清单）
# 9c. 🔧¹⁴ **发布范围门禁**（打 tag 前必跑）：每个未发布包必须被显式声明
#      ——「发布」= --expect / --from-tag；「按住」= release/holds.json（photo-picker 0.3.1 已在其中）
pnpm check:publish-scope --expect @gaozh1024/rn-kit@0.7.0
# 期望：✅ 发布范围精确匹配：发布 @gaozh1024/rn-kit@0.7.0；按住 @gaozh1024/photo-picker@0.3.1
# 若报「既不在发布目标也不在 holds 中」→ 出现了新的未发布包（例如某包被 bump 未发），先判定处置：
#   要发 → 加入本次目标（并同步发版说明）；按住 → 在 release/holds.json 登记并写明原因。
# 若报「holds 中登记的版本已在 registry 上」→ 该 hold 已失效，删除条目后重跑。
# ⚠️ 该门禁**不并入 verify:release**：发布完成后 rn-kit 0.7.0 已存在，若并进去，后续任何 PR 的
#    verify:release 都会因 photo-picker 仍待发而变红——它只在发布路径上跑（本地第 9c 步 + CI 的 publish job）。

# ── 第 10 步：发布（对齐实际工作流：tag 触发 CI）──
git add -A && git commit -m "release: rn-kit 0.7.0 (peer widen + runOnJS)"
git push -u origin release/rn-kit-0.7.0
# → PR → 复核合并进 main
# 🔧⁶ P1-1 硬门禁：tag 必须打在"合并后的 main"上，严禁在 release 分支上打 tag
git switch main
git pull --ff-only
merge_commit="$(git rev-parse --short HEAD)"
echo "merge commit: $merge_commit"   # 回填清单留痕
# 🔧⁷ 真断言（非注释）：未检测到 PR 合并提交即中止，不会继续执行 git tag
test "$merge_commit" != "ed1952b" || { echo "❌ 未检测到 PR 合并提交，禁止打 tag"; exit 1; }
# 🔧⁸ P1-1 修正：不以 merge-base 祖先关系做校验（squash/rebase merge 下 release 分支
# 原始 commit 不是 main 祖先，会误拦）。PR 合并方式不限，改以 main 上的实际内容为断言：
test "$(node -p "require('./packages/rn-kit/package.json').version")" = "0.7.0" \
  || { echo "❌ main 上 rn-kit 版本不是 0.7.0，PR 未生效，禁止打 tag"; exit 1; }
echo "✅ main 已包含 0.7.0，允许打 tag"
git tag v0.7.0 && git push origin v0.7.0
# CI 自动：pnpm install --frozen-lockfile → verify:release（含 ai:check）→ check:publish-scope
#          （--from-tag，断言只有 rn-kit@0.7.0 未发布）→ 按门禁结果发布（仅 rn-kit）→ GitHub Release
# （降级路径：CI 不可用时本地 `pnpm release --expect @gaozh1024/rn-kit@0.7.0`，
#   事后补 tag 与 GitHub Release。`release` 脚本已改为门禁驱动，无 --expect 会直接报错退出，不会误发全仓）

# ── 第 11 步：Post-publish Verification ──
npm view @gaozh1024/rn-kit@0.7.0 version                   # → 0.7.0
npm view @gaozh1024/rn-kit@0.7.0 peerDependencies --json   # → 核对新 peer 表
npm view @gaozh1024/hot-updater version                    # → 仍 0.2.0（未被连带）
npm view @gaozh1024/expo-starter version                   # → 仍 0.3.2（未被连带）
npm view @gaozh1024/photo-picker version                   # → 仍 0.3.0（🔧¹⁴ 未被连带扫出，本次按住不发）

# ── 第 12 步：ignore 临时配置 revert（🔧⁶ 生命周期收口，改为明确小 PR，不用占位符/脚本 fallback）──
# 发布确认后，在 main 上开 revert 小 PR：
git switch main && git pull --ff-only
git switch -c chore/remove-changeset-ignore
# 编辑 .changeset/config.json：仅删除 "ignore": [...] 两行数组项，其余不动
test "$(jq -r '.ignore // empty' .changeset/config.json)" = "" \
  && echo "✅ ignore 已移除" || { echo "❌ ignore 仍存在，revert 未完成"; exit 1; }
git diff .changeset/config.json                        # 期望 diff 仅为删除 ignore 字段
git add .changeset/config.json && git commit -m "chore: remove temporary changeset ignore after rn-kit 0.7.0 release"
# → PR 合并 main
# ⚠️ 治理约束：hot-updater / expo-starter 未来发 changeset 前，必须先确认 ignore 已移除
```

### P0-2 处置决策记录（连带发布问题）

| 方案                                      | 内容                                                                                                                           | 判断                                                                                                                                                                                                                                                                    |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A. ignore 临时配置**（✅ 采纳，已实证） | `.changeset/config.json` 增 `ignore: ["@gaozh1024/hot-updater", "@gaozh1024/expo-starter"]`，**发布确认后 revert**（第 12 步） | 实测 release plan 收敛为仅 rn-kit 0.7.0 minor。hot-updater 的 peer 上界开放（`>=0.4.20`）本就覆盖 0.7.0，major bump 无实质必要，纯属 changesets 对 peer 依赖方的默认策略。🔧⁵ 终审要求的生命周期已补：明确为**临时配置** + revert 步骤 + 治理约束，不留"复盘决定"模糊态 |
| B. 三包全部纳入发布                       | 接受 expo-starter 0.3.3 + **hot-updater 1.0.0 major**                                                                          | ❌ 一条 peer 上界微调被打成 1.0.0 major，语义失真且发布面失控                                                                                                                                                                                                           |
| C. 绕开 changesets 拆开发布               | rn-kit 走独立 publish                                                                                                          | ❌ 退回 v1 已否决的绕过 Changesets 路径                                                                                                                                                                                                                                 |

### P1-1 处置决策记录（发布范围：photo-picker 0.3.1 连带问题）

**实证前提（源码 + registry 双查）**：

1. `@changesets/cli` 的 `publishPackages()` 里只有 `const publicPackages = packages.filter(pkg => !pkg.packageJson.private)`，随后 `getUnpublishedPackages(publicPackages)` 按「本地版本是否在 registry 版本列表里」筛选——**`ignore` 全程未参与**。故 `.changeset/config.json` 的 `ignore` 能让 plan 收敛为单包，却拦不住发布。
2. registry 实查：`@gaozh1024/photo-picker` 最新为 **0.3.0**，本仓已是 **0.3.1**（`ed1952b` 已备好 release note / CHANGELOG / dist）。因此根目录 `changeset publish` 会把它一并发布。

**方案对比（已选定 B）**：

| 方案                                                | 内容                                                                                                                                                                                                                                                   | 判断                                                                                                                             |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| A. 先补发 photo-picker 0.3.1                        | 单独 scoped publish 后再发 rn-kit                                                                                                                                                                                                                      | ⚠️ 可行但不可取：把未经本轮复核的包先推上线；且「打 tag 扫全仓」的隐患原样保留                                                   |
| **B. 只发 rn-kit，发布步骤改为门禁驱动**（✅ 采纳） | 新增 `scripts/check-publish-scope.mjs`：枚举 workspace → 查 registry → **要求每个未发布包都是「发布目标」或 `release/holds.json` 里显式按住的条目**，未声明即中止；`--publish` 时只发布目标集合。CI 的 `changeset publish` 由「门禁 + 按门禁发布」替代 | 发布面从"隐式全仓"变成"显式声明"，photo-picker 保持待发，不引入额外上线风险；同时消掉「任何 tag 都会扫掉所有未发包」的系统性隐患 |
| C. 接受本次连带两个包                               | 门禁期望值改为两个包                                                                                                                                                                                                                                   | ❌ 发布面扩大到未经复核的包，且与"本次只发 rn-kit"的定位冲突                                                                     |

**实现要点**：

- `scripts/check-publish-scope.mjs` 支持 `--expect <name@version>`（可重复）或 `--from-tag vX.Y.Z`（取 workspace 中版本等于 X.Y.Z 的包），`--publish` 时按断言结果逐包 `pnpm publish --access public --no-git-checks`，`--dry-run` 可空跑。
- **`release/holds.json` 是按住登记表**：每个条目含 `package` / `version` / `reason` / `since`。门禁要求「未发布集合 == 发布目标 ∪ holds」，两个方向都 fail-fast：
  - 出现未声明的未发布包 → 中止（不许默认忽略）；
  - holds 里的版本已出现在 registry → 中止（条目失效，必须删除）。
    这样"按住"是一次可评审的显式决定，而不是沉默地漏掉。
- **网络异常一律中止**：registry 返回 5xx / 请求失败重试一次后 `exit 1`，绝不把"查不到"当成"未发布"。
- 门禁**不并入** `verify:release`：发布完成后 rn-kit 已存在，若并进去，后续任何 PR 都会因 photo-picker 待发而变红。它只出现在发布路径（第 9c 步 + CI publish job）。
- `release` 脚本由 `pnpm build && changeset publish` 改为 `pnpm build && node scripts/check-publish-scope.mjs --publish`——**无 `--expect`/`--from-tag` 时直接报错退出**（fail-closed，保留的降级路径不再可能误发全仓）。
- CI 里 `Create Release` 从 publish 之前移到之后：publish 失败不应留下一个"看起来已发布"的 GitHub Release。
- 代价：不再依赖 `changeset publish` 打 `<pkg>@<version>` git tag。本仓此前无任何 per-package tag（`git tag --list` 为空），发布版本标识由 `v*` tag + GitHub Release 承担，语义无损失。
- 实测（本地 stub registry，6 个非私有包）：`expect=rn-kit` + `holds=photo-picker@0.3.1` → exit 0；出现未声明的未发包（`aliyun-push`）→ exit 1 并点名；hold 失效（photo-picker 0.3.1 已发布）→ exit 1；目标版本已存在 → exit 1；非法 tag → exit 1；无目标参数 → exit 1；registry 5xx → exit 1；`--publish --dry-run` 仅对 `packages/rn-kit` 触发一次 `pnpm publish`（tarball 内容正常）。

## 变更明细（审核要点 2：逐文件）

| #   | 文件                                                                                                                               | 改动                                                                                                                                                                                                                                                                                                                                                                                                         | 来源                                            |
| --- | ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------- |
| 1   | `.changeset/rn-kit-0-7-0-runonjs.md` + `.changeset/rn-kit-0-7-0-peer-widen.md`                                                     | 两个手写 changeset（minor ×2，version-packages 消费后删除属预期）                                                                                                                                                                                                                                                                                                                                            |                                                 |
| 2   | `.changeset/config.json`                                                                                                           | 增 `ignore` 两包——**临时配置**，发布确认后 revert（第 12 步）                                                                                                                                                                                                                                                                                                                                                | 🔧⁵ 补生命周期（P1-3）                          |
| 3   | `packages/rn-kit/package.json`                                                                                                     | version → 0.7.0（自动）；peer 四字段手改（第 3 步 + jq 校验）                                                                                                                                                                                                                                                                                                                                                |                                                 |
| 4   | `packages/rn-kit/CHANGELOG.md`                                                                                                     | changeset 生成 `0.7.0` 条目：`### Minor Changes` 小节内两条 bullet，不手写                                                                                                                                                                                                                                                                                                                                   |                                                 |
| 5   | `docs/release-notes/rn-kit-0.7.0.md`                                                                                               | 新建；含 breaking 判断："无 breaking；peer 上限放宽属兼容扩展，但需消费方升级到相应 Expo/RN 版本才能享受"。🔧¹⁴ 兼容性段落重写：基线 SDK 55 已验证（108 文件 / 549 用例）、SDK 54 未复验、SDK 57 真机回归在发布后、SDK 56 无证据                                                                                                                                                                             | 🔧¹⁴ 修正（P2）                                 |
| 6   | `docs/README.md`                                                                                                                   | 链接 0.7.0 发版说明与本清单；🔧¹⁵ 删除第 8 行 `@gaozh1024/rn-observatory` 表格行（其 README 指向已迁出本仓的 `packages/rn-observatory/README.md`，死链）                                                                                                                                                                                                                                                     | 🔧¹⁵ 存量残留                                   |
| 7   | `ai/overrides/rn-kit.json`                                                                                                         | 🔧⁵ **两处**更新：`requiredProjectSetup`（54/55 → 54–57）+ `compatibilityNotes` 前 3 条旧范围（`>=54 <56` / `>=0.81 <0.84` / worklets 映射，实测确认存在），缺一则 ai:generate 后 manifest/AI_USAGE 仍带旧范围                                                                                                                                                                                               | 🔧⁵ 扩面（P1-2）                                |
| 8   | `templates/expo-starter/package.json` + `pnpm-lock.yaml`                                                                           | `^0.6.1` → `^0.7.0` + `pnpm install --lockfile-only` 同步 + `--frozen-lockfile` 校验；npm 侧模板版本仍 0.3.2，旧范围随模板下次发版自然更新                                                                                                                                                                                                                                                                   | 🔧⁵ 时序修正（P1-1）                            |
| 9   | 根 `package.json`                                                                                                                  | `verify:release` 脚本末尾追加 `&& pnpm ai:check`（🔧⁶ 只读校验；`ai:verify` 含 generate 会在 CI 静默改工作区，弃用。生成由第 8 步本地完成并提交）                                                                                                                                                                                                                                                            | 🔧⁶ 修正（P2，CI 无 ai:check 且不能引入写操作） |
| 10  | 根 `llms.txt` 等其余 AI 产物                                                                                                       | 由 `pnpm ai:generate` 批量刷新，`git diff --stat` 过目                                                                                                                                                                                                                                                                                                                                                       |                                                 |
| 11  | 源码 `src/**`                                                                                                                      | **零改动**                                                                                                                                                                                                                                                                                                                                                                                                   |                                                 |
| 12  | `scripts/generate-ai-artifacts.mjs`；根 `package.json` 的 `verify:release`；`ai/overrides/rn-observatory.json`                     | 🔧¹³ **执行中发现并修复的存量缺陷**：`packages/rn-observatory` 已在祖先提交 `ee33b85` 迁出本仓，但生成脚本 `packageTargets`、`verify:release` 的 3 条 `--dir packages/rn-observatory` 步骤、AI override 仍引用它 → `ai:generate` / `ai:check` 直接 ENOENT 崩溃，**CI 的 `verify:release` 也同样跑不通**。处置：移除脚本 target 与其 `docsForTarget` 分支、移除 `verify:release` 中 3 条步骤、删除死 override | 🔧¹³ 执行期发现（经复核确认后修复）             |
| 13  | `scripts/check-publish-scope.mjs`（新建）；根 `package.json` 的 `check:publish-scope` / `release`；`.github/workflows/release.yml` | 🔧¹⁴ **发布范围门禁**：要求每个未发布包都被显式声明为「发布目标」或「按住」，未声明即中止；仅发布目标集合；`release` 改为 fail-closed；CI 顺序调整为 verify → scope gate → publish → GitHub Release                                                                                                                                                                                                          | 🔧¹⁴ 修正（P1-1）                               |
| 14  | `scripts/generate-ai-artifacts.mjs`；`scripts/check-ai-artifacts.mjs`                                                              | 🔧¹⁴ 生成器改用仓库自身 Prettier 配置格式化输出（`generateArtifacts` 转 async，`check-ai-artifacts` 顶层 await），使提交内容与 pre-commit 的 `prettier --write` 结果逐字节一致                                                                                                                                                                                                                               | 🔧¹⁴ 修正（P1-2）                               |
| 15  | `release/holds.json`（新建）                                                                                                       | 🔧¹⁴ 按住登记表：`photo-picker@0.3.1` 显式登记为「本次不发」并写明原因；其独立发版时须删除该条目，否则门禁报「hold 失效」                                                                                                                                                                                                                                                                                    | 🔧¹⁴ 修正（P1-1）                               |
| 16  | `packages/rn-kit/README.md`                                                                                                        | 🔧¹⁵ **P1 npm 页面文案**：兼容性段落由 `0.6.x` / `expo <56` / `RN <0.84` 重写为实际 peer（`>=54 <58` / `>=0.81 <0.87`，并补 `expo-image >=3 <58`、`expo-linear-gradient >=15 <58`）；worklets 与 RN 的 SDK 对应关系补到 0.86；新增验证状态声明（基线 SDK 55、SDK 54 未复验、56/57 无真机证据）。该文件在 `files` 白名单内，即 npm 包页面正文                                                                 | 🔧¹⁵ 修正（P1）                                 |
| 17  | `templates/expo-starter/README.md`                                                                                                 | 🔧¹⁵ 同类残留：`rn-kit 0.6.x` → `0.7.x`、`>=0.6.0` → `>=0.7.0`（模板 `package.json` 本版已由 changesets 改为 `^0.7.0`，README 与之矛盾）                                                                                                                                                                                                                                                                     | 🔧¹⁵ 修正（同类 P1）                            |
| 18  | `scripts/check-publish-scope.mjs`                                                                                                  | 🔧¹⁵ 门禁加固：① `pnpm publish` 追加 `--registry <同一 registry>`，消除「查一个 registry、发到另一个」；② 注册表探测加 `AbortSignal.timeout(10000)`，超时按未知状态 fail-closed；③ 发布失败由裸栈改为 `❌ 发布 X 失败，已中止` + 退出码 + 不可回滚提醒；④ 过 Prettier                                                                                                                                        | 🔧¹⁵ 修正（P2×2 + 低优先级）                    |
| 19  | `scripts/generate-ai-artifacts.mjs`                                                                                                | 🔧¹⁵ 仅 Prettier 格式化，无逻辑变更（pre-commit 会改写，故须随 PR 提交）                                                                                                                                                                                                                                                                                                                                     | 🔧¹⁵ 低优先级                                   |

## peer 决策表（审核要点 3）

### 第一档：本次必放（发布阻塞项）

| 字段                   | 当前           | 拟改为         | 理由与证据链                                                                                                                                                                                                 |
| ---------------------- | -------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `expo`                 | `>=54 <56`     | `>=54 <58`     | 本版存在的意义即解锁 38 号 Expo 57 升级（57 线最新 **57.0.26**，57.0.27 实测 E404）。`<58` **明确排除 SDK 58**，并非"为 58 预留"；58 过观望期（38 号 §2：58.0.10+）后另行出 minor 放宽                       |
| `react-native`         | `>=0.81 <0.84` | `>=0.81 <0.87` | 覆盖 RN 0.86.3（SDK 57 实配线）。`<0.86` 不采纳（SDK 57 对应 RN 0.86.x，依旧 ERESOLVE）。`<0.87` 同样排除 0.88，与 SDK 58 一起观望                                                                           |
| `expo-image`           | `>=3 <56`      | `>=3 <58`      | 已验证：本仓 devDeps `~55.0.11` 证实 55.0.x 跟 SDK 55 走；SDK 57 线实际落点是**预测**，待 mobile 侧 `expo install --fix` 后回填（§mobile 侧联动第 4 步）。不放开则阻塞发布，故入第一档，证据标准与第二档一致 |
| `expo-linear-gradient` | `>=15 <56`     | `>=15 <58`     | 同上（已验证下界 `~55.0.14`；57 线落点待回填）                                                                                                                                                               |

**证据链声明**：

- 下界不动（`>=54` / `>=0.81`）；monorepo 全量测试在 SDK 55 / RN 0.83 线上**待执行验证**（第 9 步执行后回填），不写成已验证事实；
- 上界部分（SDK 57 / RN 0.86）的最终验证门是 **mobile 侧 38 号方案真机回归**，发布顺序上必然"先发 peer、后跑真机"——peer 语义（兼容性声明）与验证时序的固有错位，本质是"以发布代验证"，故 §回滚 的发布后段是本策略的必要配套；
- 本仓库 devDeps 验证基线仍停在 SDK 55 线——monorepo 整体升 57 线（含根 `pnpm.overrides` 七项联动）是独立事项，不在本版范围，错位在此显式记录。

**⚠️ 残余风险声明（🔧⁶ 显式登记，不静默）**：

- **SDK 56 / RN 0.85 线未做任何验证**：peer 声明 `>=54 <58` / `>=0.81 <0.87` 在数轴上覆盖 54–57，但实际证据只有两端——下界 SDK 55/RN 0.83（本仓测试）与上界 SDK 57/RN 0.86（mobile 真机回归）。中间的 SDK 56/RN 0.85 无任何测试证据，消费方若恰好落在该线，属自担风险；
- 处置选项已评估：补验需搭 SDK 56 独立环境，成本高于其窗口价值（57 已出，56 无人新装），故**选择登记风险而非补验**；
- 如未来收到 SDK 56 线消费方反馈，按 §回滚（发布后）处理并以 0.7.1 收窄 peer 或补适配。

### 第二档：实测后再放（不在本版）

| 字段                 | 当前       | 处置                                            | 证据获取方式                                                                                                 |
| -------------------- | ---------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `@expo/vector-icons` | `>=15 <16` | **不动**；若 57 线落到 16.x/17.x，出 0.7.1 放宽 | mobile scratch 分支 `npm install expo@57.0.26 --legacy-peer-deps` + `npx expo install --fix`，取实际解析版本 |
| `react-native-svg`   | `>=15 <16` | 同上                                            | 同上                                                                                                         |

| 字段                                                                  | 当前           | 处置                            |
| --------------------------------------------------------------------- | -------------- | ------------------------------- |
| `react`                                                               | `>=19.1.0 <20` | 不动（RN 0.86 仍是 React 19.x） |
| gesture-handler / reanimated / screens / safe-area-context / worklets | 现值           | 不动，现范围已覆盖 57 对应版本  |

## Version Checklist

- [ ] `.changeset/config.json` 含 `ignore` 两包（🔧¹⁰ `jq length == 2` 门禁 + jq 打印留痕），并**已标注临时属性**
- [ ] 两个 changeset 文件创建，`find` 清点无多余文件，`changeset status --output` **JSON 精确断言**通过（🔧⁹ 仅 rn-kit 0.7.0 minor，且两包 `type:none` 版本未动；🔧¹⁰ 临时文件 `mktemp` 唯一路径，失败/空文件均 exit 1）
- [ ] `packages/rn-kit/package.json`：version `0.7.0` + peer 四字段为新值（🔧⁹ node 断言通过，非仅打印）
- [ ] `packages/rn-kit/CHANGELOG.md` 顶部 `## 0.7.0` + `### Minor Changes` 两条 bullet
- [ ] 两个 changeset 文件已被 `version-packages` 消费删除（消费后不存在属预期）
- [ ] hot-updater / expo-starter 版本未被连带改动（`git status` + `npm view` 双确认）
- [ ] `docs/release-notes/rn-kit-0.7.0.md` exists（含 no-breaking 声明）
- [ ] `docs/README.md` 已链接发版说明与本清单（🔧¹¹ 两条 `grep -q` **分别**通过，非 `\|` 交替）
- [ ] `ai/overrides/rn-kit.json` **两处**均为新范围：`requiredProjectSetup` 与 `compatibilityNotes`（旧范围字符串 grep 清零留痕）
- [ ] `templates/expo-starter/package.json` rn-kit 范围 `^0.7.0`，lockfile 已同步且 `pnpm install --frozen-lockfile` 通过
- [ ] 根 `package.json` `verify:release` 已并入 `ai:check`（🔧⁶ 只读校验，非 ai:verify）
- [ ] 🔧¹⁴ `pnpm check:publish-scope --expect @gaozh1024/rn-kit@0.7.0` 通过：发布目标仅 `rn-kit@0.7.0`，`photo-picker@0.3.1` 已在 `release/holds.json` 显式按住；发布后 `npm view` 仍 0.3.0

- [ ] 🔧¹⁴ AI 产物 `prettier --check` 通过（生成内容与 pre-commit 格式化结果逐字节一致，提交后 `ai:check` 不会变红）
- [ ] 🔧¹⁴ `release.yml` 发布步骤为门禁驱动（`check:publish-scope --from-tag` + `--publish`），`Create Release` 在 publish 之后
- [ ] `ai-manifest.json` regenerated with version `0.7.0`（`ai:generate` 后 `ai:check` 绿）
- [ ] 🔧⁶ tag `v0.7.0` 打在合并后的 main：`merge_commit != ed1952b` + main 上 rn-kit version = 0.7.0 双断言通过（🔧⁸ 兼容 merge/squash/rebase）
- [ ] 发布确认后 `.changeset/config.json` 的 `ignore` 已 revert（第 12 步小 PR，jq 校验留痕）

## Verification

- [ ] `pnpm --filter @gaozh1024/rn-kit typecheck`
- [ ] `pnpm --filter @gaozh1024/rn-kit test`（基线以 release 分支实测回填：**108 文件 / 549 用例**，2026-10-18 通过。参考：`ed1952b` 上测试文件实测 108 个；v1 的"0.6.5 基线 103 文件 / 509 用例"作废）
- [ ] `pnpm install --frozen-lockfile`（🔧⁵ 新增，模拟 CI 第一道门。✅ 复核方已实测通过，2026-10-18）
- [ ] `pnpm ai:generate` → `pnpm ai:check`
- [ ] 🔧¹⁴ `pnpm exec prettier --check "packages/*/AI_USAGE.md" "packages/*/ai-manifest.json" "templates/*/AI_USAGE.md" "templates/*/ai-manifest.json"`
- [ ] 🔧¹⁴ `pnpm check:publish-scope --expect @gaozh1024/rn-kit@0.7.0`（发布范围精确匹配）
- [ ] 🔧¹⁵ **README 与 `peerDependencies` 一致性门禁**（`files` 白名单含 `README.md`，npm 包页面展示的就是仓库这一份；改 peer 忘了改 README 会直接把错误指引发出去）：

```bash
# 🔧¹⁵ README 兼容范围断言（自包含，可单独执行）
node -e '
const p = require("./packages/rn-kit/package.json");
const fs = require("node:fs");
const md = fs.readFileSync("packages/rn-kit/README.md", "utf8");
const want = ["expo", "react-native", "react", "expo-image", "expo-linear-gradient", "react-native-reanimated", "react-native-worklets", "react-native-svg"];
const bad = [];
for (const k of want) {
  const r = p.peerDependencies[k];
  if (!r) { bad.push(k + " 不在 peerDependencies 中"); continue; }
  const expect = "`" + k + "`: `" + r + "`";
  if (!md.includes(expect)) bad.push("README 缺少或未同步：" + expect);
}
const stale = md.match(/0\.6\.x|`expo`: `>=54 <56`|`react-native`: `>=0\.81 <0\.84`/g) || [];
if (bad.length || stale.length) {
  console.error("❌ README 与 peerDependencies 不一致");
  for (const b of bad) console.error("  " + b);
  for (const s of stale) console.error("  旧范围残留：" + s);
  process.exit(1);
}
console.log("✅ README 兼容范围与 peerDependencies 一致（" + want.length + " 项），无旧范围残留");
'
# 实测留痕（2026-10-18）：当前 README → exit 0；把 `expo` 改回 `>=54 <56` → exit 1，
#   同时点名「缺少期望值」与「旧范围残留」两条，非仅其一。
```

- [ ] `git diff --check`
- [ ] `pnpm --filter @gaozh1024/rn-kit build`
- [ ] **runOnJS 产物验证（本版核心证据，验 `exports` 实际引用的三个产物）**：🔧¹² 由"`grep -c` 打印数量 + 人眼比对"改为**真断言**——执行下方代码块，三个产物各 ≥2 次才算通过（任一 <2 或文件缺失即 `exit 1`）

```bash
# 🔧¹² runOnJS 产物计数门禁（自包含：不依赖主流程的 set -e，可单独执行）
# 用 `grep -o` 统计**出现次数**而非匹配行数（原 `grep -c` 数的是行，两处写在同一行时会误判为 1）
for f in packages/rn-kit/dist/index.js packages/rn-kit/dist/index.mjs packages/rn-kit/dist/index.web.mjs; do
  test -f "$f" || { echo "❌ 产物缺失：$f（先执行 pnpm --filter @gaozh1024/rn-kit build）"; exit 1; }
  n="$(grep -o -F 'runOnJS(true)' "$f" | wc -l | tr -d ' ' || true)"
  if [ "$n" -lt 2 ]; then
    echo "❌ $f: runOnJS(true) 出现 $n 次（期望 >= 2），手势修复未完整进入产物"; exit 1
  fi
  echo "✅ $f: runOnJS(true) × $n"
done
# 实测留痕（2026-10-18，ed1952b 构建产物）：三个产物均 ×2 → exit 0；
#   伪造 1 次 / 0 次 / 文件缺失三种场景均 exit 1 且给出定位信息。
```

- [ ] `cd packages/rn-kit && npm_config_cache=/tmp/rn-kit-npm-cache npm pack --dry-run --json`（必须包目录内执行，根目录跑的是私有 monorepo 根包，验不了 rn-kit）
- [ ] `npm view @gaozh1024/rn-kit@0.7.0 version` → 应 E404（未被占用）

> 📌 附注（不阻塞本版）：`index.web.js` 为 tsup 有意构建的 web-cjs 产物，但 `exports` 未引用——"构建了却不被消费"。本版不动构建配置，登记为技术债。

## Publish Path

- **正路（对齐 `.github/workflows/release.yml`）**：release 分支 PR → 合并 main → 切回 main 拉取并通过 merge-commit 断言（第 10 步）→ `git tag v0.7.0 && git push origin v0.7.0` → CI 自动 `pnpm install --frozen-lockfile` → `verify:release`（含只读 `ai:check`）→ `check:publish-scope --from-tag`（每个未发布包必须是发布目标或 holds 条目）→ 按门禁结果发布 → GitHub Release
- **降级路径**（仅 CI 不可用时）：本地 `pnpm release --expect @gaozh1024/rn-kit@0.7.0`（门禁驱动，无参数直接报错退出），事后补 tag 与 GitHub Release，并在清单里记录偏离原因

## Post-publish Verification

```bash
npm view @gaozh1024/rn-kit@0.7.0 version                    # → 0.7.0
npm view @gaozh1024/rn-kit@0.7.0 peerDependencies --json    # → 核对新 peer 表
npm view @gaozh1024/hot-updater version                     # → 仍 0.2.0（未被连带）
npm view @gaozh1024/expo-starter version                    # → 仍 0.3.2（未被连带）
npm view @gaozh1024/photo-picker version                    # → 仍 0.3.0（🔧¹⁴ 未被连带扫出）
```

## 影响面与回滚

| 项             | 说明                                                                                                                                                                                                                                                                         |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 已知消费方     | ① 吾滴 mobile（`^0.6.6`，本升级的触发方，仓库 `/Users/gzh/Projects/wudi/wudi/mobile`）；② `packages/hot-updater`（workspace 引用 + peer 上界开放，由 ignore 收敛版本规划、由发布范围门禁保证不被连带发布）；③ `templates/expo-starter`（本次显式升 `^0.7.0`，见变更明细 #8） |
| 兼容性         | 纯 additive：peer 放宽 + 收编已验证的手势修复，无 API 变更、无行为变更（runOnJS 在吾滴已用补丁形式跑了 1 个月）                                                                                                                                                              |
| 回滚（发布前） | git 层面：删 changeset 文件 / 分支重置，无外部副作用                                                                                                                                                                                                                         |
| 回滚（发布后） | npm 已发布的 0.7.0 **不可撤包**，唯一手段：`npm deprecate @gaozh1024/rn-kit@0.7.0 "peer 上界未经真机验证，请退回 0.6.6"`；已安装方（含吾滴 mobile）**不会自动退回**，需手动 `npm install @gaozh1024/rn-kit@0.6.6` + 恢复 patch + lockfile 剔除 0.7.0                         |

## mobile 侧联动（不在本仓库执行，按 38 号文档执行 + 勘误）

- mobile 仓库：`/Users/gzh/Projects/wudi/wudi/mobile`
- 38 号方案：`/Users/gzh/Projects/wudi/wudi/docs/开发设计/38-Expo-SDK57升级设计方案.md`
- patch 文件（已确认存在）：`/Users/gzh/Projects/wudi/wudi/mobile/patches/@gaozh1024+rn-kit+0.6.6.patch`

0. **勘误 38 号文档**：全文 `expo@57.0.27` / `57.0.27` → `57.0.26`（npm 实测 57.0.27 E404，57 线最新 57.0.26，RN 0.86.3）。🔧⁵ 完成判据（不通过不得勾选本联动通过）：
   ```bash
   # 🔧¹¹ 反向门禁写成显式 if（`grep ... # 期望无输出` 在 set -e 下会「成功时中止」，语义反了）：
   if grep -rn '57\.0\.27' /Users/gzh/Projects/wudi/wudi/docs/开发设计/38-Expo-SDK57升级设计方案.md; then
     echo "❌ 38 号文档仍含不存在的 expo@57.0.27，先勘误再勾选联动通过"; exit 1
   else
     echo "✅ 38 号文档已无 57.0.27 字样"
   fi
   ```
1. `npm install @gaozh1024/rn-kit@0.7.0` + `git rm "patches/@gaozh1024+rn-kit+0.6.6.patch"`
2. 回归：PageDrawer / BottomSheetModal 下滑关闭、SwipeActionRow 左滑、DEV worklet 警告归零（38 号 §7 第 11 项）
3. 之后才允许 `npm install expo@57.0.26`（38 号 §6.1，版本号按第 0 步勘误）
4. 顺手取证：`expo install --fix` 后记录 `@expo/vector-icons` / `react-native-svg` / `expo-image` / `expo-linear-gradient` 实际解析版本 → 回填 §peer 决策表两档，决定是否需要 0.7.1

> ⚠️ 失败分支：第 2 步真机回归若失败，立即按 §影响面与回滚（发布后）执行，不等修复版。

## 待确认问题（复核需确认两项）

1. **版本号 / peer 上界 / ignore 临时配置**：均维持前几轮结论；peer 范围定位为"仅支持到 SDK 57"（`<58` / `<0.87` 明确排除 SDK 58 线），58 观望期结束后另出 minor 放宽。ignore 的生命周期已定为"发布确认后 revert + 治理约束"，无遗留模糊态。
2. 🔧¹⁴ **发布范围**：已确认"只发 rn-kit，photo-picker 0.3.1 按住"。落地为 `release/holds.json` 显式登记 + `check:publish-scope` 门禁 + 发布步骤按门禁结果执行；不再使用根 `changeset publish`（它不读 ignore，必然连带 photo-picker）。photo-picker 独立发版时须删除 holds 条目，否则门禁报"hold 失效"。

---

> 修订记录：
> **v1 → v2**：① P0 发布流程回归 Changesets；② P1 peer 决策表拆两档补证据链；③ P1 Verification 补 `ai:generate` 前置、基线改实测制、runOnJS 改三实际导出产物；④ P2 路径/行号、分支、expo-starter、mobile 路径、38 号文档路径。
> **v2 → v3**：⑤ 回滚拆发布前/后补 `npm deprecate`；⑥ changeset 改手写文件（记录 `changeset add` 参数式不可用）；⑦ expo-image 理由统一证据标准。
> **v3 → v4**：⑧ P0-1 补 peer 四字段手改 + jq 校验；⑨ P0-2 连带发布实锤，采纳 ignore 方案实证收敛，补 `changeset status` 门禁；⑩ expo `57.0.27`→`57.0.26`（E404 实测）；⑪ `^0.6.1` 不兼容 0.7.0，模板显式升级；⑫ changeset 拆两文件；⑬ release note / docs README / ai overrides / ai:generate 波及面入流程；⑭ npm pack 改包目录；⑮ 测试证据改"待执行验证"；⑯ P2 × 5。
> **v4 → v5**（终审 P1 × 3 / P2 × 4）：⑰ **P1-1** 模板依赖时序移到 `version-packages` 之后，`pnpm install --lockfile-only` 同步 + `--frozen-lockfile` 校验（避免 workspace 0.6.6 不满足 `^0.7.0` 导致 CI 挂）；⑱ **P1-2** `ai/overrides/rn-kit.json` 扩为两处（新增 `compatibilityNotes` 前 3 条旧范围，实测确认），旧范围 grep 清零入验收；⑲ **P1-3** ignore 定为**临时配置**：发布确认后 revert（第 12 步）+ 治理约束（两包未来发 changeset 前必须先移除 ignore），删除"后续复盘决定"模糊态；⑳ **P2** × 4：changeset 目录清点改 `find` 排除 README、`verify:release` 并入 `ai:verify`（对齐 release.yml 实际链路，实测确认 CI 无 ai:check）、第 1/4 步补 jq/grep/test 校验命令、38 号勘误补 grep 完成判据；㉑ 发布路径对齐实际工作流（tag 触发 CI），`pnpm release` 降为降级路径；㉒ Post-publish 增加两包未被连带的 npm view 确认。
> **v5 → v6**（终审 1×P1 + 4×P2）：㉓ **P1-1** 第 10 步加硬门禁——tag 前强制 `git switch main && git pull --ff-only` 并记录 merge commit，仍为 ed1952b 则中止，杜绝 tag 落在未合并 release 分支；㉔ **P2-2** CI 门禁由 `ai:verify` 改为只读 `ai:check`（generate 会令 CI 静默生成未提交产物后继续发布；生成责任固定在本地第 8 步并随 PR 提交）；㉕ **P2-3** 第 12 步 revert 改为明确小 PR（编辑 + jq + git diff 校验），删除占位符与 Python fallback；㉖ **P2-4** changeset 清点升级为计数+定名双重 fail-fast，override 旧范围检查扩为 `rg -q`（覆盖 worklets/SDK55 旧文案）+ 文件存在性守卫；㉗ **P2-5** SDK 56/RN 0.85 线未验证显式登记为残余风险（证据只覆盖 55 与 57 两端，56 线消费方自担风险，登记而非补验）。
> **v6 → v7**（终审 1×P1 + 4×P2，全部为门禁断言补强）：㉘ **P1-1** tag 门禁由注释改为真断言（`merge_commit != ed1952b` 否则 exit 1，外加 `git merge-base --is-ancestor` 双确认 release 分支已并入 main）；㉙ **P2-2** Publish Path 残留"含 ai:verify"文案清理为"含只读 ai:check"；㉚ **P2-3** `verify:release` 校验升级为 node 结构化断言（grep 会误匹配独立 `ai:check` 脚本；断言校验脚本串含 `pnpm ai:check` 且不含 `ai:verify`）；㉛ **P2-4** ignore revert 增加阻断断言（`test "$(jq -r '.ignore // empty' ...)" = ""` 否则 exit 1）；㉜ **P2-5** 第 8 步提交前增加 `git diff --check` + `git status --short` 工作区检查（人工核对）。
> **v7 → v8**（终审 2×P1 + 3×P2）：㉝ **P1-1** 删除 `git merge-base --is-ancestor` 祖先校验（squash/rebase merge 下 release 分支原始 commit 不是 main 祖先，会误拦已合并的 PR），改以 **main 上 rn-kit 实际版本 = 0.7.0** 为断言（`node -p require` 校验，兼容 merge/squash/rebase 任意合并方式）；㉞ **P1-2** worklets 文案由"追加 SDK 57 说明"改为"**重写整句**"（旧句保留会被 `rg -q` fail-fast 门禁命中而互相冲突），并给出重写后的完整新句；㉟ **P2** × 3：第 8 步工作区检查表述降格为"人工核对，非自动白名单断言"、删除误匹配独立脚本的旧 `grep -n "ai:check"` 行（保留 node 结构化断言）、自检结论统一为"**无指令性残留**"（弃用说明与修订记录中的 ai:verify 字样属解释性内容，非执行指令）。
> **v8 → v9**（终审 1×P1 + 1×P2）：㊱ **P1** worklets AI 文案与残余风险声明冲突修正——v8 重写句"0.7.x on Expo SDK 55/56"给未验证的 SDK 56 写了确定映射，与 §残余风险声明"SDK 56 / RN 0.85 无任何验证"矛盾；改为 55/57 给确定映射、56 显式声明"covered by the supported range but not yet verified"。㊲ **P2 复核**：终审指认的执行块 `grep -n "ai:check"` 残留**实测不存在**（全文件仅本修订记录历史行含该字样，执行块仅有 node 结构化断言），无需修改，留此记录备查。
> **v9 → v10**（终审 1×P1 + 1×P2，均改为实测断言）：㊳ **P1** 第 3 步 peer 校验原为 `jq -r` 纯打印、不构成门禁，改为 node 逐字段断言（四字段期望值硬编码，任一不符 exit 1）；实测旧范围下正确报四行 ❌ 并 exit 1。㊴ **P2** 第 5 步 `changeset status` 由人工核对升级为 `--output` JSON 精确断言——⚠️ 实测发现 `ignore` 生效后被忽略包会以 `type:"none"` 出现在 `releases` 中，若照搬"纯精确匹配"写法会在**正确配置下误判失败**，故断言改为「过滤 `none` 后仅 rn-kit 0.7.0 minor」+「两包 `none` 版本须仍为 0.3.2 / 0.2.0」双条件；双向实测：有 ignore → exit 0，去掉 ignore → exit 1 并打印 `expo-starter@0.3.3 patch` / `hot-updater@1.0.0 major`。
> **v10 → v11**（终审 1×P1：shell fail-fast 与临时文件隔离）：㊵ **P1** 执行块首加 `set -euo pipefail`（Node `process.exit(1)` 原先只退出 Node，父 shell 会继续跑到 `version-packages` / 发布），并注明"分步新开终端需各自重执行本行，推荐整块粘贴"。㊶ 第 5 步三处加固：`changeset status` 失败显式 `|| exit 1`、`test -s` 校验输出非空、固定 `/tmp/rn-kit-plan.json` 改 `mktemp` 唯一路径 + `trap 'rm -f "${plan_file:-}"' EXIT` 清理。㊷ ⚠️ **实测推翻终审建议写法**：macOS BSD `mktemp /tmp/x.XXXXXX.json` **不做替换**（原样返回字面量路径，等于没隔离），故模板不加后缀、改 `fs.readFileSync` 解析；同时把 `node -e "..."` 的 JS 改用单引号包裹 + 内部只用双引号，避免 `$` 被 shell 展开。㊸ 顺带加固第 1 步 `jq`（裸 `.ignore[]` 在字段缺失时只抛 "Cannot iterate over null"，改为 `jq length == 2` 显式门禁）与第 4a/4b（裸 `test`/`grep` 在 `set -e` 下静默中止，补中文提示）。㊹ **六项实测留痕**：有 ignore→0 / 无 ignore→1 / config 损坏→命中 status 失败分支 / 预置脏 `/tmp` 文件→仍 0（未读旧文件）/ node 失败后后续命令未执行（set -e 生效）/ trap 后无残留。
> **v11 → v12**（终审 1×P1：BSD grep 兼容性）：㊺ **P1** 第 4b 步 `grep "a\|b"` 修正——实测确认 macOS BSD grep 的 BRE **不支持** `\|` 交替（`grep "a\|b"` 实际匹配文本 `a|b`），原写法在链接正确时也返回 1，叠加 `set -e` 会直接中止发布流程；改为两条独立 `grep -q`（发版说明、本清单**分别**断言，缺一即停，比单个 `-E` 更严）+ `grep -E` 打印留痕；三场景实测（齐全→0 / 缺清单→1 / 全缺→1）。㊻ 顺带修正同步区块的 38 号文档勘误检查：原为 `grep ... # 期望无输出` 的反向语义（在 `set -e` 下会「成功时中止」），改为显式 `if grep; then ❌ exit 1; else ✅; fi`。
> **v12 → v13**（终审 1×P1：产物计数无断言）：㊼ **P1** Verification 的 runOnJS 校验原为三条 `grep -c ... → ≥2` 的**人工比对**说明（打印数量即返回 0，产物只剩 1 次也放行），改为自包含循环门禁：`test -f` 前置（产物缺失先报错）+ `grep -o -F 'runOnJS(true)' | wc -l` 统计**出现次数**（原 `grep -c` 数的是匹配**行数**，若两处写在同一行会误判为 1）+ `-lt 2` 即 `exit 1`；四种场景实测（实测产物 ×2 → exit 0；伪造 1 次 / 0 次 / 文件缺失 → 均 exit 1），并注明该块自包含、可脱离主流程单独执行。
> **v13 → v14**（发布前实测 2×P1 + 1×P2）：㊽ **P1-1 发布范围**：`@changesets/cli` 源码实证 `publishPackages()` 只过滤 `private`、**不读 `ignore`**，registry 实查 `photo-picker` 本地 0.3.1 / npm 0.3.0 → 根 `changeset publish` 必然连带发布它。新增 `scripts/check-publish-scope.mjs` + `release/holds.json`：每个未发布包都必须显式声明为「发布目标」或「按住」，双向 fail-fast；发布步骤只发目标集合，`release` 脚本 fail-closed，`Create Release` 移到 publish 之后。㊾ **P1-2 AI 门禁自相矛盾**：`prettier --check` 实测生成产物不合格式（Markdown 标题后缺空行、JSON 短数组未折叠），pre-commit 的 `prettier --write` 会改写 → 提交后 CI `ai:check` 必红；生成器改为用仓库自身 Prettier 配置输出，`ai:check` 与 `prettier --check` 现已双绿。㊿ **P2 兼容性文案**：发版说明原写"SDK 54 / SDK 57 已验证"，与"验证基线 SDK 55"及"SDK 57 真机回归在发布后"冲突，按四项事实重写（55 已验证 / 54 未复验 / 57 待真机 / 56 无证据）。51 回填测试基线 **108 文件 / 549 用例**，并登记"完整 frozen 安装未重跑""SDK 57 真机未验证"。
> **v14 → v15**（复审 1×P1 + 2×P2 + 3 项低优先级）：52 **P1 npm README 仍宣传旧范围**——`packages/rn-kit/README.md` 写 `0.6.x` / `expo <56` / `RN <0.84`，与 package peer、AI 文档、0.7.0 发版说明三方冲突；该文件在 `files` 白名单内，即 npm 包页面正文，发布后用户看到的就是错误指引 → 按实际 peer 重写，并补验证状态声明（基线 55 / 54 未复验 / 56·57 无真机证据）；同类残留 `templates/expo-starter/README.md` 的 `rn-kit 0.6.x` 一并对齐（其 package.json 本版已是 `^0.7.0`）。53 **P2 `--registry` 只用于查询**——探测走自定义 registry、`pnpm publish` 却会落到默认 npm → 发布命令追加 `--registry <同一 registry>`；stub 实测 pnpm 原文 `Publishing to http://127.0.0.1:8899/` 并发出 `PUT http://127.0.0.1:8899/@gaozh1024%2frn-kit`，证明路由生效（不加该参数时 pnpm 的 ENEEDAUTH 报错指向的是 registry.npmjs.org）。54 **P2 注册表查询无超时**——`fetch` 无 `AbortSignal`，网络黑洞会让发布 job 挂死 → 每次 10s 超时 + 重试 1 次，超时按"未知状态"fail-closed；挂起型 stub 实测 **21s 后 exit 1**（2×10s + 开销）并打印超时上限。55 发布失败路径由裸栈改为 `❌ 发布 X 失败，已中止` + 退出码 + "不可回滚，先核对 registry"提醒。56 低优先级三项：执行流程标题 `v13` → `v14`（与顶部版本对齐）、`check-publish-scope.mjs` 与 `generate-ai-artifacts.mjs` 过 Prettier、`docs/README.md` 删除指向已迁出包的 `packages/rn-observatory/README.md` 死链。

---

## 执行记录（2026-10-18，release/rn-kit-0.7.0 分支，v15 清单）

### ✅ 已完成并验证（第 0-9c 步）

| 步骤 | 结果                                                                                                                                                                                                                                                                                                                                                              |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0    | 分支 `release/rn-kit-0.7.0` 已建；HEAD `ed1952b`；`git pull` → Already up to date                                                                                                                                                                                                                                                                                 |
| 1    | `.changeset/config.json` 增 `ignore` 两项；`jq length == 2` 门禁通过                                                                                                                                                                                                                                                                                              |
| 2    | 两个 changeset 文件；`find` 计数 == 2 + 定名文件双校验通过                                                                                                                                                                                                                                                                                                        |
| 3    | peer 四字段改为 `>=54 <58` / `>=0.81 <0.87` / `>=3 <58` / `>=15 <58`；node 断言通过                                                                                                                                                                                                                                                                               |
| 4    | release note 新建（🔧¹⁴ 兼容性段落按基线 SDK 55 重写）；`docs/README.md` 两处链接（两条独立 grep 均通过）；override 两处更新且旧范围 `rg` 清零；JSON 合法                                                                                                                                                                                                         |
| 5    | `changeset status` 人类可读 + JSON 精确断言：仅 `rn-kit@0.7.0 minor`，两包 `none` 保持 `0.3.2` / `0.2.0`                                                                                                                                                                                                                                                          |
| 6    | `version-packages` → version `0.7.0`；CHANGELOG 单个 `### Minor Changes` 两条 bullet；两 changeset 已消费；两包版本未动                                                                                                                                                                                                                                           |
| 7    | 模板 `^0.7.0`（changesets 自动，符合预期）；`--lockfile-only` 同步；`--frozen-lockfile --lockfile-only` → Done（lock 与 package.json 一致）。**完整 frozen 安装未重跑**（见下）                                                                                                                                                                                   |
| 8    | `ai:generate` → `ai:check` 双绿；🔧¹⁴ `prettier --check` 对 10 个 AI 产物全绿（"All matched files use Prettier code style!"）；manifest version `0.7.0` + 新 peer 范围 + SDK 56 未验证声明均已落进 `AI_USAGE.md`                                                                                                                                                  |
| 9    | `verify:release` 已并入**只读** `pnpm ai:check`，node 结构化断言通过；rn-kit `typecheck` / `test`（**108 文件 / 549 用例**）/ `build` 通过；aliyun-speech、aliyun-push、photo-picker、hot-updater 的 test·typecheck·build 与模板 lint 通过；runOnJS 三产物各 ×2；`npm pack --dry-run` 通过                                                                        |
| 9c   | 🔧¹⁴ `check:publish-scope` → 发布目标 `rn-kit@0.7.0`、`photo-picker@0.3.1` 由 `release/holds.json` 按住，exit 0（真实 registry 实测）                                                                                                                                                                                                                             |
| 9d   | 🔧¹⁵ 复审修正全部落地：rn-kit README 兼容范围按实际 peer 重写（旧范围 grep 清零）；模板 README 同步 `0.7.x`；`check-publish-scope` 加 `--registry` 与 10s 超时；两脚本 `prettier --check` 绿；`docs/README.md` 死链删除。门禁六路径回归：放行 → 0；未声明未发包 → 1；hold 失效 → 1；registry 5xx → 1；registry 挂起 → **21s 后 1**；发布失败 → 清晰中止（均实测） |

### 🔧 执行期偏差（4 处，均已处置）

1. **`changeset version` 自动改写 hot-updater peer 下限**（`>=0.4.20` → `>=0.7.0`）：不在变更明细内，已 `git checkout` 还原。该包本次不发版，抬下限对已发布 0.2.0 无意义且会无谓收窄兼容。**注意：下次对该包跑 changesets 时该改写会再次出现，需人工判断。**
2. **`pnpm install --lockfile-only` 剪掉 3 组陈旧 lock 条目**（`@shopify/flash-list@2.0.2`、`expo-media-library@55.0.17`、`expo-video@55.0.19`）：全仓 `package.json` 与源码均无引用（ripgrep 双查确认），属 pnpm 对孤儿条目的自动清理，接受。diff 为 5 增 40 删。
3. **存量缺陷修复（变更明细 #12）**：`rn-observatory` 已于祖先提交 `ee33b85` 迁出本仓，但 `generate-ai-artifacts.mjs` 的 `packageTargets` / `docsForTarget` 分支、`verify:release` 的 3 条 `--dir packages/rn-observatory` 步骤、`ai/overrides/rn-observatory.json` 仍引用它 → `ai:generate`、`ai:check`、**以及 CI 的 `verify:release` 全部必然崩溃**。已按复核确认的方案全部移除。修复后 `ai:generate`/`ai:check` 首次跑通。
4. 🔧¹⁴ **此前记为"AI 产物纯格式漂移"的那批改动，根因是生成器没走 Prettier**：v13 记录称 aliyun-\* / hot-updater / 模板的 `AI_USAGE.md`、`ai-manifest.json` 出现 Markdown 空行 / JSON 换行差异，"必须一并提交否则 CI 失败"。生成器改为按仓库 Prettier 配置输出后重新生成，这些文件的 diff **全部消失**（生成结果与已提交内容逐字节一致），只剩 rn-kit 因版本号与 peer 范围确实变化而保留 diff。故"这批格式对齐必须一并提交"的结论作废。

### ⚠️ 尚未完成（发布前需补齐）

| 项                                    | 现状                                    | 处置                               |
| ------------------------------------- | --------------------------------------- | ---------------------------------- |
| 完整 `pnpm install --frozen-lockfile` | ✅ 复核方已实测通过（2026-10-18）       | 无需重跑                           |
| 提交 / 推送 / PR                      | 工作区仍未提交（HEAD 仍 `ed1952b`）     | 按下方命令执行                     |
| SDK 57 真机回归                       | 未验证（发布后执行，见 §mobile 侧联动） | 不阻塞发布，但**不得**写成"已验证" |

> 早前记录的沙箱阻塞（tsup 清理被拒、vitest worker 超时、`.git/index.lock` 无法删除、safe-delete 超时）属执行环境问题；第 9 步全量验证、`npm pack`、`git status` 已在本机跑通，不再作为遗留项。废弃的 `ai/overrides/rn-observatory.json` 本轮已成功 `git rm`（工作区状态 `D`）；若仍有构建垃圾文件，按下方第 0 步清理。

### 📋 本机续跑命令

```bash
cd /Users/gzh/Projects/framework/rn-monorepo

# 0) 清理执行环境残留（可重复执行，无残留时也不报错）
rm -f .git/index.lock
rm -f 14wim_m0 packages/rn-kit/rmini75b packages/rn-kit/tsup.config.bundled_*.mjs
git rm -f --ignore-unmatch ai/overrides/rn-observatory.json

# 1) 完整 frozen 安装（CI 第一道门；此前只验证过 --lockfile-only）
pnpm install --frozen-lockfile

# 2) 三道门禁复跑：AI 产物格式 / 发布范围 / 产物计数
pnpm ai:check
pnpm exec prettier --check "packages/*/AI_USAGE.md" "packages/*/ai-manifest.json" \
  "templates/*/AI_USAGE.md" "templates/*/ai-manifest.json"
pnpm check:publish-scope --expect @gaozh1024/rn-kit@0.7.0
for f in packages/rn-kit/dist/index.js packages/rn-kit/dist/index.mjs packages/rn-kit/dist/index.web.mjs; do
  n="$(grep -o -F 'runOnJS(true)' "$f" | wc -l | tr -d ' ')"
  echo "$f: $n"; test "$n" -ge 2 || { echo "❌ 产物不完整"; exit 1; }
done

# 3) 提交与推送（第 10 步）
git add -A
git commit -m "release: rn-kit 0.7.0 (peer widen + runOnJS; scoped publish; prettier-stable ai artifacts)"
git push -u origin release/rn-kit-0.7.0
```

PR 合并 → 切回 main 过 tag 双断言 → `git tag v0.7.0 && git push origin v0.7.0` → CI（verify → scope gate → 仅发 rn-kit）→ 第 11 步 Post-publish → 第 12 步 revert `ignore` 小 PR。

### ✅ 发布执行与 Post-publish 验证（2026-10-19 实测）

| 步骤 | 结果                                                                                                                                                                                                                            |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 10   | PR #2 合并 main（merge commit `6e2061d`，第一父 `ed1952b`、第二父 `1b31ee5`）；tag 双断言通过；`v0.7.0` 推送触发 CI                                                                                                             |
| 11a  | npm 上线（tag 推送后 20s 内可见）：`@gaozh1024/rn-kit@0.7.0`，`latest` → 0.7.0                                                                                                                                                  |
| 11b  | peer 四字段与目标一致：`expo >=54 <58`、`react-native >=0.81 <0.87`、`expo-image >=3 <58`、`expo-linear-gradient >=15 <58`                                                                                                      |
| 11c  | 无连带发布：photo-picker 0.3.0 / hot-updater 0.2.0 / expo-starter 0.3.2 / aliyun-push 0.2.0 / aliyun-speech 0.2.0 全部未动（发布范围门禁按设计生效）                                                                            |
| 11d  | tarball 核验：22 文件，README.md 在包内且兼容段为新范围（`>=54 <58` / `>=0.81 <0.87`，无 0.6.x 残留）；dist 四产物 + d.ts 齐全。注：registry 版本元数据的 `readme` 字段为空属 npm 已废弃该字段，包页面从 tarball 解析，不受影响 |
| 12   | `.changeset/config.json` 的临时 `ignore` 已清空（`chore/remove-changeset-ignore` 分支）；`release/holds.json` 的 photo-picker 条目保留（0.3.1 仍待发）                                                                          |

遗留：① GitHub Release 页面未逐一核验（匿名 API 查不到，可能私有仓）；② SDK 57 真机回归（mobile 侧按 38 号文档）；③ 模板 `^0.7.0` 与第二批包（aliyun-push / aliyun-speech / hot-updater / photo-picker 的 peer 放宽）待 SDK 57 升级时另行发版。
