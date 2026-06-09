# AI 可消费产物与初始化设计

> 状态: 方案设计
>
> 目标: 让安装 `@gaozh1024/*` 框架后的业务项目，能够被 AI 助手快速、稳定、低幻觉率地理解和使用。

## 1. 背景

当前仓库已经具备较完整的人类可读资料：

- 根级 [README](../../README.md)
- 各包 README
- [公共 API 清单](./公共API清单.md)
- [项目模板蓝图](../03-项目模板/项目模板蓝图.md)
- `templates/expo-starter`

问题不在于“没有文档”，而在于现有资料对 AI 来说仍然偏分散、偏长、偏自由文本。

AI 更擅长消费以下四类信息：

1. 短而硬的使用约束
2. 机器可读的结构化清单
3. 可运行的真实示例
4. 直接出现在消费项目根目录的规则入口

因此，本方案不把重点放在继续扩写 README，而是新增一套 AI 可消费产物，并通过 `init-ai` 命令把最关键规则同步到消费项目根目录。

## 2. 一期范围

本期只设计并落地以下四部分：

1. 每个包的 `AI_USAGE.md`
2. 根级 `llms.txt` 与各包 `ai-manifest.json`
3. `npx @gaozh1024/rn-kit init-ai`
4. 一批可被 AI 直接引用的 recipe 示例

明确不在本期内：

- `doctor` 命令
- 远程知识库 / 在线文档站点改造
- 依赖网络的检索服务

## 3. 设计原则

### 3.1 事实和规则分层

- **事实层**来自代码、`package.json`、`src/index.ts`、稳定导出与真实文件路径
- **规则层**来自人工维护的约束、推荐模式、反模式和常见坑
- **生成层**负责把事实和规则组合成 AI 可消费产物

### 3.2 幂等优先

- 生成脚本可重复执行
- `init-ai` 可重复执行
- 再执行一次不应重复追加内容

### 3.3 真实文件优先

AI 引用的路径应尽量指向：

- 真实源码
- 真实模板
- 真实示例
- 真实测试

不要把关键事实只放在长篇 prose 里。

### 3.4 短规则优先于长解释

AI 首屏材料应尽量短，避免把 README 原文复制一份。

## 4. 产物总览

建议新增如下目录：

```text
ai/
  overrides/
    rn-kit.json
    aliyun-speech.json
    photo-album-picker.json
    aliyun-push.json
    hot-updater.json
    expo-starter.json
  templates/
    ai-usage.md.hbs
    llms.txt.hbs
    ai-manifest.json.hbs
    agents-block.md
    copilot-block.md
    cursor-rule.mdc
scripts/
  generate-ai-artifacts.mjs
  check-ai-artifacts.mjs
packages/rn-kit/
  bin/
    rn-kit.js
```

生成后的产物：

```text
llms.txt
packages/rn-kit/AI_USAGE.md
packages/rn-kit/ai-manifest.json
packages/aliyun-speech/AI_USAGE.md
packages/aliyun-speech/ai-manifest.json
packages/photo-album-picker/AI_USAGE.md
packages/photo-album-picker/ai-manifest.json
packages/aliyun-push/AI_USAGE.md
packages/aliyun-push/ai-manifest.json
packages/hot-updater/AI_USAGE.md
packages/hot-updater/ai-manifest.json
templates/expo-starter/AI_USAGE.md
templates/expo-starter/ai-manifest.json
```

## 5. 来源分层

每个产物字段都应明确来源，避免脚本越长越“猜”。

### 5.1 自动抽取的事实

来源：

- `package.json`
- `src/index.ts`
- `exports`
- `peerDependencies`
- 已有文档路径
- 已有模板和源码路径

可自动抽取的字段：

- 包名
- 版本
- 描述
- 主入口
- 导出入口
- peer dependency 范围
- 构建脚本
- 示例路径

### 5.2 人工维护的规则

来源：

