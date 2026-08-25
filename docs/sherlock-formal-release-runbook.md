# Sherlock 正式版升级发布手册

## 触发与默认行为

用户说“更新上传发布正式版”即授权执行本手册全部步骤。若未指定版本，比较 `package.json` 与公开 `latest-mac.yml` 后，将较高正式版本的补丁号加一。Cloudflare 是正式更新主通道；GitHub Fork 是源码备份通道，不以当前上游 PR 是否可合并作为发布阻塞条件。

## 不可破坏的发布约束

1. 新版本必须高于线上版本，禁止覆盖已发布版本目录。
2. macOS 必须同时生成两条通道：`legacy-bridge` ZIP 供已安装 0.6.3 的用户升级，Apple 公证的 DMG/ZIP 供新安装和后续正式更新。禁止用 Developer ID 直接覆盖旧更新源，否则 0.6.3 会拒绝签名变化。
3. 兼容桥外层签名必须使用 `Sherlock Desktop Update Signing`，指纹 `8B8FCCFB659D94D5C9A9CE2B735EB0FAE457CC7B`；其外层 Info.plist 与指定要求都必须为 `io.dsh.desktop`，内嵌的已公证正式 App 才是 `com.evanarts.sherlock`。
4. 公证通道必须使用 `Developer ID Application: yafeng he (FAV8TLDK73)`，指纹 `DDFBC7F4DA5EC49721E454BB06329C6D1E8A7B9F`，并通过 Apple notarization、stapling 和 Gatekeeper 检查。
5. 旧自签名身份备份位于 `/Users/heyafeng/Documents/Sherlock Release Backup/Sherlock-Desktop-Update-Signing-8B8FCCFB.p12`；密码存于 macOS 钥匙串，service 为 `Sherlock Update Signing P12 Backup Password`，account 为 `Sherlock Release Backup`。
6. 先上传不可变版本资源，再更新公证 DMG 稳定下载别名，最后分别提升 `latest/latest-mac.yml` 与 `notarized/latest/latest-mac.yml`。发布脚本已按此顺序执行。
7. 不丢弃、覆盖或顺手提交用户的无关改动；禁止 `git add -A`、强推和直接推送上游 `origin/main`。
8. 当前正式渠道是 macOS Apple Silicon。没有同时构建 Intel/Windows 时，不宣称这两个平台已发布。
9. 已安装 0.6.3 的用户长期走旧证书兼容 feed；新下载用户走 Developer ID 公证 feed。每次发布都必须维护两套签名 ZIP，除非未来另行实现并真实验证签名迁移安装器。

## 1. 发布前检查

在 `/Users/heyafeng/Documents/ChatGPT/dsh` 中：

```bash
git status --short --branch
git diff --check
security find-identity -v -p codesigning
xcrun notarytool history \
  --key /Users/heyafeng/Downloads/AuthKey_KSJ7725349.p8 \
  --key-id KSJ7725349 \
  --issuer 840d0b5c-4924-4f62-8a86-6201e832a4d6
curl -fsS https://updates.evanarts.com/latest/latest-mac.yml
curl -fsS https://updates.evanarts.com/notarized/latest/latest-mac.yml
```

- 记录工作区已有改动并区分当前开发成果与无关文件；打包使用用户确认的当前开发成果，但只提交发布相关文件。
- 确认两张钥匙串身份名称和指纹均匹配，并验证 App Store Connect API key 可访问公证历史。旧兼容身份缺失时先从加密 P12 恢复，不能生成新证书代替。恢复密码必须捕获到进程变量，禁止输出到日志：

```bash
sherlock_signing_keychain="$(security default-keychain -d user | tr -d '\"')"
sherlock_p12_password="$(security find-generic-password \
  -a 'Sherlock Release Backup' \
  -s 'Sherlock Update Signing P12 Backup Password' \
  -w)"
security import \
  '/Users/heyafeng/Documents/Sherlock Release Backup/Sherlock-Desktop-Update-Signing-8B8FCCFB.p12' \
  -k "$sherlock_signing_keychain" \
  -P "$sherlock_p12_password" \
  -T /usr/bin/codesign \
  -T /usr/bin/productbuild
unset sherlock_p12_password
```

若导入后身份仍未被识别为有效代码签名身份，停止发布并修复证书信任；不能切换到另一张证书。

