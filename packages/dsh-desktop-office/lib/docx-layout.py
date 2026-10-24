"""Confined Word template editor and structural delivery check."""
import base64
import copy
import hashlib
import io
import json
import os
from pathlib import Path
import sys
import zipfile
from collections import Counter
from lxml import etree as ET

W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
NS = {'w': W, 'wp': 'http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing'}
Q = lambda name: '{' + W + '}' + name
MAX_BYTES = 64 * 1024 * 1024


def package(data):
    with zipfile.ZipFile(io.BytesIO(data)) as archive:
        names = archive.namelist()
        if len(names) > 5000 or len(names) != len(set(names)) or sum(item.file_size for item in archive.infolist()) > MAX_BYTES:
            raise ValueError('Use a bounded, regular Word package')
        return {name: archive.read(name) for name in names}


def xml(data):
    return ET.fromstring(data, ET.XMLParser(resolve_entities=False, no_network=True))


def serialized(element):
    return ET.tostring(element, xml_declaration=True, encoding='UTF-8', standalone=True)


def document(parts):
    return xml(parts['word/document.xml'])


def text(paragraph):
    return ''.join((node.text or '') if node.tag == Q('t') else '\t' if node.tag == Q('tab') else '\n' if node.tag in [Q('br'), Q('cr')] else '' for node in paragraph.iter())


def set_text(paragraph, value, fragments=None, prototypes=None):
    if not isinstance(value, str) or len(value) > 32768:
        raise ValueError('Use bounded paragraph text')
    runs = paragraph.findall('w:r', NS)
    prototype = next((r for r in runs if r.find('w:t', NS) is not None), runs[0] if runs else None)
    if fragments is None:
        content = [(prototype, value)]
    else:
        if not isinstance(fragments, list) or not 1 <= len(fragments) <= 200:
            raise ValueError('Use a bounded list of native text styles')
        if any(not isinstance(f.get('text'), str) or f.get('source') not in prototypes for f in fragments):
            raise ValueError('Use recorded run IDs and text for mixed typography')
        if ''.join(f['text'] for f in fragments) != value:
            raise ValueError('Keep the complete paragraph text in its native text fragments')
        content = [(prototypes[f['source']], f['text']) for f in fragments]
    for child in list(paragraph):
        if child.tag not in [Q('pPr'), Q('bookmarkStart'), Q('bookmarkEnd')]:
            paragraph.remove(child)
    end = paragraph.find('w:bookmarkEnd', NS)
    for prototype, value in content:
        run = ET.Element(Q('r'))
        if prototype is not None and prototype.find('w:rPr', NS) is not None:
            run.append(copy.deepcopy(prototype.find('w:rPr', NS)))
        for index, line in enumerate(value.split('\n')):
            if index: ET.SubElement(run, Q('br'))
            for position, chunk in enumerate(line.split('\t')):
                if position: ET.SubElement(run, Q('tab'))
                t = ET.SubElement(run, Q('t')); t.set('{http://www.w3.org/XML/1998/namespace}space', 'preserve'); t.text = chunk
        if end is not None: end.addprevious(run)
        else: paragraph.append(run)


