import { expect, it } from 'vitest';
import { unzipSync, zipSync, strFromU8, strToU8 } from 'fflate';
import { createOfficePreviewBatches } from '../packages/ppt-runtime/core/lib/office-preview-batches.js';
const entries={
  'ppt/presentation.xml':strToU8('<p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" firstSlideNum="4"><p:sldIdLst><p:sldId id="256" r:id="rId1"/><p:sldId id="257" r:id="rId2"/><p:sldId id="258" r:id="rId3"/></p:sldIdLst></p:presentation>'),
  'ppt/slides/slide1.xml':strToU8('Cover/font context'), 'ppt/slides/slide2.xml':strToU8('Body/font context'),
  'ppt/slides/slide3.xml':strToU8('Closing/font context'),'ppt/_rels/presentation.xml.rels':strToU8('original relationships'),
  'ppt/media/picture.png':new Uint8Array([137,80,78,71])
};
it('keeps resource and font parts intact while selecting slide IDs and global numbering',()=>{
  const bytes=zipSync(entries),select=createOfficePreviewBatches(bytes,3);
  for(const[first,count]of[[0,1],[1,2],[0,3]]){
    const result=unzipSync(select(first,count)),xml=strFromU8(result['ppt/presentation.xml']);
    expect(xml).toContain(`firstSlideNum="${4+first}"`);expect([...xml.matchAll(/<p:sldId /g)]).toHaveLength(count);
    for(const[key,value]of Object.entries(entries))if(key!=='ppt/presentation.xml')expect(result[key]).toEqual(value);
    expect(xml).toContain(`r:id="rId${first+1}"`);
  }
  expect(unzipSync(bytes)).toEqual(entries);
});
it.each([[-1,1],[0,0],[2,2],[.5,1]])('rejects invalid slide range %s/%s', (first,count)=>{
  expect(()=>createOfficePreviewBatches(zipSync(entries),3)(first,count)).toThrow('batch range');
});
it('rejects inconsistent exported slide counts',()=>{
  expect(()=>createOfficePreviewBatches(zipSync(entries),4)).toThrow('slide list mismatch');
});
