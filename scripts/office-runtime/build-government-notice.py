"""Build the neutral government-notice template and its renamed Source Han subset.

The upstream TrueType variable font is not stored in the repository. Place the
official 2.003R SourceHanSerifSC-VF.ttf at the cache path below, or pass it as
the first argument. The installable package receives only the renamed subset
inside example.docx, plus OFL.txt and font-source.json.
"""
import hashlib
import json
import shutil
import struct
import sys
import zipfile
from pathlib import Path

from fontTools.subset import Options, Subsetter
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import OverlapMode, instantiateVariableFont
from lxml import etree as ET

ROOT = Path(__file__).resolve().parents[2]
OUTPUT = ROOT / 'packages/dsh-desktop-office/sources/curated/government-notice'
CACHE = Path('/tmp/dsh-notice-font/SourceHanSerifSC-VF.ttf')
LICENSE = Path('/tmp/dsh-notice-font/LICENSE.txt')
SOURCE_URL = 'https://github.com/adobe-fonts/source-han-serif/raw/release/Variable/TTF/SourceHanSerifSC-VF.ttf'
SOURCE_SHA256 = '04f163fb935acd9c0caa79e535a43d510a724d25e584d36212e494a9f9db64f4'
SOURCE_VERSION = '2.003R'
FAMILY = 'DSH Gov Song'
POSTSCRIPT = 'DSHGovSong'
FONT_KEY = '{6F2C1B84-9A47-4E15-B3D8-0C5A7E19D462}'
WEIGHT = 600
BUDGET = 10 * 1024 * 1024
W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
XML = 'http://www.w3.org/XML/1998/namespace'
REL = 'http://schemas.openxmlformats.org/package/2006/relationships'
CT = 'http://schemas.openxmlformats.org/package/2006/content-types'
CP = 'http://schemas.openxmlformats.org/package/2006/metadata/core-properties'
DC = 'http://purl.org/dc/elements/1.1/'
DCTERMS = 'http://purl.org/dc/terms/'
XSI = 'http://www.w3.org/2001/XMLSchema-instance'
EP = 'http://schemas.openxmlformats.org/officeDocument/2006/extended-properties'
PRIMARY_NAME_IDS = {1, 2, 3, 4, 6, 16, 17, 18, 21, 22}

ISSUER = '示例市公共服务中心文件'
DOCUMENT_NUMBER = '示例公服〔2026〕1号'
TITLE = '关于开展公园节假日服务安排的通知'
RECIPIENT = '各区公共服务站：'
BODY = '为做好公园节假日服务安排，现将有关事项通知如下。'
HEADING = '一、服务主题和时间'
DETAIL = '服务主题为便民开放，时间为节假日每日 8 时至 18 时。'
SUBHEADING = '（一）开放安排'
SUBDETAIL = '各站点按已确认的时段开放，并保留现场引导。'
SECOND = '二、组织实施'
SECOND_DETAIL = '由示例市公共服务中心负责统筹，各站点落实值班安排。'
SIGNATURE = '示例市公共服务中心'
DATE = '2026年10月30日'


def q(name):
    return f'{{{W}}}{name}'


def sha256(data):
    return hashlib.sha256(data).hexdigest()


def gb2312_level1():
    # Level-1 common characters, not a GB/T 9704 font claim.
    chars = []
    for lead in range(0xB0, 0xD8):
        for trail in range(0xA1, 0xFF):
            if lead == 0xD7 and trail > 0xF9:
                continue
            try:
                chars.append(bytes([lead, trail]).decode('gb2312'))
            except UnicodeDecodeError:
                continue
    return ''.join(chars)


def charset():
    extra = ''.join(chr(code) for code in range(32, 127))
    extra += '，。、；：？！“”‘’（）【】《》—…·．％‰〈〉「」『』〔〕～－×'
    sample = ''.join([ISSUER, DOCUMENT_NUMBER, TITLE, RECIPIENT, BODY, HEADING, DETAIL, SUBHEADING, SUBDETAIL, SECOND, SECOND_DETAIL, SIGNATURE, DATE, '抄送示例市公园管理处'])
    return ''.join(sorted(set(gb2312_level1() + extra + sample)))


