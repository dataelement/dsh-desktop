import { mkdtemp, writeFile, readFile, mkdir, rm, access, truncate } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { unzipSync, zipSync, strFromU8, strToU8 } from 'fflate';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ render: vi.fn(), images: vi.fn(), dispose: vi.fn(), export: vi.fn(), create: vi.fn() }));
vi.mock('@deepseek-ai/libreoffice-kit', () => ({ createConverterFactory: async () => ({ create: mocks.create, dispose: mocks.dispose }) }));
vi.mock('../packages/ppt-runtime/core/lib/pptd.js', () => ({ renderPptdProject: mocks.export }));
const { renderOfficeTemplatePreview } = await import('../packages/ppt-runtime/core/lib/office-template-preview.js');
let root, events;
function deck(pages) {
  return zipSync({ 'ppt/presentation.xml': strToU8(`<p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><p:sldIdLst>${Array.from({length:pages},(_,i)=>`<p:sldId id="${256+i}" r:id="rId${i+1}"/>`).join('')}</p:sldIdLst></p:presentation>`), 'ppt/slides/slide1.xml':strToU8('Font context retained') });
}
const project = pages => ({ pages: Array.from({length:pages},()=>({})), width:720, height:405 });
beforeEach(async () => {
  vi.resetAllMocks();root=await mkdtemp(path.join(os.tmpdir(),'ppt-office-progress-'));events=[];
  mocks.export.mockImplementation(async p => ({bytes:deck(p.pages.length)}));
  mocks.create.mockResolvedValueOnce({render:mocks.render}).mockResolvedValueOnce({renderImages:mocks.images});
  mocks.render.mockImplementation(async ({inputPath,outputPath})=>{
    const xml=strFromU8(unzipSync(await readFile(inputPath))['ppt/presentation.xml']);
    const first=Number(xml.match(/firstSlideNum="(\d+)"/)[1]),pages=[...xml.matchAll(/<p:sldId /g)].length;
    events.push(`office:${first}:${pages}`);await writeFile(outputPath,JSON.stringify({first,pages}));return{missingFonts:['Missing Face']};
  });
  mocks.images.mockImplementation(async ({inputPath,outputDir,pages},signal,onImage)=>{
    const batch=JSON.parse(await readFile(inputPath));await mkdir(outputDir);const images=[];
    for(const page of pages){const file=path.join(outputDir,`page-${page}.png`);await writeFile(file,String(batch.first+page-1));const image={page,path:file};images.push(image);events.push(`paint:${batch.first+page-1}`);await onImage(image,batch.pages);}
    events.push(`returned:${batch.first}`);return{pageCount:batch.pages,images};
  });
});
afterEach(async()=>{await rm(root,{recursive:true,force:true});});

it.each([1,10,25])('publishes every page before its image batch returns, with a %i-page source',async pages=>{
  const published=[];
  const result=await renderOfficeTemplatePreview(project(pages),root,1920,200,async p=>{
    expect(await readFile(p.path,'utf8')).toBe(String(p.page));published.push(p.page);events.push(`published:${p.page}`);
  });
  expect(published).toEqual(Array.from({length:pages},(_,i)=>i+1));
  expect(events.indexOf('published:1')).toBeLessThan(events.findIndex(e=>e.startsWith('office:2:'))===-1?Infinity:events.findIndex(e=>e.startsWith('office:2:')));
  expect(events.indexOf('published:1')).toBeLessThan(events.indexOf('returned:1'));
  if(pages>1)expect(events.indexOf('published:2')).toBeLessThan(events.indexOf('returned:2'));
  expect(mocks.export).toHaveBeenCalledTimes(1);expect(result.missingFonts).toEqual(['Missing Face']);expect(result.timings.firstPageMs).toBeGreaterThanOrEqual(0);
  expect(mocks.dispose).toHaveBeenCalledTimes(1);await expect(access(path.join(root,'office-preview'))).rejects.toThrow();
  expect(unzipSync(await readFile(path.join(root,'preview-deck.pptx')))['ppt/slides/slide1.xml']).toEqual(strToU8('Font context retained'));
});

