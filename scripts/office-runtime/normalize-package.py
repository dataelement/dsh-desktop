"""Normalize regenerated Office packages to stable metadata and chart IDs."""
import argparse
import re
from zipfile import ZipFile, ZipInfo, ZIP_DEFLATED
from pathlib import Path


def normalize_package(path):
    # Kit allocates random chart-axis IDs. Canonical local IDs preserve the
    # axis-reference graph while giving equivalent workbooks stable revisions.
    with ZipFile(path) as archive:
        entries = [(name, archive.read(name)) for name in sorted(archive.namelist())]
    normalized = []
    for name, data in entries:
        if name == 'docProps/core.xml':
            data = re.sub(rb'(<dcterms:(?:created|modified)[^>]*>)[^<]+', rb'\g<1>2026-09-01T00:00:00Z', data)
        if re.fullmatch(r'xl/charts/chart\d+\.xml', name):
            axis_ids = {}
            def stable_axis(match):
                original = match.group(2)
                axis_ids.setdefault(original, str(100000 + len(axis_ids)).encode())
                return match.group(1) + axis_ids[original] + match.group(3)
            data = re.sub(rb'(<(?:[\w.-]+:)?(?:axId|crossAx)\b[^>]*\bval=")(\d+)(")', stable_axis, data)
        normalized.append((name, data))
    with ZipFile(path, 'w', compression=ZIP_DEFLATED) as archive:
        for name, data in normalized:
            info = ZipInfo(name, (2026, 9, 1, 0, 0, 0))
            info.compress_type = ZIP_DEFLATED
            archive.writestr(info, data)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('package', type=Path)
    normalize_package(parser.parse_args().package)