def rename_font(font):
    names = {
        1: FAMILY,
        2: 'Regular',
        3: f'{FAMILY} Regular;DSH;modified subset',
        4: FAMILY,
        6: POSTSCRIPT,
        16: FAMILY,
        17: 'Regular',
        18: FAMILY,
        21: FAMILY,
        22: 'Regular',
    }
    table = font['name']
    note = ' This subset is modified and is not an official Adobe release. Adobe does not endorse this version.'
    for record in list(table.names):
        if record.nameID in names:
            record.string = names[record.nameID]
        elif record.nameID == 0 and 'does not endorse' not in record.toUnicode():
            record.string = record.toUnicode() + note
    os2 = font['OS/2']
    os2.usWeightClass = WEIGHT
    os2.fsSelection = (os2.fsSelection & ~0x21) | 0x40
    font['head'].macStyle &= ~0x1
    for tag in ['fvar', 'gvar', 'avar', 'STAT', 'HVAR', 'MVAR', 'VVAR', 'DSIG', 'CFF ', 'CFF2']:
        if tag in font:
            del font[tag]


def build_subset(source, text):
    font = TTFont(source)
    options = Options()
    options.layout_features = ['*']
    options.glyph_names = True
    options.legacy_cmap = True
    options.symbol_cmap = True
    options.notdef_glyph = True
    options.notdef_outline = True
    options.recommended_glyphs = True
    options.name_IDs = ['*']
    options.name_legacy = True
    options.name_languages = ['*']
    options.drop_tables = ['DSIG']
    options.hinting = True
    subsetter = Subsetter(options=options)
    subsetter.populate(text=text)
    subsetter.subset(font)
    static = instantiateVariableFont(font, {'wght': WEIGHT}, static=True, overlap=OverlapMode.REMOVE, updateFontNames=False)
    rename_font(static)
    buffer = Path('/tmp/dsh-notice-font/DSHGovSong.ttf')
    static.save(buffer)
    data = buffer.read_bytes()
    if len(data) > BUDGET:
        raise RuntimeError(f'subset is {len(data)} bytes, above the 10 MiB budget')
    check = TTFont(buffer)
    if 'glyf' not in check or 'fvar' in check:
        raise RuntimeError('subset is not a static TrueType font')
    families = {record.toUnicode() for record in check['name'].names if record.nameID == 1}
    if families != {FAMILY}:
        raise RuntimeError(f'unexpected family names: {families}')
    for record in check['name'].names:
        if record.nameID in PRIMARY_NAME_IDS and any(token in record.toUnicode() for token in ('Source Han', 'SourceHan', '思源', 'Noto')):
            raise RuntimeError(f'reserved name remains in nameID {record.nameID}')
    return data


def obfuscate(data):
    raw = bytes.fromhex(FONT_KEY.strip('{}').replace('-', ''))
    key = raw[::-1]
    prefix = bytearray(data[:32])
    for index in range(32):
        prefix[index] ^= key[index % 16]
    hidden = bytes(prefix) + data[32:]
    restored = bytearray(hidden[:32])
    for index in range(32):
        restored[index] ^= key[index % 16]
    if bytes(restored) + hidden[32:] != data or struct.unpack('>I', data[:4])[0] != 0x00010000:
        raise RuntimeError('font obfuscation did not round-trip to TrueType')
    return hidden


def element(tag, namespace, text=None, **attributes):
    node = ET.Element(f'{{{namespace}}}{tag}')
    for key, value in attributes.items():
        node.set(key, value)
    if text is not None:
        node.text = text
    return node


def run(text, font, size, color=None):
    node = ET.Element(q('r'))
    props = ET.SubElement(node, q('rPr'))
    fonts = ET.SubElement(props, q('rFonts'))
    latin = FAMILY if font == FAMILY else 'Times New Roman'
    for kind in ['ascii', 'hAnsi', 'cs']:
        fonts.set(q(kind), latin)
    fonts.set(q('eastAsia'), font)
    if color:
        ET.SubElement(props, q('color')).set(q('val'), color)
    ET.SubElement(props, q('sz')).set(q('val'), str(size))
    ET.SubElement(props, q('szCs')).set(q('val'), str(size))
    text_node = ET.SubElement(node, q('t'))
    text_node.set(f'{{{XML}}}space', 'preserve')
    text_node.text = text
    return node


def paragraph(text, font, size, *, align='left', before=0, after=0, line=560, line_rule='exact', first_line=0, right=0, color=None, border=False):
    node = ET.Element(q('p'))
    props = ET.SubElement(node, q('pPr'))
    spacing = ET.SubElement(props, q('spacing'))
    spacing.set(q('before'), str(before))
    spacing.set(q('after'), str(after))
    spacing.set(q('line'), str(line))
    spacing.set(q('lineRule'), line_rule)
    if first_line or right:
        indent = ET.SubElement(props, q('ind'))
        if first_line:
            indent.set(q('firstLine'), str(first_line))
        if right:
            indent.set(q('right'), str(right))
    ET.SubElement(props, q('jc')).set(q('val'), align)
    ET.SubElement(props, q('snapToGrid')).set(q('val'), '0')
    if border:
        edges = ET.SubElement(props, q('pBdr'))
        bottom = ET.SubElement(edges, q('bottom'))
        bottom.set(q('val'), 'single')
        bottom.set(q('sz'), '18')
        bottom.set(q('space'), '1')
        bottom.set(q('color'), 'FF0000')
    if text is not None:
        node.append(run(text, font, size, color))
    return node


