import {expect,it} from 'vitest';
import PptxGenJS from 'pptxgenjs';
import {zipSync,unzipSync,strToU8,strFromU8} from 'fflate';
import yaml from 'js-yaml';
import {convertPptxToPptd} from '../packages/ppt-runtime/core/lib/pptx-converter.js';
import {convertedGeometry} from '../packages/ppt-runtime/core/lib/pptx-geometry.js';
import {importedTextLines} from '../packages/ppt-runtime/core/lib/imported-text-layout.js';
import {parsePptdProject,renderPptdProject} from '../packages/ppt-runtime/core/lib/pptd.js';
import {JSDOM} from 'jsdom';
async function fixture(edit,pageCount=1) {
 const pptx=new PptxGenJS();pptx.layout='LAYOUT_WIDE';
 for(let i=0;i<pageCount;i++){
  const slide=pptx.addSlide();
  slide.addShape(pptx.ShapeType.rect,{x:1,y:1,w:3,h:1,fill:{color:'8FAADC'}});
  slide.addText('ABC',{x:1,y:2,w:3,h:1,fontSize:18});
 }
 const parts=unzipSync(Buffer.from(await pptx.write({outputType:'nodebuffer'})));edit(parts);
 return convertPptxToPptd(Buffer.from(zipSync(parts)),'fidelity.pptx');
}
const path='<a:custGeom><a:avLst/><a:gdLst/><a:pathLst><a:path w="100" h="100"><a:moveTo><a:pt x="0" y="0"/></a:moveTo><a:lnTo><a:pt x="20" y="0"/></a:lnTo><a:lnTo><a:pt x="20" y="100"/></a:lnTo><a:close/></a:path></a:pathLst></a:custGeom>';
it('retains custom vector paths through conversion and export',async()=>{
 const converted=await fixture(parts=>{const key='ppt/slides/slide1.xml';parts[key]=strToU8(strFromU8(parts[key]).replace(/<a:prstGeom[\s\S]*?<\/a:prstGeom>/,path));});
 const shape=yaml.load([...converted.source.pages.values()][0]).elements.find(e=>e.elementType==='shape');
 expect(shape.shapeName).toBe('custom');expect(shape.path).toContain('L 43.2 0');
 const exported=unzipSync((await renderPptdProject(parsePptdProject(converted.source))).bytes);
 expect(strFromU8(exported['ppt/slides/slide1.xml'])).toContain('<a:custGeom');
 expect(Object.keys(exported).some(k=>k.endsWith('.svg'))).toBe(false);
});
it('composes visible master graphics and respects showMasterSp',async()=>{
 const edit=(parts,hidden)=>{
  const key='ppt/slideMasters/slideMaster1.xml';
  const shape='<p:sp><p:nvSpPr><p:cNvPr id="900" name="Master decoration"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="914400" cy="914400"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:solidFill><a:srgbClr val="00FF00"/></a:solidFill></p:spPr></p:sp>';
  parts[key]=strToU8(strFromU8(parts[key]).replace('</p:spTree>',shape+'</p:spTree>'));
  if(hidden)parts['ppt/slides/slide1.xml']=strToU8(strFromU8(parts['ppt/slides/slide1.xml']).replace('<p:sld ','<p:sld showMasterSp="0" '));
 };
 for(const hidden of [false,true]){
  const converted=await fixture(p=>edit(p,hidden));
  const elements=yaml.load([...converted.source.pages.values()][0]).elements;
  expect(elements.some(e=>e.fill?.color==='#00FF00')).toBe(!hidden);
 }
});
it('keeps shared master inputs intact across slides with independent visibility and object identities',async()=>{
 const converted=await fixture(parts=>{
  const key='ppt/slideMasters/slideMaster1.xml';
  const shape='<p:sp><p:nvSpPr><p:cNvPr id="900" name="Shared decoration"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="914400" cy="914400"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:solidFill><a:srgbClr val="00FF00"/></a:solidFill></p:spPr></p:sp>';
  parts[key]=strToU8(strFromU8(parts[key]).replace('</p:spTree>',shape+'</p:spTree>'));
  parts['ppt/slides/slide1.xml']=strToU8(strFromU8(parts['ppt/slides/slide1.xml']).replace('<p:sld ','<p:sld showMasterSp="0" '));
 },3);
 const pages=[...converted.source.pages.values()].map(text=>yaml.load(text));
 expect(pages.map(page=>page.elements.filter(e=>e.fill?.color==='#00FF00').length)).toEqual([0,1,1]);
 for(const page of pages){
  expect(new Set(page.elements.map(e=>e.elementId)).size).toBe(page.elements.length);
  expect(page.elements.filter(e=>e.elementType==='text').map(e=>e.content.text).join('')).toContain('ABC');
 }
});
it('preserves source spacing and tabs, exports editable text and honors edits',async()=>{
 const converted=await fixture(parts=>{
  const key='ppt/slides/slide1.xml';let xml=strFromU8(parts[key]);
  xml=xml.replace(/<a:pPr[^>]*>/,'<a:pPr marL="12700"><a:tabLst><a:tab pos="914400" algn="l"/></a:tabLst>');
  xml=xml.replace(/<a:rPr /,'<a:rPr spc="-100" ').replace('<a:t>ABC</a:t>','<a:t>A\tBC</a:t>');
  parts[key]=strToU8(xml);
 });
 const page=yaml.load([...converted.source.pages.values()][0]);const text=page.elements.find(e=>e.elementType==='text');
 expect(text.content.paragraphs[0].tabStops[0].position).toBe(72);
 expect(text.content.paragraphs[0].runs[0].options.letterSpacing).toBe(-1);
 const lines=importedTextLines(text.content,text.bounds);expect(lines[1].x-lines[0].x).toBeCloseTo(71);
 const exported=unzipSync((await renderPptdProject(parsePptdProject(converted.source))).bytes);
 expect(strFromU8(exported['ppt/slides/slide1.xml'])).toContain('BC');
 text.content.text='<p>Edited</p>';
 const source={...converted.source,pages:new Map([['pages/page-1.page',yaml.dump(page)]])};
 const edited=unzipSync((await renderPptdProject(parsePptdProject(source))).bytes);
 expect(strFromU8(edited['ppt/slides/slide1.xml'])).toContain('Edited');
 expect(strFromU8(edited['ppt/slides/slide1.xml'])).not.toContain('>BC<');
});
it('uses full authored width and negative spacing without cropping a final glyph',()=>{
 const lines=importedTextLines({fontSize:12,wrap:true,paragraphs:[{runs:[{text:'交互问答',options:{fontSize:12,bold:true,letterSpacing:-.15}}]}]},[0,0,49,16]);
 expect(lines).toHaveLength(1);expect(lines[0].runs[0].text).toBe('交互问答');
});
it('fails explicitly on unsupported geometry instead of creating a bounding rectangle',()=>{
 const doc=new JSDOM(path.replace('<a:custGeom>', '<a:custGeom xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">').replace('<a:close/>','<a:unknown/>'),{contentType:'text/xml'}).window.document;
 // The DOM fixture supplies the namespace used by source OOXML.
 expect(()=>convertedGeometry(doc.documentElement,100,100)).toThrow();
});

