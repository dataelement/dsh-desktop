import {it,expect} from'vitest';import sharp from'sharp';import PptxGenJS from'pptxgenjs';import{unzipSync,zipSync,strToU8,strFromU8}from'fflate';import yaml from'js-yaml';
import{emfToSvg}from'../packages/ppt-runtime/core/lib/emf-image.js';
import{convertPptxToPptd}from'../packages/ppt-runtime/core/lib/pptx-converter.js';
import{parsePptdProject,checkPptdProject,renderPptdProject}from'../packages/ppt-runtime/core/lib/pptd.js';
function rec(type,values=[]){const b=Buffer.alloc(8+4*values.length);b.writeUInt32LE(type);b.writeUInt32LE(b.length,4);values.forEach((v,n)=>b.writeUInt32LE(v>>>0,8+n*4));return b;}
function emf(extra=[]){
 const desc=Buffer.from('Adobe\0','utf16le');const h=Buffer.alloc(88+desc.length);h.writeUInt32LE(1);h.writeUInt32LE(h.length,4);[100,200,199,299].forEach((v,n)=>h.writeInt32LE(v,8+n*4));h.writeUInt32LE(0x464d4520,40);h.writeUInt32LE(0x10000,44);h.writeUInt16LE(2,56);h.writeUInt32LE(6,60);h.writeUInt32LE(88,64);desc.copy(h,88);
 const rectangle=(x,y,r,b)=>[rec(59),rec(27,[x,y]),rec(54,[r,y]),rec(54,[r,b]),rec(54,[x,b]),rec(61),rec(60)];
 const records=[h,rec(17,[8]),rec(9,[100,100]),rec(11,[100,100]),...rectangle(125,225,175,275),rec(67,[5]),rec(39,[1,0,0x000000ff,0]),rec(37,[1]),...rectangle(100,200,200,300),rec(62,[100,200,200,300]),...extra,rec(14,[0,16,20])];
 h.writeUInt32LE(records.reduce((n,b)=>n+b.length,0),48);h.writeUInt32LE(records.length,52);return Buffer.concat(records);
}
it('renders nonzero EMF bounds, description headers, selected colors and clipping with transparent margins',async()=>{
 const svg=emfToSvg(emf());expect(svg.toString()).toContain('viewBox="100 200 100 100"');
 const{data,info}=await sharp(svg).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const pixel=(x,y)=>[...data.subarray((y*info.width+x)*4,(y*info.width+x)*4+4)];
 expect(pixel(50,50)).toEqual([255,0,0,255]);expect(pixel(10,10)[3]).toBe(0);expect(pixel(80,80)[3]).toBe(0);
});
it('rejects truncated records, invalid counts, unknown drawing records and EMF+ content',()=>{
 const good=emf();expect(()=>emfToSvg(good.subarray(0,-4))).toThrow();
 const count=Buffer.from(good);count.writeUInt32LE(999,52);expect(()=>emfToSvg(count)).toThrow('不完整');
 expect(()=>emfToSvg(emf([rec(0x7fff)]))).toThrow('32767');
 expect(()=>emfToSvg(emf([rec(70,[4,0x2b464d45])]))).toThrow('EMF+');
 const length=Buffer.from(good);length.writeUInt32LE(4,good.readUInt32LE(4)+4);expect(()=>emfToSvg(length)).toThrow('记录长度');
});
it('imports nested EMF relationships and preserves their image in editable PPTX export',async()=>{
 const pptx=new PptxGenJS();const slide=pptx.addSlide();slide.addImage({data:'image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lV8AAAAASUVORK5CYII=',x:1,y:1,w:1,h:1});
 const zip=unzipSync(Buffer.from(await pptx.write({outputType:'nodebuffer'})));zip['ppt/slides/media/vector.emf']=emf();const rp='ppt/slides/_rels/slide1.xml.rels';zip[rp]=strToU8(strFromU8(zip[rp]).replace(/Target="\.\.\/media\/[^\"]+"/g,'Target="media/vector.emf"'));
 const c=await convertPptxToPptd(zipSync(zip),'vector.pptx');expect(c.diagnostics.filter(d=>d.level==='unsupported')).toEqual([]);expect([...c.source.assets.values()][0].mediaType).toBe('image/svg+xml');
 expect(yaml.load([...c.source.pages.values()][0]).elements.filter(e=>e.elementType==='image')).toHaveLength(1);
 const project=parsePptdProject(c.source);expect(checkPptdProject(project).errorCount).toBe(0);const native=unzipSync((await renderPptdProject(project)).bytes);expect(Object.keys(native).some(n=>n.endsWith('.svg'))).toBe(true);
});
it('uses distinct internal identities for repeated and normalized display names and exports straight connectors',async()=>{
 const p=new PptxGenJS();const s=p.addSlide();for(const[x,name]of[[1,'标题 2'],[3,'图片 2'],[5,'标题 2']])s.addText(name,{x,y:1,w:1.5,h:.5,objectName:name,fontSize:12});s.addShape(p.ShapeType.line,{x:1,y:3,w:4,h:0,line:{color:'00AA00',width:2}});
 const bytes=unzipSync(Buffer.from(await p.write({outputType:'nodebuffer'})));bytes['ppt/slides/slide1.xml']=strToU8(strFromU8(bytes['ppt/slides/slide1.xml']).replace('prst="line"','prst="straightConnector1"'));
 const c=await convertPptxToPptd(zipSync(bytes),'same-name.pptx');const project=parsePptdProject(c.source);expect(checkPptdProject(project).errorCount).toBe(0);const elements=yaml.load([...c.source.pages.values()][0]).elements;expect(new Set(elements.map(e=>e.elementId)).size).toBe(elements.length);expect(elements.filter(e=>e.elementType==='line')).toHaveLength(1);const native=unzipSync((await renderPptdProject(project)).bytes);expect(strFromU8(native['ppt/slides/slide1.xml'])).toContain('00AA00');
});
it('keeps nested group coordinates, scale and child styles when expanding to editable objects',async()=>{
 const p=new PptxGenJS();p.addSlide().addText('Group text',{x:2,y:3,w:1,h:.5,fontSize:12,color:'123456',fill:{color:'AABBCC'},objectName:'child'});
 const parts=unzipSync(Buffer.from(await p.write({outputType:'nodebuffer'}))),sp='ppt/slides/slide1.xml';let xml=strFromU8(parts[sp]);const shape=xml.match(/<p:sp>.*?<\/p:sp>/s)[0];
 const group=(id,x,y,cx,cy,chx,chy,chcx,chcy,body)=>`<p:grpSp><p:nvGrpSpPr><p:cNvPr id="${id}" name="group"/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="${x*914400}" y="${y*914400}"/><a:ext cx="${cx*914400}" cy="${cy*914400}"/><a:chOff x="${chx*914400}" y="${chy*914400}"/><a:chExt cx="${chcx*914400}" cy="${chcy*914400}"/></a:xfrm></p:grpSpPr>${body}</p:grpSp>`;
 // Inner moves (2,3) to (3,4); outer maps (3,4) to (6,7) and doubles its size.
 xml=xml.replace(shape,group(10,4,5,4,4,2,3,2,2,group(11,3,4,1,.5,2,3,1,.5,shape)));parts[sp]=strToU8(xml);
 const c=await convertPptxToPptd(zipSync(parts),'nested-group.pptx'),els=yaml.load([...c.source.pages.values()][0]).elements;
 const text=els.find(e=>e.elementType==='text');expect(text.bounds).toEqual([432,504,144,72]);expect(text.content.fontSize).toBe(24);expect(text.content.color).toBe('#123456');expect(els.find(e=>e.elementType==='shape').fill.color).toBe('#AABBCC');expect(checkPptdProject(parsePptdProject(c.source)).errorCount).toBe(0);
});