- `ai/overrides/*.json`

人工维护字段包括：

- 何时使用
- 何时不要使用
- 推荐入口
- 推荐初始化方式
- 反模式
- 常见错误
- 兼容性备注
- canonical example 路径
- AI 需优先遵守的约束

### 5.3 生成结果

来源：

- 自动抽取事实 + 人工规则 + 模板

生成结果必须是确定性的，避免不同机器生成不一致内容。

## 6. `AI_USAGE.md` 规范

### 6.1 目标

`AI_USAGE.md` 是给 AI 看的短说明书，不是 README 的替代品，也不是 README 的镜像。

### 6.2 固定结构

每个包的 `AI_USAGE.md` 使用相同结构：

```md
# <package name> AI Usage

## What It Is

## When To Use

## When Not To Use

## Recommended Entry

## Install Prerequisites

## Required Project Setup

## Minimal Working Example

## Canonical Patterns

## Anti-Patterns

## Common Failure Cases

## Compatibility Baseline

## See Also
```

### 6.3 内容约束

- 每节尽量短
- 优先列规则，不展开长解释
- `Minimal Working Example` 必须引用真实代码或提供最小示例
- `Anti-Patterns` 必须明确写禁止或不推荐做法
- `Common Failure Cases` 应优先覆盖安装和集成时最常见的问题

### 6.4 首批包的关键内容

#### `@gaozh1024/rn-kit`

必须明确：

- 业务 App 默认优先 `AppProvider`
- Expo 项目优先 `expo install` 安装原生依赖
- NativeWind/Tailwind 是 UI 样式硬前置
- 页面容器优先参考 `AppScreen`
- API 能力优先 `createAPI`
- 稳定公共 API 以 [公共 API 清单](./公共API清单.md) 为准

#### `@gaozh1024/photo-album-picker`

必须明确：

- 依赖 `@gaozh1024/rn-kit`
- 依赖导航、媒体库权限与若干 Expo 原生包
- 负责“选图/预览/裁剪流程”，不负责上传

#### `@gaozh1024/aliyun-speech`

必须明确：

- 依赖录音权限与音频能力
- 适合阿里云实时语音转写接入
- headless hooks 与可选 UI 的边界

#### `@gaozh1024/aliyun-push`

必须明确：

- provider、service helper 与 Expo config plugin 的边界
- 原生配置顺序与消费项目的职责边界

#### `@gaozh1024/hot-updater`

必须明确：

- 运行时能力与发布脚本能力是两层
- 这是 OTA helper，不是完整发布平台

#### `@gaozh1024/expo-starter`

必须明确：

- 它是规范化接入参考实现
- 当 AI 需要猜“推荐项目结构”时，应优先参考该模板

## 7. 根级 `llms.txt`

### 7.1 目标

`llms.txt` 作为仓库根索引，帮助通用 AI 快速找到“应该看哪几个文件”，而不是一次性喂给它全部文档。

### 7.2 内容要求

- 控制在短文本范围
- 只做索引和总规则，不承载全部细节
- 必须列出主要包、默认规则和 canonical reference

### 7.3 建议内容骨架

```txt
Project: Panther Expo Framework Monorepo

Primary packages:
- @gaozh1024/rn-kit
- @gaozh1024/photo-album-picker
- @gaozh1024/aliyun-speech
- @gaozh1024/aliyun-push
- @gaozh1024/hot-updater
- @gaozh1024/expo-starter

Default guidance:
- Prefer AppProvider over bare ThemeProvider
- In Expo projects, install native deps with expo install first
- NativeWind/Tailwind setup is required for rn-kit UI styling
- Prefer stable public exports documented in the public API list
- Use expo-starter as the canonical integration reference

Canonical references:
- packages/rn-kit/AI_USAGE.md
- docs/02-架构设计/公共API清单.md
- templates/expo-starter/AI_USAGE.md
```

## 8. `ai-manifest.json` 规范