it('flattens CJK theme fonts and keeps DrawingML property order for Office export',async()=>{
 const converted=await fixture(parts=>{
  const key='ppt/slides/slide1.xml';let xml=strFromU8(parts[key]);
  xml=xml.replace('<a:t>ABC</a:t>','<a:t>中文标题</a:t>');
  xml=xml.replace(/<a:rPr[^>]*>[\s\S]*?<\/a:rPr>/,'<a:rPr sz="1800"><a:ea typeface="Calibri"/><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill><a:latin typeface="Lantinghei SC Heavy"/></a:rPr>');
  parts[key]=strToU8(xml);
 });
 const text=yaml.load([...converted.source.pages.values()][0]).elements.find(e=>e.elementType==='text');
 expect(text.content.fontFamily).toBe('Lantinghei SC Heavy');
 const xml=text.content.nativeTextBody;
 expect(xml).toContain('<a:ea typeface="Lantinghei SC Heavy"/>');
 const props=xml.slice(xml.indexOf('<a:rPr'),xml.indexOf('</a:rPr>'));
 expect(props.indexOf('solidFill')).toBeLessThan(props.indexOf('<a:latin'));
});
it('preserves transparent custom-shape overlays in editable export',async()=>{
 const converted=await fixture(parts=>{
  const key='ppt/slides/slide1.xml';parts[key]=strToU8(strFromU8(parts[key])
   .replace(/<a:prstGeom[\s\S]*?<\/a:prstGeom>/,path)
   .replace('<a:srgbClr val="8FAADC"/>','<a:srgbClr val="000000"><a:alpha val="32156"/></a:srgbClr>'));
 });
 const exported=unzipSync((await renderPptdProject(parsePptdProject(converted.source))).bytes);
 const vectors=Object.entries(exported).filter(([key])=>key.endsWith('.svg')).map(([,bytes])=>strFromU8(bytes));
 expect(strFromU8(exported['ppt/slides/slide1.xml'])).toContain('val="32156"');
 expect(strFromU8(exported['ppt/slides/slide1.xml'])).toContain('<a:custGeom');
});
it('preserves text box identity, default character kerning and the nearest auto-fit rule',async()=>{
 const converted=await fixture(parts=>{
  const key='ppt/slides/slide1.xml';let xml=strFromU8(parts[key]);
  xml=xml.replaceAll('<p:cNvSpPr/>','<p:cNvSpPr txBox="1"/>').replaceAll('<p:nvPr></p:nvPr>','<p:nvPr><p:ph type="title"/></p:nvPr>');
  xml=xml.replace(/(<a:bodyPr[^>]*>)[\s\S]*?<\/a:bodyPr>/g,'$1<a:spAutoFit/></a:bodyPr>');parts[key]=strToU8(xml);
  const layoutKey=Object.keys(parts).find(key=>/^ppt\/slideLayouts\/slideLayout\d+\.xml$/.test(key));
  parts[layoutKey]=strToU8(strFromU8(parts[layoutKey]).replace('</p:spTree>','<p:sp><p:nvSpPr><p:cNvPr id="90" name="Title"/><p:cNvSpPr/><p:nvPr><p:ph type="title"/></p:nvPr></p:nvSpPr><p:spPr/><p:txBody><a:bodyPr><a:normAutofit fontScale="90000"/></a:bodyPr><a:lstStyle><a:defPPr><a:defRPr kern="0"/></a:defPPr></a:lstStyle><a:p/></p:txBody></p:sp></p:spTree>'));
 });
 const text=yaml.load([...converted.source.pages.values()][0]).elements.find(e=>e.elementType==='text');
 expect(text.content.nativeTextBody).toContain('kern="0"');
 expect(text.content.nativeTextBody.match(/<a:(?:noAutofit|normAutofit|spAutoFit)\b/g)).toEqual(['<a:normAutofit']);
 expect(text.content.sourceAutoFit).toBe('grow');
 expect(text.content.nativeTextBody).not.toContain('fontScale="90000"');
 const exported=unzipSync((await renderPptdProject(parsePptdProject(converted.source))).bytes);
 expect(strFromU8(exported['ppt/slides/slide1.xml'])).toContain('<p:cNvSpPr txBox="1"');
});

