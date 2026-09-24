import { expect, it } from 'vitest';
import { unzipSync, strFromU8 } from 'fflate';
import yaml from 'js-yaml';
import { convertPptxToPptd } from '../packages/ppt-runtime/core/lib/pptx-converter.js';
import { parsePptdProject, renderPptdProject } from '../packages/ppt-runtime/core/lib/pptd.js';

it.each(['scatter'])('exports %s point values into OOXML and survives import', async type => {
 const deck = {version:'v2',title:'Numeric chart',size:[960,540],pages:['numeric.page']};
 const chart = {
  elementId:'numeric',elementType:'chart',bounds:[50,50,800,420],legend:false,
  data:{cols:['x','y','size'],rows:[[1,2,4],[4,9,6],[8,3,10]]},
  series:[{type,name:'Priorities',encode:{x:'x',y:'y',size:'size'},fill:'#14CA5D',marker:{shape:'circle',size:8}}]
 };
 const source={entryName:'deck.pptd',manifest:yaml.dump(deck),pages:new Map([['numeric.page',yaml.dump({elements:[chart]})]]),assets:new Map()};
 const output=await renderPptdProject(parsePptdProject(source));
 const parts=unzipSync(output.bytes);const xml=strFromU8(parts['ppt/charts/chart1.xml']);
 expect(xml).toContain('<c:ser>');expect(xml).toMatch(/<c:xVal>[\s\S]*?<c:v>8<\/c:v>/);
 expect(xml).toMatch(/<c:yVal>[\s\S]*?<c:v>9<\/c:v>/);
 const converted=await convertPptxToPptd(Buffer.from(output.bytes),'numeric.pptx');
 expect(converted.diagnostics.filter(d=>d.level==='unsupported')).toEqual([]);
 const restored=yaml.load([...converted.source.pages.values()][0]).elements.find(e=>e.elementType==='chart');
 expect(restored.data.rows.map(row=>row.slice(0,2).map(Number))).toEqual([[1,2],[4,9],[8,3]]);
},30000);