def normalize(parts, profile):
    header = profile.get('issuerHeader') if profile else None
    if not header: return parts
    root = document(parts)
    if header:
        paragraphs = root.findall('.//w:body/w:p', NS)
        paragraph = paragraphs[header['paragraph']]
        if len(paragraph.findall('.//w:drawing', NS)) != 1:
            raise ValueError('The issuer-header source requires its recorded drawing')
        extent = paragraph.find('.//wp:extent', NS)
        height = max(700, round(int(extent.get('cy')) / 635)) if extent is not None else 1120
        for child in list(paragraph):
            if child.tag != Q('pPr'):
                paragraph.remove(child)
        ppr = paragraph.find('w:pPr', NS)
        if ppr is None: ppr = ET.SubElement(paragraph, Q('pPr'))
        jc = ppr.find('w:jc', NS)
        if jc is None: jc = ET.SubElement(ppr, Q('jc'))
        jc.set(Q('val'), 'center')
        spacing = ppr.find('w:spacing', NS)
        if spacing is None: spacing = ET.SubElement(ppr, Q('spacing'))
        spacing.set(Q('line'), str(height)); spacing.set(Q('lineRule'), 'atLeast')
        snap = ppr.find('w:snapToGrid', NS)
        if snap is None: snap = ET.SubElement(ppr, Q('snapToGrid'))
        snap.set(Q('val'), '0')
        run = ET.SubElement(paragraph, Q('r')); props = ET.SubElement(run, Q('rPr'))
        fonts = ET.SubElement(props, Q('rFonts'))
        for kind in ['ascii', 'hAnsi', 'eastAsia']: fonts.set(Q(kind), header['font'])
        ET.SubElement(props, Q('sz')).set(Q('val'), str(header['sizeHalfPoints']))
        ET.SubElement(props, Q('color')).set(Q('val'), header['color'])
        ET.SubElement(run, Q('t')).text = header['text']
    parts['word/document.xml'] = serialized(root)
    return parts


def save_package(parts):
    output = io.BytesIO()
    with zipfile.ZipFile(output, 'w', zipfile.ZIP_DEFLATED) as archive:
        for name, data in parts.items():
            info = zipfile.ZipInfo(name, (1980, 1, 1, 0, 0, 0)); info.compress_type = zipfile.ZIP_DEFLATED
            archive.writestr(info, data)
    return output.getvalue()


def protected(p, profile, index):
    return bool(p.findall('.//w:drawing', NS) or p.findall('.//w:pBdr', NS) or p.findall('.//w:sectPr', NS)
                or (profile and profile.get('issuerHeader', {}).get('paragraph') == index))


def inventory(parts, profile):
    result = []
    for index, p in enumerate(document(parts).findall('.//w:body//w:p', NS)):
        styles = []
        for position, run in enumerate(p.findall('w:r', NS)):
            size = run.find('w:rPr/w:sz', NS); bold = run.find('w:rPr/w:b', NS)
            styles.append({'id': f'p{index}:r{position}', 'text': text(run),
                           'fonts': ','.join(run.xpath('./w:rPr/w:rFonts/@w:ascii | ./w:rPr/w:rFonts/@w:eastAsia', namespaces=NS)) or 'inherited',
                           'size': size.get(Q('val')) if size is not None else 'inherited',
                           'bold': bold is not None and bold.get(Q('val'), '1') not in ['0', 'false']})
        result.append({'id': f'p{index}', 'text': text(p), 'can_remove': p.getparent().tag == Q('body') and not protected(p, profile, index), 'runs': styles})
    return result


def workspace_path(root, raw, create=False):
    if not isinstance(raw, str) or not raw or len(raw) > 1024:
        raise ValueError('Use a bounded workspace path')
    path = Path(raw)
    if path.is_absolute():
        try: path = path.relative_to(root)
        except ValueError: raise ValueError('Use a document inside the active workspace')
    if any(part in ['..', '.'] for part in path.parts) or path.suffix.lower() != '.docx':
        raise ValueError('Use a .docx path inside the active workspace')
    current = root
    for part in path.parts[:-1]:
        current = current / part
        if create and not current.exists(): current.mkdir(mode=0o700)
        if current.is_symlink() or not current.is_dir(): raise ValueError('Use regular workspace directories')
    target = current / path.name
    if target.is_symlink() or not target.resolve().is_relative_to(root):
        raise ValueError('Use a regular document inside the active workspace')
    return target


def read_document(path):
    if not path.is_file() or path.stat().st_size > MAX_BYTES: raise ValueError('Use a bounded regular Word file')
    return path.read_bytes()


def write_document(path, data, replace=False):
    flags = os.O_WRONLY | (os.O_TRUNC if replace else os.O_EXCL | os.O_CREAT)
    flags |= getattr(os, 'O_NOFOLLOW', 0)
    with os.fdopen(os.open(path, flags, 0o600), 'wb') as stream: stream.write(data)


