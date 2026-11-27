"""Bounded native Office inspection and preview preparation for the Host."""
import io
import json
from pathlib import Path, PurePosixPath
import re
import sys
import zipfile
from lxml import etree as ET
from PIL import Image


EXTERNAL_WORD_FIELD = re.compile(r'\b(?:DDE(?:AUTO)?|INCLUDETEXT|INCLUDEPICTURE|LINK)\b', re.I)


def check_word_field(instruction):
    if EXTERNAL_WORD_FIELD.search(instruction):
        raise ValueError('External Word fields are not supported')


def inspect_fields(root, mode):
    # A complex field may span multiple runs. None marks a separated field's result.
    fields = []
    for node in root.iter():
        name = ET.QName(node)
        local = name.localname
        if local == 'fldChar':
            kind = node.get(ET.QName(name.namespace, 'fldCharType'))
            if kind == 'begin':
                fields.append([])
            elif fields and kind in ('separate', 'end'):
                parts = fields.pop()
                if parts:
                    check_word_field(''.join(parts))
                if kind == 'separate':
                    fields.append(None)
        elif local == 'instrText':
            instruction = node.text or ''
            check_word_field(instruction)
            if fields and fields[-1] is not None:
                fields[-1].append(instruction)
        elif local == 'fldSimple':
            for attr, instruction in node.attrib.items():
                if ET.QName(attr).localname == 'instr':
                    check_word_field(instruction)
        elif mode == 'excel' and local == 'f' and re.search(r'\b(?:WEBSERVICE|RTD)\s*\(|\[[^\]]*\.(?:xlsx?|xlsm|xlsb)\]|\|[^!]*!', node.text or '', re.I):
            raise ValueError('External formula data is not supported')
    for parts in fields:
        if parts:
            check_word_field(''.join(parts))


def inspect_package(path, mode):
    with zipfile.ZipFile(path) as archive:
        infos = archive.infolist()
        if len(infos) > 5000 or len({item.filename for item in infos}) != len(infos) or sum(item.file_size for item in infos) > 64 * 1024 * 1024:
            raise ValueError('Office package exceeds its inspection budget')
        required = 'word/document.xml' if mode == 'word' else 'xl/workbook.xml' if mode == 'excel' else None
        names = {item.filename for item in infos}
        if not required or required not in names or '[Content_Types].xml' not in names:
            raise ValueError('The native package does not match the selected format')
        for item in infos:
            name = item.filename
            if item.flag_bits & 1 or '\\' in name or name.startswith('/') or '..' in PurePosixPath(name).parts or ':' in name:
                raise ValueError('Use regular unencrypted Office resources')
            lower = name.lower()
            if any(part in lower for part in ['vbaproject', '/activex/', '/embeddings/', 'xl/externallinks/', 'xl/querytables/', 'xl/connections.xml']) or lower.endswith(('.exe', '.dll', '.com')):
                raise ValueError('Macros, embedded objects and external linked data are not supported')
            if lower.endswith(('.xml', '.rels')):
                data = archive.read(item)
                if b'<!DOCTYPE' in data.upper() or b'<!ENTITY' in data.upper():
                    raise ValueError('XML entities are not supported')
                root = ET.fromstring(data, ET.XMLParser(resolve_entities=False, no_network=True))
                if lower == '[content_types].xml' and (b'macroenabled' in data.lower() or b'vbaproject' in data.lower()):
                    raise ValueError('Macros are not supported')
                if lower.endswith('.rels'):
                    for relation in root:
                        if relation.get('TargetMode') == 'External' and not relation.get('Type', '').endswith('/hyperlink'):
                            raise ValueError('External linked data is not supported')
                inspect_fields(root, mode)
    return {'mode': mode, 'checked': True}


def previews(directory, images):
    if not images or len(images) > 50:
        raise ValueError('Use between 1 and 50 rendered pages')
    root = Path(directory)
    (root / 'pages').mkdir(exist_ok=True)
    ratios = []
    Image.MAX_IMAGE_PIXELS = 40_000_000
    for number, path in enumerate(images, 1):
        with Image.open(path) as source:
            image = source.convert('RGB')
            ratio = image.width / image.height
            if not 0 < ratio <= 20:
                raise ValueError('Unsupported preview aspect ratio')
            ratios.append(ratio)
            image.thumbnail((1600, 1800))
            image.save(root / 'pages' / f'{number}.webp', 'WEBP', quality=85)
            if number == 1:
                image.thumbnail((560, 720))
                image.save(root / 'thumbnail.webp', 'WEBP', quality=85)
    return {'pageAspectRatios': ratios}


if __name__ == '__main__':
    request = json.load(sys.stdin)
    if request.get('command') == 'inspect':
        result = inspect_package(request['input'], request['mode'])
    elif request.get('command') == 'previews':
        result = previews(request['directory'], request['images'])
    else:
        raise ValueError('Unknown Office preparation command')
    print(json.dumps(result))