- 保存线上旧元数据、稳定 DMG 别名和本地旧版 App，以便真实升级测试及异常回滚。必须在正式打包覆盖 `dist` 前执行：

```bash
sherlock_release_tmp="$(mktemp -d /tmp/sherlock-formal-release.XXXXXX)"
./node_modules/.bin/wrangler r2 object get \
  sherlock-releases/latest/latest-mac.yml \
  --remote \
  --file "$sherlock_release_tmp/previous-legacy-latest-mac.yml"
./node_modules/.bin/wrangler r2 object get \
  sherlock-releases/notarized/latest/latest-mac.yml \
  --remote \
  --file "$sherlock_release_tmp/previous-notarized-latest-mac.yml" || true
./node_modules/.bin/wrangler r2 object get \
  sherlock-releases/download/sherlock-mac-arm64.dmg \
  --remote \
  --file "$sherlock_release_tmp/previous-sherlock-mac-arm64.dmg"
ditto /path/to/verified/Sherlock-0.6.3.app "$sherlock_release_tmp/Sherlock-previous.app"
```

## 2. 版本与聚焦验证

以下以 `0.6.4` 为例，实际使用计算出的版本：

```bash
npm version 0.6.4 --no-git-tag-version

npm test -- \
  test/app-identity.test.ts \
  test/update.test.ts \
  test/update-manager.test.ts \
  test/sidebar-update-control.test.ts \
  test/cloudflare-release.test.ts \
  test/release.test.ts \
  test/macos-self-signed-update.test.ts \
  test/macos-package-runtime.test.ts \
  test/brand-migration.test.ts

npm run typecheck
npm run build
```

增加本次源码改动直接涉及的测试，但不运行全功能测试。任何失败都应先定位修复并重跑相关检查，不能带失败继续发布。

## 3. 正式打包与签名验证

```bash
./script/build_and_run.sh --formal

bridge_check="$(mktemp -d /tmp/sherlock-bridge-check.XXXXXX)"
ditto -x -k dist-legacy/sherlock-mac-arm64-legacy.zip "$bridge_check"
/usr/libexec/PlistBuddy -c 'Print :CFBundleIdentifier' \
  "$bridge_check/Sherlock.app/Contents/Info.plist"
codesign --verify --deep --strict --verbose=2 "$bridge_check/Sherlock.app"
codesign --verify --strict \
  -R='identifier "io.dsh.desktop" and certificate root = H"8b8fccfb659d94d5c9a9ce2b735eb0fae457cc7b"' \
  "$bridge_check/Sherlock.app"
/usr/libexec/PlistBuddy -c 'Print :CFBundleIdentifier' \
  "$bridge_check/Sherlock.app/Contents/Resources/Sherlock.app/Contents/Info.plist"
xcrun stapler validate \
  "$bridge_check/Sherlock.app/Contents/Resources/Sherlock.app"
test -x \
  "$bridge_check/Sherlock.app/Contents/Frameworks/Squirrel.framework/Versions/A/Resources/ShipIt"
test -d "$bridge_check/Sherlock.app/Contents/Frameworks/Mantle.framework"
test -d "$bridge_check/Sherlock.app/Contents/Frameworks/ReactiveObjC.framework"

/usr/libexec/PlistBuddy -c 'Print :CFBundleIdentifier' \
  dist-notarized/mac-arm64/Sherlock.app/Contents/Info.plist
codesign --verify --deep --strict --verbose=2 dist-notarized/mac-arm64/Sherlock.app
xcrun stapler validate dist-notarized/mac-arm64/Sherlock.app
xcrun stapler validate dist-notarized/sherlock-mac-arm64.dmg
spctl --assess --type execute --verbose=2 dist-notarized/mac-arm64/Sherlock.app
spctl --assess --type open --context context:primary-signature --verbose=2 \
  dist-notarized/sherlock-mac-arm64.dmg
hdiutil verify dist-notarized/sherlock-mac-arm64.dmg
```

必须确认：兼容桥外层 Info.plist 是 `io.dsh.desktop` 并满足 0.6.3 的旧指定要求，内嵌 App 与公证 App 的 Info.plist 是 `com.evanarts.sherlock`；兼容桥含可执行 ShipIt 及 Squirrel/Mantle/ReactiveObjC；公证 App/DMG 均通过 Apple 验证；`dist-release` 同时包含旧桥 ZIP、公证 ZIP/DMG、两个 `latest-mac.yml`。`--formal` 只能用临时 `--sherlock-user-data-dir` 打开公证版，不能提前迁移用户真实数据。

