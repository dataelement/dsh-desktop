import {readFile,writeFile} from 'node:fs/promises';
const {Document,Paragraph,TextRun,Table,TableRow,TableCell,WidthType,BorderStyle,AlignmentType,HeadingLevel,Header,Footer,PageNumber,ImageRun,Packer,ExternalHyperlink,InternalHyperlink,Bookmark,TabStopType,SectionType,Tab}=docx;
const model=JSON.parse(await readFile(office.inputs[0],'utf8'));
const font={ascii:'Hiragino Sans GB',hAnsi:'Hiragino Sans GB',eastAsia:'Hiragino Sans GB',cs:'Hiragino Sans GB'};
const C={navy:'003B5C',blue:'4472C4',ink:'333333',gray:'636363',line:'D9D9D9',header:'D6DCE4',pale:'F2F2F2'};
const W=9412;
const border={style:BorderStyle.SINGLE,size:4,color:C.line};
const none={style:BorderStyle.NONE,size:0,color:'FFFFFF'};
const tr=(text,{size=20,bold=false,italic=false,color=C.ink,underline=false}={})=>new TextRun({text,font,size,bold,italics:italic,color,underline:underline?{}:undefined});
function pp(n,{size=20,inTable=false,cover=false,color,forceBold=false,after,keep=false}={}){
  const role=n.role??'body';let s=size,c=color??C.ink,b=forceBold,ital=false,heading;
  if(role==='h1'){s=34;b=true;heading=HeadingLevel.HEADING_1;}
  if(role==='h2'){s=24;b=true;heading=HeadingLevel.HEADING_2;}
  if(role==='h3'){s=22;b=true;heading=HeadingLevel.HEADING_3;}
  if(role==='caption'){s=20;b=true;}
  if(role==='source'){s=16;c=C.gray;ital=true;}
  if(role==='toc'){s=20;b=true;}
  if(role==='equation'){s=18;}
  const children=[];
  for(const r of n.runs??[{text:n.text??''}]){
    const opts={size:s,bold:b||r.bold,italic:ital||r.italic,color:r.url?C.blue:c,underline:role==='h1'||!!r.url||!!r.anchor};
    const rr=r.text.split(/(\n|\t)/).filter(Boolean).map(t=>t==='\n'?new TextRun({break:1,font,size:s}):t==='\t'?new TextRun({children:[new Tab()],font,size:s}):tr(t,opts));
    if(r.url)children.push(new ExternalHyperlink({link:r.url,children:rr}));
    else if(r.anchor)children.push(new InternalHyperlink({anchor:r.anchor,children:rr}));
    else children.push(...rr);
  }
  const body=n.bookmark?[new Bookmark({id:n.bookmark,children})]:children;
  return new Paragraph({children:body,heading,spacing:{before:['h2','h3'].includes(role)?140:role==='caption'?120:0,after:after??(role==='h1'?140:role==='h2'?80:role==='source'?120:role==='toc'?200:inTable?20:90),line:Math.round(s*12.8),lineRule:'exact'},keepNext:keep||['h1','h2','h3','caption'].includes(role),keepLines:true,tabStops:role==='equation'?[{type:TabStopType.LEFT,position:3300}]:[{type:TabStopType.RIGHT,position:W}],indent:cover?{left:1247,right:1247}:undefined});
}
function nativeTable(n){
  const sum=n.widths.reduce((a,b)=>a+b,0);const widths=n.widths.map(x=>Math.round(x/sum*W));widths[widths.length-1]+=W-widths.reduce((a,b)=>a+b,0);
  return new Table({width:{size:W,type:WidthType.DXA},columnWidths:widths,borders:{top:border,bottom:border,left:border,right:border,insideHorizontal:border,insideVertical:border},rows:n.rows.map((row,i)=>new TableRow({tableHeader:i===0,cantSplit:true,children:row.map((cell,j)=>new TableCell({width:{size:widths[j],type:WidthType.DXA},margins:{top:75,bottom:75,left:80,right:80},shading:{fill:i===0?C.header:i%2?'FFFFFF':C.pale},verticalAlign:'center',children:cell.map(p=>pp(p,{size:18,inTable:true,forceBold:i===0,keep:i<n.rows.length-1}))}))}))});
}
const images=new Map();for(let i=0;i<model.images.length;i++)images.set(model.images[i],await readFile(office.inputs[i+1]));
async function blocks(nodes,size){const out=[];for(const n of nodes){if(n.kind==='table')out.push(nativeTable(n));else if(n.kind==='image')out.push(new Paragraph({spacing:{before:0,after:30,line:240,lineRule:'auto'},keepNext:true,children:[new ImageRun({type:'png',data:images.get(n.file),transformation:{width:627,height:257},altText:{title:'小米汽车经营图表',description:'图表数据来自本次冻结输入，口径及来源见相邻图注。',name:n.file}})]}));else out.push(pp(n,{size}));}return out;}
const cover=[];
cover.push(new Table({width:{size:11906,type:WidthType.DXA},columnWidths:[11906],borders:{top:none,bottom:none,left:none,right:none,insideHorizontal:none,insideVertical:none},rows:[new TableRow({cantSplit:true,children:[new TableCell({shading:{fill:C.navy},margins:{top:260,bottom:240,left:1247,right:1247},children:[new Paragraph({children:[tr('2026 年 9 月 10 日\t企业专题研究',{size:18,color:'FFFFFF'})],tabStops:[{type:TabStopType.RIGHT,position:W}],spacing:{after:180,line:240,lineRule:'exact'}}),new Paragraph({children:[tr('小米汽车',{size:64,bold:true,color:'FFFFFF'})],spacing:{after:60,line:820,lineRule:'exact'}}),new Paragraph({children:[tr('XIAOMI AUTO',{size:22,color:'FFFFFF'})],spacing:{after:0,line:290,lineRule:'exact'}})]})]})]}));
cover.push(pp({text:'中国 / 新能源汽车'},{size:18,cover:true,color:C.gray,after:160}));
cover.push(pp({text:'从交付规模到盈利质量'},{size:36,forceBold:true,cover:true,after:160}));
cover.push(pp({text:'2026 年中期经营观察：规模、车型组合与投入强度的再平衡'},{size:20,cover:true,color:C.gray,after:180}));
const cc=model.cover.find(n=>n.kind==='table'&&n.rows[0].length===3).rows[0];
const colwidths=[5558,340,3514];
cover.push(new Table({indent:{size:1247,type:WidthType.DXA},width:{size:W,type:WidthType.DXA},columnWidths:colwidths,borders:{top:none,bottom:none,left:none,right:none,insideHorizontal:none,insideVertical:none},rows:[new TableRow({cantSplit:true,children:cc.map((cell,i)=>new TableCell({width:{size:colwidths[i],type:WidthType.DXA},margins:{top:i===2?100:0,bottom:70,left:i===2?140:0,right:i===2?140:0},shading:{fill:i===2?C.pale:'FFFFFF'},verticalAlign:'top',children:cell.map(n=>{const title=n.runs?.length&&n.runs.every(r=>r.bold)&&n.text.length<30;return pp(n,{size:title?24:i===2?18:20,inTable:true,color:title?C.blue:C.ink,after:title?75:i===2?160:135,forceBold:title})})}))})]}));
cover.push(pp(model.cover[5],{size:16,cover:true,color:C.gray,after:90}));
cover.push(pp({text:'自研 Word 基础 Skill × equity-research-report-cn｜同材料组合验证'},{size:16,cover:true,color:C.gray,after:0}));
const footer=new Footer({children:[new Paragraph({children:[tr('Codex 研究整理 / 小米汽车专题\t',{size:16,color:C.gray}),new TextRun({font,size:16,color:C.gray,children:[PageNumber.CURRENT]})],tabStops:[{type:TabStopType.RIGHT,position:W}],border:{top:{...border,space:5}}})]});
const header=new Header({children:[new Paragraph({children:[tr('2026 年 9 月 10 日\t中国 / 新能源汽车',{size:16,color:C.gray})],tabStops:[{type:TabStopType.RIGHT,position:W}],border:{bottom:{...border,space:5}}})]});
const sections=[{properties:{page:{size:{width:11906,height:16838},margin:{top:680,bottom:1077,left:0,right:0}}},children:cover}];
for(const [i,nodes]of model.pages.entries()){
  const size=i===7?18:i===9||i===10?18:20;
  sections.push({properties:{type:SectionType.NEXT_PAGE,page:{size:{width:11906,height:16838},margin:{top:1361,bottom:1077,left:1247,right:1247,header:560,footer:560}}},headers:{default:header},footers:{default:footer},children:await blocks(nodes,size)});
}
const document=new Document({creator:'Codex · 自研 Word 与研报 Skill 组合验证',title:'小米汽车专题研究：从交付规模到盈利质量',description:'保留先前报告材料；验证专业研报结构样式与自研 Office 工具组合。',styles:{default:{document:{run:{font,size:20,color:C.ink},paragraph:{spacing:{line:256,lineRule:'exact',after:90}}}},paragraphStyles:[{id:'Heading1',name:'Heading 1',basedOn:'Normal',next:'Normal',quickFormat:true,run:{font,size:34,bold:true,underline:{}},paragraph:{keepNext:true}},{id:'Heading2',name:'Heading 2',basedOn:'Normal',next:'Normal',quickFormat:true,run:{font,size:24,bold:true},paragraph:{keepNext:true}},{id:'Heading3',name:'Heading 3',basedOn:'Normal',next:'Normal',quickFormat:true,run:{font,size:22,bold:true},paragraph:{keepNext:true}}]},sections});
await writeFile(office.output,await Packer.toBuffer(document));
