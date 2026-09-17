#!/usr/bin/env node
// SPDX-License-Identifier: MIT
// SPDX-FileCopyrightText: 2026 Niels Martignène <niels.martignene@protonmail.com>

const fs = require('node:fs');
const path = require('node:path');

main();

async function main() {
    try {
        await run();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

function run() {
    let args = process.argv.slice(2);

    if (args.length < 2)
        throw new Error('Usage: trampolines.cjs DIRECTORY N');

    let dest_dir = args[0]?.trim?.();
    let n = parseInt(args[1], 10);

    if (!dest_dir)
        throw new Error('Destination directory is empty');
    if (Number.isNaN(n))
        throw new Error('N must be an integer');

    if (!fs.existsSync(dest_dir))
        fs.mkdirSync(dest_dir);

    writeAsmTrampolines(path.join(dest_dir, 'gnu.inc'), n,
        i => `.global SYMBOL(Trampoline${i})`,
        i => `SYMBOL(Trampoline${i}):\n    trampoline ${i}`
    );
    writeAsmTrampolines(path.join(dest_dir, 'armasm.inc'), n,
        i => `    EXPORT Trampoline${i}`,
        i => `Trampoline${i} PROC\n    trampoline ${i}\n    ENDP`,
        `    END`
    );
    writeAsmTrampolines(path.join(dest_dir, 'masm64.inc'), n,
        i => `public Trampoline${i}`,
        i => `Trampoline${i} proc frame\n    trampoline ${i}\nTrampoline${i} endp`
    );
    writeAsmTrampolines(path.join(dest_dir, 'masm32.inc'), n,
        i => `public Trampoline${i}`,
        i => `Trampoline${i} proc\n    trampoline ${i}\nTrampoline${i} endp`
    );
}

function writeAsmTrampolines(filename, n, fmt_export, fmt_proc, end = null) {
    let lines = [];

    for (let i = 0; i < n; i++) {
        let line = fmt_export(i);
        lines.push(line);
    }
    lines.push('');

    for (let i = 0; i < n; i++) {
        let line = fmt_proc(i);
        lines.push(line);
    }
    lines.push('');

    if (end !== null) {
        lines.push(end);
        lines.push('');
    }

    let content = lines.join('\n');
    fs.writeFileSync(filename, content);
}
