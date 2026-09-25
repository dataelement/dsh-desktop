/** Expand the remaining fourteen packs after baseline generation/localization. */
import fs from 'node:fs/promises';
import {refinementGuidance} from './ppt/refinement-guidance.mjs';
import path from 'node:path';
import crypto from 'node:crypto';
import yaml from 'js-yaml';
import {createCompositions, compositionPlans} from './ppt/composition-library.mjs';
const root=path.resolve('packages/ppt-runtime/templates');
const json=async file=>JSON.parse(await fs.readFile(file,'utf8'));
for(const category of await fs.readdir(root)) for(const slug of await fs.readdir(path.join(root,category))){
 if(!compositionPlans[slug])continue;
 const dir=path.join(root,category,slug), meta=await json(dir+'/metadata.json'), retained=slug.startsWith('curated-');
 let english;
 for(const lang of ['en','zh']){
  const out=dir+(lang==='en'?'/source':'/source-zh'), manifest=yaml.load(await fs.readFile(out+'/deck.pptd','utf8'));
  const base=await Promise.all(manifest.pages.map(async(file,i)=>({page:yaml.load(await fs.readFile(out+'/'+file,'utf8')),name:meta.semantics.source.pageReferences[i].sourceTitle,family:meta.semantics.source.pageReferences[i].family,reference:meta.semantics.source.pageReferences[i]})));
  const rich=createCompositions(meta,lang);
  const pages=retained?[...base.slice(0,-1),...rich,base.at(-1)]:[base[0],...rich,base.at(-1)];
  if(pages.length!==12)throw Error(slug+': expected 12 pages');
  // Renumber the authored page footer, including retained layouts moved to the end.
  pages.forEach((p,i)=>{for(const e of p.page.elements??[])if(e.elementType==='text'&&e.bounds[0]>=850&&e.bounds[1]>=500&&/^\d{1,2}$/.test(e.content.text))e.content.text=String(i+1).padStart(2,'0');});
  await fs.rm(out+'/pages',{recursive:true,force:true});await fs.mkdir(out+'/pages',{recursive:true});
  manifest.pages=pages.map((_,i)=>'pages/'+String(i+1).padStart(2,'0')+'.page');
  for(const [i,p] of pages.entries())await fs.writeFile(out+'/'+manifest.pages[i],yaml.dump(p.page,{lineWidth:-1}));
  await fs.writeFile(out+'/deck.pptd',yaml.dump(manifest,{lineWidth:-1}));
  if(lang==='en')english=pages;
 }
 let design=await fs.readFile(dir+'/design.md','utf8');
 design=design.replace(/\n## Expanded composition rules[\s\S]*$/,'').replace(/eight editable layouts/g,'twelve editable layouts');
 const guidance=`\n## Expanded composition rules\n\nTwelve editable reference pages. ${retained?'The ten established industry pages are preserved; two new analytical layouts are inserted before the closing.':'The cover and closing retain the parent style; ten content layouts add information structures with varied density.'}\n\n${english.map((p,i)=>`${i+1}. ${p.name} — ${p.summary??p.reference.structureSummary}`).join('\n')}\n\nChoose a layout by the information relationship: evidence and interpretation, hierarchy, change over time, decision criteria, timed dependencies or ordered handoffs. For six or more content pages, use at least four distinct structures when the material supports them; avoid repeating the same composition on adjacent pages. Alternate detailed evidence with a simpler synthesis. A detailed page needs one dominant argument, supporting evidence and a concise interpretation. More detail must come from meaningful relationships, not extra decoration or a smaller font.\n\nKeep the parent palette and typography. Preserve its characteristic rails, paper fields, serif/sans hierarchy and light/dark rhythm. Use body text around 18–22 pt, direct chart labels around 13–16 pt, and 48 pt outer margins on 960 × 540 pt pages. Native text, shapes and connectors remain editable. Rescale the geometry or split a page before shrinking the text. Reference charts drawn with shapes have editable geometry; they do not contain an embedded chart spreadsheet.\n\nNew examples are explicitly illustrative: replace every invented value, quote and conclusion with the user's evidence. Retained sourced industry examples remain attributed in their existing notes. Never invent facts to fill a layout. Include units, common baselines, meaningful owners, measurement windows and dependencies as appropriate. English previews do not select the user's output language. Use the existing English/Chinese font pairs and platform fallbacks; reflow translated text.\n`;
 design+=guidance+'\n'+refinementGuidance;await fs.writeFile(dir+'/design.md',design);
 const refs=english.map((p,i)=>p.reference?{...p.reference,slideNumber:i+1,recommendedRoles:[p.family]}:{slideNumber:i+1,sourceTitle:p.name,family:p.family,titlePosition:'left',bodyColumns:p.columns,density:p.density,features:[p.recipe],recommendedRoles:[p.family],structureSummary:p.summary,zones:p.page.elements.filter(e=>e.elementType!=='line').map(e=>({kind:e.elementType==='text'?(e.content.fontSize>=29?'title':'text'):'shape',x:e.bounds[0]*4/3,y:e.bounds[1]*4/3,width:e.bounds[2]*4/3,height:e.bounds[3]*4/3,...e.elementType==='text'?{textRole:e.content.fontSize>=29?'title':'body',fontSize:e.content.fontSize,textCapacity:Math.floor(e.bounds[2]/e.content.fontSize)*Math.floor(e.bounds[3]/(e.content.fontSize*1.1))}:{shape:e.shapeName,fill:e.fill.color.slice(1)}})),jsxReference:''});
 const count=english.length, nums=english.map((_,i)=>i+1), preview=retained?10:4;
 Object.assign(meta.definition,{referencePageCount:count,representativeSlides:nums,previewSlides:[preview,...nums.filter(n=>n!==preview)],previewSubtitle:'12 editable layouts',previewLanguage:'en',designSha256:crypto.createHash('sha256').update(design).digest('hex')});
 Object.assign(meta.semantics.source,{slideCount:count,sha256:meta.definition.designSha256,designSummary:design,recommendedDensity:'medium',averageTextBlocks:Math.round(english.reduce((n,p)=>n+p.page.elements.filter(e=>e.elementType==='text').length,0)/count),averageCharacters:Math.round(english.reduce((n,p)=>n+p.page.elements.reduce((n,e)=>n+(e.content?.text?.length??0),0),0)/count),pageReferences:refs,layoutPatterns:refs.map((r,i)=>({family:r.family,slideCount:1,sampleSlideNumbers:[i+1],titlePosition:'left',bodyColumns:r.bodyColumns,density:r.density,averageTextFrames:english[i].page.elements.filter(e=>e.elementType==='text').length,averageMediaFrames:0}))});
 await fs.writeFile(dir+'/metadata.json',JSON.stringify(meta,null,2)+'\n');console.log(slug,count,'bilingual layouts');
}
