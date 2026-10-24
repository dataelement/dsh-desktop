import { expect, it } from 'vitest';
import PptxGenJS from 'pptxgenjs';
import { unzipSync, zipSync, strToU8, strFromU8 } from 'fflate';
import yaml from 'js-yaml';
import { convertPptxToPptd } from '../packages/ppt-runtime/core/lib/pptx-converter.js';
import { isSafeSvg } from '../packages/ppt-runtime/core/lib/pptx-resources.js';
import { parsePptdProject, checkPptdProject, renderPptdProject } from '../packages/ppt-runtime/core/lib/pptd.js';
const safeSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><path fill="#123456" d="M0 0h100v100H0z"/></svg>';

it('keeps decorative shapes as single objects when their OOXML contains empty paragraphs', async () => {
 const pptx = new PptxGenJS(); pptx.layout = 'LAYOUT_WIDE';
 const slide = pptx.addSlide();
 slide.addShape(pptx.ShapeType.rect, {x:1,y:1,w:3,h:.1,fill:{color:'334455'},line:{color:'334455'}});
 const converted = await convertPptxToPptd(Buffer.from(await pptx.write({outputType:'nodebuffer'})), 'empty-shape.pptx');
 const elements = yaml.load([...converted.source.pages.values()][0]).elements;
 expect(elements).toHaveLength(1); expect(elements[0].elementType).toBe('shape');
 expect(checkPptdProject(parsePptdProject(converted.source)).issues.some(i=>i.code==='text-overflow'||i.code==='text-occlusion')).toBe(false);
});

it('recovers SVG-only picture relationships and charts beside slides, preserving native output and automatic axes', async () => {
 const pptx = new PptxGenJS(); pptx.layout = 'LAYOUT_WIDE';
 const slide = pptx.addSlide();
 slide.addImage({data:'image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lV8AAAAASUVORK5CYII=',x:1,y:1,w:1,h:1});
 slide.addChart(pptx.ChartType.bar,[{name:'Quarter',labels:['A','B'],values:[12,35]}],{x:3,y:1,w:5,h:3});
 const parts = unzipSync(Buffer.from(await pptx.write({outputType:'nodebuffer'})));
 const relPath='ppt/slides/_rels/slide1.xml.rels'; let rels=strFromU8(parts[relPath]);
 rels=rels.replace(/Target="\.\.\/media\/([^"]+)"/g,(_,name)=>{delete parts['ppt/media/'+name];return 'Target="media/icon.svg"';});
 rels=rels.replace(/Target="\.\.\/charts\/([^"]+)"/g,(_,name)=>{parts['ppt/slides/charts/'+name]=parts['ppt/charts/'+name];delete parts['ppt/charts/'+name];return `Target="charts/${name}"`;});
 parts[relPath]=strToU8(rels); parts['ppt/slides/media/icon.svg']=strToU8(safeSvg);
 parts['ppt/slides/slide1.xml']=strToU8(strFromU8(parts['ppt/slides/slide1.xml']).replace(/<a:blip r:embed="([^"]+)"\s*\/>/,(_,id)=>`<a:blip><a:extLst><a:ext uri="svg"><asvg:svgBlip xmlns:asvg="http://schemas.microsoft.com/office/drawing/2016/SVG/main" r:embed="${id}"/></a:ext></a:extLst></a:blip>`));
 const converted=await convertPptxToPptd(Buffer.from(zipSync(parts)),'nested.pptx');
 expect(converted.diagnostics.filter(d=>d.level==='unsupported')).toEqual([]);
 const elements=yaml.load([...converted.source.pages.values()][0]).elements;
 expect(elements.filter(e=>e.elementType==='image')).toHaveLength(1);
 const chart=elements.find(e=>e.elementType==='chart'); expect(chart).toBeDefined();
 expect(JSON.stringify(chart)).toContain('35');
 expect(JSON.stringify(chart)).not.toMatch(/"(?:min|max)":0/);
 expect([...converted.source.assets.values()][0].mediaType).toBe('image/svg+xml');
 const exported=await renderPptdProject(parsePptdProject(converted.source));
 const output=unzipSync(exported.bytes);
 expect(Object.keys(output).some(key=>key.endsWith('.svg'))).toBe(true);
 expect(Object.keys(output).some(key=>/^ppt\/charts\/chart\d+\.xml$/.test(key))).toBe(true);
},30000);

