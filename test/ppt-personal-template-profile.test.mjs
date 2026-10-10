import {expect,it} from 'vitest';
import yaml from 'js-yaml';
import {extractPersonalTemplateProfile,personalTemplateSourceTheme,personalTemplatePageSummary,validPersonalTemplateProfile} from '../packages/ppt-runtime/core/lib/personal-template-profile.js';

const text=(id,bounds,value,face,size,color)=>({elementId:id,elementType:'text',bounds,content:{fontFamily:face,fontSize:size,color,text:value,
  paragraphs:[{runs:[{text:value,options:{fontFamily:face,fontSize:size,color}}]}]}});
function fixture() {
  const pages=[0,1,2].map(index=>({file:`pages/${index}.page`,background:{type:'solid',color:'#FAFAF2'},elements:[
    text('heading',[50,25,400,48],`Original title ${index}`,'Heading Face',30,'#145566'),
    text('body',[50,100,400,100],'Original facts should be replaced','Body Face',14,'#112233'),
    text('footer',[50,515,400,12],'Reviewed Company','Body Face',8,'#777777'),
    {elementId:'accent',elementType:'shape',bounds:[0,0,10,400],fill:{type:'solid',color:'#336699'}},
    {elementId:'picture',elementType:'image',bounds:[520,100,300,220],src:'assets/logo.png'}
  ]}));
  return {width:960,height:540,pages};
}

it('extracts source typography, colour roles and content slots without modifying source facts or layout',()=>{
  const project=fixture(),before=structuredClone(project),profile=extractPersonalTemplateProfile(project);
  expect(project).toEqual(before);
  expect(profile.palette).toMatchObject({background:'FAFAF2',text:'112233'});
  expect(profile.typography).toEqual({title:{fontFace:'Heading Face',fontSize:30,color:'145566',bold:false},body:{fontFace:'Body Face',fontSize:14,color:'112233',bold:false}});
  expect(profile.pages.map(page=>page.role)).toEqual(['cover','content','content']);
  const slots=profile.pages[1].slots;
  expect(slots.find(s=>s.elementId==='heading')).toMatchObject({role:'title',action:'replace-content',fontSize:30,bounds:[50,25,400,48]});
  expect(slots.find(s=>s.elementId==='body')).toMatchObject({role:'body',action:'replace-content',fontFace:'Body Face',textCapacity:140});
  expect(slots.find(s=>s.elementId==='footer')).toMatchObject({role:'footer',action:'review-branding'});
  expect(slots.find(s=>s.elementId==='picture')).toMatchObject({kind:'image',action:'replace-content'});
  expect(JSON.stringify(profile)).not.toContain('Original facts');
  const index=JSON.parse(personalTemplatePageSummary(profile.pages[1]));
  expect(index).toMatchObject({roleBasis:'geometry',slotCounts:{title:1,body:1,footer:1,image:1}});
  expect(index.slots).toBeUndefined();
  expect(JSON.parse(personalTemplatePageSummary(profile.pages[1],true)).slots).toEqual(slots);
});

it('uses dominant rich-text run styles and writes extracted defaults while retaining source pages and assets',()=>{
  const project=fixture();
  project.pages[0].elements[0].content.paragraphs[0].runs=[
    {text:'Intro',options:{fontFamily:'Minor Face',fontSize:12,color:'#222222'}},
    {text:'Long dominant heading',options:{fontFamily:'Heading Face',fontSize:30,color:'#145566'}}
  ];
  const profile=extractPersonalTemplateProfile(project);
  expect(profile.pages[0].slots.find(s=>s.role==='title')).toMatchObject({fontFace:'Heading Face',fontSize:30,color:'145566'});
  const source={manifest:yaml.dump({version:'v2',size:[960,540],pages:['a.page'],theme:{colors:{custom:'#AA0000'},textStyles:{caption:{fontSize:10}}}}),pages:new Map([['a.page','unchanged']]),assets:new Map()};
  const updated=personalTemplateSourceTheme(source,profile),manifest=yaml.load(updated.manifest);
  expect(manifest.theme.colors).toMatchObject({background:'#FAFAF2',text:'#112233',custom:'#AA0000'});
  expect(manifest.theme.textStyles).toMatchObject({title:{fontFamily:'Heading Face',fontSize:30},body:{fontFamily:'Body Face',fontSize:14},caption:{fontSize:10}});
  expect(updated.pages).toBe(source.pages);expect(updated.assets).toBe(source.assets);
  expect(source.manifest).not.toContain('Heading Face');
  expect(manifest.theme.textStyles.title).toMatchObject({color:'#145566',bold:false});
});

it('validates stored profiles and detects a broken page index or typography before tool projection',()=>{
  const project=fixture(),profile=extractPersonalTemplateProfile(project),index=project.pages.map(page=>({file:page.file}));
  expect(validPersonalTemplateProfile(profile,index)).toBe(true);
  expect(validPersonalTemplateProfile({...profile,pages:profile.pages.slice(1)},index)).toBe(false);
  expect(validPersonalTemplateProfile({...profile,typography:{}},index)).toBe(false);
  expect(validPersonalTemplateProfile({...profile,palette:{}},index)).toBe(false);
  expect(validPersonalTemplateProfile(null,index)).toBe(false);
});