def cell(text, width):
    node = ET.Element(q('tc'))
    props = ET.SubElement(node, q('tcPr'))
    ET.SubElement(props, q('tcW')).set(q('w'), str(width))
    props.find(q('tcW')).set(q('type'), 'dxa')
    node.append(paragraph(text, 'FangSong', 32, line=360, line_rule='auto'))
    return node


def edition_table():
    table = ET.Element(q('tbl'))
    props = ET.SubElement(table, q('tblPr'))
    width = ET.SubElement(props, q('tblW'))
    width.set(q('w'), '8845')
    width.set(q('type'), 'dxa')
    borders = ET.SubElement(props, q('tblBorders'))
    for edge in ['top', 'left', 'bottom', 'right', 'insideH', 'insideV']:
        border = ET.SubElement(borders, q(edge))
        visible = edge in {'top', 'bottom'}
        border.set(q('val'), 'single' if visible else 'nil')
        border.set(q('sz'), '8' if visible else '0')
        border.set(q('space'), '0')
        border.set(q('color'), '000000')
    grid = ET.SubElement(table, q('tblGrid'))
    ET.SubElement(grid, q('gridCol')).set(q('w'), '1400')
    ET.SubElement(grid, q('gridCol')).set(q('w'), '7445')
    row = ET.SubElement(table, q('tr'))
    row.append(cell('抄送', 1400))
    row.append(cell('示例市公园管理处', 7445))
    return table


def section():
    node = ET.Element(q('sectPr'))
    ET.SubElement(node, q('footerReference')).set(q('type'), 'default')
    node.find(q('footerReference')).set(f'{{{R}}}id', 'rId4')
    page = ET.SubElement(node, q('pgSz'))
    page.set(q('w'), '11906')
    page.set(q('h'), '16838')
    margins = ET.SubElement(node, q('pgMar'))
    # Public millimetre layout: top 37, bottom 35, left 28, right 26.
    for key, value in [('top', '2098'), ('right', '1474'), ('bottom', '1984'), ('left', '1587'), ('header', '851'), ('footer', '992'), ('gutter', '0')]:
        margins.set(q(key), value)
    ET.SubElement(node, q('pgNumType')).set(q('fmt'), 'decimal')
    ET.SubElement(node, q('cols')).set(q('space'), '425')
    grid = ET.SubElement(node, q('docGrid'))
    grid.set(q('type'), 'lines')
    grid.set(q('linePitch'), '580')
    grid.set(q('charSpace'), '0')
    return node


def document():
    root = ET.Element(q('document'), nsmap={'w': W, 'r': R})
    body = ET.SubElement(root, q('body'))
    body.append(paragraph(ISSUER, FAMILY, 72, align='center', line=800, line_rule='atLeast', color='FF0000'))
    body.append(paragraph(DOCUMENT_NUMBER, 'FangSong', 32, align='center', before=200, after=120))
    body.append(paragraph(None, 'FangSong', 32, align='center', line=240, border=True))
    body.append(paragraph(TITLE, FAMILY, 44, align='center', before=360, after=360, line=640, line_rule='atLeast'))
    body.append(paragraph(RECIPIENT, 'FangSong', 32))
    body.append(paragraph(BODY, 'FangSong', 32, align='both', first_line=640))
    body.append(paragraph(HEADING, 'Microsoft YaHei', 32, before=120))
    body.append(paragraph(DETAIL, 'FangSong', 32, align='both', first_line=640))
    body.append(paragraph(SUBHEADING, 'KaiTi', 32, before=80))
    body.append(paragraph(SUBDETAIL, 'FangSong', 32, align='both', first_line=640))
    body.append(paragraph(SECOND, 'Microsoft YaHei', 32, before=120))
    body.append(paragraph(SECOND_DETAIL, 'FangSong', 32, align='both', first_line=640))
    body.append(paragraph(SIGNATURE, 'FangSong', 32, align='right', before=360, right=640))
    body.append(paragraph(DATE, 'FangSong', 32, align='right', after=200, right=640))
    body.append(edition_table())
    body.append(section())
    return root


