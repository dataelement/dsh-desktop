import { mkdtemp, writeFile, readFile, access, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import PptxGenJS from 'pptxgenjs';
import { createConverter } from '@deepseek-ai/libreoffice-kit';
import { afterAll, beforeAll, expect, it } from 'vitest';
let root, pdf, converter;
beforeAll(async()=>{
  root=await mkdtemp(path.join(os.tmpdir(),'office-image-progress-'));const deck=new PptxGenJS();deck.layout='LAYOUT_WIDE';
  for(let i=1;i<=3;i++)deck.addSlide().addText(`Page ${i}`,{x:1,y:1,w:4,h:1,fontFace:'Arial',fontSize:32});
  const source=path.join(root,'source.pptx');await writeFile(source,await deck.write({outputType:'nodebuffer'}));pdf=path.join(root,'source.pdf');
  converter=await createConverter({timeoutMs:30000});await converter.render({inputPath:source,outputPath:pdf});
},60000);
afterAll(async()=>{await converter?.dispose();if(root)await rm(root,{recursive:true,force:true});});

it('publishes complete PNGs in requested order before the native batch resolves',async()=>{
  const directory=path.join(root,'success');const pages=[];let finished=false;
  const result=await converter.renderImages({inputPath:pdf,outputDir:directory,pages:[1,2,3],dpi:48,maxPages:3},undefined,async(image,count)=>{
    expect(finished).toBe(false);expect(count).toBe(3);expect((await readFile(image.path)).subarray(0,8)).toEqual(Buffer.from([137,80,78,71,13,10,26,10]));pages.push(image.page);
  });
  finished=true;expect(pages).toEqual([1,2,3]);expect(result.images.map(image=>image.page)).toEqual(pages);expect(result.rasterEngine).toBe('pdfium');
});

it('removes a failed callback batch and keeps the converter reusable',async()=>{
  const outputDir=path.join(root,'failure');const pages=[];
  await expect(converter.renderImages({inputPath:pdf,outputDir,pages:[1,2,3],dpi:48,maxPages:3},undefined,async image=>{
    pages.push(image.page);if(image.page===2)throw new Error('Consumer stopped');
  })).rejects.toThrow('Consumer stopped');
  expect(pages).toEqual([1,2]);await expect(access(outputDir)).rejects.toThrow();
  const result=await converter.renderImages({inputPath:pdf,outputDir:path.join(root,'retry'),pages:[3],dpi:48,maxPages:3});
  expect(result.images.map(image=>image.page)).toEqual([3]);
});

it('rejects an invalid callback before creating the output directory',async()=>{
  const outputDir=path.join(root,'invalid');await expect(converter.renderImages({inputPath:pdf,outputDir},undefined,'wrong')).rejects.toThrow('progress must be a function');
  await expect(access(outputDir)).rejects.toThrow();
});

it('cancels a stalled consumer callback and releases the native render slot',async()=>{
  const abort=new AbortController(),outputDir=path.join(root,'stalled');let started;
  const entered=new Promise(resolve=>{started=resolve;});
  const rendering=converter.renderImages({inputPath:pdf,outputDir,pages:[1,2],dpi:48,maxPages:3},abort.signal,()=>{
    started();return new Promise(()=>{});
  });
  const failure=expect(rendering).rejects.toThrow('Stop consumer');await entered;abort.abort(new Error('Stop consumer'));await failure;
  await expect(access(outputDir)).rejects.toThrow();
  const next=await converter.renderImages({inputPath:pdf,outputDir:path.join(root,'after-abort'),pages:[1],dpi:48,maxPages:3});expect(next.images).toHaveLength(1);
});
