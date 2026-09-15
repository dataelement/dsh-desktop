const A='http://schemas.openxmlformats.org/drawingml/2006/main';
const child=(n,name)=>[...n.children].find(c=>c.localName===name);
const value=(n,a,f=0)=>Number(n?.getAttribute(a)??f);
const multiply=(m,n)=>[m[0]*n[0]+m[2]*n[1],m[1]*n[0]+m[3]*n[1],m[0]*n[2]+m[2]*n[3],m[1]*n[2]+m[3]*n[3],m[0]*n[4]+m[2]*n[5]+m[4],m[1]*n[4]+m[3]*n[5]+m[5]];
const identity=[1,0,0,1,0,0];
const transform=(node,group=false)=>{
 const off=child(node,'off'),ext=child(node,'ext'),co=child(node,'chOff'),ce=child(node,'chExt');
 const x=value(off,'x'),y=value(off,'y'),w=value(ext,'cx'),h=value(ext,'cy');
 const sx=group?w/value(ce,'cx',w||1):1,sy=group?h/value(ce,'cy',h||1):1;
 const angle=value(node,'rot')/60000*Math.PI/180,c=Math.cos(angle),s=Math.sin(angle),fx=node.getAttribute('flipH')==='1'?-1:1,fy=node.getAttribute('flipV')==='1'?-1:1;
 const centered=[c*fx,s*fx,-s*fy,c*fy,x+w/2,y+h/2];
 const base=group?[sx,0,0,sy,-value(co,'x')*sx-w/2,-value(co,'y')*sy-h/2]:[1,0,0,1,-w/2,-h/2];
 return {matrix:multiply(centered,base),w,h};
};
/** Flatten group coordinates in OOXML before model extraction, retaining each child's styles.
 * The affine transform composes child offsets, scaling, rotation and reflection through nesting.
 */
export function flattenPptxGroups(xml) {
 const doc=new DOMParser().parseFromString(xml,'application/xml');
 const tree=[...doc.getElementsByTagNameNS('*','spTree')][0];if(!tree)return{xml,count:0};
 let count=0;
 function walk(parent,matrix,depth,groupFill){
  if(depth>64)throw new Error('PPTX 组合层级超过解析限制');
  for(const node of[...parent.children]){
   if(node.localName==='grpSp'){
    const props=child(node,'grpSpPr'),xf=props&&child(props,'xfrm');
    if(!xf)throw new Error('PPTX 组合坐标缺失');
    const fill=[...props.children].find(n=>['solidFill','gradFill','blipFill','noFill'].includes(n.localName))??groupFill;
    const t=transform(xf,true);if(t.matrix.some(n=>!Number.isFinite(n)))throw new Error('PPTX 组合尺寸无效');
    walk(node,multiply(matrix,t.matrix),depth+1,fill);count++;
    for(const item of[...node.children])if(!['nvGrpSpPr','grpSpPr'].includes(item.localName))parent.insertBefore(item,node);
    node.remove();
   }else if(depth>0&&['sp','pic','cxnSp','graphicFrame'].includes(node.localName)){
    const props=child(node,'spPr'),xf=props?child(props,'xfrm'):child(node,'xfrm');
    if(!xf)throw new Error('PPTX 组合内对象坐标缺失');
    if(groupFill&&props){const inherited=child(props,'grpFill');if(inherited)inherited.replaceWith(groupFill.cloneNode(true));}
    const t=transform(xf),m=multiply(matrix,t.matrix),sx=Math.hypot(m[0],m[1]),sy=Math.hypot(m[2],m[3]);
    if(!sx||!sy||Math.abs(m[0]*m[2]+m[1]*m[3])>sx*sy*1e-6)throw new Error('PPTX 组合的倾斜变换暂未支持');
    const width=t.w*sx,height=t.h*sy,cx=m[0]*t.w/2+m[2]*t.h/2+m[4],cy=m[1]*t.w/2+m[3]*t.h/2+m[5];
    const off=child(xf,'off'),ext=child(xf,'ext');off.setAttribute('x',String(Math.round(cx-width/2)));off.setAttribute('y',String(Math.round(cy-height/2)));ext.setAttribute('cx',String(Math.round(width)));ext.setAttribute('cy',String(Math.round(height)));
    xf.removeAttribute('flipH');xf.removeAttribute('flipV');if(m[0]*m[3]-m[1]*m[2]<0)xf.setAttribute('flipV','1');
    const angle=(Math.atan2(m[1],m[0])*180/Math.PI+360)%360;xf.setAttribute('rot',String(Math.round(angle*60000)));
    const scale=Math.sqrt(Math.abs(matrix[0]*matrix[3]-matrix[1]*matrix[2]));
    if(Math.abs(scale-1)>1e-6){
     for(const r of node.getElementsByTagNameNS(A,'rPr'))if(r.hasAttribute('sz'))r.setAttribute('sz',String(Math.round(value(r,'sz')*scale)));
     for(const r of node.getElementsByTagNameNS(A,'defRPr'))if(r.hasAttribute('sz'))r.setAttribute('sz',String(Math.round(value(r,'sz')*scale)));
     for(const ln of node.getElementsByTagNameNS(A,'ln'))if(ln.hasAttribute('w'))ln.setAttribute('w',String(Math.round(value(ln,'w')*scale)));
    }
   }
  }
 }
 walk(tree,identity,0);return{xml:doc.documentElement.outerHTML,count};
}
