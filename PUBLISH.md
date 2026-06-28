# 发布指南

适用于以下六个包：

- `@gaozh1024/rn-kit`
- `@gaozh1024/aliyun-speech`
- `@gaozh1024/photo-album-picker`
- `@gaozh1024/aliyun-push`
- `@gaozh1024/hot-updater`
- `@gaozh1024/expo-starter`

## 1. 发布前检查

### 必跑验证

```bash
pnpm verify:release
```

等价展开如下：

```bash
pnpm --dir packages/rn-kit typecheck
pnpm --dir packages/rn-kit test
pnpm --dir packages/rn-kit build
pnpm --dir packages/aliyun-speech typecheck
pnpm --dir packages/aliyun-speech build
pnpm --dir packages/photo-album-picker test
pnpm --dir packages/photo-album-picker typecheck
pnpm --dir packages/photo-album-picker build
pnpm --dir packages/aliyun-push typecheck
pnpm --dir packages/aliyun-push build
pnpm --dir packages/hot-updater test
pnpm --dir packages/hot-updater typecheck
pnpm --dir packages/hot-updater build
pnpm --dir templates/expo-starter lint
```

### 建议补充检查

```bash
# 检查打包内容
cd packages/rn-kit
npm pack --dry-run

cd ../aliyun-speech
npm pack --dry-run

cd ../photo-album-picker
npm pack --dry-run

cd ../aliyun-push
npm pack --dry-run

cd ../hot-updater
npm pack --dry-run

cd ../../templates/expo-starter
npm pack --dry-run
```

如果本机 `~/.npm` 缓存权限异常，可临时这样执行：

```bash
cd packages/rn-kit
npm_config_cache=/tmp/npm-cache npm pack --dry-run

cd ../aliyun-speech
npm_config_cache=/tmp/npm-cache npm pack --dry-run

cd ../photo-album-picker
npm_config_cache=/tmp/npm-cache npm pack --dry-run

cd ../aliyun-push
npm_config_cache=/tmp/npm-cache npm pack --dry-run

cd ../hot-updater
npm_config_cache=/tmp/npm-cache npm pack --dry-run

cd ../../templates/expo-starter
npm_config_cache=/tmp/npm-cache npm pack --dry-run
```

## 2. 版本同步原则

推荐优先使用 changeset 管理版本，而不是手工只改单个 `package.json`：

```bash
pnpm changeset
pnpm version-packages
```

如果这次只发布 `@gaozh1024/aliyun-push`，推荐流程：

```bash
# 1. 记录 patch/minor 变更
pnpm changeset

# 2. 落版本号与 CHANGELOG
pnpm version-packages

# 3. 回归验证
pnpm verify:release

# 4. 单包打包检查
pnpm --dir packages/aliyun-push pack --pack-destination /tmp/aliyun-push-pack
```

发布前请同步检查：

1. `packages/rn-kit/package.json` 版本号
2. `packages/aliyun-speech/package.json` 版本号（若本次涉及语音包）
3. `packages/photo-album-picker/package.json` 版本号（若本次涉及相册包）
4. `packages/aliyun-push/package.json` 版本号（若本次涉及推送包）
5. `packages/hot-updater/package.json` 版本号（若本次涉及 OTA 包）
6. `templates/expo-starter/package.json` 版本号
7. 模板依赖的 `@gaozh1024/rn-kit` 版本范围
8. `docs/release-notes/` 是否新增对应 release notes
9. `docs/README.md` 是否新增文档入口

推荐顺序：

- 先确定 `rn-kit` / `aliyun-speech` / `photo-album-picker` / `aliyun-push` / `hot-updater` 版本
- 再同步模板依赖版本（如有）
- 再补文档与 release notes
- 如果走 CI 发布，确保 `.github/workflows/release.yml` 指向当前 monorepo 的真实包与 `changeset publish`

## 3. 正式版发布

### 3.1 登录 npm

```bash
npm login
```

### 本次联动发布：rn-kit 0.6.1 + expo-starter 0.3.2

本次只发布两个包，并且模板依赖框架包，所以顺序必须是：

1. `@gaozh1024/rn-kit@0.6.1`
2. `@gaozh1024/expo-starter@0.3.2`

发布前最小复核：

```bash
pnpm --dir packages/rn-kit lint
pnpm --dir packages/rn-kit build
pnpm --dir templates/expo-starter lint
pnpm ai:check
git diff --check
```

打包内容复核：

