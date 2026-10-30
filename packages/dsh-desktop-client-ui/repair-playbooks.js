/** Bilingual incident references owned by the repair mode, never pasted into user messages. */
export function repairPlaybooks() {
  // Paths stay in the Directories section above: repeating absolute Windows
  // paths in every entry is what made this block unreadable.
  return [
    {
      title: { zh: '插件加载失败', en: 'Plugin failed to load' },
      symptom: {
        zh: '`plugin tree failed to load`、`failed to apply|import loader entry <行id> (<包名>)`，或 `does not provide an export named`。',
        en: '`plugin tree failed to load`, `failed to apply|import loader entry <row id> (<package>)`, or `does not provide an export named`.'
      },
      cause: {
        zh: '括号里的包名才是插件，外层 `cordis:include` 只是包装；`does not provide an export named` 是它引用了新版已移除的导出。',
        en: 'The parenthesized package is the plugin; the outer `cordis:include` is a wrapper. `does not provide an export named` means it imports an export this Harness removed.'
      },
      fix: {
        zh: '先通过应用修复界面升级并重启；仍失败时，说明影响并经用户确认后停用相关插件并重启验证。无升级时可先停用。',
        en: 'Upgrade through the application repair UI and restart first. If it still fails, explain the effect and obtain confirmation before reversibly disabling the related plugin and restarting. Disable first only when no upgrade exists.'
      }
    },
    {
      title: { zh: '插件包损坏', en: 'Plugin package broken' },
      symptom: {
        zh: '包目录下的 `cordis.patch.yml` 或入口文件 `ENOENT`，或包自带 patch 解析失败。',
        en: '`ENOENT` for the package\'s `cordis.patch.yml` or entry file, or its own patch fails to parse.'
      },
      cause: {
        zh: '安装中断。加载器在用户 patch 层之前就读包自带的 patch，所以普通停用拿不到可关的加载行。',
        en: 'An interrupted install. The loader reads the package\'s own patch before the user patch layer, so an ordinary disable has no row to switch off.'
      },
      fix: {
        zh: '先分清坏在哪一层：node_modules/<包名> 多是安装 generation 的链接，下一次启动会重建。先核对链接与真实包，缺 package.json 或声明的 patch 才说明安装损坏。使用应用修复界面升级；仍失败时可停用相关插件。若不能安全停用，保留证据和备份并继续本维修会话，不把停用偷偷替换成卸载，也不自动删除包。',
        en: 'First distinguish the projected link from its installed generation. Verify the link and real package; only a missing package.json or declared patch in the real package proves installation damage. Upgrade through the repair UI, then disable the related plugin if needed. If reversible disable is unavailable, preserve evidence and backups and continue this repair conversation. Never silently substitute uninstall for disable or delete a package.'
      },
      avoid: {
        zh: '**不要自己删包目录**，也不要教用户删。界面卸载是一条带恢复日志的事务：备份材料、清理插件注册的组件、撤销安装记录里的 generation 指针。手删只去掉文件，安装记录还在，下次启动会按它重新投影，用户还丢了可撤销的备份。',
        en: '**Never delete the package folder yourself**, and do not tell the user to. The UI removal is a journaled transaction: it backs the material up, cleans the components the plugin registered, and revokes the generation pointer in the install records. Deleting files only removes the files — the install record still points at it, the next launch projects it back, and the user loses the recoverable backup.'
      }
    },
    {
      title: { zh: 'Windows 模块回退目录 EPERM', en: 'Windows EPERM in the module fallback folder' },
      symptom: {
        zh: '`EPERM: operation not permitted, symlink`，路径在 `profiles\\node_modules\\`，栈里有 `ensureSymlink` / `healProfilesModuleFallbackLocked`。',
        en: '`EPERM: operation not permitted, symlink` under `profiles\\node_modules\\`, with `ensureSymlink` / `healProfilesModuleFallbackLocked` in the stack.'
      },
      cause: {
        zh: '升级后重建回退链接，旧链接被其他 DSH 进程或杀软占用。与安装盘、开发者模式无关。',
        en: 'An upgrade rebuilds the fallback links and an old one is held by another DSH process or antivirus. Unrelated to the install drive or Developer Mode.'
      },
      fix: {
        zh: '仅在安全模式下，确认报错项是宿主生成、可重建的链接并向用户说明后处理：安全模式不用 `profiles\\node_modules`，删掉报错指到的那一项（junction 用 `Remove-Item -Recurse -Force`），下次启动重建。删除同样 EPERM 说明占用还在，请用户退干净所有 DSH 进程（任务管理器确认）、必要时临时放行杀软，再重启。',
        en: 'Only in Safe Mode, first verify the exact entry is a host-generated, rebuildable link and explain the change. Safe Mode does not use `profiles\\node_modules`, so delete the entry the error names (`Remove-Item -Recurse -Force` for a junction) and the next launch rebuilds it. If that delete is EPERM too, the holder is still alive: have the user quit every DSH process (Task Manager), exempt the folder from antivirus if needed, and restart.'
      },
      avoid: {
        zh: '不要建议开发者模式或重装到 C 盘，不要删整个 `profiles\\node_modules`。',
        en: 'No Developer Mode, no reinstall on C:, and never delete the whole `profiles\\node_modules`.'
      }
    },
    {
      title: { zh: '用户 patch 层损坏', en: 'User patch layer corrupt' },
      symptom: {
        zh: '`YAMLException` 或 `failed to parse overlay`，指向正常 profile 的 `cordis.patch.yml`。',
        en: '`YAMLException` or `failed to parse overlay` pointing at the normal profile\'s `cordis.patch.yml`.'
      },
      cause: {
        zh: '强制关机截断了文件，或手工编辑出错。',
        en: 'A forced shutdown truncated it, or a hand edit broke it.'
      },
      fix: {
        zh: '读取最内层解析位置，先说明并备份，再经确认做最小修正或恢复已验证的备份；不可把无法解析的整个配置直接清成空列表。',
        en: 'Read the innermost parse location, explain and back up the file, then make the smallest approved correction or restore a verified backup. Never clear the whole configuration to an empty list.'
      }
    },
    {
      title: { zh: '启动超时', en: 'Startup timeout' },
      symptom: {
        zh: '`waiting for Harness` 之后被看门狗 `SIGTERM`，且没有更早的入口报错。',
        en: 'The watchdog `SIGTERM`s after `waiting for Harness`, with no earlier entry failure.'
      },
      cause: {
        zh: '某个插件在启动主链路里下载大文件或扫描大量数据。',
        en: 'A plugin downloads or scans heavily on the startup path.'
      },
      fix: {
        zh: '日志里最后活动的插件只是线索，不代表已确认根因。结合加载器归属和时间证据，经确认停用相关第三方插件并重启验证。',
        en: 'The last active plugin is only a lead, not proven attribution. Check loader ownership and timing evidence, then obtain confirmation to disable related third-party plugins and restart.'
      }
    },
    {
      title: { zh: '自建 preset 挂不上', en: 'A user preset fails to mount' },
      symptom: {
        zh: '`agent-presets: preset "<id>" failed to mount: ...`，后跟 `missing required value` / `expected … but got …` / `names no plugin` / `not valid YAML`，通常带键路径。坏的是默认 preset 时，所有会话都建不出来。',
        en: '`agent-presets: preset "<id>" failed to mount: ...` with `missing required value` / `expected … but got …` / `names no plugin` / `not valid YAML`, usually naming the key. If the broken one is the default, no session can be created at all.'
      },
      cause: {
        zh: '`.agent-presets/<id>/agent.cordis.yml` 是从旧版内置 preset 复制的，升级后配置键改了名或类型。启动和导入会先把 persona 的 `text` 改成 `prefix`，第一次原文在 `.agent-presets/.persona-prefix-backups/<id>/`。仍挂不上才需要手修。',
        en: '`.agent-presets/<id>/agent.cordis.yml` was copied from an older shipped preset and an upgrade renamed a key or changed its type. Startup and import already rename a persona `text` key to `prefix`; the first original is in `.agent-presets/.persona-prefix-backups/<id>/`. Hand repair is only for what that rewrite could not fix.'
      },
      fix: {
        zh: '以内置同源那份为基准，备份后只改报错指到的键，改完确认 YAML 能解析。对照时可以用 `.persona-prefix-backups` 里的原文，不要删掉它。',
        en: 'Use the shipped original as the baseline, back up, change only the key the error names, and confirm the YAML parses. The copy in `.persona-prefix-backups` is the original to compare against; do not delete it.'
      },
      avoid: {
        zh: '不要删整个 preset 目录，也不要改内置 preset。',
        en: 'Do not delete the preset folder or edit a shipped preset.'
      }
    }
  ]
}

export function repairPlaybookManual() {
  return repairPlaybooks().map((entry, index) => [
    `${index + 1}. ${entry.title.zh} / ${entry.title.en}`,
    `症状 / Symptoms: ${entry.symptom.zh} ${entry.symptom.en}`,
    `原因 / Cause: ${entry.cause.zh} ${entry.cause.en}`,
    `处理 / Fix: ${entry.fix.zh} ${entry.fix.en}`,
    ...(entry.avoid ? [`避免 / Avoid: ${entry.avoid.zh} ${entry.avoid.en}`] : [])
  ].join('\n')).join('\n\n')
}