it('joins and disposes the next Office export when page publication fails',async()=>{
  let rejectNext;
  const original=mocks.render.getMockImplementation();
  mocks.render.mockImplementation(async args=>{
    if(args.inputPath.includes('batch-10'))return new Promise((_,reject)=>{rejectNext=reject;});
    return original(args);
  });
  mocks.dispose.mockImplementation(async()=>{rejectNext?.(new Error('disposed'));});
  await expect(renderOfficeTemplatePreview(project(17),root,1920,200,async p=>{
    if(p.page===2){await new Promise(resolve=>setImmediate(resolve));throw new Error('publication failed');}
  })).rejects.toThrow('publication failed');
  expect(rejectNext).toBeTypeOf('function');expect(mocks.dispose).toHaveBeenCalledTimes(1);
  await expect(access(path.join(root,'office-preview'))).rejects.toThrow();
});

it('rejects out-of-order images and releases batch files',async()=>{
  mocks.images.mockImplementation(async({outputDir},signal,onImage)=>{
    await mkdir(outputDir);const file=path.join(outputDir,'wrong.png');await writeFile(file,'wrong');await onImage({page:2,path:file},1);
  });
  await expect(renderOfficeTemplatePreview(project(2),root,1920,200)).rejects.toThrow('page count mismatch');
  expect(mocks.dispose).toHaveBeenCalledTimes(1);await expect(access(path.join(root,'office-preview'))).rejects.toThrow();
});

it('enforces the page budget before starting Office',async()=>{
  await expect(renderOfficeTemplatePreview(project(201),root,1920,200)).rejects.toThrow('page budget');
  expect(mocks.export).toHaveBeenCalledTimes(0);expect(mocks.create).toHaveBeenCalledTimes(0);
});


it('applies the PDF byte budget across batches',async()=>{
  const metadata=new Map();
  mocks.render.mockImplementation(async({inputPath,outputPath})=>{
    const xml=strFromU8(unzipSync(await readFile(inputPath))['ppt/presentation.xml']);
    const first=Number(xml.match(/firstSlideNum="(\d+)"/)[1]),pages=[...xml.matchAll(/<p:sldId /g)].length;
    metadata.set(outputPath,{first,pages});await writeFile(outputPath,'');await truncate(outputPath,64*1024*1024+1);return{missingFonts:[]};
  });
  mocks.images.mockImplementation(async({inputPath,outputDir,pages},signal,onImage)=>{
    await mkdir(outputDir);const batch=metadata.get(inputPath),images=[];
    for(const page of pages){const file=path.join(outputDir,`page-${page}.png`);await writeFile(file,String(batch.first+page-1));const image={page,path:file};images.push(image);await onImage(image,batch.pages);}
    return{pageCount:batch.pages,images};
  });
  const published=[];await expect(renderOfficeTemplatePreview(project(10),root,1920,200,async p=>published.push(p.page))).rejects.toThrow('PDF byte budget');
  expect(published).toEqual([1]);expect(mocks.dispose).toHaveBeenCalledTimes(1);await expect(access(path.join(root,'office-preview'))).rejects.toThrow();
});


it('propagates external cancellation to both slots and joins the pending export', async () => {
  const controller=new AbortController(); let pendingStarted=false;
  const original=mocks.render.getMockImplementation();
  mocks.render.mockImplementation(async (args,signal) => {
    expect(signal).toBe(controller.signal);
    if (args.inputPath.includes('batch-10')) {
      pendingStarted=true;
      return new Promise((resolve,reject) => signal.addEventListener('abort',() => reject(signal.reason),{once:true}));
    }
    return original(args);
  });
  const originalImages=mocks.images.getMockImplementation();
  mocks.images.mockImplementation(async (args,signal,onImage) => {
    expect(signal).toBe(controller.signal);
    return originalImages(args,signal,onImage);
  });
  const published=[];
  await expect(renderOfficeTemplatePreview(project(17),root,1920,200,async p => {
    published.push(p.page);
    if(p.page===2){await vi.waitFor(() => expect(pendingStarted).toBe(true));controller.abort();}
  },controller.signal)).rejects.toMatchObject({name:'AbortError'});
  expect(published).toEqual([1,2]);expect(mocks.dispose).toHaveBeenCalledTimes(1);
  await expect(access(path.join(root,'office-preview'))).rejects.toThrow();
});