```bash
cd packages/rn-kit
npm_config_cache=/tmp/rn-kit-npm-cache npm pack --dry-run --json

cd ../../templates/expo-starter
npm_config_cache=/tmp/expo-starter-npm-cache npm pack --dry-run --json
```

正式发布：

```bash
cd packages/rn-kit
npm publish --access public

cd ../../templates/expo-starter
npm publish --access public
```

发布后核验：

```bash
npm view @gaozh1024/rn-kit@0.6.1 version
npm view @gaozh1024/expo-starter@0.3.2 version
npm view @gaozh1024/expo-starter@0.3.2 dependencies --json
```

### 3.2 发布框架包

```bash
cd packages/rn-kit
npm publish --access public
```

### 3.3 发布语音包

```bash
cd ../aliyun-speech
npm publish --access public
```

### 3.4 发布相册包

```bash
cd ../photo-album-picker
npm publish --access public
```

### 3.5 发布推送包

```bash
cd ../aliyun-push
npm publish --access public
```

### 3.6 发布热更新包

```bash
cd ../hot-updater
npm publish --access public
```

### 3.7 发布模板包

模板依赖框架包，所以一定要在框架包成功发布后再发模板：

```bash
cd ../../templates/expo-starter
npm publish --access public
```

### 3.8 推荐安装方式

框架包：

```bash
pnpm add @gaozh1024/rn-kit
```

语音包：

```bash
pnpm add @gaozh1024/aliyun-speech
```

相册包：

```bash
pnpm add @gaozh1024/photo-album-picker
```

推送包：

```bash
pnpm add @gaozh1024/aliyun-push aliyun-react-native-push
```

热更新包：

```bash
pnpm add @gaozh1024/hot-updater @hot-updater/react-native
```

模板包：

```bash
npx create-expo-app@latest my-app --template @gaozh1024/expo-starter
```

## 4. Beta / 预发布

如果本次改动较大，建议先发 beta：

```bash
cd packages/rn-kit
npm publish --tag beta --access public

cd ../aliyun-speech
npm publish --tag beta --access public

cd ../photo-album-picker
npm publish --tag beta --access public

cd ../aliyun-push
npm publish --tag beta --access public

cd ../hot-updater
npm publish --tag beta --access public
```

如果模板也需要预发布，可以显式发 beta 版本号后再发布；否则建议模板仍等正式版统一发布。

查看 beta：

```bash
npm view @gaozh1024/rn-kit versions --json | grep beta
npm view @gaozh1024/aliyun-speech versions --json | grep beta
npm view @gaozh1024/photo-album-picker versions --json | grep beta
npm view @gaozh1024/aliyun-push versions --json | grep beta
npm view @gaozh1024/hot-updater versions --json | grep beta
```

安装 beta：

```bash
pnpm add @gaozh1024/rn-kit@beta
pnpm add @gaozh1024/aliyun-speech@beta
pnpm add @gaozh1024/photo-album-picker@beta
pnpm add @gaozh1024/aliyun-push@beta
pnpm add @gaozh1024/hot-updater@beta
```

## 5. Yalc 本地联调

```bash
# 发布到本地 yalc
pnpm yalc:publish

# 推送到已链接项目
pnpm yalc:push
```

适用场景：

- 模板联调
- 真机验证
- 发布前 smoke test

## 6. 模板发布注意事项

1. 不要使用过于通用的无 scope 包名
2. 模板包必须保持可发布状态，不能设置 `private: true`
3. 模板依赖的 `@gaozh1024/rn-kit` 必须已发布
4. 每次升级 Expo SDK 后，要同步更新模板依赖
5. `README` 中的模板包名、scope、命令示例必须和实际发布信息一致

## 7. 推荐发布清单

每次发版建议至少确认：

- [ ] 版本号已更新
- [ ] release notes 已补充
- [ ] 框架 / 语音包 / 相册包 / 推送包 / 模板 README 已同步
- [ ] `typecheck / test / build / lint` 已通过
- [ ] `npm pack --dry-run` 已检查
- [ ] 模板对 `rn-kit` 的依赖版本已同步

## 8. 常见问题

1. **401 Unauthorized**：需要重新 `npm login`
2. **403 Forbidden**：没有包权限，或包名 / scope 配置异常
3. **EPUBLISHCONFLICT**：版本号已存在，需要升级版本
4. **create-expo-app 无法正确拉取模板**：通常是模板包名不唯一，或模板依赖版本未先发布
