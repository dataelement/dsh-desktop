/** Rebuild the shipped PPT plugin from the maintained sources and explicit sixteen-pack catalog. */
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { promisify } from 'node:util';
import { execFile } from 'node:child_process';
import crypto from 'node:crypto';
import sharp from 'sharp';
const run = promisify(execFile);
const root = path.resolve('packages/ppt-runtime');
const dest = path.resolve('packages/ppt-bundles');
const scratch = await fs.mkdtemp(path.join(os.tmpdir(), 'dsh-ppt-build-'));
const specs = [];
for (const c of await fs.readdir(root + '/templates'))
    for (const d of await fs.readdir(root + '/templates/' + c))
        specs.push(JSON.parse(await fs.readFile(root + '/templates/' + c + '/' + d + '/metadata.json', 'utf8')));
specs.sort((a, b) => a.definition.id.localeCompare(b.definition.id));
if (specs.length !== 16)
    throw Error('Expected exactly sixteen maintained templates');
const previews = {};
const previewFiles = {};
const checks = [];
try {
    for (const { definition, provenance } of specs) {
        const dir = root + '/templates/' + definition.referenceDirectory;
        const { stdout } = await run(process.execPath, [root + '/core/lib/bin.js', 'check', dir + '/source', '--json']);
        const check = JSON.parse(stdout);
        if (check.errorCount)
            throw Error(definition.id + ': ' + stdout);
        checks.push({ id: definition.id, ...check });
        if (!process.argv.includes('--reuse-previews')) {
            const pngDir = scratch + '/' + definition.id;
            await run(process.execPath, [root + '/core/lib/bin.js', 'screenshot', dir + '/source', '-o', pngDir, '--scale', '1.3333333333', '--json']);
            const pngs = JSON.parse(await fs.readFile(pngDir + '/index.json', 'utf8')).pages.map(p => p.file);
            if (pngs.length !== definition.referencePageCount)
                throw Error('Incomplete preview set');
            await fs.mkdir(dir + '/pages', { recursive: true });
            for (const [i, f] of pngs.entries())
                await sharp(pngDir + '/' + f).jpeg({ quality: 87 }).toFile(dir + '/pages/' + String(i + 1).padStart(2, '0') + '.jpg');
        }
        previews[definition.id] = await Promise.all(definition.previewSlides.map(async number => {
            const relative = definition.referenceDirectory + '/pages/' + String(number).padStart(2, '0') + '.jpg';
            const bytes = await fs.readFile(root + '/templates/' + relative);
            const hash = crypto.createHash('sha256').update(bytes).digest('hex');
            previewFiles[hash] = relative;
            return '/dsh-ppt/previews/' + hash + '.jpg';
        }));
    }
    const artifacts = {};
    for (const kind of ['core', 'adapter']) {
        const stage = scratch + '/' + kind;
        await fs.cp(root + '/' + kind, stage, { recursive: true, filter: p => !path.basename(p).startsWith('._') && path.basename(p) !== '.DS_Store' });
        await fs.cp(root + '/upstream', stage + '/licenses', { recursive: true });
        let client = await fs.readFile(stage + '/lib/client.js', 'utf8');
        if (!client.includes('/* GENERATED_PPT_PREVIEWS */ {}'))
            throw Error('Missing preview insertion marker');
        client = client.replace('/* GENERATED_PPT_PREVIEWS */ {}', JSON.stringify(previews));
        await fs.writeFile(stage + '/lib/client.js', client);
        if (kind === 'core') {
            await fs.writeFile(stage + '/lib/preview-manifest.js', '// Build allowlist: paths resolve only inside the bundled template references.\nexport const previewFiles = ' + JSON.stringify(previewFiles) + ';\n');
            await fs.writeFile(stage + '/lib/catalog.js', '// Generated only from the maintained template catalog.\nexport const definitions = ' + JSON.stringify(specs.map(s => s.definition)) + ';\nexport const semantics = ' + JSON.stringify(Object.fromEntries(specs.map(s => [s.definition.id, s.semantics]))) + ';\n');
            for (const { definition } of specs) {
                const target = stage + '/skills/dsh-ppt/references/' + definition.referenceDirectory;
                await fs.cp(root + '/templates/' + definition.referenceDirectory, target, { recursive: true });
                await fs.rm(target + '/metadata.json');
            }
        }
        const { stdout } = await run('npm', ['pack', stage, '--ignore-scripts', '--json', '--pack-destination', scratch]);
        const packed = JSON.parse(stdout)[0];
        const file = kind === 'core' ? 'dsh-ppt-0.1.1-rc.2-desktop-20260906.tgz' : 'dsh-ppt-composer-0.1.1-rc.2-desktop-20260906.tgz';
        const bytes = await fs.readFile(scratch + '/' + packed.filename);
        await fs.writeFile(dest + '/' + file, bytes);
        artifacts[kind] = { file, sha256: crypto.createHash('sha256').update(bytes).digest('hex'), integrity: 'sha512-' + crypto.createHash('sha512').update(bytes).digest('base64') };
    }
    await fs.writeFile(root + '/artifacts.json', JSON.stringify(artifacts, null, 2) + '\n');
    await fs.mkdir('doc/ppt-remediation', { recursive: true });
    await fs.writeFile('doc/ppt-remediation/source-checks.json', JSON.stringify(checks, null, 2) + '\n');
    console.log(JSON.stringify({ artifacts, checks: checks.map(c => ({ id: c.id, pages: c.pageCount, errors: c.errorCount, warnings: c.warningCount })) }, null, 2));
}
finally {
    await fs.rm(scratch, { recursive: true, force: true });
}
