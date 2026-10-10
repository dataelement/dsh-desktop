import { createConverter } from '@deepseek-ai/libreoffice-kit';
import { mkdir,writeFile,copyFile,rm,lstat,rename } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { constants } from 'node:fs';
import path from 'node:path';
import { renderPptdProject } from './pptd.js';
import { templateOfficeFontOptions } from './office-font-options.js';
/** Render the actual exported template through the bundled Office engine. All paths
 * are host-owned draft files; the caller holds the library policy/audit lock.
 */
export async function renderOfficeTemplatePreview(project,directory,longEdge,maxPages,onPage) {
  const started=Date.now();
  const deck=await renderPptdProject(project);
  const exported=Date.now();
  const input=path.join(directory,'preview-deck.pptx'), pdf=path.join(directory,'preview-deck.pdf');
  const tiles=path.join(directory,'office-preview');
  await writeFile(input,deck.bytes,{flag:'wx',mode:0o600});
  const converter=await createConverter({timeoutMs:120000,maxInputBytes:128*1024*1024,maxOutputBytes:128*1024*1024,...templateOfficeFontOptions});
  try {
    const converted=await converter.render({inputPath:input,outputPath:pdf});
    const officeRendered=Date.now();
    // PDFium rasterizes the PDF exported by Office, using the same model as final output.
    const destination=path.join(directory,'preview','pages');await mkdir(destination,{recursive:true,mode:0o700});
    // Publish the cover immediately. Eight-page batches amortize helper/font/PDF
    // loading while keeping the 40-page and per-operation resource limits.
    for(let first=1;first<=project.pages.length;) {
      const pages=Array.from({length:Math.min(first===1?1:8,project.pages.length-first+1)},(_,index)=>first+index);
      const outputDir=path.join(tiles,`page-${first}`);
      await mkdir(tiles,{recursive:true,mode:0o700});
      const rendered=await converter.renderImages({inputPath:pdf,outputDir,pages,
        dpi:Math.max(24,Math.min(600,longEdge/Math.max(project.width,project.height)*72)),maxPages});
      if(rendered.pageCount!==project.pages.length||rendered.images.length!==pages.length||rendered.images.some((image,index)=>image.page!==pages[index]))
        throw new Error('Office template preview page count mismatch');
      for(const image of rendered.images) {
        const target=path.join(destination,`page-${image.page}.png`);
        await copyFile(image.path,target);
        await onPage?.({page:image.page,total:project.pages.length,path:target});
      }
      await rm(outputDir,{recursive:true,force:true});
      first+=pages.length;
    }
    return {engine:'libreoffice-pdfium',missingFonts:converted.missingFonts,timings:{exportMs:exported-started,officeMs:officeRendered-exported,rasterMs:Date.now()-officeRendered,totalMs:Date.now()-started}};
  } finally {await converter.dispose();await rm(tiles,{recursive:true,force:true});}
}

/** Render a requested original page from the preserved PPTX. The caller validates
 * the source and cache paths under the library lock; PDF and PNG publish atomically.
 */
export async function renderOriginalTemplatePage(input,directory,page,canvas,pageCount,maxPages,longEdge) {
  const pdf=path.join(directory,'source.pdf'),target=path.join(directory,`page-${page}.png`);
  const regular=async file=>{
    try {const info=await lstat(file);if(!info.isFile()||info.isSymbolicLink())throw new Error('原稿缓存应为普通本地文件');return true;}
    catch(error){if(error.code==='ENOENT')return false;throw error;}
  };
  if(await regular(target))return target;
  const converter=await createConverter({timeoutMs:120000,maxInputBytes:128*1024*1024,maxOutputBytes:128*1024*1024,...templateOfficeFontOptions});
  const temporary=path.join(directory,`source-${randomUUID()}.pdf`),tiles=path.join(directory,`tiles-${randomUUID()}`),image=path.join(directory,`page-${randomUUID()}.png`);
  try {
    if(!await regular(pdf)) {await converter.render({inputPath:input,outputPath:temporary});await rename(temporary,pdf);}
    const rendered=await converter.renderImages({inputPath:pdf,outputDir:tiles,pages:[page],maxPages,
      dpi:Math.max(24,Math.min(600,longEdge/Math.max(canvas.width,canvas.height)*72))});
    if(rendered.pageCount!==pageCount||rendered.images.length!==1||rendered.images[0].page!==page)
      throw new Error('原稿预览页数与模板不同，请检查隐藏页或文件结构');
    await copyFile(rendered.images[0].path,image,constants.COPYFILE_EXCL);await rename(image,target);
    return target;
  } finally {await converter.dispose();await rm(tiles,{recursive:true,force:true});await rm(temporary,{force:true});await rm(image,{force:true});}
}
