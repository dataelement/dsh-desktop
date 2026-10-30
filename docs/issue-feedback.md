# Issue 等待反馈与自动关闭

只有维护者明确需要用户提供复现结果或必要信息时，才加 `needs-feedback`。
确认仍未修复的缺陷、等待 PR 合并或等待发版的 issue 不加此标签，不能用“无反馈”代替修复。

工作流合并到默认分支后，每天 UTC 02:17（北京时间 10:17）检查一次：

- 带 `needs-feedback` 的 issue 至少 14 天没有新动态后，留言提醒并加 `feedback-reminded`。
- 再过 7 天仍无新动态，留言说明因信息不足关闭，使用 `not_planned` 原因并加 `closed-no-feedback`，不冒充已修复。
- 仅处理 issue，不处理 PR。GitHub 定时任务可能延迟，因此日期是最短等待时间，不是精确关闭时刻。
- `keep-open` 始终排除定时处理。需要停止倒计时时，移除 `needs-feedback` 与 `feedback-reminded`；重新请求反馈时先清除旧提醒标签，再加 `needs-feedback`。
- 倒计时依据 GitHub 的更新时间；评论、维护者修改等新动态也可能延长等待，不只统计报告者回复。

非机器人的新评论会移除三个等待/自动关闭标签，并加 `feedback-received`，退出自动关闭流程。
若已因无反馈自动关闭，会重新打开；人工关闭且没有自动关闭标记的 issue 不会自动重开。
机器人的评论和 PR 评论不会触发此处理。回复内容不被执行，也不会被用于拼接脚本。

维护者处理 `feedback-received` 后移除此标签。若还需补充信息，应明确说明缺少什么，再重新加 `needs-feedback`。
关闭后的回复如未触发工作流，用户仍可手动重开或新建 issue；维护者应检查 Actions 的失败日志。

使用前需建立以下仓库标签：`needs-feedback`、`feedback-reminded`、`closed-no-feedback`、`feedback-received`、`keep-open`。
首次纳入等待反馈时，留下版本、待补充内容、14 天提醒/再等 7 天关闭的说明；不要只打标签而不给用户说明。
已有未修复问题保持原状，不批量套用此规则。
