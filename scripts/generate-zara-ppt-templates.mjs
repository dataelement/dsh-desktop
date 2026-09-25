/**
 * 模板设计参考并按 MIT 许可改编自 Zara Zhang（GitHub: zarazhangrui）的 PPT/HTML 模板：
 * https://github.com/zarazhangrui/beautiful-html-templates
 * 固定参考版本：e5e204fb1f3b06290846e7dcd7aceddabeceec8c。
 * DSH 将所选模板重建为原生可编辑 PPTD，补充中英文示例、字体配对与扩展版式。
 * 来源与 MIT 许可保留在 packages/ppt-runtime/upstream/zara/。
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import yaml from 'js-yaml';
import { createRichLayouts, richLayoutGuidance, richLayoutSlugs } from './ppt/rich-layouts.mjs';
const root = path.resolve('packages/ppt-runtime');
export const zaraSpecs = [
    ['soft-editorial', 'Soft Editorial', '柔和编辑部', 'editorial', 'F2EEDF', '2A241B', 'E1A4C2', 'D6DD63', 'E8C9B6', 'Georgia', 'Arial', 'serif'],
    ['editorial-forest', 'Editorial Forest', '森林季刊', 'work', '2E4A2A', 'EFE7D4', 'E89CB1', '3A5A36', 'E6DCC4', 'Georgia', 'Arial', 'serif'],
    ['signal', 'Signal', '深蓝决策', 'consulting', '1C2644', 'E2DCD0', 'C8A870', '232F55', '8A96A8', 'Georgia', 'Arial', 'serif'],
    ['blue-professional', 'Blue Professional', '蓝色商务', 'business', 'FDFAE7', '111111', '1E2BFA', 'E9E8E0', '6B6B6B', 'Arial', 'Arial', 'sans'],
    ['broadside', 'Broadside', '橙黑宣言', 'promotion', '111111', 'F0ECE5', 'E85D26', '282826', '888880', 'Arial Black', 'Arial', 'sans'],
    ['monochrome', 'Monochrome', '极简研究', 'academic', 'FAFADF', '1A1A16', '1A1A16', 'F2F2D2', '5E5E54', 'Helvetica Neue', 'Arial', 'sans'],
    ['neo-grid-bold', 'Neo-Grid Bold', '荧光网格', 'business', 'F5F4EF', '0A0A0A', 'E6FF3D', 'ECECE8', '8A8A85', 'Arial Black', 'Arial', 'sans'],
    ['sakura-chroma', 'Sakura Chroma', '复古彩带', 'promotion', 'F1E6CB', '3A2516', 'E54489', 'E5D6B0', 'F09131', 'Arial Narrow', 'Arial', 'sans'],
    ['playful', 'Playful', '杏色创意', 'promotion', 'F0C8A0', '1A1A1A', '1A1A1A', 'E8B88E', 'F7DEC6', 'Arial Black', 'Arial', 'sans'],
    ['cartesian', 'Cartesian', '理性简报', 'consulting', 'EDE8E0', '1A1A1A', '8A8178', 'E2DBD1', '5A5A5A', 'Georgia', 'Arial', 'serif']
].map(([slug, name, zh, category, bg, ink, accent, surface, secondary, title, body, kind]) => ({ slug, name, zh, category, bg, ink, accent, surface, secondary, title, body, kind }));
const ref = 'e5e204fb1f3b06290846e7dcd7aceddabeceec8c';
for (const s of zaraSpecs) {
    const out = path.join(root, 'templates', s.category, 'dsh-' + s.slug);
    await fs.mkdir(out, { recursive: true });
    const upstreamDesign = await fs.readFile(path.join(root, 'upstream/zara/templates', s.slug, 'design.md'), 'utf8');
    const fontTokens = [...upstreamDesign.matchAll(/fontFamily: ["']?([^\n]+)/g)].map(m => m[1].split(',')[0].replace(/["']/g, '').trim());
    const fonts = { en: { title: s.title, body: s.body }, zh: { title: s.kind === 'serif' ? 'Songti SC' : 'PingFang SC', body: 'PingFang SC' }, fallbacks: { en: { title: s.kind === 'serif' ? 'Georgia' : 'Arial', body: 'Arial' }, zh: { macOS: { serif: 'Songti SC', sans: 'PingFang SC' }, Windows: { serif: 'SimSun', sans: 'Microsoft YaHei' }, Linux: { serif: 'Noto Serif CJK SC', sans: 'Noto Sans CJK SC' } } }, upstreamTitle: fontTokens[0] };
    const palette = { background: s.bg, text: s.ink, accent: s.accent, surface: s.surface, secondary: s.secondary, muted: s.secondary };
    const deckPages = {};
    for (const lang of ['en', 'zh']) {
        const tr = (en, zh) => lang === 'en' ? en : zh, pairs = { title: { latin: s.title, ea: 'Noto Serif CJK SC', mac: s.kind === 'serif' ? 'Songti SC' : 'PingFang SC', win: s.kind === 'serif' ? 'SimSun' : 'Microsoft YaHei' }, body: { latin: s.body, ea: 'Noto Sans CJK SC', mac: 'PingFang SC', win: 'Microsoft YaHei' } };
        let elements = [], pages = [], n = 0, background = s.bg;
        const text = (en, zh, x, y, w, h, size = 22, opts = {}) => elements.push({ elementId: 't' + ++n, elementType: 'text', bounds: [x, y, w, h], content: { text: tr(en, zh), fontFamily: opts.display ? pairs.title : pairs.body, fontSize: size, color: '#' + s.ink, lineHeight: 1.12, bold: !!opts.display && ['broadside', 'neo-grid-bold', 'playful', 'sakura-chroma'].includes(s.slug), ...Object.fromEntries(Object.entries(opts).filter(([k]) => k !== 'display')) } });
        const rect = (x, y, w, h, color = s.surface, border = 0, shape = 'rect') => elements.push({ elementId: 's' + ++n, elementType: 'shape', bounds: [x, y, w, h], shapeName: shape, fill: { type: 'solid', color: '#' + color }, border: { width: border, color: '#' + s.ink } });
        const line = (x, y, w, h = 0, color = s.ink, width = .7) => elements.push({ elementId: 'l' + ++n, elementType: 'line', bounds: [x, y, Math.max(w, 1), Math.max(h, 1)], viewBox: [Math.max(w, 1), Math.max(h, 1)], points: `0,0 ${w},${h}`, border: { color: '#' + color, width } });
        const header = (en, zh) => { text(s.name.toUpperCase(), s.zh, 48, 26, 740, 20, 10); line(48, 56, 864, 0, s.slug === 'signal' ? '2E3D5C' : s.ink, .5); text(en, zh, 48, 84, 864, 70, 34, { display: true }); };
        const footer = () => { text('DSH / ILLUSTRATIVE EXAMPLE', 'DSH / 自编示例', 48, 506, 760, 16, 9); text(String(pages.length + 1).padStart(2, '0'), String(pages.length + 1).padStart(2, '0'), 870, 503, 40, 20, 11); };
        const save = (name, zh, family) => { footer(); pages.push({ name: tr(name, zh), family, page: { pageType: pages.length ? 'content' : 'cover', background: { type: 'solid', color: '#' + background }, notes: 'Native PPTD adaptation of Zara Zhang / ' + s.name + '. MIT. Example figures are illustrative.', elements } }); elements = []; n = 0; background = s.bg; };
        const stripes = (x, y, w, h) => { ['E54489', 'F09131', 'F0BC2A', '3D9F47', '3F8BC4'].forEach((c, i) => { rect(x, y + i * h / 5, w, h / 5 - 4, c); elements.at(-1).rotation = -14; }); };
        const checker = (x, y, size = 16) => { for (let r = 0; r < 4; r++)
            for (let c = 0; c < 4; c++)
                rect(x + c * size, y + r * size, size, size, (r + c) % 2 ? s.accent : s.ink); };
        // Each cover keeps the source's distinct composition rather than sharing a recolored master.
        if (s.slug === 'soft-editorial') {
            text('FIELD NOTES / VOL. 01', '观察手记 / 第一期', 48, 34, 800, 24, 12);
            text('Ideas worth\na closer look', '值得细看的\n几个想法', 48, 148, 480, 210, 64, { display: true });
            rect(589, 124, 323, 330, s.accent, 0, 'roundRect');
            text('Observe.\nQuestion.\nUnderstand.', '观察。\n提问。\n理解。', 620, 177, 265, 200, 38, { display: true, color: '#2A241B' });
            text('Research, perspective and the next decision', '研究、观点与下一项决策', 50, 415, 490, 50, 18);
        }
        else if (s.slug === 'editorial-forest') {
            text('EDITORIAL JOURNAL / 2026', '经营季刊 / 2026', 48, 34, 800, 24, 12);
            text('Quarterly\nReview\n2026', '季度\n经营复盘\n2026', 48, 122, 790, 300, 78, { display: true, color: '#' + s.accent });
            line(48, 468, 864);
        }
        else if (s.slug === 'signal') {
            text('BRIEFING / STRATEGY / OPERATIONS', '简报 / 战略 / 经营', 64, 74, 780, 20, 11, { color: '#' + s.accent });
            line(64, 154, 72, 0, s.accent, 2);
            text('The next\ndecision', '下一项\n关键决策', 64, 190, 800, 170, 70, { display: true });
            text('Evidence, choices and the plan ahead', '证据、选择与行动计划', 64, 403, 780, 44, 22, { color: '#C8A870' });
        }
        else if (s.slug === 'blue-professional') {
            rect(690, 0, 270, 500, 'E9E8E0');
            line(48, 166, 36, 0, s.accent, 3);
            text('Market outlook &\nstrategic priorities', '市场展望与\n战略优先级', 48, 200, 610, 180, 50, { display: true, bold: true });
            text('A clear view of the next operating cycle', '下一轮经营周期的清晰判断', 48, 414, 600, 50, 20);
        }
        else if (s.slug === 'broadside') {
            background = s.accent;
            text('THE BROADSIDE / 01', '橙黑宣言 / 01', 48, 34, 800, 24, 12, { color: '#111111' });
            text('make the\nnext move', '下一步，\n动起来', 48, 209, 864, 224, 78, { display: true, color: '#111111' });
        }
        else if (s.slug === 'monochrome') {
            text('USER RESEARCH / FIELD STUDY', '用户研究 / 现场观察', 48, 35, 850, 24, 11);
            text('User Research\nSynthesis', '用户研究\n洞察综述', 48, 243, 850, 178, 65, { display: true, bold: false });
            line(48, 460, 864);
        }
        else if (s.slug === 'neo-grid-bold') {
            rect(24, 24, 205, 452, s.ink);
            rect(238, 24, 454, 255, s.accent);
            rect(701, 24, 235, 255, s.ink);
            rect(238, 288, 454, 188, s.accent);
            checker(253, 40, 17);
            text('THE NEXT\nGROWTH\nCHAPTER', '下一轮\n增长', 254, 301, 422, 166, 42, { display: true });
            text('FIELD REPORT\n2026 / 01', '研究简报\n2026 / 01', 715, 395, 198, 64, 13);
        }
        else if (s.slug === 'sakura-chroma') {
            text('TAPE GARDEN / RESEARCH SERIES', '彩带系列 / 研究手记', 48, 38, 500, 28, 12);
            stripes(520, 150, 380, 180);
            text('T—26', 'T—26', 48, 140, 445, 170, 99, { display: true, bold: true });
            rect(48, 382, 412, 65, s.accent);
            text('SUPERCATALOG', '超级目录', 62, 390, 382, 51, 36, { display: true, bold: true, color: '#F1E6CB' });
        }
        else if (s.slug === 'playful') {
            rect(758, 66, 115, 141, s.bg, 2, 'ellipse');
            rect(782, 93, 70, 93, s.ink, 0, 'ellipse');
            text('CREATE\nSOMETHING\nGOOD', '做一点\n好东西', 48, 150, 716, 228, 61, { display: true });
            text('Creative direction & visual systems', '创意方向与视觉系统', 48, 420, 730, 45, 22, { bold: true });
        }
        else {
            rect(707, 190, 182, 182, s.bg, .4, 'ellipse');
            text('RESEARCH & STRATEGY', '研究与战略', 48, 155, 800, 24, 11);
            text('Cartesian', '理性简报', 48, 225, 680, 105, 66, { display: true });
            text('A considered approach to the next question', '审慎地回答下一个问题', 48, 354, 645, 55, 21);
        }
        save('Cover', '封面', 'cover');
        header('The questions that guide the work', '用问题组织这次讨论');
        const labels = [['Context', '背景'], ['Evidence', '证据'], ['Choices', '选择'], ['Action', '行动']];
        if (s.slug === 'editorial-forest' || s.slug === 'neo-grid-bold') {
            labels.forEach(([a, b], i) => { const x = 48 + (i % 2) * 444, y = 175 + Math.floor(i / 2) * 151; rect(x, y, 426, 136, i % 2 ? s.accent : s.surface); text('0' + (i + 1), '0' + (i + 1), x + 18, y + 12, 360, 25, 13, { color: '#' + (i % 2 ? '1A1A17' : s.ink) }); text(a, b, x + 18, y + 49, 384, 66, 32, { display: true, color: '#' + (i % 2 ? '1A1A17' : s.ink) }); });
        }
        else
            labels.forEach(([a, b], i) => { const y = 166 + i * 78; text('0' + (i + 1), '0' + (i + 1), 48, y, 100, 42, 26, { display: true }); text(a, b, 179, y, 696, 46, 29, { display: true }); line(179, y + 58, 733); });
        save('Agenda', '目录', 'agenda');
        header('Three observations worth testing', '三个值得验证的观察');
        const insights = [['Make the first step clear', '让第一步更清晰', 'People need to know what to do next.', '用户需要知道下一步做什么。'], ['Reduce the waiting', '减少等待', 'Remove delays between intent and action.', '减少意图与行动之间的延迟。'], ['Keep the feedback visible', '让反馈可见', 'Show progress and explain the result.', '展示进度，并解释行动结果。']];
        insights.forEach(([a, b, c, d], i) => { let x = 48 + i * 294, y = 183, w = 276, h = 276; const bright = ['soft-editorial', 'playful', 'sakura-chroma'].includes(s.slug); const fill = s.slug === 'soft-editorial' ? [s.accent, 'D6DD63', 'E8C9B6'][i] : s.slug === 'playful' && i === 1 ? s.ink : s.surface; rect(x, y, w, h, fill, s.slug === 'playful' ? 1 : 0, s.slug === 'soft-editorial' ? 'roundRect' : 'rect'); const color = s.slug === 'playful' && i === 1 ? s.bg : s.slug === 'soft-editorial' ? '2A241B' : s.ink; text('0' + (i + 1), '0' + (i + 1), x + 20, y + 18, w - 40, 32, 20, { color: '#' + color }); text(a, b, x + 20, y + 70, w - 40, 94, 27, { display: true, color: '#' + color }); text(c, d, x + 20, y + 191, w - 40, 64, 17, { color: '#' + color }); });
        save('Insights', '洞察', 'insights');
        header('Progress in three measures', '用三个指标观察进展');
        const stats = [['68%', 'Task completion', '任务完成率'], ['28', 'Research sessions', '研究场次'], ['9', 'Open questions', '待验证问题']];
        if (['soft-editorial', 'neo-grid-bold'].includes(s.slug)) {
            rect(48, 174, 548, 304, s.accent);
            text('68%', '68%', 76, 218, 490, 130, 106, { display: true, color: '#2A241B' });
            text('Task completion', '任务完成率', 76, 404, 490, 40, 23, { color: '#2A241B' });
            stats.slice(1).forEach(([a, b, c], i) => { rect(611, 174 + i * 158, 301, 146, i ? s.secondary : s.surface); text(a, a, 632, 187 + i * 158, 251, 75, 57, { display: true }); text(b, c, 632, 268 + i * 158, 251, 34, 17); });
        }
        else
            stats.forEach(([a, b, c], i) => { const x = 48 + i * 294; line(x, 208, 266, 0, s.accent, 2); text(a, a, x, 254, 266, 128, 78, { display: true, color: '#' + (s.slug === 'editorial-forest' || s.slug === 'signal' || s.slug === 'broadside' ? s.accent : s.ink) }); text(b, c, x, 408, 266, 46, 21); });
        save('Metrics', '关键指标', 'data');
        header('Compare the same measure over time', '在同一尺度上比较变化');
        const values = [44, 59, 72, 86];
        if (s.slug === 'blue-professional') {
            values.forEach((v, i) => { text('Period ' + (i + 1), '阶段 ' + (i + 1), 48, 191 + i * 68, 190, 40, 20); rect(270, 194 + i * 68, 560, 27, s.surface); rect(270, 194 + i * 68, v * 6, 27, s.accent); text(String(v), String(v), 852, 188 + i * 68, 60, 44, 23); });
        }
        else {
            line(120, 439, 700);
            values.forEach((v, i) => { const x = 166 + i * 178; rect(x, 439 - v * 2.6, 88, v * 2.6, i === 3 ? s.accent : s.secondary); text(String(v), String(v), x, 397 - v * 2.6, 95, 36, 24, { display: true }); text('Q' + (i + 1), 'Q' + (i + 1), x, 456, 95, 32, 16); });
        }
        save('Comparison chart', '数据比较', 'data');
        header('A practical sequence for the next step', '让下一步有明确的执行顺序');
        const steps = [['Observe', '观察', 'Collect the facts', '收集事实'], ['Frame', '定义', 'State the question', '明确问题'], ['Test', '验证', 'Try a small change', '小步试验'], ['Review', '复盘', 'Decide what follows', '决定后续行动']];
        if (s.slug === 'broadside') {
            steps.forEach(([a, b, c, d], i) => { const w = 360 + i * 148, x = 48 + (864 - w) / 2, y = 170 + i * 73; rect(x, y, w, 61, i === 0 ? s.accent : s.surface); text(a, b, x + 20, y + 9, w - 40, 45, 27, { display: true }); });
        }
        else if (s.slug === 'signal') {
            steps.forEach(([a, b, c, d], i) => { const x = 48 + (i % 2) * 444, y = 182 + Math.floor(i / 2) * 151; line(x, y, 415, 0, s.accent); text('0' + (i + 1), '0' + (i + 1), x, y + 12, 80, 32, 20, { color: '#' + s.accent }); text(a, b, x + 98, y + 10, 310, 45, 29, { display: true }); text(c, d, x + 98, y + 72, 310, 49, 19); });
        }
        else {
            line(62, 220, 798, 0, s.accent);
            steps.forEach(([a, b, c, d], i) => { const x = 48 + i * 220; rect(x + 9, 205, 30, 30, s.slug === 'cartesian' ? s.bg : s.accent, s.slug === 'cartesian' ? 1 : 0, 'ellipse'); text('0' + (i + 1), '0' + (i + 1), x, 166, 170, 32, 16); text(a, b, x, 263, 196, 55, 29, { display: true }); text(c, d, x, 351, 196, 78, 19); });
        }
        save('Process', '执行流程', 'process');
        header('Choose with the tradeoffs in view', '把取舍摆在同一页');
        line(480, 175, 0, 295);
        text('Current approach', '当前做法', 48, 179, 396, 58, 29, { display: true });
        text('Next approach', '下一步做法', 516, 179, 396, 58, 29, { display: true });
        text('Many entry points\n\nUnclear ownership\n\nFeedback arrives late', '入口较多\n\n责任不清晰\n\n反馈不及时', 48, 272, 396, 190, 24);
        text('One clear starting point\n\nA named owner\n\nVisible, timely feedback', '明确的起点\n\n具体的负责人\n\n及时可见的反馈', 516, 272, 396, 190, 24);
        save('Before and after', '前后比较', 'comparison');
        if (s.slug === 'broadside') {
            background = s.accent;
            text('MAKE IT\nHAPPEN', '现在，\n行动', 48, 178, 860, 225, 88, { display: true, color: '#111111' });
        }
        else if (s.slug === 'sakura-chroma') {
            stripes(280, 99, 625, 300);
            rect(48, 235, 776, 119, s.bg, 1);
            text('Build it. Then learn.', '做出来，再学习。', 66, 251, 740, 87, 51, { display: true, bold: true });
        }
        else {
            text('NEXT CHAPTER', '下一章', 48, 79, 850, 26, 13);
            text('A clear question.\nA concrete next step.', '一个明确的问题。\n一项具体的行动。', 48, 184, 860, 197, 55, { display: true });
            line(48, 415, 864, 0, s.accent, 1.5);
        }
        save('Closing', '收尾', 'closing');
        pages = createRichLayouts(s, lang, pairs, pages);
        deckPages[lang] = pages;
        const dir = path.join(out, lang === 'en' ? 'source' : 'source-zh');
        await fs.mkdir(dir + '/pages', { recursive: true });
        await fs.writeFile(dir + '/deck.pptd', yaml.dump({ version: 'v2', title: tr(s.name, s.zh), size: [960, 540], template: { id: 'dsh-' + s.slug, name: s.name }, pages: pages.map((_, i) => 'pages/' + String(i + 1).padStart(2, '0') + '.page') }, { lineWidth: -1 }));
        for (const [i, p] of pages.entries())
            await fs.writeFile(dir + '/pages/' + String(i + 1).padStart(2, '0') + '.page', yaml.dump(p.page, { lineWidth: -1 }));
    }
    const pages = deckPages.en;
    const design = `# ${s.name} / ${s.zh}\n\nAdapted from Zara Zhang's ${s.name}, commit ${ref}. MIT. This native edition rebuilds ${richLayoutSlugs.has(s.slug) ? pages.length : 'eight'} editable layouts; it is not an HTML import or an exact copy of every upstream slide.\n\n## Typography\n\nEnglish display: ${fonts.en.title}; English body: ${fonts.en.body}. These portable Office substitutions replace the upstream display face ${fonts.upstreamTitle}. Chinese display: ${fonts.zh.title}; body: ${fonts.zh.body}. On Windows use ${fonts.fallbacks.zh.Windows[s.kind]} / Microsoft YaHei; on Linux use ${fonts.fallbacks.zh.Linux[s.kind]} / Noto Sans CJK SC. No font binary is distributed. Keep the serif/sans distinction.\n\nEnglish previews use source/. Chinese examples use source-zh/. Preview language does not select the language of the user's output. Choose the matching fonts for the actual content; reflow longer translations instead of shrinking titles.\n\n## Layout grammar\n\n${upstreamDesign.split('---')[1]?.split('description:')[1]?.split('\n\n')[0] ?? s.name}\n\n${pages.map((p, i) => `${i + 1}. ${p.name} (${p.family})`).join('\n')}\n\n${richLayoutGuidance(s.slug)}All charts and diagrams are native editable vectors. Example figures are illustrative, not reported facts. Retain a 48 pt outer margin and use 16:9, 960 × 540 pt.\n\nCopyright (c) 2026 Zara Zhang. DSH adaptation 2026-09-06. See licenses/zara/LICENSE and the pinned source design specification.\n`;
    await fs.writeFile(out + '/design.md', design);
    const definition = { id: 'dsh-' + s.slug, category: s.category, sourceCollection: 'curated', slug: 'dsh-' + s.slug, name: s.name, localizedNames: { en: s.name, zh: s.zh }, variantLabel: 'DSH', description: s.zh + ' · ' + s.name, previewTitle: s.name, previewSubtitle: `${pages.length} editable layouts`, titleFontFace: s.title, bodyFontFace: s.body, fonts, previewLanguage: 'en', palette, referenceDirectory: s.category + '/dsh-' + s.slug, referenceWidth: 1280, referenceHeight: 720, referencePageCount: pages.length, representativeSlides: pages.map((_, i) => i + 1), previewSlides: richLayoutSlugs.has(s.slug) ? [s.slug === 'blue-professional' ? 4 : 5, ...pages.map((_, i) => i + 1).filter(i => i !== (s.slug === 'blue-professional' ? 4 : 5))] : pages.map((_, i) => i + 1), designSha256: crypto.createHash('sha256').update(design).digest('hex') };
    const refs = pages.map((p, i) => ({ slideNumber: i + 1, sourceTitle: p.name, family: p.family, titlePosition: 'left', bodyColumns: p.columns ?? (['comparison', 'data'].includes(p.family) ? 2 : 1), density: p.density ?? 'medium', features: [p.family], recommendedRoles: [p.family], structureSummary: p.summary ?? p.name, zones: p.page.elements.filter(e => e.elementType !== 'line').map(e => ({ kind: e.elementType === 'text' ? (e.content.fontSize >= 29 ? 'title' : 'text') : 'shape', x: e.bounds[0] * 4 / 3, y: e.bounds[1] * 4 / 3, width: e.bounds[2] * 4 / 3, height: e.bounds[3] * 4 / 3, ...e.elementType === 'text' ? { textRole: e.content.fontSize >= 29 ? 'title' : 'body', fontSize: e.content.fontSize, textCapacity: Math.floor(e.bounds[2] / e.content.fontSize) * Math.floor(e.bounds[3] / (e.content.fontSize * 1.12)) } : { shape: e.shapeName, fill: e.fill.color.slice(1) } })), jsxReference: '' }));
    await fs.writeFile(out + '/metadata.json', JSON.stringify({ definition, semantics: { palette, source: { fileName: s.slug + '-reference.jpg', sha256: definition.designSha256, slideCount: pages.length, averageTextBlocks: richLayoutSlugs.has(s.slug) ? Math.round(pages.reduce((n, p) => n + p.page.elements.filter(e => e.elementType === 'text').length, 0) / pages.length) : 14, averageCharacters: richLayoutSlugs.has(s.slug) ? Math.round(pages.reduce((n, p) => n + p.page.elements.reduce((n, e) => n + (e.content?.text?.length ?? 0), 0), 0) / pages.length) : 240, visualGrammar: s.slug, recommendedDensity: 'medium', designSummary: design, layoutPatterns: pages.map((p, i) => ({ family: p.family, slideCount: 1, sampleSlideNumbers: [i + 1], titlePosition: 'left', bodyColumns: p.columns ?? 2, density: p.density ?? 'medium', averageTextFrames: richLayoutSlugs.has(s.slug) ? p.page.elements.filter(e => e.elementType === 'text').length : 14, averageMediaFrames: 0 })), pageReferences: refs } }, provenance: { kind: 'mit-adaptation', license: 'MIT', upstream: `https://github.com/zarazhangrui/beautiful-html-templates/tree/${ref}/templates/${s.slug}`, author: 'Zara Zhang', adaptedBy: 'DSH Desktop contributors', modified: '2026-09-06' } }, null, 2) + '\n');
    console.log(s.name, pages.length, 'bilingual layouts');
}