it('preserves the whole DrawingML preset catalog rather than the authoring-library subset',async()=>{
 const {DRAWINGML_PRESET_SHAPES}=await import('../packages/ppt-runtime/core/lib/drawingml-shapes.js');
 const converted=await fixture(parts=>{
  const key='ppt/slides/slide1.xml',xml=strFromU8(parts[key]),window=new JSDOM(xml,{contentType:'text/xml'}).window;
  const doc=window.document,tree=doc.getElementsByTagNameNS('*','spTree')[0],original=doc.getElementsByTagNameNS('*','sp')[0];
  original.remove();
  let id=500;
  for(const preset of DRAWINGML_PRESET_SHAPES){const shape=original.cloneNode(true);const nv=shape.getElementsByTagNameNS('*','cNvPr')[0];nv.setAttribute('id',String(id++));nv.setAttribute('name',preset);shape.getElementsByTagNameNS('*','prstGeom')[0].setAttribute('prst',preset);tree.append(shape);}
  parts[key]=strToU8(new window.XMLSerializer().serializeToString(doc));window.close();
 });
 expect(converted.diagnostics.filter(item=>item.level==='unsupported')).toEqual([]);
 const project=parsePptdProject(converted.source),exported=unzipSync((await renderPptdProject(project)).bytes);
 const doc=new JSDOM(strFromU8(exported['ppt/slides/slide1.xml']),{contentType:'text/xml'}).window.document;
 const names=[...doc.getElementsByTagNameNS('*','prstGeom')].map(node=>node.getAttribute('prst'));
 for(const preset of DRAWINGML_PRESET_SHAPES)expect(names).toContain(preset);
 expect(names).toHaveLength(DRAWINGML_PRESET_SHAPES.size+1); // additional textbox geometry
});
it('retains connector bend adjustments and exact arrow endpoints after bounds edits',async()=>{
 const converted=await fixture(parts=>{
  const key='ppt/slides/slide1.xml';let xml=strFromU8(parts[key]);
  xml=xml.replace(/<a:prstGeom[\s\S]*?<\/a:prstGeom>/,'<a:prstGeom prst="bentConnector3"><a:avLst><a:gd name="adj1" fmla="val 23456"/></a:avLst></a:prstGeom>');
  xml=xml.replace('</a:ln>','<a:headEnd type="triangle" w="lg" len="sm"/><a:tailEnd type="diamond" w="sm" len="lg"/></a:ln>');parts[key]=strToU8(xml);
 });
 const project=parsePptdProject(converted.source);const shape=project.pages[0].elements.find(e=>e.shapeName==='bentConnector3');shape.bounds[2]*=2;
 const xml=strFromU8(unzipSync((await renderPptdProject(project)).bytes)['ppt/slides/slide1.xml']);
 expect(xml).toContain('prst="bentConnector3"');expect(xml).toContain('fmla="val 23456"');
 expect(xml).toContain('type="triangle" w="lg" len="sm"');expect(xml).toContain('type="diamond" w="sm" len="lg"');
});
it('exports custom arc/formula geometry natively and applies subsequent authored path edits',async()=>{
 const native='<a:custGeom><a:avLst/><a:gdLst><a:gd name="angle" fmla="at2 w h"/></a:gdLst><a:pathLst><a:path w="100" h="100"><a:moveTo><a:pt x="0" y="50"/></a:moveTo><a:arcTo wR="50" hR="50" stAng="0" swAng="10800000"/><a:close/></a:path></a:pathLst></a:custGeom>';
 const converted=await fixture(parts=>{const key='ppt/slides/slide1.xml';parts[key]=strToU8(strFromU8(parts[key]).replace(/<a:prstGeom[\s\S]*?<\/a:prstGeom>/,native));});
 expect(converted.diagnostics.filter(item=>item.level==='unsupported')).toEqual([]);
 const project=parsePptdProject(converted.source);let xml=strFromU8(unzipSync((await renderPptdProject(project)).bytes)['ppt/slides/slide1.xml']);
 expect(xml).toContain('<a:arcTo');expect(xml).toContain('fmla="at2 w h"');
 const shape=project.pages[0].elements.find(e=>e.shapeName==='custom');shape.path='M 0 0 L 20 20';shape.viewBox=[100,100];
 const edited=unzipSync((await renderPptdProject(project)).bytes);
 expect(strFromU8(edited['ppt/slides/slide1.xml'])).not.toContain('<a:arcTo');
 expect(Object.keys(edited).some(key=>key.endsWith('.svg'))).toBe(true);
});
it('rejects external relationships and entities in imported native geometry',async()=>{
 const {hasNativeShape,nativeShapeIssue}=await import('../packages/ppt-runtime/core/lib/imported-shape-export.js');
 for(const geometry of ['<!DOCTYPE a:prstGeom [<!ENTITY x SYSTEM "file:///secret">]><a:prstGeom xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" prst="rect"/>','<a:prstGeom xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:link="external" prst="rect"/>']) {
  const element={shapeName:'rect',nativeShape:{geometry}};expect(nativeShapeIssue(element)).toBeDefined();expect(hasNativeShape(element)).toBe(false);
 }
});

