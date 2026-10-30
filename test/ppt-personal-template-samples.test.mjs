import { expect, it } from 'vitest';
import yaml from 'js-yaml';
import { createPersonalTemplateSamples, validPersonalTemplateSamples } from '../packages/ppt-runtime/core/lib/personal-template-samples.js';
import { extractPersonalTemplateProfile } from '../packages/ppt-runtime/core/lib/personal-template-profile.js';
import { markSourceLayout, hasSourceLayout } from '../packages/ppt-runtime/core/lib/source-layout.js';

const text = (id, value, y, size = 24) => markSourceLayout({ elementId: id, elementType: 'text', bounds: [60,y,600,60], content: {
  text: value, fontFamily: 'Source Face', fontSize: size, color: '#145566', wrap: false, margins: [1,2,3,4],
  paragraphs: [{ align:'center', runs:[{text:value,options:{fontFamily:'Source Face',fontSize:size,color:'#145566',bold:true}}] }],
  nativeTextBody:`<p:txBody xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:bodyPr wrap="none" anchor="ctr" lIns="50800"/><a:lstStyle/><a:p><a:pPr algn="ctr"/><a:r><a:rPr sz="${size*100}" b="1"><a:solidFill><a:srgbClr val="145566"/></a:solidFill><a:latin typeface="Source Face"/></a:rPr><a:t>${value}</a:t></a:r></a:p></p:txBody>`
} });
function fixture() {
  const pages = [0,1,2].map(i=>({file:`pages/${i}.page`,background:{color:'#FFFFFF'},elements:[
    text('title',`客户业务建设方案第${i+1}部分`,30,32),
    text('body','这是一段具体客户的业务背景与实际实施需求，需要替换为通用的内容示例。',130,16),
    text('footer','Source Brand',490,8)
  ]}));
  const source={entryName:'deck.pptd',manifest:'unchanged',pages:new Map(pages.map(p=>[p.file,yaml.dump(p)])),assets:new Map()};
  return {width:960,height:540,pages,source};
}

it('writes bounded sample content into the reusable source while retaining native styles and original assets',()=>{
  const project=fixture(),before=structuredClone(project),profile=extractPersonalTemplateProfile(project);
  const result=createPersonalTemplateSamples(project,profile),page=yaml.load(result.source.pages.get('pages/0.page'));
  expect(project).toEqual(before);
  expect(result.source.assets).toBe(project.source.assets);
  expect(result.samples.simplifiedTextCount).toBe(6);
  expect(page.elements[0].content.paragraphs[0].runs[0].text).toBe('项目方案汇报');
  expect(result.source.pages.get('pages/0.page')).not.toContain('客户业务建设');
  expect(page.elements[0].content.nativeTextBody).toContain('<a:t>项目方案汇报</a:t>');
  expect(page.elements[0].content.nativeTextBody).toContain('sz="3200" b="1"');
  expect(page.elements[0].content.nativeTextBody).toContain('wrap="none" anchor="ctr" lIns="50800"');
  expect(page.elements[0].bounds).toEqual(project.pages[0].elements[0].bounds);
  expect(page.elements[0].content.paragraphs[0].runs[0].options).toEqual(project.pages[0].elements[0].content.paragraphs[0].runs[0].options);
  expect(hasSourceLayout(page.elements[0])).toBe(true);
  expect(page.elements[2]).toEqual(project.pages[0].elements[2]);
  expect(result.samples.representativePages).toEqual([1,2]);
  expect(result.source.pages.size).toBe(3);
  expect(validPersonalTemplateSamples(result.samples,3)).toBe(true);
  expect(validPersonalTemplateSamples({...result.samples,representativePages:[1,3]},3)).toBe(false);
});

it('keeps dense diagrams and chart/table source text together, and retains distinct layouts',()=>{
  const project=fixture();
  project.pages[1].elements.push(...Array.from({length:8},(_,i)=>({elementId:`box${i}`,elementType:'shape',bounds:[i*50,220,45,30],shape:'rect'})),
    ...Array.from({length:8},(_,i)=>text(`label${i}`,`业务标签${i}`,220,12)));
  project.pages[2].elements.push({elementId:'table',elementType:'table',bounds:[60,250,600,180]});
  project.source.pages=new Map(project.pages.map(p=>[p.file,yaml.dump(p)]));
  const result=createPersonalTemplateSamples(project,extractPersonalTemplateProfile(project));
  expect(result.source.pages.get('pages/1.page')).toBe(project.source.pages.get('pages/1.page'));
  expect(result.source.pages.get('pages/2.page')).toBe(project.source.pages.get('pages/2.page'));
  expect(result.samples.layouts.map(p=>p.content)).toEqual(['sample','source','source']);
  expect(result.samples.representativePages).toEqual([1,2,3]);
});

