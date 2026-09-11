"""Build the offline Skill catalogue from the reviewed, user-supplied archive."""
import argparse
import hashlib
import json
import re
import stat
import zipfile
from pathlib import Path, PurePosixPath

parser = argparse.ArgumentParser()
parser.add_argument('--archive', type=Path, required=True)
parser.add_argument('--review', type=Path, required=True)
parser.add_argument('--extra-skill', type=Path, action='append', default=[])
args = parser.parse_args()
destination = Path(__file__).resolve().parents[1] / 'packages/dsh-office/business-skills'
inventory = json.loads((args.review / 'inventory-classified.json').read_text())
review = json.loads((args.review / 'review-summary.json').read_text())
archive = json.loads((args.review / 'archive-manifest.json').read_text())
digest = lambda data: hashlib.sha256(data).hexdigest()
assert digest(args.archive.read_bytes()) == archive['sha256'], 'Archive differs from the reviewed revision'
assert len(inventory) == len({item['id'] for item in inventory}) == 185
payloads = {}
with zipfile.ZipFile(args.archive) as source:
    for info in source.infolist():
        if info.is_dir():
            continue
        parts = PurePosixPath(info.filename).parts
        assert len(parts) >= 3 and parts[0] == '开源skill合集'
        assert all(part not in ('', '.', '..') for part in parts)
        assert '\\' not in info.filename and not stat.S_ISLNK(info.external_attr >> 16)
        relative = '/'.join(parts[1:])
        assert relative not in payloads and info.file_size <= 1024 * 1024
        payloads[relative] = source.read(info)
assert len(payloads) == archive['files'] and sum(map(len, payloads.values())) == archive['uncompressed_bytes']
expected = {f"{item['id']}/{file}" for item in inventory for file in item['files']}
assert set(payloads) == expected, 'Reviewed catalogue and archive resources differ'

entries = []
for item in sorted(inventory, key=lambda row: row['id']):
    name = item['id']
    assert re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*', name) and name == item['name']
    files = {file: {'sha256': digest(payloads[f'{name}/{file}']), 'bytes': len(payloads[f'{name}/{file}'])}
             for file in sorted(item['files'])}
    category = item['category']
    modes = ['word', 'excel'] if category in ['数据与财务分析', '可视化与样式'] else ['word'] if category in ['文档与业务方案', '文案与语言处理'] else ['general']
    entries.append({
        'name': name, 'description': item['description'], 'family': item['family'],
        'category': category, 'suggestedModes': modes,
        'license': item['frontmatter'].get('license'),
        'licenseFiles': [file for file in files if PurePosixPath(file).name.upper().startswith(('LICENSE', 'NOTICE'))],
        'dependencies': [module for module, names in review['dependency_imports'].items() if name in names],
        'scripts': item['scripts'], 'revision': files['SKILL.md']['sha256'], 'files': files,
    })

additions = []
for folder in args.extra_skill:
    name = folder.name
    assert name == 'gov-doc-writing', 'Register metadata for each additional Skill explicitly'
    files = {}
    for file in sorted(folder.rglob('*')):
        assert not file.is_symlink()
        if not file.is_file():
            continue
        relative = file.relative_to(folder).as_posix()
        data = file.read_bytes()
        assert len(data) <= 1024 * 1024
        payloads[f'{name}/{relative}'] = data
        files[relative] = {'sha256': digest(data), 'bytes': len(data)}
    entries.append({'name': name, 'description': '按单位性质、部门、文种与角色撰写和审阅公文，包括通知、请示、报告、函、工作方案、讲话和会议纪要；提供事实核对、文种结构与公文排版规范。',
        'family': '公文写作', 'category': '文档与业务方案', 'suggestedModes': ['word'],
        'license': None, 'licenseFiles': [], 'dependencies': [], 'scripts': [],
        'revision': files['SKILL.md']['sha256'], 'files': files})
    additions.append({'name': name, 'source': 'User-authorized local Skill package', 'version': '2.0.4', 'files': len(files), 'revision': files['SKILL.md']['sha256']})

destination.mkdir(parents=True, exist_ok=True)
for relative, data in payloads.items():
    target = destination / 'source' / relative
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(data)
catalog = {'version': 1, 'sourceArchive': args.archive.name, 'sourceSha256': archive['sha256'],
           'archiveSkillCount': 185, 'additions': additions, 'skillCount': len(entries), 'resourceCount': len(payloads), 'entries': entries}
(destination / 'catalog.json').write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + '\n')
(destination / 'NOTICE.md').write_text(
    '# Bundled business Skills\n\n'
    f"Source: user-supplied `{args.archive.name}`.\n\nSHA-256: `{archive['sha256']}`.\n\n"
    'All 185 original archive Skill directories and 667 files are preserved byte for byte under `source/`, '
    'including their original license and attribution files. `catalog.json` records every resource hash, '
    'the original declarations and the reviewed capability categories. DSH runtime guidance is maintained '
    'separately in `lib/business-skills.js`; the original Skill files retain their original terms.\n\n'
    'Additional user-authorized local Skills are recorded separately in catalog.additions with their source revision. '
    'Their original text and references are retained; no new license is assigned to these additions.\n\n'
    'The catalogue makes each Skill discoverable. Execution uses the active session tools, policy and '
    'available dependencies; catalogue membership records availability of instructions and resources.\n', encoding='utf8')
print(json.dumps({'skills': len(entries), 'resources': len(payloads), 'output': str(destination)}))