def canonical(element):
    # Compare expanded names: serializers may legitimately change namespace prefixes.
    if element is None: return ('inherited',)
    return (element.tag, tuple(sorted(element.attrib.items())), (element.text or '').strip(), tuple(canonical(c) for c in element))


def validate(source, candidate, profile):
    expected, actual = document(source), document(candidate)
    checks = []
    for name, data in source.items():
        if name.startswith('word/fonts/') or name.startswith('word/footer') or name.startswith('word/header') or name == 'word/fontTable.xml':
            if candidate.get(name) != data: raise ValueError('Preserve the template embedded fonts, headers and page-number footers')
    checks.append('embedded-fonts-and-running-content')
    for name in ['word/styles.xml', 'word/settings.xml', 'word/theme/theme1.xml']:
        if name in source and (name not in candidate or canonical(xml(candidate[name])) != canonical(xml(source[name]))):
            raise ValueError('Keep the selected Word style, settings and theme definitions')
    checks.append('style-and-theme-definitions')
    expected_sections, actual_sections = expected.findall('.//w:sectPr', NS), actual.findall('.//w:sectPr', NS)
    if len(expected_sections) != len(actual_sections): raise ValueError('Preserve the template section layout')
    for left, right in zip(expected_sections, actual_sections):
        if canonical(left) != canonical(right):
            raise ValueError('Preserve the template page geometry, section settings and header/footer references')
    checks.append('page-geometry')
    for query, message in [('.//w:pBdr', 'Preserve the template paragraph borders and red divider'), ('.//wp:extent', 'Preserve the template drawing frames'), ('.//w:tblPr', 'Preserve the template table layout'), ('.//w:tblGrid', 'Preserve the template table columns')]:
        reference = Counter(canonical(e) for e in expected.findall(query, NS)); proposed = Counter(canonical(e) for e in actual.findall(query, NS))
        if reference - proposed: raise ValueError(message)
    checks.append('borders-and-drawing-frames')
    allowed = set(expected.xpath('.//w:rFonts/@w:ascii | .//w:rFonts/@w:hAnsi | .//w:rFonts/@w:eastAsia', namespaces=NS))
    proposed = set(actual.xpath('.//w:rFonts/@w:ascii | .//w:rFonts/@w:hAnsi | .//w:rFonts/@w:eastAsia', namespaces=NS))
    if proposed - allowed: raise ValueError('Use the font assignments from the selected template')
    checks.append('template-font-assignments')
    for query, message in [('.//w:body//w:p/w:pPr', 'Use the selected template paragraph styles and spacing'), ('.//w:body//w:r/w:rPr', 'Use the selected template text sizes and styles')]:
        allowed_profiles = set(canonical(e) for e in expected.findall(query, NS))
        if any(canonical(e) not in allowed_profiles for e in actual.findall(query, NS)): raise ValueError(message)
    checks.append('paragraph-and-run-styles')
    header = profile.get('issuerHeader') if profile else None
    if header:
        reference = expected.findall('.//w:body/w:p', NS)[header['paragraph']]
        signatures = [canonical(e) for e in reference.findall('.//w:rPr', NS)]
        matches = [p for p in actual.findall('.//w:body/w:p', NS) if [canonical(e) for e in p.findall('.//w:rPr', NS)] == signatures and text(p).strip() and canonical(p.find('w:pPr', NS)) == canonical(reference.find('w:pPr', NS))]
        if not matches: raise ValueError('Keep an editable issuer header in the template red type style')
    checks.append('editable-issuer-header')
    return checks


