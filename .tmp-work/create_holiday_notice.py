import base64
import json
import subprocess
from pathlib import Path

PYTHON = Path('/Users/fairy/Desktop/dsh-desktop/.build/office-runtime/primary-runtime/dependencies/python/bin/python3')
TEMPLATE = Path('/Users/fairy/Desktop/dsh-desktop/.build/office-runtime/templates/government-notice/example.docx')
PROFILE = Path('/Users/fairy/Desktop/dsh-desktop/.build/office-runtime/templates/government-notice/generation.json')
WORKER = Path('/Users/fairy/Desktop/dsh-desktop/packages/dsh-desktop-office/lib/docx-layout.py')
OUTPUT_ROOT = Path('/Users/fairy/Desktop')
OUTPUT_NAME = '北京数据项素公司集中放假通知_2026.docx'
OUTPUT = OUTPUT_ROOT / OUTPUT_NAME

if OUTPUT.exists():
    raise FileExistsError(f'Refusing to overwrite existing file: {OUTPUT}')

payload = {
    'command': 'write',
    'profile': json.loads(PROFILE.read_text(encoding='utf-8')),
    'source': base64.b64encode(TEMPLATE.read_bytes()).decode('ascii'),
    'sourceSha256': '',
    'args': {
        'output_path': OUTPUT_NAME,
        'replacements': [
            {'id': 'p0', 'text': '北京数据项素公司文件'},
            {'id': 'p1', 'text': '【待补充：发文文号】'},
            {'id': 'p3', 'text': '关于公司集中放假安排的通知'},
            {'id': 'p4', 'text': '公司各部门：'},
            {'id': 'p5', 'text': '根据公司工作安排，现将集中放假有关事项通知如下：'},
            {'id': 'p6', 'text': '一、放假时间'},
            {'id': 'p7', 'text': '2026年10月30日（星期五）至11月18日（星期三）放假，共20天。'},
            {'id': 'p8', 'text': '（一）返岗安排'},
            {'id': 'p9', 'text': '各部门员工于2026年11月19日（星期四）起正常到岗上班。请提前做好人员返岗和工作衔接。'},
            {'id': 'p10', 'text': '二、工作要求'},
            {'id': 'p11', 'text': '（一）放假前，各部门应完成相关工作交接，妥善保管办公区域、设备及重要资料，做好安全检查。'},
            {'id': 'p12', 'text': '北京数据项素'},
            {'id': 'p13', 'text': '2026年10月30日'},
            {'id': 'p14', 'text': '发布部门'},
            {'id': 'p15', 'text': '综合管理部'},
        ],
        'additions': [
            {'after': 'p11', 'source': 'p8', 'text': '（二）放假期间'},
            {'after': 'p11', 'source': 'p9', 'text': '各部门应按【待补充：值班安排】做好值班值守，保持通信畅通；遇有紧急情况，按【待补充：应急处置流程】及时报告和处置。'},
            {'after': 'p11', 'source': 'p8', 'text': '（三）返岗后'},
            {'after': 'p11', 'source': 'p9', 'text': '请各部门及时组织员工恢复正常工作秩序，并于【待补充：时间】前完成【待补充：需报送事项】。'},
        ],
        'removals': [],
    },
}
result = subprocess.run(
    [str(PYTHON), str(WORKER)],
    cwd=OUTPUT_ROOT,
    input=json.dumps(payload, ensure_ascii=False).encode('utf-8'),
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    check=False,
)
if result.returncode != 0:
    raise RuntimeError(result.stderr.decode('utf-8', errors='replace'))
print(result.stdout.decode('utf-8'))
print(OUTPUT)