it('preserves numbering, branding and mixed run styles with a separate original source plane',()=>{
  const project=fixture(),heading=project.pages[0].elements[0];
  heading.content.text='Original business heading';
  heading.content.paragraphs[0].runs=[{text:'Original ',options:{fontSize:32,bold:true,color:'#145566'}},{text:'business heading',options:{fontSize:24,bold:false,color:'#008866'}}];
  delete heading.content.nativeTextBody;
  project.pages[0].elements.push(text('number','2026',420,12));
  project.source.pages.set('pages/0.page',yaml.dump(project.pages[0]));
  const result=createPersonalTemplateSamples(project,extractPersonalTemplateProfile(project));
  const page=yaml.load(result.source.pages.get('pages/0.page'));
  expect(page.elements[0].content.paragraphs[0].runs.map(r=>r.options)).toEqual(heading.content.paragraphs[0].runs.map(r=>r.options));
  expect(page.elements[0].content.paragraphs[0].runs.map(r=>r.text).join('')).toBe('Project overview');
  expect(page.elements.at(-1).content.text).toBe('2026');
  expect(project.source.pages.get('pages/0.page')).toContain('Original business');
});

it('keeps empty paragraphs and numerical lines while selecting the first meaningful heading',()=>{
  const project=fixture(),heading=project.pages[0].elements[0];
  delete heading.content.nativeTextBody;
  heading.content.paragraphs=[{runs:[]},...heading.content.paragraphs,{runs:[{text:'2026',options:{fontSize:12}}]}];
  project.source.pages.set('pages/0.page',yaml.dump(project.pages[0]));
  const result=createPersonalTemplateSamples(project,extractPersonalTemplateProfile(project));
  const content=yaml.load(result.source.pages.get('pages/0.page')).elements[0].content;
  expect(content.paragraphs[0].runs).toEqual([]);
  expect(content.paragraphs[1].runs[0].text).toBe('项目方案汇报');
  expect(content.paragraphs[2].runs[0].text).toBe('2026');
});

it('retains native shape geometry and typography differences when grouping representative layouts',()=>{
  const project=fixture();
  project.pages[1].elements.push({elementId:'geometry',elementType:'shape',bounds:[60,220,400,120],nativeShape:{geometry:'<a:prstGeom prst="rect"/>'}});
  project.pages[2].elements.push({elementId:'geometry',elementType:'shape',bounds:[60,220,400,120],nativeShape:{geometry:'<a:prstGeom prst="ellipse"/>'}});
  project.source.pages=new Map(project.pages.map(p=>[p.file,yaml.dump(p)]));
  expect(createPersonalTemplateSamples(project,extractPersonalTemplateProfile(project)).samples.representativePages).toEqual([1,2,3]);
  project.pages[2].elements.at(-1).nativeShape.geometry='<a:prstGeom prst="rect"/>';
  project.pages[2].elements[1].content.paragraphs[0].runs[0].options.color='#880066';
  expect(createPersonalTemplateSamples(project,extractPersonalTemplateProfile(project)).samples.representativePages).toEqual([1,2,3]);
});

it('uses complete short section labels for agendas while retaining their numerical sequence',()=>{
  const project=fixture();
  project.pages[1].elements=[text('title','Contents',30,32),...['公司介绍','技术实力','业务场景','客户案例'].flatMap((value,i)=>[
    text(`number-${i}`,String(i+1).padStart(2,'0'),110+i*70,16),text(`section-${i}`,value,110+i*70,16)
  ])].reverse();
  project.source.pages.set('pages/1.page',yaml.dump(project.pages[1]));
  const result=createPersonalTemplateSamples(project,extractPersonalTemplateProfile(project));
  const elements=yaml.load(result.source.pages.get('pages/1.page')).elements;
  expect(elements.filter(e=>e.elementId.startsWith('section')).sort((a,b)=>a.bounds[1]-b.bounds[1]).map(e=>e.content.paragraphs[0].runs[0].text)).toEqual(['项目背景','主要内容','实施计划','总结展望']);
  expect(elements.filter(e=>e.elementId.startsWith('number')).sort((a,b)=>a.bounds[1]-b.bounds[1]).map(e=>e.content.text)).toEqual(['01','02','03','04']);
});