## 4. Cloudflare 预演与正式提升

先预演，不写远端：

```bash
npm run release:cloudflare -- \
  --bucket sherlock-releases \
  --version 0.6.4 \
  --tag v0.6.4 \
  --assets dist-release \
  --prepared "$sherlock_release_tmp/prepared" \
  --dry-run
```

确认计划中 `immutable` 在前、`stable` 居中、`metadata` 最后，再去掉 `--dry-run` 正式发布。不要手工提前上传 `latest-mac.yml`。

正式上传前，对预演列出的每个 `releases/v<version>/...` 不可变 key 执行一次远端存在性检查。目标 key 不存在才允许继续；若已存在，禁止覆盖，也禁止复用该版本号。

## 5. 公开更新源验证

```bash
curl -fsS https://updates.evanarts.com/latest/latest-mac.yml \
  | grep -F 'version: 0.6.4'
curl -fsS https://updates.evanarts.com/notarized/latest/latest-mac.yml \
  | grep -F 'version: 0.6.4'
curl -fsSI https://updates.evanarts.com/latest/latest-mac.yml \
  | grep -Eiq '^cache-control:.*no-cache'
curl -fsS --range 0-0 -o /dev/null \
  https://updates.evanarts.com/releases/v0.6.4/sherlock-mac-arm64-legacy.zip
curl -fsS --range 0-0 -o /dev/null \
  https://updates.evanarts.com/releases/v0.6.4/sherlock-mac-arm64.zip
curl -fsSI \
  https://updates.evanarts.com/releases/v0.6.4/sherlock-mac-arm64.zip \
  | grep -Eiq '^cache-control:.*immutable'
```

先独立验证默认目录迁移恢复逻辑；目标目录可预先存在但不能覆盖其中的新值：

```bash
migration_root="$sherlock_release_tmp/migration-app-data"
mkdir -p "$migration_root/dsh-desktop/harness" \
  "$migration_root/sherlock-desktop/harness"
printf 'legacy-sentinel' > \
  "$migration_root/dsh-desktop/harness/legacy-sentinel.txt"
printf 'new-settings' > \
  "$migration_root/sherlock-desktop/harness/settings.yaml"
open -na dist-legacy/mac-arm64/Sherlock.app --args \
  "--sherlock-app-data-dir=$migration_root"
# 启动完成后确认 legacy-sentinel 已复制、new-settings 未被覆盖、迁移 marker 已生成。
```

再使用打包前保存的旧正式版做真实自动升级验证，并使用隔离用户数据目录，不能拿用户的正式数据做试验：

```bash
mkdir -p "$sherlock_release_tmp/update-user-data"
open -na "$sherlock_release_tmp/Sherlock-previous.app" --args \
  --sherlock-user-data-dir="$sherlock_release_tmp/update-user-data"
```

写入并记录一个数据哨兵，然后完成发现更新、点击下载、下载完成、确认重启、重新打开为新版本，并确认：版本已更新、Info.plist 已切到 `com.evanarts.sherlock`、同一路径数据哨兵未变化、更新按钮恢复隐藏。该步骤验证真实 updater；上一段单独验证默认 `dsh-desktop → sherlock-desktop` 迁移，禁止把两者混为同一证据。

DSH 共存必须使用两个不同哨兵：DSH Desktop 保持 `dsh-desktop`，Sherlock 保持 `sherlock-desktop`，两个进程同时存在且互不改写对方哨兵。

从公开稳定地址重新下载 DMG 后执行固定 Gatekeeper 验证：

