/** DSH-authored editable reference pages. No withdrawn template is used as an input. */
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import yaml from 'js-yaml';
const root = path.resolve('packages/ppt-runtime/templates');
const upstream = 'https://github.com/nexu-io/html-anything/tree/c31204544230578ac814026fecc153c6e36587ae';
const specs = [
    { slug: 'dsh-engineering-blueprint', category: 'work', name: '工程蓝图 · Engineering Blueprint', short: 'ENGINEERING NOTES', paper: 'F0EAE0', ink: '252824', accent: 'B5392A', muted: '68665F', surface: 'E7E0D4', source: 'deck-blueprint', summary: '纸张底色、工程网格、流程盒和反馈路径；用于架构评审、技术方案及执行计划。' },
    { slug: 'dsh-course-workshop', category: 'academic', name: '课程培训 · Course Workshop', short: 'LEARNING JOURNAL', paper: 'F7F4EB', ink: '243F35', accent: '447A62', muted: '70766B', surface: 'E5EBDD', source: 'deck-course-module', summary: '固定学习目标边栏、概念图、实例与自测；用于培训、课程和工作坊。' },
    { slug: 'dsh-editorial-notebook', category: 'editorial', name: '编辑手记 · Editorial Notebook', short: 'FIELD NOTES', paper: 'F8F8F6', ink: '252320', accent: 'A86043', muted: '76716A', surface: 'EDEBE5', summary: '原创的双栏论述、边注、证据条和决策矩阵；用于研究、观点与业务叙事。' }
];
for (const spec of specs) {
    const out = path.join(root, spec.category, spec.slug);
    await fs.mkdir(path.join(out, 'source/pages'), { recursive: true });
    let e = [], counter = 0;
    const pages = [];
    const c = n => '#' + spec[n];
    const text = (s, x, y, w, h, size = 20, opts = {}) => e.push({ elementId: 't' + (++counter), elementType: 'text', bounds: [x, y, w, h], content: { text: s, fontFamily: 'Arial', fontSize: size, color: c('ink'), lineHeight: 1.2, ...opts } });
    const box = (x, y, w, h, fill = 'surface', border = false) => e.push({ elementId: 's' + (++counter), elementType: 'shape', bounds: [x, y, w, h], shapeName: 'rect', fill: { type: 'solid', color: c(fill) }, border: { color: c('muted'), width: border ? .7 : 0 } });
    const line = (x, y, w, h = 0, color = 'muted', width = .6) => e.push({ elementId: 'l' + (++counter), elementType: 'line', bounds: [x, y, Math.max(w, 1), Math.max(h, 1)], viewBox: [Math.max(w, 1), Math.max(h, 1)], points: `0,0 ${w},${h}`, border: { color: c(color), width } });
    const title = (s, k) => { text(spec.short, 48, 24, 700, 18, 10, { color: c('muted'), letterSpacing: 1.2 }); line(48, 50, 864); text(s, 48, 68, 864, 64, 31, { bold: true }); text('DSH / 自编示例，非外部事实', 48, 505, 760, 16, 9, { color: c('muted') }); text(String(k).padStart(2, '0'), 860, 504, 48, 18, 11); };
    const save = (label, family = 'grid') => { pages.push({ label, family, page: { pageType: pages.length === 0 ? 'cover' : 'content', background: { type: 'solid', color: c('paper') }, notes: `DSH authored layout: ${label}. All content is illustrative. Replace with user facts.`, elements: e } }); e = []; counter = 0; };
    if (spec.source === 'deck-blueprint') {
        title('让架构决策，可以被验证', 1);
        text('工程蓝图\n让系统可解释', 48, 170, 480, 172, 64, { bold: true });
        text('约束 → 边界 → 反馈\n用证据连接设计与运行。', 52, 356, 460, 80, 23, { color: c('muted') });
        for (let x = 580; x < 910; x += 48)
            line(x, 148, 0, 298, 'muted', .25);
        for (let y = 148; y < 448; y += 48)
            line(580, y, 332, 0, 'muted', .25);
        ['输入', '处理', '验证'].forEach((s, i) => { box(600 + i * 34, 176 + i * 82, 224, 56, 'paper', true); text('0' + (i + 1) + ' / ' + s, 618 + i * 34, 190 + i * 82, 185, 32, 20); });
        save('架构封面', 'cover');
        title('明确每层职责，减少隐式依赖', 2);
        ['交互层', '服务层', '数据层'].forEach((s, i) => { box(48, 160 + i * 98, 590, 76, i === 1 ? 'surface' : 'paper', true); text(s, 68, 176 + i * 98, 160, 36, 23, { bold: true }); text(['接收意图，展示状态', '校验输入，编排任务', '记录变更，支持恢复'][i], 254, 181 + i * 98, 365, 30, 18); });
        text('边界约束', 690, 168, 214, 40, 23, { bold: true, color: c('accent') });
        text('每一层只依赖约定接口。\n\n失败能够定位，变更能够回退。', 690, 226, 214, 206, 19);
        save('分层架构');
        title('一个请求，经过四个可观测步骤', 3);
        ['接收', '校验', '执行', '交付'].forEach((s, i) => { box(48 + i * 220, 204 - (i === 2 ? 24 : 0), 196, 126, 'paper', true); text('0' + (i + 1), 66 + i * 220, 224 - (i === 2 ? 24 : 0), 160, 35, 19, { color: c('accent') }); text(s, 66 + i * 220, 272 - (i === 2 ? 24 : 0), 160, 40, 28, { bold: true }); if (i < 3)
            line(245 + i * 220, 265, 22, 0, 'accent', 2); });
        text('反馈回路：每个步骤同时记录输入、结果与失败原因。', 48, 390, 850, 62, 23);
        save('处理流程', 'process');
        title('比较方案之前，先统一评价尺度', 4);
        text('评价维度', 48, 168, 210, 32, 20, { bold: true });
        text('集中处理', 346, 168, 240, 32, 22, { bold: true });
        text('分层处理', 642, 168, 240, 32, 22, { bold: true });
        ['变更范围', '故障定位', '初期投入'].forEach((s, i) => { line(48, 212 + i * 75, 864); text(s, 48, 226 + i * 75, 220, 40, 20); text(['影响较广', '集中排查', '较低'][i], 346, 226 + i * 75, 235, 40, 20); text(['边界明确', '按层定位', '需要接口设计'][i], 642, 226 + i * 75, 250, 40, 20); });
        save('方案比较', 'comparison');
        title('责任明确，接口才会长期稳定', 5);
        ['接口契约', '运行指标', '故障恢复'].forEach((s, i) => { text('0' + (i + 1), 48, 167 + i * 99, 90, 46, 35, { color: c('accent') }); text(s, 164, 169 + i * 99, 300, 40, 23, { bold: true }); text(['版本兼容与输入约束', '延迟、错误率与资源上限', '回退步骤与验证责任'][i], 510, 172 + i * 99, 390, 48, 19); line(164, 232 + i * 99, 736); });
        save('责任清单');
        title('先控制高影响、难恢复的风险', 6);
        [['数据写入', '变更前保留可恢复状态'], ['外部依赖', '定义超时和降级策略'], ['权限边界', '只开放必要能力']].forEach(([a, b], i) => { box(48, 159 + i * 101, 62, 64, 'accent'); text('0' + (i + 1), 58, 175 + i * 101, 44, 33, 19, { color: c('paper') }); text(a, 138, 159 + i * 101, 220, 40, 24, { bold: true }); text(b, 390, 169 + i * 101, 494, 44, 20); });
        save('风险登记');
        title('按验证门槛推进，而不是按日期猜测', 7);
        ['最小闭环', '压力检验', '灰度运行'].forEach((s, i) => { text('GATE ' + (i + 1), 48 + i * 295, 175, 260, 30, 12, { color: c('accent') }); line(48 + i * 295, 218, 260, 0, 'accent', 2); text(s, 48 + i * 295, 245, 260, 52, 28, { bold: true }); text(['输入到交付可以完整复现', '关键边界和失败路径通过', '有监控、有回退、有人负责'][i], 48 + i * 295, 320, 258, 84, 19); });
        save('验证路线', 'process');
        title('下一步：选一个真实场景跑通', 8);
        text('先验证一条链路，\n再扩大系统边界。', 48, 172, 770, 126, 44, { bold: true });
        box(48, 351, 864, 102);
        text('负责人 / 输入样例 / 通过标准 / 回退方式', 72, 382, 810, 45, 24);
        save('执行结论', 'closing');
    }
    else if (spec.source === 'deck-course-module') {
        const rail = (goal) => { box(48, 158, 212, 302); text('本节目标', 66, 182, 170, 32, 14, { bold: true }); text(goal, 66, 240, 169, 180, 23, { bold: true }); };
        title('把一个新方法，练成可用的能力', 1);
        text('从理解，\n走向独立完成。', 48, 172, 630, 172, 64, { bold: true });
        box(716, 172, 196, 230);
        text('READ\nTRY\nREVIEW', 740, 206, 152, 157, 25, { bold: true });
        text('工作坊 / 示例课程 / 45 分钟', 52, 389, 620, 42, 19, { color: c('muted') });
        save('课程封面', 'cover');
        title('结束时，你应该能完成三件事', 2);
        rail('用自己的语言\n说明学习结果');
        ['解释核心概念', '完成一次练习', '检查并修正结果'].forEach((s, i) => { text('0' + (i + 1), 310, 174 + i * 93, 80, 45, 25, { color: c('accent') }); text(s, 414, 174 + i * 93, 480, 55, 26, { bold: true }); line(310, 240 + i * 93, 594); });
        save('学习目标');
        title('一个动作，包含输入、规则与结果', 3);
        rail('看清结构\n再讨论细节');
        ['输入', '规则', '结果'].forEach((s, i) => { box(310 + i * 202, 221, 181, 111, 'paper', true); text(s, 330 + i * 202, 252, 141, 50, 25, { bold: true }); });
        text('例：一段材料 → 提炼判断 → 三句话说明', 310, 383, 590, 60, 21);
        save('概念结构', 'process');
        title('把抽象要求，换成可检查的表达', 4);
        rail('识别一个\n有效的目标');
        text('修改前', 310, 166, 280, 35, 18, { color: c('muted') });
        text('“学习得更好”', 310, 215, 590, 50, 28);
        line(310, 286, 594);
        text('修改后', 310, 310, 280, 35, 18, { color: c('accent') });
        text('“独立完成示例，\n并解释每一步的理由”', 310, 357, 590, 80, 27, { bold: true });
        save('实例讲解', 'comparison');
        title('练习：把任务拆成三个可验证步骤', 5);
        rail('实际操作\n而不是复述');
        ['2 分钟：写下目标', '5 分钟：完成第一次尝试', '3 分钟：检查结果并记录疑问'].forEach((s, i) => { text(s, 310, 170 + i * 103, 594, 62, 24, { bold: true }); line(310, 243 + i * 103, 594); });
        save('限时练习', 'process');
        title('自测：哪个证据能说明你学会了？', 6);
        rail('判断学习\n是否真正发生');
        ['A  看完全部材料', 'B  记住所有标题', 'C  独立完成新例子并解释过程'].forEach((s, i) => { box(310, 164 + i * 96, 594, 70); text(s, 330, 183 + i * 96, 550, 44, 21); });
        text('先独立选择，再讨论理由。答案与解析见演讲备注。', 310, 459, 594, 28, 14, { color: c('muted') });
        save('选择自测');
        pages.at(-1).page.notes += ' Suggested answer: C; transfer and explanation provide evidence of learning.';
        title('复盘：留下能帮助下一次的记录', 7);
        rail('发现差距\n形成改进动作');
        ['我已经能做到', '我仍然不确定', '下一次我会改变'].forEach((s, i) => { text(s, 310, 165 + i * 100, 580, 38, 24, { bold: true }); line(310, 234 + i * 100, 594); });
        save('学习复盘');
        title('带走一个方法，并在真实任务中使用', 8);
        text('理解结构\n动手尝试\n用结果校正', 48, 160, 650, 236, 42, { bold: true });
        box(714, 168, 198, 254);
        text('下一次\n带一个\n真实案例', 736, 211, 152, 160, 27, { bold: true });
        save('课程总结', 'closing');
    }
    else {
        title('真正值得记录的，是判断如何改变', 1);
        text('从观察，\n到有依据的判断。', 48, 166, 798, 172, 64, { fontFamily: 'Georgia' });
        line(48, 344, 864);
        text('一份关于证据、解释和行动的编辑手记', 48, 372, 796, 65, 24, { color: c('muted') });
        save('手记封面', 'cover');
        title('先写出判断，再摆出支持它的证据', 2);
        text('01\n观察笔记', 48, 165, 210, 100, 25, { fontFamily: 'Georgia', color: c('muted') });
        line(283, 160, 0, 298);
        text('判断不是标题的装饰，\n它决定这一页应该放什么。', 326, 168, 578, 115, 32, { fontFamily: 'Georgia' });
        text('把现象、解释和建议分开。\n每一条解释，都要能够回到可核实的观察。', 326, 327, 570, 106, 22);
        save('观点展开');
        title('有价值的证据，应该能改变一个决定', 3);
        text('“如果证据不能改变判断，\n我们可能只是用它装饰观点。”', 76, 188, 808, 153, 37, { fontFamily: 'Georgia' });
        line(76, 381, 113, 0, 'accent', 2);
        text('DSH 自编示例句 / 用于展示引文版式', 215, 369, 649, 43, 17, { color: c('muted') });
        save('引文页', 'quote');
        title('同一尺度，才能看见真正的差异', 4);
        ['方案一', '方案二', '方案三'].forEach((s, i) => { text(s, 48, 165 + i * 95, 167, 40, 23); box(230, 175 + i * 95, [240, 470, 340][i], 29, i === 1 ? 'accent' : 'surface'); text(['48', '94', '68'][i], 728, 161 + i * 95, 155, 53, 34, { fontFamily: 'Georgia' }); });
        text('自编演示数据 / 相同条件 / 指标单位：分', 48, 460, 790, 25, 13, { color: c('muted') });
        save('证据条图', 'data');
        title('把旧假设和新证据放在同一页', 5);
        line(480, 160, 0, 290);
        text('旧假设', 48, 170, 380, 42, 22, { color: c('muted') });
        text('只要投入更多，\n结果就会更好。', 48, 242, 380, 101, 29, { fontFamily: 'Georgia' });
        text('新的观察', 526, 170, 378, 42, 22, { color: c('accent') });
        text('瓶颈没有变化，\n额外投入只是增加等待。', 526, 242, 378, 126, 29, { fontFamily: 'Georgia' });
        save('假设对照', 'comparison');
        title('解释变化，需要补上中间的因果环节', 6);
        [['条件变化', '新的约束出现'], ['行为调整', '资源重新分配'], ['结果变化', '效率和成本改变']].forEach(([a, b], i) => { text('0' + (i + 1), 48 + i * 296, 168, 248, 55, 36, { fontFamily: 'Georgia', color: c('accent') }); line(48 + i * 296, 251, 248); text(a, 48 + i * 296, 278, 248, 50, 26, { bold: true }); text(b, 48 + i * 296, 356, 248, 72, 20); });
        save('因果分析', 'process');
        title('行动优先级：影响与证据一起考虑', 7);
        box(48, 160, 864, 292);
        line(480, 160, 0, 292, 'paper', 2);
        line(48, 306, 864, 0, 'paper', 2);
        [['证据充分 / 影响较大', '优先行动'], ['证据不足 / 影响较大', '先做验证'], ['证据充分 / 影响较小', '安排实施'], ['证据不足 / 影响较小', '保留观察']].forEach(([a, b], i) => { const x = 70 + (i % 2) * 432, y = 179 + Math.floor(i / 2) * 146; text(a, x, y, 384, 32, 17, { color: c('muted') }); text(b, x, y + 53, 384, 47, 29, { fontFamily: 'Georgia' }); });
        save('决策矩阵');
        title('留下一项行动，也留下一项待验证的问题', 8);
        text('下一步做什么？', 48, 169, 860, 70, 39, { fontFamily: 'Georgia' });
        text('谁负责 / 如何验证 / 何时复盘', 48, 271, 860, 60, 23, { color: c('muted') });
        line(48, 367, 864);
        text('判断可以坚定，证据始终允许更新。', 48, 406, 860, 64, 29, { fontFamily: 'Georgia' });
        save('行动收尾', 'closing');
    }
    const palette = { background: spec.paper, surface: spec.surface, text: spec.ink, muted: spec.muted, accent: spec.accent, secondary: spec.surface };
    const manifest = { version: 'v2', title: spec.name, size: [960, 540], template: { id: spec.slug, name: spec.name }, pages: pages.map((_, i) => `pages/${String(i + 1).padStart(2, '0')}.page`) };
    await fs.writeFile(path.join(out, 'source/deck.pptd'), yaml.dump(manifest, { lineWidth: -1 }));
    const refs = [];
    for (const [i, p] of pages.entries()) {
        await fs.writeFile(path.join(out, manifest.pages[i].replace('pages/', 'source/pages/')), yaml.dump(p.page, { lineWidth: -1 }));
        refs.push({ slideNumber: i + 1, sourceTitle: p.label, family: p.family, titlePosition: 'left', bodyColumns: p.family === 'comparison' ? 2 : 1, density: 'medium', features: ['statement'], recommendedRoles: [i === 0 ? 'cover' : i === 7 ? 'closing' : 'overview'], structureSummary: p.label + '；以可编辑文本和矢量形状组织信息。', zones: p.page.elements.filter(x => x.elementType !== 'line').map(x => ({ kind: x.elementType === 'text' ? (x.content.fontSize >= 29 ? 'title' : 'text') : 'shape', x: x.bounds[0] * 4 / 3, y: x.bounds[1] * 4 / 3, width: x.bounds[2] * 4 / 3, height: x.bounds[3] * 4 / 3, ...x.elementType === 'text' ? { textRole: x.content.fontSize >= 29 ? 'title' : 'body', fontSize: x.content.fontSize, textCapacity: Math.floor(x.bounds[2] / x.content.fontSize) * Math.floor(x.bounds[3] / (x.content.fontSize * 1.2)) } : { shape: 'rect', fill: x.fill.color.slice(1) } })), jsxReference: '' });
    }
    const design = `# ${spec.name}\n\n${spec.summary}\n\n## 使用规则\n\n16:9，960×540 点。正文使用 Arial 并由系统回退中文字体；编辑部大标题可用 Georgia，缺失时回退衬线字体。只引用字体名称，不分发字体文件。背景 #${spec.paper}，正文 #${spec.ink}，强调 #${spec.accent}。单页突出一个判断；超出文本容量时拆页，不缩小字号。保持边距 48 点、清晰层次及页脚。图表、表格、关系图均使用可编辑元素。\n\n## 版式\n\n${pages.map((p, i) => `${i + 1}. ${p.label}`).join('\n')}\n\n## 来源\n\n${spec.source ? `视觉方向参考 html-anything 的 ${spec.source}（Apache-2.0，固定提交 c31204544230578ac814026fecc153c6e36587ae）。本文件、PPTD 页面、示例内容和预览为 DSH 的适配和新增；保留上游许可和署名。` : 'DSH 独立编写；未使用 guizang-ppt-skill、社区 Kimi 模板、木友圈文件或它们的派生图片。'} 示例句和示例数字均为自编，不代表事实结论。\n`;
    await fs.writeFile(path.join(out, 'design.md'), design);
    const definition = { id: spec.slug, category: spec.category, sourceCollection: 'curated', slug: spec.slug, name: spec.name, variantLabel: 'DSH', description: spec.summary, previewTitle: spec.name, previewSubtitle: 'DSH · 8 editable layouts', titleFontFace: spec.source ? 'Arial' : 'Georgia', bodyFontFace: 'Arial', palette, referenceDirectory: spec.category + '/' + spec.slug, referenceWidth: 1280, referenceHeight: 720, referencePageCount: 8, representativeSlides: [1, 2, 3, 4, 5, 6, 7, 8], previewSlides: [1, 2, 3, 4, 5, 6, 7, 8], designSha256: crypto.createHash('sha256').update(design).digest('hex') };
    const source = { fileName: spec.slug + '-reference.jpg', sha256: definition.designSha256, slideCount: 8, averageTextBlocks: 10, averageCharacters: 180, visualGrammar: 'editorial', recommendedDensity: 'medium', designSummary: spec.summary, layoutPatterns: pages.map((p, i) => ({ family: p.family, slideCount: 1, sampleSlideNumbers: [i + 1], titlePosition: 'left', bodyColumns: 1, density: 'medium', averageTextFrames: 10, averageMediaFrames: 0 })), pageReferences: refs };
    await fs.writeFile(path.join(out, 'metadata.json'), JSON.stringify({ definition, semantics: { palette, source }, provenance: { kind: spec.source ? 'apache-adaptation' : 'dsh-original', license: spec.source ? 'Apache-2.0' : 'MIT', upstream: spec.source ? upstream : undefined, sourceSkill: spec.source, author: 'DSH Desktop contributors', modified: '2026-09-06' } }, null, 2) + '\n');
    console.log(spec.slug, pages.length, 'editable pages');
}