def edit(parts, profile, args):
    root = document(parts); paragraphs = root.findall('.//w:body//w:p', NS); lookup = {f'p{i}': p for i, p in enumerate(paragraphs)}
    prototypes = {f'p{i}:r{j}': copy.deepcopy(r) for i, p in enumerate(paragraphs) for j, r in enumerate(p.findall('w:r', NS))}
    replacements, additions, removals = args.get('replacements', []), args.get('additions', []), args.get('removals', [])
    if any(not isinstance(items, list) or len(items) > 1000 for items in [replacements, additions, removals]): raise ValueError('Use a bounded edit plan')
    if profile and profile.get('issuerHeader'):
        header = root.findall('.//w:body/w:p', NS)[profile['issuerHeader']['paragraph']]
        header_id = f'p{paragraphs.index(header)}'
        if header_id not in [item.get('id') for item in replacements]: raise ValueError('Fill the issuer header with the current issuing organization')
    seen = set()
    for replacement in replacements:
        key = replacement['id']
        if key in seen or key not in lookup: raise ValueError('Use each recorded paragraph ID once')
        seen.add(key); p = lookup[key]
        if p.findall('.//w:drawing', NS): raise ValueError('Edit drawing content with the native Office workflow')
        set_text(p, replacement['text'], replacement.get('runs'), prototypes)
    tails = {}
    for addition in additions:
        after, source = addition['after'], addition['source']
        if after not in lookup or source not in lookup: raise ValueError('Use recorded paragraph IDs for additions')
        origin = lookup[source]
        if protected(origin, profile, paragraphs.index(origin)): raise ValueError('Use a text paragraph as the addition style')
        clone = copy.deepcopy(origin); set_text(clone, addition['text'], addition.get('runs'), prototypes)
        for marker in clone.xpath('.//w:bookmarkStart | .//w:bookmarkEnd', namespaces=NS): marker.getparent().remove(marker)
        anchor = tails.get(after, lookup[after]); anchor.addnext(clone); tails[after] = clone
    for key in removals:
        if key not in lookup or key in seen: raise ValueError('Use distinct recorded paragraph IDs for removals')
        p = lookup[key]
        if p.getparent().tag != Q('body') or protected(p, profile, paragraphs.index(p)): raise ValueError('Keep the template layout paragraphs and table structure')
        p.getparent().remove(p); seen.add(key)
    parts['word/document.xml'] = serialized(root)
    return parts


def run(payload):
    root = Path.cwd().resolve(); source = normalize(package(base64.b64decode(payload['source'], validate=True)), payload.get('profile'))
    command, args, profile = payload['command'], payload.get('args', {}), payload.get('profile')
    if command == 'prepare':
        target = workspace_path(root, args['path']); current = read_document(target)
        if hashlib.sha256(current).hexdigest() != payload['sourceSha256']: raise ValueError('Prepare the recorded template copy')
        data = save_package(source) if profile and profile.get('issuerHeader') else current
        if data != current: write_document(target, data, replace=True)
        return {'sha256': hashlib.sha256(data).hexdigest(), 'paragraphs': inventory(source, profile)}
    if command == 'write':
        target = workspace_path(root, args['output_path'], create=True); candidate = edit(copy.deepcopy(source), profile, args)
        checks = validate(source, candidate, profile); data = save_package(candidate); write_document(target, data)
        return {'path': args['output_path'], 'sha256': hashlib.sha256(data).hexdigest(), 'checks': checks}
    if command == 'validate':
        data = read_document(workspace_path(root, args['path'])); checks = validate(source, package(data), profile)
        return {'sha256': hashlib.sha256(data).hexdigest(), 'checks': checks}
    raise ValueError('Use a supported Word template operation')


def emit(stream, text):
    # The host clears the child environment, so Windows keeps its charmap code page.
    # Callers decode these pipes as UTF-8.
    stream.buffer.write((text + '\n').encode('utf-8'))


if __name__ == '__main__':
    try:
        raw = sys.stdin.buffer.read(90 * 1024 * 1024 + 1)
        if len(raw) > 90 * 1024 * 1024: raise ValueError('Use a bounded Word operation')
        emit(sys.stdout, json.dumps(run(json.loads(raw)), ensure_ascii=False))
    except Exception as error:
        emit(sys.stderr, str(error)); sys.exit(1)