### 8.1 目标

`ai-manifest.json` 是给脚本、工具、IDE 插件和未来本地查询接口使用的机器可读契约。

### 8.2 文件位置

- 每个包根目录一份
- 必须随 npm 发布一起打包到 `files`

### 8.2.1 分发模型

必须先约束“安装后 AI 到哪里读这些产物”，否则 manifest 中的路径会变成悬空引用。

一期采用以下分发规则：

1. 每个**发布包**必须随 npm 一起发布自己的：
   - `AI_USAGE.md`
   - `ai-manifest.json`
2. `@gaozh1024/rn-kit` 额外发布：
   - `init-ai` CLI 入口
   - `init-ai` 使用到的本地模板/受管区块内容
3. `canonicalExamples` 默认只能引用：
   - 当前包内部随 npm 发布的文件
   - 当前模板包 `@gaozh1024/expo-starter` 随 npm 发布的文件
4. 一期**不默认依赖远程 URL** 作为 canonical example 或主说明书入口
5. 若某个包的 manifest 需要引用 `expo-starter` 的示例，必须满足：
   - 该引用是显式跨包引用
   - 该模板文件已随 `@gaozh1024/expo-starter` 发布
   - 同时当前包自身仍要提供最小可用说明，不能把核心说明全部外包给模板

结论：

- `AI_USAGE.md` 和 `ai-manifest.json` 必须是**包内自带**
- recipe 可以跨包引用，但引用目标必须是**已发布文件**
- 根级 `llms.txt` 更适合仓库内开发，不应作为消费项目安装后的唯一入口

### 8.3 建议 schema

```json
{
  "schemaVersion": 1,
  "packageName": "@gaozh1024/rn-kit",
  "version": "0.4.18",
  "role": "core-framework",
  "summary": "Panther Expo Framework core package",
  "entrypoints": [
    {
      "path": ".",
      "kind": "runtime",
      "recommended": true
    }
  ],
  "installation": {
    "packageManagerCommand": "npm install @gaozh1024/rn-kit",
    "projectTypes": ["expo", "react-native"],
    "peerDependencies": {
      "expo": ">=54 <56"
    }
  },
  "recommendedUsage": {
    "primaryProvider": "AppProvider",
    "canonicalTemplate": "templates/expo-starter",
    "minimumSetup": [
      "nativewind configured",
      "tailwind content includes rn-kit dist",
      "expo install native peers first"
    ]
  },
  "stableApis": ["AppProvider", "createTheme", "createAPI", "AppButton"],
  "compatibilityNotes": ["Expo SDK 54 maps to RN 0.81; Expo SDK 55 maps to RN 0.83"],
  "antiPatterns": [
    "Using ThemeProvider alone as the default app bootstrap",
    "Installing Expo native peers with plain npm latest"
  ],
  "canonicalExamples": [
    {
      "name": "minimal-app-bootstrap",
      "path": "templates/expo-starter/src/root/providers.tsx"
    }
  ],
  "docs": ["README.md", "AI_USAGE.md"]
}
```

### 8.4 字段要求

- `schemaVersion`: 当前固定为 `1`
- `packageName`: 必须与 `package.json` 一致
- `version`: 必须与 `package.json` 一致
- `role`: 包的职责分类，如 `core-framework` / `template` / `feature-package`
- `entrypoints`: 指出推荐导入入口
- `installation.peerDependencies`: 直接从 `package.json` 派生
- `recommendedUsage`: 人工维护的推荐初始化约束
- `stableApis`: 结合稳定导出文档与入口导出生成
- `antiPatterns`: 人工维护
- `canonicalExamples`: 必须指向真实路径

### 8.4.1 路径语义

为避免实现时不同脚本对 `path` 的理解不一致，一期统一约束如下：

- `entrypoints[*].path`
  - 表示 npm 包导入入口
  - 合法值示例：`.`、`./plugin`