it('accepts self-contained SVG and rejects active or external content including encoded URLs', () => {
 expect(isSafeSvg(strToU8(safeSvg))).toBe(true);
 for(const body of ['<script>alert(1)</script>', '<foreignObject/>', '<image href="https://example.com/x.png"/>', '<image href="&#104;ttps://example.com/x.png"/>', '<style>@import "https://example.com/font.css";</style>', '<rect style="fill:url(https://example.com/a.svg)"/>', '<g onload="alert(1)"/>', '<image href="data:image/svg+xml;base64,PHN2Zz4="/>']) {
  expect(isSafeSvg(strToU8(`<svg xmlns="http://www.w3.org/2000/svg">${body}</svg>`)),body).toBe(false);
 }
 expect(isSafeSvg(strToU8('<!DOCTYPE svg SYSTEM "file:///etc/passwd">'+safeSvg))).toBe(false);
});

it('inherits placeholder title size, color and face from the layout while preserving explicit run overrides', async () => {
 const pptx = new PptxGenJS(); pptx.layout = 'LAYOUT_WIDE';
 pptx.addSlide().addText('Inherited title', {x:1,y:1,w:10,h:2});
 const parts = unzipSync(Buffer.from(await pptx.write({outputType:'nodebuffer'})));
 let slide = strFromU8(parts['ppt/slides/slide1.xml']);
 slide = slide.replace('<p:cNvSpPr/><p:nvPr></p:nvPr>', '<p:cNvSpPr/><p:nvPr><p:ph type="title"/></p:nvPr>');
 slide = slide.replace(/<a:rPr\b[^>]*>[\s\S]*?<\/a:rPr>/g, '<a:rPr lang="en-US"/>');
 slide = slide.replace(/<a:pPr\b[^>]*>[\s\S]*?<\/a:pPr>/g, '<a:pPr/>');
 parts['ppt/slides/slide1.xml'] = strToU8(slide);
 const layoutPath = Object.keys(parts).find(name => /^ppt\/slideLayouts\/slideLayout\d+\.xml$/.test(name));
 let layout = strFromU8(parts[layoutPath]);
 layout = layout.replace('</p:spTree>', '<p:sp><p:nvSpPr><p:cNvPr id="99" name="Title"/><p:cNvSpPr/><p:nvPr><p:ph type="title"/></p:nvPr></p:nvSpPr><p:spPr/><p:txBody><a:bodyPr/><a:lstStyle><a:lvl1pPr><a:defRPr sz="4000"><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill><a:latin typeface="Arial"/></a:defRPr></a:lvl1pPr></a:lstStyle><a:p/></p:txBody></p:sp></p:spTree>');
 parts[layoutPath] = strToU8(layout);
 let converted = await convertPptxToPptd(Buffer.from(zipSync(parts)), 'inherited.pptx');
 let text = yaml.load([...converted.source.pages.values()][0]).elements.find(item => item.elementType === 'text').content;
 expect(text.fontSize).toBe(40); expect(text.color).toBe('#FFFFFF'); expect(text.fontFamily).toBe('Arial');
 parts['ppt/slides/slide1.xml'] = strToU8(slide.replace('<a:rPr lang="en-US"/>', '<a:rPr sz="2000"><a:solidFill><a:srgbClr val="FF0000"/></a:solidFill></a:rPr>'));
 converted = await convertPptxToPptd(Buffer.from(zipSync(parts)), 'override.pptx');
 text = yaml.load([...converted.source.pages.values()][0]).elements.find(item => item.elementType === 'text').content;
 expect(text.fontSize).toBe(20); expect(text.color).toBe('#FF0000');
 const exported = await renderPptdProject(parsePptdProject(converted.source));
 const xml = strFromU8(unzipSync(exported.bytes)['ppt/slides/slide1.xml']);
 expect(xml).toContain('sz="2000"'); expect(xml).toContain('FF0000');
});