```bash
public_dmg="$sherlock_release_tmp/public-sherlock-0.6.4.dmg"
curl -fL https://updates.evanarts.com/download/sherlock-mac-arm64.dmg \
  -o "$public_dmg"
xattr -w com.apple.quarantine '0081;00000000;Safari;' "$public_dmg"
xcrun stapler validate "$public_dmg"
spctl --assess --type open --context context:primary-signature --verbose=2 "$public_dmg"
mount_output="$(hdiutil attach -nobrowse "$public_dmg")"
mount_point="$(printf '%s\n' "$mount_output" | awk '/\/Volumes\// { sub(/^.*\/Volumes\//, "/Volumes/"); print; exit }')"
/usr/libexec/PlistBuddy -c 'Print :CFBundleIdentifier' \
  "$mount_point/Sherlock.app/Contents/Info.plist"
/usr/libexec/PlistBuddy -c 'Print :CFBundleShortVersionString' \
  "$mount_point/Sherlock.app/Contents/Info.plist" | grep -Fx '0.6.4'
xcrun stapler validate "$mount_point/Sherlock.app"
spctl --assess --type execute --verbose=2 "$mount_point/Sherlock.app"
open -na "$mount_point/Sherlock.app" --args \
  "--sherlock-user-data-dir=$sherlock_release_tmp/public-smoke-user-data"
# 等到真实窗口可用且进程稳定后，再执行 detach。
hdiutil detach "$mount_point"
```

首次创建公证 feed 时，没有上一版公证 App，`notarized → new` 真实自动升级标记为不适用。从下一个版本开始必须同时保存上一版公证 App，并对 `/notarized/latest/` 再完成一次真实下载、重启安装和版本确认。

若没有旧版测试夹具，必须明确报告未完成，不能把网络检查冒充真实升级验证。真实升级或 Gatekeeper 验证失败属于发布失败，必须分别回滚两个公开元数据入口和稳定 DMG。

若发布命令在写入稳定 DMG 后的任何阶段报错、提升后的公开元数据异常，或真实升级失败，立即恢复旧元数据和稳定 DMG 下载别名，再验证公开入口已回到旧版本；不可变版本资源可以保留：

```bash
./node_modules/.bin/wrangler r2 object put \
  sherlock-releases/latest/latest-mac.yml \
  --remote \
  --file "$sherlock_release_tmp/previous-legacy-latest-mac.yml" \
  --content-type application/yaml \
  --cache-control 'no-cache, max-age=0, must-revalidate'
./node_modules/.bin/wrangler r2 object put \
  sherlock-releases/notarized/latest/latest-mac.yml \
  --remote \
  --file "$sherlock_release_tmp/previous-notarized-latest-mac.yml" \
  --content-type application/yaml \
  --cache-control 'no-cache, max-age=0, must-revalidate'
./node_modules/.bin/wrangler r2 object put \
  sherlock-releases/download/sherlock-mac-arm64.dmg \
  --remote \
  --file "$sherlock_release_tmp/previous-sherlock-mac-arm64.dmg" \
  --content-type application/x-apple-diskimage \
  --cache-control 'no-cache, max-age=0, must-revalidate'
```

若发布前 `notarized/latest/latest-mac.yml` 为 404，则不要执行上面的 notarized 元数据恢复命令；应精确删除本次新建的 key：

```bash
./node_modules/.bin/wrangler r2 object delete \
  sherlock-releases/notarized/latest/latest-mac.yml --remote
```

## 6. 源码同步

线上验证成功后，检查并仅暂存本次发布相关文件，提交信息使用 `release: publish Sherlock <version>`。推送到：

```bash
git push https://github.com/hyf901111-design/dsh-desktop.git \
  HEAD:refs/heads/codex/sherlock-cloudflare-updates
```

当前不要创建 `v<version>` Git 标签，因为 Fork 的完整 GitHub Release Secrets/Runner 尚未配置，标签会触发失败的工作流。GitHub 推送失败不回滚已经验证成功的 Cloudflare 版本；修复认证后重试源码同步。

若既有 Fork 发布分支发生非快进分歧，禁止强推，也不要为了 Git 同步改写已经验证的发布提交。把当前发布提交推到新的版本化备份分支，例如：

```bash
git push https://github.com/hyf901111-design/dsh-desktop.git \
  HEAD:refs/heads/codex/sherlock-cloudflare-updates-0.6.4
```

此时 Cloudflare 发布保持有效，在最终报告中把主发布分支同步标记为待处理，并给出新备份分支链接。

## 完成标准

最终汇报分别列出：版本与提交、聚焦测试和类型检查、应用/DMG 签名、Cloudflare 元数据与 Range/缓存验证、真实旧版升级验证、GitHub Fork 推送。所有发布步骤成功且无待处理故障后才称为“正式版发布完成”。