- `canonicalExamples[*].path`
  - 表示**仓库内相对路径**
  - 必须是正斜杠路径
  - 不允许绝对路径
  - 不允许 `..` 越出仓库根目录
- `docs[*]`
  - 表示当前包或仓库内的文档相对路径
- 若未来需要支持远程引用，应新增显式字段如 `url`，而不是让 `path` 同时兼容本地路径和 URL

### 8.5 `stableApis` 生成策略

`stableApis` 不应直接把 `src/index.ts` 所有导出原样塞入。

推荐策略：

1. 优先参考 [公共 API 清单](./公共API清单.md)
2. 再与入口导出做交叉校验
3. 对未出现在稳定清单中的导出，不默认标为稳定

## 9. 生成流程

### 9.1 脚本职责

建议引入三个脚本职责：

- `generate-ai-artifacts.mjs`
  - 生成 `AI_USAGE.md`
  - 生成 `ai-manifest.json`
  - 生成根级 `llms.txt`
- `check-ai-artifacts.mjs`
  - 检查生成结果是否过期
  - 校验路径、字段和模板是否一致
- `init-ai`
  - 将规则同步到消费项目

### 9.2 根脚本建议

根级 `package.json` 后续可增加：

```json
{
  "scripts": {
    "ai:generate": "node scripts/generate-ai-artifacts.mjs",
    "ai:check": "node scripts/check-ai-artifacts.mjs",
    "ai:verify": "pnpm ai:generate && pnpm ai:check"
  }
}
```

### 9.3 生成产物是否入库

一期建议将以下文件作为**受控生成产物**提交到 git：

- 根级 `llms.txt`
- 各包 `AI_USAGE.md`
- 各包 `ai-manifest.json`

理由：

- 便于 review 最终 AI 可见内容
- 便于 npm 发布前校验产物完整性
- 便于用户直接在仓库和 tarball 中看到真实结果
- 避免“本地临时生成但未提交”导致发布漂移

对应规则：

1. 开发者修改 `ai/overrides`、模板或入口导出后，应执行 `pnpm ai:generate`
2. CI 或发布前执行 `pnpm ai:check`
3. `ai:check` 失败表示受控生成产物过期

## 10. `init-ai` 命令设计

### 10.1 目标

`init-ai` 不是“生成一堆新文档”，而是把 Panther 框架最关键的 AI 规则同步到消费项目根目录，让 AI 在业务项目里第一时间看到这些规则。

### 10.2 调用方式

```bash
npx @gaozh1024/rn-kit init-ai
```

### 10.3 写入目标

- `AGENTS.md`
- `.github/copilot-instructions.md`
- `.cursor/rules/panther.mdc`

### 10.4 幂等规则

命令行为必须幂等：

1. 文件不存在：创建
2. 文件存在且已包含受管区块：更新区块
3. 文件存在但没有受管区块：追加一次受管区块
4. 文件存在且内容一致：输出 `up to date`
5. 永不重复追加同一受管区块

### 10.5 受管区块 marker

统一使用如下标记：

```md
<!-- panther:init-ai:start -->

... managed content ...

<!-- panther:init-ai:end -->
```

### 10.6 内容策略

#### `AGENTS.md`

只写框架级接入规则，不覆盖用户现有主体内容。

建议注入：

- 当前项目接入 Panther 框架时的默认约束
- 优先 `AppProvider`
- Expo 原生依赖先 `expo install`
- 样式异常优先排查 NativeWind/Tailwind 配置
- 新页面/项目结构优先参考 `expo-starter`
- API 接入优先 `createAPI`
- 若业务项目已有更深层规则，以业务项目规则为准

#### `.github/copilot-instructions.md`

偏向 GitHub Copilot 的简短使用规则。

#### `.cursor/rules/panther.mdc`

可作为相对独立的规则文件存在，但仍建议支持 marker 更新，避免未来与用户自定义内容冲突。