it('preserves native gradient stops, theme colors and alpha while respecting paint edits',async()=>{
 const gradient='<a:gradFill rotWithShape="1"><a:gsLst><a:gs pos="0"><a:schemeClr val="accent1"><a:alpha val="54321"/></a:schemeClr></a:gs><a:gs pos="100000"><a:srgbClr val="00FF00"/></a:gs></a:gsLst><a:lin ang="5400000" scaled="1"/></a:gradFill>';
 const converted=await fixture(parts=>{const key='ppt/slides/slide1.xml';parts[key]=strToU8(strFromU8(parts[key]).replace(/<a:solidFill>[\s\S]*?<\/a:solidFill>/,gradient));});
 const project=parsePptdProject(converted.source),shape=project.pages[0].elements.find(e=>e.elementType==='shape');
 let xml=strFromU8(unzipSync((await renderPptdProject(project)).bytes)['ppt/slides/slide1.xml']);
 expect(xml).toContain('<a:gradFill');expect(xml).toContain('val="54321"');expect(xml).toContain('ang="5400000"');expect(xml.match(/<a:gradFill[\s\S]*?<\/a:gradFill>/)[0]).not.toContain('<a:schemeClr');
 shape.fill={type:'solid',color:'#FF0000'};
 xml=strFromU8(unzipSync((await renderPptdProject(project)).bytes)['ppt/slides/slide1.xml']);
 expect(xml).not.toContain('<a:gradFill');expect(xml).toContain('val="FF0000"');
});

