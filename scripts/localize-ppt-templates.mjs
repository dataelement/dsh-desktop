/** English preview projects and explicit English/Chinese font pairs for the six existing templates. */
import fs from 'node:fs/promises';
import path from 'node:path';
import yaml from 'js-yaml';
import crypto from 'node:crypto';
const root = path.resolve('packages/ppt-runtime/templates');
const overrides = JSON.parse(await fs.readFile('scripts/ppt/english-layout-overrides.json', 'utf8'));
const dictionary = JSON.parse(await fs.readFile('scripts/ppt/english-text.json', 'utf8'));
Object.assign(dictionary, { '出口': 'Exports', '进口': 'Imports', '美国': 'US', '英国': 'UK', '德国': 'Germany', '日本': 'Japan', '年': 'Year', '平台': 'Platform', '独立站': 'Own store', '本地履约': 'Local fulfillment' });
for (const c of await fs.readdir(root))
    for (const d of await fs.readdir(path.join(root, c))) {
        if (!d.startsWith('curated-') && !['dsh-engineering-blueprint', 'dsh-course-workshop', 'dsh-editorial-notebook'].includes(d))
            continue;
        const dir = path.join(root, c, d), zh = path.join(dir, 'source-zh');
        // Read immutable authored seeds, never the previously enriched output.
        const seed = path.resolve('scripts/ppt/base-templates', d);
        for (const folder of ['source', 'source-zh']) {
            await fs.rm(path.join(dir, folder), { recursive: true, force: true });
            await fs.cp(path.join(seed, 'source-zh'), path.join(dir, folder), { recursive: true });
        }
        for (const file of ['metadata.json', 'design.md'])
            await fs.copyFile(path.join(seed, file), path.join(dir, file));
        const meta = JSON.parse(await fs.readFile(dir + '/metadata.json', 'utf8'));
        const serif = d === 'dsh-editorial-notebook';
        const title = { latin: serif ? 'Georgia' : 'Arial', ea: serif ? 'Noto Serif CJK SC' : 'Noto Sans CJK SC', mac: serif ? 'Songti SC' : 'PingFang SC', win: serif ? 'SimSun' : 'Microsoft YaHei' };
        const body = { latin: 'Arial', ea: 'Noto Sans CJK SC', mac: 'PingFang SC', win: 'Microsoft YaHei' };
        const pairFont = (obj) => { if (!obj || typeof obj !== 'object')
            return; for (const [k, v] of Object.entries(obj)) {
            if (k === 'fontFamily')
                obj[k] = (obj.fontSize >= 29 ? title : body);
            else
                pairFont(v);
        } };
        const translate = (obj) => { if (!obj || typeof obj !== 'object')
            return; for (const [k, v] of Object.entries(obj)) {
            if (typeof v === 'string' && dictionary[v])
                obj[k] = dictionary[v];
            else if (typeof v === 'string' && k === 'text' && /[\u3400-\u9fff]/u.test(v))
                throw Error('Missing translation: ' + v);
            else
                translate(v);
        } };
        for (const f of await fs.readdir(zh + '/pages')) {
            const page = yaml.load(await fs.readFile(zh + '/pages/' + f, 'utf8'));
            pairFont(page);
            await fs.writeFile(zh + '/pages/' + f, yaml.dump(page, { lineWidth: -1 }));
            translate(page);
            for (const e of page.elements) {
                const value = overrides[d]?.[e.elementId + '@' + f] ?? overrides[d]?.[e.elementId];
                if (value) {
                    if (typeof value === 'string')
                        e.content.text = value;
                    else {
                        e.content.text = value.text;
                        e.bounds = value.bounds;
                    }
                }
            }
            await fs.writeFile(dir + '/source/pages/' + f, yaml.dump(page, { lineWidth: -1 }));
        }
        const manifest = yaml.load(await fs.readFile(zh + '/deck.pptd', 'utf8'));
        pairFont(manifest);
        manifest.template = { id: meta.definition.id, name: meta.definition.name };
        await fs.writeFile(zh + '/deck.pptd', yaml.dump(manifest, { lineWidth: -1 }));
        const englishNames = { 'dsh-engineering-blueprint': 'Engineering Blueprint', 'dsh-course-workshop': 'Course Workshop', 'dsh-editorial-notebook': 'Editorial Notebook' };
        manifest.title = englishNames[d] ?? meta.definition.name;
        await fs.writeFile(dir + '/source/deck.pptd', yaml.dump(manifest, { lineWidth: -1 }));
        const englishName = englishNames[d] ?? meta.definition.name;
        meta.definition.localizedNames = { en: englishName, zh: meta.definition.name.split(' · ')[0] };
        meta.definition.name = englishName;
        meta.definition.previewTitle = englishName;
        meta.definition.previewLanguage = 'en';
        meta.definition.fonts = { en: { title: title.latin, body: body.latin }, zh: { title: title.mac, body: body.mac }, fallbacks: { zh: { macOS: { title: title.mac, body: body.mac }, Windows: { title: title.win, body: body.win }, Linux: { title: title.ea, body: body.ea } } } };
        let design = await fs.readFile(dir + '/design.md', 'utf8');
        design = design.replace(/\n## Bilingual typography[\s\S]*$/, '');
        design += `\n## Bilingual typography\n\nEnglish previews: source/. Chinese examples: source-zh/. English title/body: ${title.latin} / ${body.latin}. Chinese macOS: ${title.mac} / ${body.mac}; Windows: ${title.win} / ${body.win}; Linux: ${title.ea} / ${body.ea}. Font names only, no binaries. Use the user's requested output language, independently of the preview language. Reflow long translations; do not reduce text below readable size.\n`;
        await fs.writeFile(dir + '/design.md', design);
        meta.definition.designSha256 = crypto.createHash('sha256').update(design).digest('hex');
        await fs.writeFile(dir + '/metadata.json', JSON.stringify(meta, null, 2) + '\n');
    }