### 10.7 CLI 参数建议

```txt
init-ai
init-ai --check
init-ai --dry-run
init-ai --target <dir>
init-ai --include cursor
init-ai --force-rewrite
```

参数语义：

- `--check`: 只检查，不写入
- `--dry-run`: 展示将写入的变更
- `--target <dir>`: 指定业务项目目录
- `--include cursor`: 显式生成 Cursor 规则文件
- `--force-rewrite`: 仅在用户明确要求时重写整文件

### 10.8 冲突策略

默认不报错、不覆盖整文件、不重复追加。

仅在以下场景报错：

- 目标文件不可写
- marker 异常损坏且无法安全判定
- 用户显式要求整文件重写但写入失败

### 10.9 精确合并算法

为保证实现可预测，一期按以下顺序执行：

1. 解析目标文件路径
2. 若父目录不存在，则创建父目录
3. 若目标文件不存在：
   - 创建新文件
   - 写入完整受管内容
   - 返回 `created`
4. 若目标文件存在：
   - 读取原始文本
   - 规范化内部比较用换行为 `\n`
   - 查找 `<!-- panther:init-ai:start -->` 与 `<!-- panther:init-ai:end -->`
5. 若同时找到且顺序合法：
   - 仅替换 marker 之间的受管区块
   - 若替换后内容不变，返回 `up_to_date`
   - 若内容变化，返回 `updated`
6. 若一个存在、一个不存在，或顺序非法：
   - 返回冲突错误
   - 不做写入
7. 若两个 marker 都不存在：
   - 按文件类型采用默认插入策略追加一次受管区块
   - 返回 `appended`
8. 写回文件时：
   - 尽量保留原文件换行风格
   - 新创建文件默认使用 `\n`

### 10.10 默认插入策略

- `AGENTS.md`
  - 若文件已存在且无 marker，将受管区块追加到文件尾部
  - 追加前补一个空行
- `.github/copilot-instructions.md`
  - 若文件已存在且无 marker，将受管区块追加到文件尾部
  - 追加前补一个空行
- `.cursor/rules/panther.mdc`
  - 若文件不存在，直接创建
  - 若文件存在且无 marker，也采用追加 marker 区块，而不是整文件覆盖

### 10.11 测试矩阵

`init-ai` 至少应覆盖以下场景：

| 场景              | 输入状态                            | 期望结果                    |
| ----------------- | ----------------------------------- | --------------------------- |
| 新建文件          | 文件不存在                          | 创建文件并写入受管内容      |
| 已存在且无 marker | 旧文件含用户内容                    | 仅追加一次受管区块          |
| 已存在且有 marker | 旧文件含旧版受管内容                | 只更新 marker 内内容        |
| 重复执行          | 文件已是最新内容                    | 返回 `up to date`，文件不变 |
| marker 损坏       | 只有 start 或只有 end               | 报错且不写入                |
| 多次执行          | 连续运行两次以上                    | 不出现重复区块              |
| 保留用户内容      | marker 外有自定义内容               | marker 外内容完全保留       |
| 目录缺失          | `.github` 或 `.cursor/rules` 不存在 | 自动创建目录                |
| 换行保留          | 原文件为 CRLF                       | 写回后仍保持 CRLF           |

## 11. recipe 示例设计

### 11.1 目标

recipe 的目的不是展示“文档片段”，而是提供 AI 可以直接抄用、可被验证的真实文件。

### 11.2 优先落点

优先以 `templates/expo-starter` 为 canonical integration reference，在模板内增加 recipe 源文件，降低维护成本。

建议目录：

```text
templates/expo-starter/src/recipes/
  minimal-bootstrap.tsx
  theme-toggle.tsx
  api-auth.ts
  photo-picker.tsx
  aliyun-speech.tsx
  aliyun-push.tsx
  hot-updater.tsx
```

如后续需要独立可运行示例，再考虑拆到 `examples/recipes/`。