it('shares identical media across slides and keeps every image relationship valid',async()=>{
 const pptx=new PptxGenJS();pptx.layout='LAYOUT_WIDE';
 const image='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aDZ8AAAAASUVORK5CYII=';
 for(let page=0;page<3;page++)pptx.addSlide().addImage({data:image,x:1,y:1,w:1,h:1});
 const original=await pptx.write({outputType:'nodebuffer'});
 const converted=await convertPptxToPptd(original,'shared-media.pptx');
 const parts=unzipSync((await renderPptdProject(parsePptdProject(converted.source))).bytes);
 const media=Object.keys(parts).filter(name=>name.startsWith('ppt/media/')&&!name.endsWith('/'));
 expect(media).toHaveLength(1);
 for(let page=1;page<=3;page++){
  const doc=new JSDOM(strFromU8(parts[`ppt/slides/_rels/slide${page}.xml.rels`]),{contentType:'text/xml'}).window.document;
  const images=[...doc.getElementsByTagNameNS('*','Relationship')].filter(n=>n.getAttribute('Type').endsWith('/image'));
  expect(images).toHaveLength(1);expect(images[0].getAttribute('Target')).toBe('../media/'+media[0].split('/').pop());
 }
});

it('retains patterned text-shape backgrounds and exact native line paint',async()=>{
 const converted=await fixture(parts=>{
  const key='ppt/slides/slide1.xml',window=new JSDOM(strFromU8(parts[key]),{contentType:'text/xml'}).window;
  const doc=window.document,shapes=doc.getElementsByTagNameNS('*','sp'),first=shapes[0];
  first.append(shapes[1].getElementsByTagNameNS('*','txBody')[0].cloneNode(true));
  let xml=new window.XMLSerializer().serializeToString(doc);window.close();
  xml=xml.replace(/<a:solidFill>[\s\S]*?<\/a:solidFill>/,'<a:pattFill prst="pct10"><a:fgClr><a:srgbClr val="112233"/></a:fgClr><a:bgClr><a:srgbClr val="FFFFFF"/></a:bgClr></a:pattFill>');
  xml=xml.replace(/<a:ln\b(?:[^>]*\/>|[^>]*>[\s\S]*?<\/a:ln>)/,'<a:ln w="25400" cap="rnd" cmpd="dbl" algn="in"><a:solidFill><a:srgbClr val="123456"><a:alpha val="87654"/></a:srgbClr></a:solidFill><a:custDash><a:ds d="300000" sp="100000"/></a:custDash><a:miter lim="800000"/></a:ln>');
  parts[key]=strToU8(xml);
 });
 const project=parsePptdProject(converted.source),shape=project.pages[0].elements.find(e=>e.elementType==='shape');
 expect(shape).toBeDefined();
 let xml=strFromU8(unzipSync((await renderPptdProject(project)).bytes)['ppt/slides/slide1.xml']);
 expect(xml).toContain('<a:pattFill');expect(xml).toContain('cap="rnd" cmpd="dbl"');expect(xml).toContain('val="87654"');expect(xml).toContain('<a:custDash');
 shape.border={width:4,color:'#FF0000',style:'solid'};
 xml=strFromU8(unzipSync((await renderPptdProject(project)).bytes)['ppt/slides/slide1.xml']);
 expect(xml).toContain('<a:pattFill');expect(xml).toContain('val="FF0000"');expect(xml).not.toContain('val="87654"');
});