def footer():
    root = ET.Element(q('ftr'), nsmap={'w': W})
    node = paragraph('— ', 'FangSong', 28, align='center', line=360, line_rule='auto')
    node.append(field_run('begin'))
    node.append(field_run('instr', ' PAGE '))
    node.append(field_run('end'))
    node.append(run(' —', 'FangSong', 28))
    root.append(node)
    return root


def field_run(kind, text=None):
    node = run(text or '', 'FangSong', 28)
    text_node = node.find(q('t'))
    node.remove(text_node)
    if kind == 'instr':
        instruction = ET.SubElement(node, q('instrText'))
        instruction.set(f'{{{XML}}}space', 'preserve')
        instruction.text = text
    else:
        ET.SubElement(node, q('fldChar')).set(q('fldCharType'), kind)
    return node


def styles():
    root = ET.Element(q('styles'), nsmap={'w': W})
    normal = ET.SubElement(root, q('style'))
    normal.set(q('type'), 'paragraph')
    normal.set(q('default'), '1')
    normal.set(q('styleId'), 'Normal')
    ET.SubElement(normal, q('name')).set(q('val'), 'Normal')
    props = ET.SubElement(normal, q('rPr'))
    fonts = ET.SubElement(props, q('rFonts'))
    fonts.set(q('ascii'), 'Times New Roman')
    fonts.set(q('hAnsi'), 'Times New Roman')
    fonts.set(q('eastAsia'), 'FangSong')
    fonts.set(q('cs'), 'Times New Roman')
    ET.SubElement(props, q('sz')).set(q('val'), '32')
    ET.SubElement(props, q('szCs')).set(q('val'), '32')
    return root


def font_table():
    root = ET.Element(q('fonts'), nsmap={'w': W, 'r': R})
    embedded = ET.SubElement(root, q('font'))
    embedded.set(q('name'), FAMILY)
    ET.SubElement(embedded, q('charset')).set(q('val'), '86')
    ET.SubElement(embedded, q('family')).set(q('val'), 'roman')
    ET.SubElement(embedded, q('pitch')).set(q('val'), 'variable')
    regular = ET.SubElement(embedded, q('embedRegular'))
    regular.set(f'{{{R}}}id', 'rId1')
    regular.set(q('fontKey'), FONT_KEY)
    regular.set(q('subsetted'), 'true')
    for name, alternate in [('FangSong', 'STFangsong'), ('KaiTi', 'Kaiti SC'), ('Microsoft YaHei', 'PingFang SC'), ('Times New Roman', None)]:
        font = ET.SubElement(root, q('font'))
        font.set(q('name'), name)
        if alternate:
            ET.SubElement(font, q('altName')).set(q('val'), alternate)
        ET.SubElement(font, q('charset')).set(q('val'), '86' if alternate else '00')
        ET.SubElement(font, q('family')).set(q('val'), 'modern' if alternate else 'roman')
        ET.SubElement(font, q('pitch')).set(q('val'), 'variable')
    return root


def settings():
    root = ET.Element(q('settings'), nsmap={'w': W})
    ET.SubElement(root, q('zoom')).set(q('percent'), '100')
    ET.SubElement(root, q('updateFields')).set(q('val'), 'true')
    return root


def relationships(pairs):
    root = ET.Element(f'{{{REL}}}Relationships', nsmap={None: REL})
    for index, (kind, target) in enumerate(pairs, 1):
        node = ET.SubElement(root, f'{{{REL}}}Relationship')
        node.set('Id', f'rId{index}')
        node.set('Type', kind)
        node.set('Target', target)
    return root


def content_types():
    root = ET.Element(f'{{{CT}}}Types', nsmap={None: CT})
    for extension, content in [('rels', 'application/vnd.openxmlformats-package.relationships+xml'), ('xml', 'application/xml'), ('odttf', 'application/vnd.openxmlformats-officedocument.obfuscatedFont')]:
        node = ET.SubElement(root, f'{{{CT}}}Default')
        node.set('Extension', extension)
        node.set('ContentType', content)
    overrides = {
        '/word/document.xml': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml',
        '/word/styles.xml': 'application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml',
        '/word/settings.xml': 'application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml',
        '/word/fontTable.xml': 'application/vnd.openxmlformats-officedocument.wordprocessingml.fontTable+xml',
        '/word/footer1.xml': 'application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml',
        '/docProps/core.xml': 'application/vnd.openxmlformats-package.core-properties+xml',
        '/docProps/app.xml': 'application/vnd.openxmlformats-officedocument.extended-properties+xml',
    }
    for part, content in overrides.items():
        node = ET.SubElement(root, f'{{{CT}}}Override')
        node.set('PartName', part)
        node.set('ContentType', content)
    return root


