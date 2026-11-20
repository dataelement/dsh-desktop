"""Copy recalculated formula caches into a native XLSX without changing its styles.

Run from the active workspace root after recalculating a separate temporary copy.
The source and output must differ; the original and all non-worksheet parts remain intact.
"""
import argparse
import copy
from decimal import Decimal
import hashlib
import io
import json
import math
import os
from pathlib import Path, PurePosixPath
import posixpath
import zipfile
from lxml import etree as ET

NS = {'s': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
S = '{' + NS['s'] + '}'
RID = '{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id'
MAX_BYTES = 64 * 1024 * 1024


def xml(data):
    if b'<!DOCTYPE' in data.upper() or b'<!ENTITY' in data.upper():
        raise ValueError('XML entities are not supported')
    return ET.fromstring(data, ET.XMLParser(resolve_entities=False, no_network=True))


def package(data):
    with zipfile.ZipFile(io.BytesIO(data)) as archive:
        infos = archive.infolist()
        if len(infos) > 5000 or len({i.filename for i in infos}) != len(infos) or sum(i.file_size for i in infos) > MAX_BYTES:
            raise ValueError('Use a bounded XLSX package')
        if any(i.flag_bits & 1 or '\\' in i.filename or i.filename.startswith('/') or '..' in PurePosixPath(i.filename).parts for i in infos):
            raise ValueError('Use regular, unencrypted XLSX resources')
        return infos, {i.filename: archive.read(i) for i in infos}


def sheets(parts):
    book = xml(parts['xl/workbook.xml'])
    relationships = {r.get('Id'): r for r in xml(parts['xl/_rels/workbook.xml.rels'])}
    result = {}
    for sheet in book.findall('s:sheets/s:sheet', NS):
        relation = relationships[sheet.get(RID)]
        if not relation.get('Type', '').endswith('/worksheet'):
            continue
        raw = relation.get('Target', '')
        path = posixpath.normpath(raw.lstrip('/') if raw.startswith('/') else posixpath.join('xl', raw))
        if relation.get('TargetMode') == 'External' or not path.startswith('xl/worksheets/') or path not in parts:
            raise ValueError('Use local worksheet resources')
        result[sheet.get('name')] = path
    return result


def merge(source_bytes, calculated_bytes):
    infos, source = package(source_bytes)
    _, calculated = package(calculated_bytes)
    calculated_sheets = sheets(calculated)
    shared = xml(calculated['xl/sharedStrings.xml']).findall('s:si', NS) if 'xl/sharedStrings.xml' in calculated else []
    source_shared = xml(source['xl/sharedStrings.xml']).findall('s:si', NS) if 'xl/sharedStrings.xml' in source else []
    def constant(cell, strings):
        if cell.find('s:f', NS) is not None: return ('formula',)
        kind = cell.get('t', 'n'); value = cell.find('s:v', NS)
        if kind == 'inlineStr': return ('text', ''.join(t.text or '' for t in cell.findall('.//s:is//s:t', NS)))
        if value is None or value.text is None: return None
        if kind == 's':
            index = int(value.text)
            if not 0 <= index < len(strings): raise ValueError('Invalid string index')
            return ('text', ''.join(t.text or '' for t in strings[index].iter(S + 't')))
        if kind in ['str', 'inlineStr']: return ('text', value.text)
        return (kind, Decimal(value.text) if kind == 'n' else value.text)
    count = 0
    for name, path in sheets(source).items():
        root = xml(source[path])
        formulas = [c for c in root.findall('.//s:sheetData/s:row/s:c', NS) if c.find('s:f', NS) is not None]
        if name not in calculated_sheets:
            raise ValueError('The recalculated workbook is missing an input worksheet')
        actual = xml(calculated[calculated_sheets[name]])
        values = {c.get('r'): c for c in actual.findall('.//s:sheetData/s:row/s:c', NS)}
        formula_addresses = {c.get('r') for c in formulas}
        expected = {c.get('r'): constant(c, source_shared) for c in root.findall('.//s:sheetData/s:row/s:c', NS) if c.get('r') not in formula_addresses}
        proposed = {address: constant(c, shared) for address, c in values.items() if address not in formula_addresses}
        if {k: v for k, v in expected.items() if v is not None} != {k: v for k, v in proposed.items() if v is not None}:
            raise ValueError('The recalculated workbook does not match the edited input data')
        if not formulas: continue
        for cell in formulas:
            candidate = values.get(cell.get('r'))
            value = candidate.find('s:v', NS) if candidate is not None else None
            if value is None:
                raise ValueError(f'Missing calculated cache for {name}!{cell.get("r")}')
            original_formula, calculated_formula = cell.find('s:f', NS), candidate.find('s:f', NS)
            if calculated_formula is None or (original_formula.text and original_formula.text != calculated_formula.text):
                raise ValueError('The recalculated workbook does not match the original formula')
            kind, text = candidate.get('t', 'n'), value.text or ''
            if kind == 's':
                index = int(text)
                if not 0 <= index < len(shared): raise ValueError('Invalid formula string cache')
                text = ''.join(t.text or '' for t in shared[index].iter(S + 't'))
                kind = 'str'
            if kind not in ['n', 'str', 'b'] or (kind == 'n' and (not text or not math.isfinite(float(text)))) or (kind == 'b' and text not in ['0', '1']):
                raise ValueError(f'Invalid or error formula cache for {name}!{cell.get("r")}')
            # Keep the original formula element, cell style and every other cell unchanged.
            for old in list(cell):
                if old.tag in [S + 'v', S + 'is']: cell.remove(old)
            cell.set('t', kind)
            node = ET.Element(S + 'v'); node.text = text
            cell.insert(list(cell).index(cell.find('s:f', NS)) + 1, node)
            count += 1
            if count > 100000: raise ValueError('Formula cache budget exceeded')
        source[path] = ET.tostring(root, encoding='UTF-8', xml_declaration=True, standalone=True)
    output = io.BytesIO()
    with zipfile.ZipFile(output, 'w') as archive:
        for info in infos: archive.writestr(copy.copy(info), source[info.filename])
    return output.getvalue(), count


def workspace_path(raw, output=False):
    root = Path.cwd().resolve()
    path = Path(raw)
    if '..' in path.parts or path.suffix.lower() != '.xlsx': raise ValueError('Use an XLSX path in the active workspace')
    target = path if path.is_absolute() else root / path
    if not target.resolve().is_relative_to(root) or target.is_symlink(): raise ValueError('Use a regular workspace file')
    current = target.parent
    while current != root:
        if current.is_symlink() or not current.is_dir(): raise ValueError('Use regular workspace directories')
        current = current.parent
    if not output and (not target.is_file() or target.stat().st_size > MAX_BYTES): raise ValueError('Use a bounded XLSX file')
    return target


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', required=True)
    parser.add_argument('--calculated', required=True)
    parser.add_argument('--output', required=True)
    args = parser.parse_args()
    source, calculated, output = workspace_path(args.source), workspace_path(args.calculated), workspace_path(args.output, True)
    if output in [source, calculated]: raise ValueError('Write a new output; keep the source and temporary recalculation')
    result, cells = merge(source.read_bytes(), calculated.read_bytes())
    flags = os.O_WRONLY | os.O_CREAT | os.O_EXCL | getattr(os, 'O_NOFOLLOW', 0)
    with os.fdopen(os.open(output, flags, 0o600), 'wb') as stream: stream.write(result)
    print(json.dumps({'output': str(output), 'cached_formula_cells': cells, 'sha256': hashlib.sha256(result).hexdigest(),
                      'checks': ['original-formulas', 'original-styles-and-resources', 'unrelated-cell-data', 'formula-caches']}))