it('keeps physical text and stroke sizes across equivalent group coordinate systems',async()=>{
 for(const unit of [1000,914400]) {
  const converted=await fixture(parts=>{
   const key='ppt/slides/slide1.xml',window=new JSDOM(strFromU8(parts[key]),{contentType:'text/xml'}).window;
   const doc=window.document,tree=doc.getElementsByTagNameNS('*','spTree')[0],shapes=[...doc.getElementsByTagNameNS('*','sp')];
   const p='http://schemas.openxmlformats.org/presentationml/2006/main',a='http://schemas.openxmlformats.org/drawingml/2006/main';
   const group=doc.createElementNS(p,'p:grpSp');
   const shell=new window.DOMParser().parseFromString(`<p:grpSp xmlns:p="${p}" xmlns:a="${a}"><p:nvGrpSpPr><p:cNvPr id="99" name="Normalized group"/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="914400" y="914400"/><a:ext cx="2743200" cy="1828800"/><a:chOff x="0" y="0"/><a:chExt cx="${unit*3}" cy="${unit*2}"/></a:xfrm></p:grpSpPr></p:grpSp>`,'application/xml');
   for(const item of [...shell.documentElement.children])group.append(doc.importNode(item,true));
   shapes.forEach((shape,index)=>{
    const transform=shape.getElementsByTagNameNS(a,'xfrm')[0],off=transform.getElementsByTagNameNS(a,'off')[0],ext=transform.getElementsByTagNameNS(a,'ext')[0];
    off.setAttribute('x','0');off.setAttribute('y',String(index*unit));ext.setAttribute('cx',String(unit*3));ext.setAttribute('cy',String(unit));
    if(index===0){
     const line=shape.getElementsByTagNameNS(a,'ln')[0];line.setAttribute('w','12700');
     const paint=new window.DOMParser().parseFromString(`<a:solidFill xmlns:a="${a}"><a:srgbClr val="000000"/></a:solidFill>`,'application/xml');
     line.replaceChildren(doc.importNode(paint.documentElement,true));
    }
    group.append(shape);
   });
   tree.append(group);parts[key]=strToU8(new window.XMLSerializer().serializeToString(doc));window.close();
  });
  const project=parsePptdProject(converted.source),shape=project.pages[0].elements.find(e=>e.elementType==='shape'),text=project.pages[0].elements.find(e=>e.elementType==='text');
  expect(shape.bounds).toEqual([72,72,216,72]);expect(shape.border.width).toBe(1);
  expect(text.bounds).toEqual([72,144,216,72]);expect(text.content.fontSize).toBe(18);
  const exported=unzipSync((await renderPptdProject(project)).bytes),window=new JSDOM(strFromU8(exported['ppt/slides/slide1.xml']),{contentType:'text/xml'}).window;
  const doc=window.document,outline=[...doc.getElementsByTagNameNS('*','sp')].find(s=>s.getElementsByTagNameNS('*','cNvPr')[0]?.getAttribute('name')===shape.elementId);
  expect(outline.getElementsByTagNameNS('*','ln')[0].getAttribute('w')).toBe('12700');
  expect([...doc.getElementsByTagNameNS('*','rPr')].some(r=>r.getAttribute('sz')==='1800')).toBe(true);window.close();
 }
});