### 11.3 首批 recipe 主题

- `rn-kit-minimal-bootstrap`
- `rn-kit-theme-toggle`
- `rn-kit-create-api-auth`
- `photo-album-picker-basic`
- `aliyun-speech-basic`
- `aliyun-push-provider`
- `hot-updater-basic`

### 11.4 规则

- 每个 recipe 必须是一个真实文件
- 每个 recipe 都应在 manifest 中可被引用
- 尽量复用模板内现有依赖
- 不为了展示而引入额外依赖
- 若被其他包 manifest 引用，recipe 文件必须随 `@gaozh1024/expo-starter` 发布
- recipe 不能成为当前包唯一的最小使用说明，当前包自身仍需自带 `AI_USAGE.md`

### 11.5 验证

本期至少满足：

- recipe 所在模板可通过 `tsc --noEmit`
- 涉及纯函数逻辑时优先补单测

## 12. `ai-manifest` 正式 schema 草案

正式 schema 建议落在：

```text
ai/schema/ai-manifest.schema.json
```

最小要求：

- 使用 JSON Schema Draft 2020-12
- `additionalProperties: false`
- 对 `role`、`entrypoints[*].kind`、`projectTypes` 给出枚举
- 对 `canonicalExamples[*].path` 限定为相对路径
- 通过 `required` 明确必填字段

schema 示例见：

- [ai/schema/ai-manifest.schema.json](../../ai/schema/ai-manifest.schema.json)

## 13. 首批人工覆盖文件建议

建议维护如下文件：

```text
ai/overrides/rn-kit.json
ai/overrides/aliyun-speech.json
ai/overrides/photo-album-picker.json
ai/overrides/aliyun-push.json
ai/overrides/hot-updater.json
ai/overrides/expo-starter.json
```

建议字段：

```json
{
  "role": "core-framework",
  "whenToUse": [],
  "whenNotToUse": [],
  "recommendedEntry": [],
  "requiredProjectSetup": [],
  "antiPatterns": [],
  "commonFailureCases": [],
  "compatibilityNotes": [],
  "canonicalExamples": []
}
```

说明：

- 规则字段由人工维护
- 版本、依赖、入口等事实字段不在 override 中维护

## 14. 分阶段落地顺序

建议实现顺序：

1. 定义 `ai-manifest.json` schema
2. 创建 `ai/overrides/*.json`
3. 创建 `AI_USAGE.md` 与 `llms.txt` 模板
4. 实现 `generate-ai-artifacts.mjs`
5. 将 `AI_USAGE.md` / `ai-manifest.json` 纳入各包发布 `files`
6. 实现 `init-ai`
7. 补齐 recipe 文件
8. 增加 `ai:check` / `ai:verify`

## 15. 验收标准

一期完成时应满足：

### 15.1 产物完整性

- 根目录存在 `llms.txt`
- 每个发布包存在 `AI_USAGE.md`
- 每个发布包存在 `ai-manifest.json`

### 15.2 质量要求

- 所有 `canonicalExamples.path` 都指向真实文件
- `canonicalExamples.path` 不引用未发布文件
- `init-ai` 多次执行不重复追加
- 规则更新只改 marker 内内容
- `AI_USAGE.md` 明确写出反模式与常见坑

### 15.3 可维护性

- 事实字段不靠手工重复维护
- 人工维护内容只集中在 `ai/overrides/*.json`
- 生成结果可由脚本重建

## 16. 当前结论

本方案的核心不是“让 AI 去看更多文档”，而是让框架在安装后天然提供三层能力：

1. **短规则**：`AI_USAGE.md`、`llms.txt`
2. **结构化契约**：`ai-manifest.json`
3. **项目入口同步**：`init-ai`
4. **真实参考实现**：recipes + `expo-starter`

这样可以显著降低 AI 在消费项目中的误用率、漏配率和幻觉率。