def core_properties():
    root = ET.Element(f'{{{CP}}}coreProperties', nsmap={'cp': CP, 'dc': DC, 'dcterms': DCTERMS, 'xsi': XSI})
    ET.SubElement(root, f'{{{DC}}}title').text = '示例市公共服务中心通知'
    ET.SubElement(root, f'{{{DC}}}subject').text = 'DSH 自编公文示例'
    ET.SubElement(root, f'{{{DC}}}creator').text = 'DSH'
    ET.SubElement(root, f'{{{CP}}}lastModifiedBy').text = 'DSH'
    for name in ['created', 'modified']:
        node = ET.SubElement(root, f'{{{DCTERMS}}}{name}')
        node.set(f'{{{XSI}}}type', 'dcterms:W3CDTF')
        node.text = '2026-10-30T00:00:00Z'
    return root


def app_properties():
    root = ET.Element(f'{{{EP}}}Properties', nsmap={None: EP})
    ET.SubElement(root, f'{{{EP}}}Application').text = 'DSH'
    return root


def xml_bytes(node):
    return ET.tostring(node, xml_declaration=True, encoding='UTF-8', standalone=True)


def write_docx(path, font_data):
    parts = {
        '[Content_Types].xml': xml_bytes(content_types()),
        '_rels/.rels': xml_bytes(relationships([
            ('http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument', 'word/document.xml'),
            ('http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties', 'docProps/core.xml'),
            ('http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties', 'docProps/app.xml'),
        ])),
        'word/document.xml': xml_bytes(document()),
        'word/styles.xml': xml_bytes(styles()),
        'word/settings.xml': xml_bytes(settings()),
        'word/fontTable.xml': xml_bytes(font_table()),
        'word/footer1.xml': xml_bytes(footer()),
        'word/_rels/document.xml.rels': xml_bytes(relationships([
            ('http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles', 'styles.xml'),
            ('http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings', 'settings.xml'),
            ('http://schemas.openxmlformats.org/officeDocument/2006/relationships/fontTable', 'fontTable.xml'),
            ('http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer', 'footer1.xml'),
        ])),
        'word/_rels/fontTable.xml.rels': xml_bytes(relationships([
            ('http://schemas.openxmlformats.org/officeDocument/2006/relationships/font', 'fonts/font1.odttf'),
        ])),
        'word/fonts/font1.odttf': obfuscate(font_data),
        'docProps/core.xml': xml_bytes(core_properties()),
        'docProps/app.xml': xml_bytes(app_properties()),
    }
    with zipfile.ZipFile(path, 'w', compression=zipfile.ZIP_DEFLATED) as archive:
        for name in sorted(parts):
            info = zipfile.ZipInfo(name, (1980, 1, 1, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            archive.writestr(info, parts[name])


def manifest(source_hash, subset, text):
    return {
        'familyName': FAMILY,
        'postScriptName': POSTSCRIPT,
        'styleName': 'Regular',
        'outlineWeight': WEIGHT,
        'subsetSha256': sha256(subset),
        'subsetBytes': len(subset),
        'charsetCount': len(text),
        'charsetSha256': sha256(text.encode('utf-8')),
        'charset': 'GB/T 2312 level 1, ASCII, common punctuation, and the sample text',
        'source': {
            'family': 'Source Han Serif',
            'file': 'SourceHanSerifSC-VF.ttf',
            'version': SOURCE_VERSION,
            'url': SOURCE_URL,
            'sha256': source_hash,
            'license': 'OFL-1.1',
        },
        'modified': True,
        'reservedFontNameRemoved': True,
        'fontTools': '4.68.0',
        'build': 'subset the variable font, instantiate wght=600 with overlap removal, then rename the family to DSH Gov Song',
    }


def main():
    source = Path(sys.argv[1]) if len(sys.argv) > 1 else CACHE
    data = source.read_bytes()
    if sha256(data) != SOURCE_SHA256:
        raise RuntimeError('the official variable font does not match the recorded 2.003R hash')
    text = charset()
    print(f'charset {len(text)} characters')
    subset = build_subset(source, text)
    print(f'subset {len(subset)} bytes')
    OUTPUT.mkdir(parents=True, exist_ok=True)
    write_docx(OUTPUT / 'example.docx', subset)
    shutil.copyfile(LICENSE, OUTPUT / 'OFL.txt')
    (OUTPUT / 'font-source.json').write_text(json.dumps(manifest(sha256(data), subset, text), ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'wrote {OUTPUT / "example.docx"}')


if __name__ == '__main__':
    main()
