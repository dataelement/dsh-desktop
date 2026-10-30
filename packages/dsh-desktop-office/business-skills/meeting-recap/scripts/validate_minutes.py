#!/usr/bin/env python3
"""Check minutes structure; factual fidelity is checked against source material."""
import re
import sys
from datetime import date
from pathlib import Path


class ValidationResult:
    def __init__(self):
        self.errors, self.warnings, self.info = [], [], []

    @property
    def passed(self):
        return not self.errors

    def report(self):
        lines = ['会议纪要结构校验：' + ('通过' if self.passed else '需修正')]
        for kind, items in [('错误', self.errors), ('待确认', self.warnings), ('信息', self.info)]:
            lines += [kind + '：' + item for item in items]
        return '\n'.join(lines)


def section(content, names):
    for name in names:
        match = re.search(r'^##\s+' + re.escape(name) + r'[^\n]*\n(.*?)(?=^##\s|\Z)', content, re.M | re.S)
        if match:
            return match.group(1)
    return None


def cells(line):
    value = line.strip()
    if value.startswith('|'):
        value = value[1:]
    if value.endswith('|'):
        value = value[:-1]
    return [cell.strip() for cell in value.split('|')]


def validate(content):
    result = ValidationResult()
    if not re.search(r'^#\s+.*会议纪要', content, re.M):
        result.errors.append('主标题应包含会议纪要')
    topics = section(content, ['议题记录', '详细记录'])
    if topics is None or not topics.strip():
        result.errors.append('请提供议题记录及明确的事项状态')
    actions = section(content, ['行动项', '行动项汇总'])
    if actions is None or not actions.strip():
        result.errors.append('请列出行动项，或记录本次明确没有新增任务')
        return result
    table = [cells(line) for line in actions.splitlines() if line.strip().startswith('|')]
    if table:
        header = table[0]
        aliases = [('任务', '任务描述', '事项'), ('负责人',), ('期限', '截止日期'), ('交付标准', '完成标准', '交付物')]
        positions = []
        for labels in aliases:
            index = next((i for i, value in enumerate(header) if value in labels), None)
            if index is None:
                result.errors.append('行动项表需包含' + labels[0])
            positions.append(index)
        if all(index is not None for index in positions):
            seen = set()
            count = 0
            for row in table[1:]:
                if all(re.fullmatch(r':?-+:?', value.replace(' ', '')) for value in row):
                    continue
                if len(row) != len(header):
                    result.errors.append('行动项列数与表头一致'); continue
                count += 1
                values = [row[i] for i in positions]
                if any(not value for value in values):
                    result.errors.append('行动项缺失字段请标为待确认')
                task, owner, deadline, deliverable = values
                identity = re.sub(r'\s+', '', task)
                if identity in seen:
                    result.errors.append('重复任务请合并：' + task)
                seen.add(identity)
                if any('待确认' in value for value in values):
                    result.warnings.append(task + '有待确认字段')
                for value in re.findall(r'\b\d{4}-\d{2}-\d{2}\b', deadline):
                    try:
                        date.fromisoformat(value)
                    except ValueError:
                        result.errors.append('请核对期限中的日期：' + value)
            if count == 0:
                result.errors.append('请填写行动项，或用正文记录本次明确没有新增任务')
            result.info.append('行动项数量：' + str(count))
    return result


if __name__ == '__main__':
    if len(sys.argv) != 2:
        sys.exit('用法：python3 validate_minutes.py 会议纪要.md')
    result = validate(Path(sys.argv[1]).read_text(encoding='utf-8'))
    print(result.report())
    sys.exit(0 if result.passed else 1)
