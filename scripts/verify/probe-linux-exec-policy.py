#!/usr/bin/env python3
"""Read-only Linux ELF execution-policy probe (Python standard library only).

Usage: python3 probe-linux-exec-policy.py /path/to/node [/bin/ls ...]
Reports file-backed mmap errno and security/mount evidence as JSON. It does
not execute the supplied files, write mapped pages, or change security policy.
Compare an affected ELF with a trusted system ELF; EPERM alone does not identify
the responsible security module. Administrator audit evidence may be needed.
"""

import argparse
import ctypes
import errno
import json
import mmap
import os
import platform
import struct
import sys


def read_evidence(path):
    try:
        with open(path, encoding='utf-8') as source:
            return {'value': source.read(65536).strip()}
    except OSError as error:
        return {'errno': error.errno, 'error': str(error)}


def mount_evidence(path):
    try:
        with open('/proc/self/mountinfo', encoding='utf-8') as source:
            matches = []
            for line in source:
                fields = line.split()
                separator = fields.index('-')
                mountpoint = fields[4]
                for encoded, decoded in [(r'\040', ' '), (r'\011', '\t'), (r'\012', '\n'), (r'\134', '\\')]:
                    mountpoint = mountpoint.replace(encoded, decoded)
                if path == mountpoint or path.startswith(mountpoint.rstrip('/') + '/'):
                    matches.append({
                        'mountpoint': mountpoint,
                        'mount_options': fields[5],
                        'filesystem': fields[separator + 1],
                        'super_options': fields[separator + 3]
                    })
            return max(matches, key=lambda item: len(item['mountpoint'])) if matches else None
    except (OSError, ValueError, IndexError) as error:
        return {'error': str(error)}


def probe_file(path, libc):
    resolved = os.path.realpath(path)
    result = {'path': path, 'resolved_path': resolved, 'mount': mount_evidence(resolved)}
    try:
        result['xattr_names'] = os.listxattr(resolved)
    except OSError as error:
        result['xattr_error'] = {'errno': error.errno, 'error': str(error)}
    try:
        descriptor = os.open(resolved, os.O_RDONLY | os.O_CLOEXEC)
    except OSError as error:
        result['open_error'] = {'errno': error.errno, 'error': str(error)}
        return result
    try:
        header = os.pread(descriptor, 64, 0)
        if header[:4] != b'\x7fELF' or len(header) < 64 or header[4] not in (1, 2) or header[5] not in (1, 2):
            result['error'] = 'Expected a complete ELF32 or ELF64 header'
            return result
        endian = '<' if header[5] == 1 else '>'
        is64 = header[4] == 2
        offset = struct.unpack_from(endian + ('Q' if is64 else 'I'), header, 32 if is64 else 28)[0]
        entry_size, count = struct.unpack_from(endian + 'HH', header, 54 if is64 else 42)
        expected_size = 56 if is64 else 32
        if entry_size < expected_size or count > 1024:
            result['error'] = 'Unsupported program-header table'
            return result
        size = os.fstat(descriptor).st_size
        if offset + entry_size * count > size:
            result['error'] = 'Program-header table exceeds file size'
            return result
        segments = []
        for index in range(count):
            raw = os.pread(descriptor, expected_size, offset + index * entry_size)
            if is64:
                kind, flags, file_offset, address, _, file_size, _, _ = struct.unpack(endian + 'IIQQQQQQ', raw)
            else:
                kind, file_offset, address, _, file_size, _, flags, _ = struct.unpack(endian + 'IIIIIIII', raw)
            if kind != 1 or file_size == 0:
                continue
            aligned_offset = file_offset - file_offset % mmap.PAGESIZE
            # A single read-only/executable page suffices to test file execution policy.
            length = min(mmap.PAGESIZE, size - aligned_offset)
            if length <= 0:
                result['error'] = 'LOAD offset exceeds file size'
                return result
            segment = {'offset': hex(file_offset), 'address': hex(address), 'elf_flags': flags, 'probes': []}
            for name, protection in [('read', mmap.PROT_READ), ('read_exec', mmap.PROT_READ | mmap.PROT_EXEC)]:
                ctypes.set_errno(0)
                mapping = libc.mmap(None, length, protection, mmap.MAP_PRIVATE, descriptor, aligned_offset)
                error_number = ctypes.get_errno()
                failure = mapping == ctypes.c_void_p(-1).value
                probe = {'protection': name, 'ok': not failure, 'errno': error_number if failure else 0}
                if failure:
                    probe['errno_name'] = errno.errorcode.get(error_number, 'UNKNOWN')
                    probe['error'] = os.strerror(error_number)
                else:
                    # Never access or write mapped pages; release immediately.
                    ctypes.set_errno(0)
                    if libc.munmap(mapping, length) != 0:
                        cleanup_errno = ctypes.get_errno()
                        raise OSError(cleanup_errno, 'munmap failed: ' + os.strerror(cleanup_errno))
                segment['probes'].append(probe)
            segments.append(segment)
        result['segments'] = segments
    except (OSError, struct.error) as error:
        result['error'] = str(error)
    finally:
        os.close(descriptor)
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('elf_paths', nargs='+', help='ELF files to inspect, including a trusted system control')
    arguments = parser.parse_args()
    if sys.platform != 'linux':
        parser.error('This probe requires Linux /proc and mmap semantics')
    if ctypes.sizeof(ctypes.c_void_p) != 8:
        parser.error('This probe currently requires a 64-bit Python process')
    libc = ctypes.CDLL(None, use_errno=True)
    libc.mmap.restype = ctypes.c_void_p
    libc.mmap.argtypes = [ctypes.c_void_p, ctypes.c_size_t, ctypes.c_int, ctypes.c_int, ctypes.c_int, ctypes.c_long]
    libc.munmap.restype = ctypes.c_int
    libc.munmap.argtypes = [ctypes.c_void_p, ctypes.c_size_t]
    report = {
        'kernel': platform.release(),
        'machine': platform.machine(),
        'libc': platform.libc_ver(),
        'evidence': {path: read_evidence(path) for path in [
            '/sys/kernel/security/lsm',
            '/sys/kernel/security/elfverify/status',
            '/sys/kernel/security/elfverify/version',
            '/proc/sys/vm/mmap_min_addr'
        ]},
        'files': [probe_file(path, libc) for path in arguments.elf_paths]
    }
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
