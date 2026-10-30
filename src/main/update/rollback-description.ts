/** Do not expose updater errors or raw paths in the recovery page. */
export function rollbackUnavailableDescription(reason: string | undefined, locale: 'zh' | 'en'): string {
  const descriptions: Record<string, [string, string]> = {
    'unsupported-installation': ['当前安装方式不支持自动回退应用版本。', 'This installation does not support automatic application rollback.'],
    'previous-installed-version-not-recorded': ['未记录本次升级前的应用版本，无法自动回退。', 'The version installed before this upgrade was not recorded.'],
    'data-compatibility-unverified': ['尚未验证旧版本与当前数据的兼容性，暂不能回退。', 'Compatibility between the prior version and current data has not been verified.'],
    'previous-version-archive-unavailable': ['升级前版本的安装包当前不可用。', 'The installer for the previously installed version is unavailable.'],
    'installation-platform-changed': ['安装平台已变化，无法使用原版本回退记录。', 'The installation platform changed; its rollback record cannot be used.'],
    'installation-version-changed': ['当前版本与升级记录不一致，无法确定安全的回退目标。', 'The current version does not match the recorded upgrade.'],
    'rollback-failed': ['上一次应用回退未成功，请进入维修 Agent。', 'The previous application rollback failed. Open the Repair Agent.']
  }
  const fallback: [string, string] = ['当前无法自动回退应用版本，请使用其他修复方式。', 'Automatic application rollback is unavailable. Use another repair option.']
  return (descriptions[reason ?? ''] ?? fallback)[locale === 'zh' ? 0 : 1]
}