it('resolves theme line width and color beneath a local connector arrowhead',async()=>{
 const converted=await fixture(parts=>{
  const key='ppt/slides/slide1.xml',window=new JSDOM(strFromU8(parts[key]),{contentType:'text/xml'}).window;
  const doc=window.document,shape=doc.getElementsByTagNameNS('*','sp')[0],properties=[...shape.children].find(n=>n.localName==='spPr');
  const a='http://schemas.openxmlformats.org/drawingml/2006/main',p='http://schemas.openxmlformats.org/presentationml/2006/main';
  properties.getElementsByTagNameNS(a,'prstGeom')[0].setAttribute('prst','bentConnector2');
  properties.getElementsByTagNameNS(a,'ln')[0].replaceWith(new window.DOMParser().parseFromString(`<a:ln xmlns:a="${a}"><a:tailEnd type="triangle" w="med" len="lg"/></a:ln>`,'application/xml').documentElement);
  shape.append(new window.DOMParser().parseFromString(`<p:style xmlns:p="${p}" xmlns:a="${a}"><a:lnRef idx="3"><a:srgbClr val="ED7D31"/></a:lnRef></p:style>`,'application/xml').documentElement);
  parts[key]=strToU8(new window.XMLSerializer().serializeToString(doc));
  const themeKey='ppt/theme/theme1.xml',theme=new window.DOMParser().parseFromString(strFromU8(parts[themeKey]),'application/xml');
  theme.getElementsByTagNameNS(a,'lnStyleLst')[0].children[2].setAttribute('w','38100');
  parts[themeKey]=strToU8(new window.XMLSerializer().serializeToString(theme));window.close();
 });
 const project=parsePptdProject(converted.source),shape=project.pages[0].elements.find(e=>e.shapeName==='bentConnector2');
 expect(shape.border).toMatchObject({width:3,color:'#ED7D31'});
 const xml=strFromU8(unzipSync((await renderPptdProject(project)).bytes)['ppt/slides/slide1.xml']);
 expect(xml).toContain('w="38100"');expect(xml).toContain('val="ED7D31"');
 expect(xml).toContain('type="triangle" w="med" len="lg"');expect(shape.nativeShape.line).not.toContain('phClr');
});

it('resolves theme fill placeholders and gives explicit local paint priority',async()=>{
 for(const localOverride of [false,true]) {
  const converted=await fixture(parts=>{
   const key='ppt/slides/slide1.xml',window=new JSDOM(strFromU8(parts[key]),{contentType:'text/xml'}).window;
   const doc=window.document,shape=doc.getElementsByTagNameNS('*','sp')[0],properties=[...shape.children].find(n=>n.localName==='spPr');
   const a='http://schemas.openxmlformats.org/drawingml/2006/main',p='http://schemas.openxmlformats.org/presentationml/2006/main';
   properties.getElementsByTagNameNS(a,'solidFill')[0].remove();
   if(localOverride)properties.append(doc.createElementNS(a,'a:noFill'));
   shape.append(new window.DOMParser().parseFromString(`<p:style xmlns:p="${p}" xmlns:a="${a}"><a:fillRef idx="1"><a:srgbClr val="123456"><a:alpha val="54321"/></a:srgbClr></a:fillRef></p:style>`,'application/xml').documentElement);
   parts[key]=strToU8(new window.XMLSerializer().serializeToString(doc));window.close();
  });
  const project=parsePptdProject(converted.source),shape=project.pages[0].elements.find(e=>e.elementType==='shape');
  if(localOverride){expect(shape.fill).toBeUndefined();expect(shape.nativeShape.fill).toContain('<a:noFill');}
  else{expect(shape.nativeShape.fill).toContain('val="123456"');expect(shape.nativeShape.fill).toContain('val="54321"');expect(shape.nativeShape.fill).not.toContain('phClr');}
 }
});
