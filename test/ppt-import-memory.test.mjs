import { randomUUID } from 'node:crypto';
import { mkdtemp,readFile,rm,writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import PptxGenJS from 'pptxgenjs';
import { afterEach,expect,it } from 'vitest';
import { PersonalTemplateLibrary } from '../packages/ppt-runtime/core/lib/personal-templates.js';
import { runPersonalTemplateImport } from '../packages/ppt-runtime/core/lib/personal-template-import.js';
import { unzipSync,zipSync,strFromU8,strToU8 } from 'fflate';
import { boundedPptxGeometry } from '../packages/ppt-runtime/core/lib/pptx-geometry-budget.js';

const roots=[];
afterEach(async()=>{for(const root of roots.splice(0))await rm(root,{recursive:true,force:true});});
async function fixture(pages=1) {
  const root=await mkdtemp(path.join(os.tmpdir(),'ppt-import-memory-'));roots.push(root);
  const audits=[];
  const library=new PersonalTemplateLibrary({root,appendAudit:async(...args)=>audits.push(args)});
  const pptx=new PptxGenJS();pptx.layout='LAYOUT_WIDE';
  for(let i=0;i<pages;i++)pptx.addSlide().addText(`Heading ${i+1}`,{x:1,y:1,w:10,h:1,fontSize:24});
  const bytes=Buffer.from(await pptx.write({outputType:'nodebuffer'}));
  const upload=await library.uploadStart('owner',{fileName:'template.pptx',size:bytes.length});
  await library.uploadChunk('owner',{uploadId:upload.uploadId,offset:0,base64:bytes.toString('base64')});
  return {root,library,audits,job:{root,sessionId:'owner',uploadId:upload.uploadId,draftId:randomUUID(),maxSlides:200}};
}

it('imports more template pages than the default generation cap and preserves every preview index',async()=>{
  const {library,job}=await fixture(41);
  const draft=await library.prepare('owner',{uploadId:job.uploadId,requestId:randomUUID()});
  expect(draft.template.slideCount).toBe(41);
  expect(draft.template.pageIndex.map(page=>page.slideNumber)).toEqual(Array.from({length:41},(_,i)=>i+1));
  expect(draft.template.previewMetadata.engine).toBe('libreoffice-pdfium');
  const last=await library.previewPage('owner',draft.draftId,41);
  expect(last.preview).toMatch(/^data:image\/png;base64,/);
  await library.cancel('owner',draft.draftId);
},120000);

it('contains a real child V8 heap exhaustion and accepts a later import in the same host',async()=>{
  const {library,job}=await fixture();
  await expect(runPersonalTemplateImport(job,undefined,{maxHeapMiB:32})).rejects.toThrow('内存预算');
  const draft=await library.prepare('owner',{uploadId:job.uploadId});
  expect(draft.template.slideCount).toBe(1);
  await library.cancel('owner',draft.draftId);
},60000);

it('bounds an import deadline and keeps the host upload available for a new attempt',async()=>{
  const {library,job}=await fixture();
  await expect(runPersonalTemplateImport(job,undefined,{timeoutMs:1})).rejects.toThrow('超时');
  const draft=await library.prepare('owner',{uploadId:job.uploadId});
  expect(draft.template.slideCount).toBe(1);
  await library.cancel('owner',draft.draftId);
});

it('cleans failed uploads and records the conversion error without interrupting the library',async()=>{
  const {root,library,job,audits}=await fixture();
  const file=path.join(root,'personal-templates/uploads',job.uploadId,'source.pptx');
  await writeFile(file,Buffer.alloc((await readFile(file)).length));
  await expect(library.prepare('owner',{uploadId:job.uploadId})).rejects.toThrow('有效的 PPTX');
  await expect(readFile(path.join(root,'personal-templates/uploads',job.uploadId,'source.pptx'))).rejects.toMatchObject({code:'ENOENT'});
  expect(audits.at(-1)[1]).toMatchObject({operation:'prepare-personal-template',status:'failed'});
  expect(await library.list()).toEqual([]);
});

it('processes repeated dense vector paths under a small heap with frames and ordinary shapes retained',async()=>{
  const {root,library,job}=await fixture();
  const pptx=new PptxGenJS();pptx.layout='LAYOUT_WIDE';
  for(let i=0;i<12;i++) {
    const slide=pptx.addSlide();
    slide.addText(`Page ${i+1} 🐳`,{x:1,y:.2,w:8,h:.5,fontSize:20});
    slide.addShape('rect',{x:2,y:2,w:3,h:2,rotate:30,fill:{color:'224466'}});
    slide.addShape('ellipse',{x:7,y:2,w:1,h:1,fill:{color:'7799BB'}});
  }
  const entries=unzipSync(Buffer.from(await pptx.write({outputType:'nodebuffer'})));
  const dense=`<a:custGeom><a:avLst/><a:gdLst/><a:ahLst/><a:cxnLst/><a:rect l="0" t="0" r="r" b="b"/><a:pathLst><a:path w="100000" h="100000"><a:moveTo><a:pt x="0" y="0"/></a:moveTo>${'<a:lnTo><a:pt x="10000" y="20000"/></a:lnTo>'.repeat(20000)}<a:close/></a:path></a:pathLst></a:custGeom>`;
  for(const key of Object.keys(entries).filter(key=>/^ppt\/slides\/slide\d+\.xml$/.test(key))) {
    let matched=0;
    const xml=strFromU8(entries[key]).replace(/<p:sp>[\s\S]*?<\/p:sp>/g,shape=>{
      if(!shape.includes('cx="2743200" cy="1828800"'))return shape;
      matched++;return shape.replace(/<a:prstGeom\b[^>]*>[\s\S]*?<\/a:prstGeom>/,dense);
    });
    expect(matched).toBe(1);expect(xml).toContain('<a:custGeom>');entries[key]=strToU8(xml);
  }
  const bytes=Buffer.from(zipSync(entries));
  await library.uploads.cancel('owner',job.uploadId);
  const upload=await library.uploads.start('owner',{fileName:'dense.pptx',size:bytes.length});
  await library.uploads.append('owner',{uploadId:upload.uploadId,offset:0,base64:bytes.toString('base64')});
  const draft=await runPersonalTemplateImport({...job,uploadId:upload.uploadId},undefined,{maxHeapMiB:384});
  expect(draft.template.slideCount).toBe(12);
  expect(draft.template.resourcePlaceholders).toHaveLength(12);
  for(const item of draft.template.resourcePlaceholders)expect(item).toMatchObject({feature:'shape-geometry',bounds:[144,144,216,144]});
  const source=await readFile(path.join(root,'personal-templates/drafts',draft.draftId,'source.pptx'));
  expect(source.equals(bytes)).toBe(true);
  const exported=unzipSync(await readFile(path.join(root,'personal-templates/drafts',draft.draftId,'preview-deck.pptx')));
  for(let i=1;i<=12;i++) {
    const xml=strFromU8(exported[`ppt/slides/slide${i}.xml`]);
    expect(xml).toContain('prst="ellipse"');
    expect(xml).toContain('rot="1800000"');
    expect(xml).toContain('<p:pic>');
  }
  await library.cancel('owner',draft.draftId);
},60000);

it.each(['a','drawing',''])('preserves namespace and Unicode positions while bounding %s geometry',prefix=>{
  const q=prefix?prefix+':':'',ns=prefix?`xmlns:${prefix}`:'xmlns';
  const xml=`<root>🐳<${q}custGeom ${ns}="http://schemas.openxmlformats.org/drawingml/2006/main"><${q}pathLst>${`<${q}path/>`.repeat(40000)}</${q}pathLst></${q}custGeom><next>after</next></root>`;
  const bounded=boundedPptxGeometry(xml);
  expect(bounded).toContain('🐳');expect(bounded).toContain('<next>after</next>');
  expect(bounded).toContain('dshBudget:placeholder="geometry"');
  expect(bounded).not.toContain('custGeom');
  expect(bounded.length).toBeLessThan(1000);
});
