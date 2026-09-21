import json,datetime,math
from openpyxl import Workbook
from openpyxl.styles import Font,PatternFill,Alignment,Border,Side
from openpyxl.chart import LineChart,BarChart,ScatterChart,Reference,Series
from openpyxl.chart.shapes import GraphicalProperties
from openpyxl.chart.axis import ChartLines
from openpyxl.drawing.line import LineProperties
from openpyxl.drawing.text import Paragraph,ParagraphProperties,CharacterProperties,Font as DrawingFont
from openpyxl.chart.text import RichText
from openpyxl.worksheet.page import PageMargins
from openpyxl.formatting.rule import ColorScaleRule,CellIsRule
from openpyxl.utils import get_column_letter as col
from openpyxl.workbook.properties import CalcProperties
with open(office['inputs'][0],encoding='utf8') as f:data=json.load(f)
wb=Workbook();wb.remove(wb.active)
FONT='Noto Sans CJK SC';INK='253446';MUTED='687A8D';WHITE='FFFFFF';PAPER='F4F7FA';NAVY='174661';BLUE='286DAC';ACCENT='DE9C56';COLORS=[BLUE,'D99145','67A7AF','906EA7'];RED='B65759'
def cell(ws,r,c,value,fmt=None,bold=False,color=INK,size=10,fill=None):
 x=ws.cell(r,c,value);x.font=Font(name=FONT,size=size,color=color,bold=bold);x.alignment=Alignment(vertical='center',horizontal='left' if isinstance(value,str) and not value.startswith('=') else 'right',wrap_text=True)
 if fmt:x.number_format=fmt
 if fill:x.fill=PatternFill('solid',fgColor=fill)
 return x
def band(ws,r,c1,c2,value,size=11,bold=False,fill=None,color=INK):
 ws.merge_cells(start_row=r,start_column=c1,end_row=r,end_column=c2)
 if fill:
  for c in range(c1,c2+1):ws.cell(r,c).fill=PatternFill('solid',fgColor=fill)
 return cell(ws,r,c1,value,bold=bold,color=color,size=size,fill=fill)
def setup(name,rows=54,last='P',width=8.4,raw=False):
 ws=wb.create_sheet(name);ws.sheet_view.showGridLines=False;ws.sheet_view.zoomScale=85
 for c in range(1,19):ws.column_dimensions[col(c)].width=width
 if not raw:ws.column_dimensions['A'].width=2.5
 for r in range(1,rows+1):ws.row_dimensions[r].height=19
 ws.print_area=f'A1:{last}{rows}';ws.print_options.horizontalCentered=True;ws.sheet_properties.pageSetUpPr.fitToPage=True
 ws.page_setup.orientation='portrait';ws.page_setup.paperSize=ws.PAPERSIZE_A3;ws.page_setup.fitToWidth=1;ws.page_setup.fitToHeight=1
 ws.page_margins=PageMargins(left=.28,right=.28,top=.25,bottom=.25,header=0,footer=.1)
 if raw:ws.freeze_panes='B8'
 return ws
def heading(ws,title,sub):
 band(ws,2,2,16,title,22,True,color=NAVY);ws.row_dimensions[2].height=37
 band(ws,3,2,16,sub,10,color=MUTED);ws.row_dimensions[3].height=25
 ws.sheet_properties.tabColor=NAVY
def section(ws,r,title):
 band(ws,r,2,16,title,11,True,fill=PAPER,color=NAVY);ws.row_dimensions[r].height=23

def kpi(ws,c,label,formula,fmt):
 band(ws,5,c,c+2,label,9,color=MUTED)
 x=band(ws,6,c,c+2,formula,23,True,color=NAVY);x.number_format=fmt;ws.row_dimensions[6].height=36

def rich(size=900):
 return RichText(p=[Paragraph(pPr=ParagraphProperties(defRPr=CharacterProperties(latin=DrawingFont(typeface=FONT),ea=DrawingFont(typeface=FONT),sz=size,solidFill=MUTED)),endParaRPr=CharacterProperties(lang='zh-CN'))])
def style(ch,title,width=12,height=7,legend=False):
 ch.title=title;ch.width=width;ch.height=height;ch.style=13;ch.graphical_properties=GraphicalProperties(solidFill=WHITE,ln=LineProperties(noFill=True))
 ch.x_axis.txPr=rich();ch.y_axis.txPr=rich();ch.x_axis.majorGridlines=None;ch.y_axis.majorGridlines=ChartLines(spPr=GraphicalProperties(ln=LineProperties(solidFill='E3EAF0',w=6000)))
 ch.title.txPr=rich(1100)
 if legend:ch.legend.position='b';ch.legend.txPr=rich(850)
 else:ch.legend=None
 for i,s in enumerate(ch.series):
  s.graphicalProperties.line.solidFill=COLORS[i%len(COLORS)];s.graphicalProperties.line.width=22000;s.graphicalProperties.solidFill=COLORS[i%len(COLORS)]
 return ch
def bar(ws,source,cols,r1,r2,category,title,anchor,width=12,height=7,stack=False):
 ch=BarChart()
 for c in cols:ch.add_data(Reference(source,min_col=c,min_row=r1-1,max_row=r2),titles_from_data=True)
 ch.set_categories(Reference(source,min_col=category,min_row=r1,max_row=r2));ch.y_axis.scaling.min=0;ch.gapWidth=70
 if stack:ch.grouping='stacked';ch.overlap=100
 style(ch,title,width,height,len(cols)>1);ws.add_chart(ch,anchor);return ch
def scatter(ws,source,xcol,ycols,r1,r2,title,anchor,width=24.4,height=8,labels=None,log=False):
 ch=ScatterChart();ch.scatterStyle='lineMarker'
 for n,c in enumerate(ycols):
  s=Series(Reference(source,min_col=c,min_row=r1,max_row=r2),Reference(source,min_col=xcol,min_row=r1,max_row=r2),title=labels[n] if labels else str(source.cell(r1-1,c).value));s.marker.symbol='circle' if r2-r1<40 else 'none';s.marker.size=4;ch.series.append(s)
 if log:ch.x_axis.scaling.logBase=10;ch.x_axis.scaling.min=.01;ch.x_axis.scaling.max=100
 style(ch,title,width,height,len(ycols)>1);ws.add_chart(ch,anchor);return ch

def headers(ws,r,labels):
 ws.row_dimensions[r].height=32
 for c,h in enumerate(labels,1):cell(ws,r,c,h,bold=True,color=WHITE,fill=NAVY,size=9).alignment=Alignment(horizontal='center',vertical='center',wrap_text=True)
def table_row(ws,r,vals,formats=None):
 for c,v in enumerate(vals,1):cell(ws,r,c,v,(formats or {}).get(c),fill=WHITE if r%2==0 else PAPER,size=10)
def save():
 wb.calculation=CalcProperties(calcMode='auto',fullCalcOnLoad=True);wb.save(office['output'])
O=setup('港口总览');C=setup('货类与航线');E=setup('作业效率');D=setup('日度汇总',46,'H',16,True);R=setup('作业明细',46,'K',13,True)
heading(O,data['title'],'2025 年度    吞吐趋势 · 进出港结构 · 等泊与作业效率    模拟数据')
heading(C,'货类与航线结构','2025 年度    货物吨数按装卸作业统计；箱量单独使用 TEU')
heading(E,'作业效率与等待时间','2025 年度    按货类和航线比较；变化反映模拟业务情景')
# Raw observations, each record retained.
for w,title,sub in [(R,'装卸作业明细','2,190 条模拟记录；预览前 39 条，完整数据保存在本工作表'),(D,'日度汇总与计算','365 天完整公式；预览前 39 天；吞吐量为进港卸货与出港装货合计')]:
 band(w,2,1,int(11 if w==R else 8),title,20,True,color=NAVY);band(w,3,1,int(11 if w==R else 8),sub,10,color=MUTED);w.row_dimensions[2].height=34;w.row_dimensions[3].height=30
headers(R,7,data['fields'])
for r,record in enumerate(data['records'],8):
 v=record.copy();v[1]=datetime.date.fromisoformat(v[1]);table_row(R,r,v,{2:'yyyy-mm-dd',7:'#,##0',8:'0.00',9:'0.00',10:'0.00',11:'#,##0'})
for r in range(8,R.max_row+1):
 for c in [2,3]:R.cell(r,c).alignment=Alignment(horizontal='center',vertical='center')
R.column_dimensions['B'].width=16;R.column_dimensions['A'].width=17;R.column_dimensions['D'].width=18;R.auto_filter.ref=f'A7:K{R.max_row}';last=7+len(data['records'])
headers(D,7,['日期','进港 / 吨','出港 / 吨','合计 / 吨','作业数','平均等泊 / h','作业总时 / h','吨 / 作业小时'])
for i in range(365):
 r=i+8;date=datetime.date(2025,1,1)+datetime.timedelta(days=i)
 vals=[date,f'=SUMIFS(\'作业明细\'!$G$8:$G${last},\'作业明细\'!$B$8:$B${last},A{r},\'作业明细\'!$C$8:$C${last},"进港")',f'=SUMIFS(\'作业明细\'!$G$8:$G${last},\'作业明细\'!$B$8:$B${last},A{r},\'作业明细\'!$C$8:$C${last},"出港")',f'=SUM(B{r}:C{r})',f'=COUNTIFS(\'作业明细\'!$B$8:$B${last},A{r})',f'=AVERAGEIFS(\'作业明细\'!$I$8:$I${last},\'作业明细\'!$B$8:$B${last},A{r})',f'=SUMIFS(\'作业明细\'!$H$8:$H${last},\'作业明细\'!$B$8:$B${last},A{r})',f'=D{r}/G{r}']
 table_row(D,r,vals,{1:'mm-dd',2:'#,##0',3:'#,##0',4:'#,##0',5:'0',6:'0.0',7:'0.0',8:'#,##0'})
D.auto_filter.ref='A7:H372';D.column_dimensions['A'].width=12
# Monthly calculation table: separate grain is visible on dashboard below charts.
section(O,43,'季度吞吐与效率摘要')
starts=[2,5,8,11,14]
for c,h in zip(starts,['季度','进港 / 万吨','出港 / 万吨','总量 / 万吨','等泊 / 小时']):band(O,44,c,c+2,h,9,True,fill=NAVY,color=WHITE)
# More complete monthly data are on the second analysis page; summary shows quarterly seasonality.
for i in range(4):
 r=45+i;s=8+i*3;e=s+2
 for c,expr,fmt in zip(starts,[f'{i+1}季度',f'=SUM(\'货类与航线\'!B{s}:B{e})',f'=SUM(\'货类与航线\'!C{s}:C{e})',f'=SUM(E{r},H{r})',f'=AVERAGE(\'货类与航线\'!E{s}:E{e})'],['@','0.0','0.0','0.0','0.0']):band(O,r,c,c+2,expr,10,fill=PAPER if i%2 else WHITE).number_format=fmt
# Quarterly wait is weighted over daily records using raw dates (different month lengths).
for i in range(4):
 r=45+i;start=datetime.date(2025,1+i*3,1);end=datetime.date(2026,1,1) if i==3 else datetime.date(2025,4+i*3,1)
 O.cell(r,14).value=f'=AVERAGEIFS(\'作业明细\'!$I$8:$I${last},\'作业明细\'!$B$8:$B${last},">="&DATE({start.year},{start.month},1),\'作业明细\'!$B$8:$B${last},"<"&DATE({end.year},{end.month},1))'
kpi(O,2,'全年吞吐量 / 万吨',"=SUM('日度汇总'!D8:D372)/10000",'#,##0.0');kpi(O,6,'进港货物占比',"=SUM('日度汇总'!B8:B372)/SUM('日度汇总'!D8:D372)",'0.0%');kpi(O,10,'平均等泊 / 小时',f"=AVERAGE('作业明细'!I8:I{last})",'0.0');kpi(O,14,'装卸作业 / 笔',"=SUM('日度汇总'!E8:E372)",'#,##0')
section(O,9,'01  全年日度吞吐量与短期波动')
ch=scatter(O,D,1,[4],8,372,'日度吞吐量 / 吨','B10',24.4,8.0);ch.x_axis.numFmt='m月';ch.x_axis.majorUnit=61;ch.x_axis.scaling.min=45658;ch.x_axis.scaling.max=46022
section(O,27,'02  流向结构与主要货类')
# Monthly build on C A8:F19.
headers(C,7,['月份','进港 / 万吨','出港 / 万吨','总量 / 万吨','等泊 / 小时','效率 / 吨每小时'])
for c in range(1,7):C.column_dimensions[col(c)].width=15
for m in range(1,13):
 r=m+7;start=f'DATE(2025,{m},1)';end=f'DATE(2025,{m+1},1)'
 cond=f"'作业明细'!$B$8:$B${last},\">=\"&{start},'作业明细'!$B$8:$B${last},\"<\"&{end}"
 vals=[f'{m}月',f'=SUMIFS(\'作业明细\'!$G$8:$G${last},{cond},\'作业明细\'!$C$8:$C${last},"进港")/10000',f'=SUMIFS(\'作业明细\'!$G$8:$G${last},{cond},\'作业明细\'!$C$8:$C${last},"出港")/10000',f'=SUM(B{r}:C{r})',f'=AVERAGEIFS(\'作业明细\'!$I$8:$I${last},{cond})',f'=D{r}*10000/SUMIFS(\'作业明细\'!$H$8:$H${last},{cond})']
 table_row(C,r,vals,{2:'0.0',3:'0.0',4:'0.0',5:'0.0',6:'#,##0'})
# Compact source tables to right, aligned with chart categories.
for c,h in enumerate(['货类','吞吐 / 万吨','占比'],10):cell(C,7,c,h,bold=True,color=WHITE,fill=NAVY)
for i,cat in enumerate(data['cargo'],8):
 cell(C,i,10,cat);cell(C,i,11,f'=SUMIFS(\'作业明细\'!$G$8:$G${last},\'作业明细\'!$D$8:$D${last},J{i})/10000','0.0');cell(C,i,12,f'=K{i}/SUM($K$8:$K$13)','0.0%')
for c,h in enumerate(['航线','吞吐 / 万吨','作业数'],10):cell(C,16,c,h,bold=True,color=WHITE,fill=NAVY)
for r,route in enumerate(data['routes'],17):
 cell(C,r,10,route);cell(C,r,11,f'=SUMIFS(\'作业明细\'!$G$8:$G${last},\'作业明细\'!$E$8:$E${last},J{r})/10000','0.0');cell(C,r,12,f'=COUNTIFS(\'作业明细\'!$E$8:$E${last},J{r})','0')
C.column_dimensions['J'].width=20;C.column_dimensions['K'].width=16;C.column_dimensions['L'].width=14
bar(O,C,[2,3],8,19,1,'月度进出港 / 万吨','B28',12,7.4,True);bar(O,C,[11],8,13,10,'货类吞吐 / 万吨','J28',12,7.4)
# C print bounds follows populated columns rather than excessive blank columns.

for j in range(1,13):C.column_dimensions[col(j)].width=max(C.column_dimensions[col(j)].width,16)
C.print_area='A1:L52';C.page_setup.orientation='landscape';C.page_setup.paperSize=C.PAPERSIZE_A3
bar(C,C,[11],17,21,10,'航线吞吐量 / 万吨','A25',16,10);bar(C,C,[2,3],8,19,1,'进出港货量的月度变化 / 万吨','G25',16,10)
band(O,51,2,16,'口径：进港为卸货，出港为装船；装卸总量按作业计量，转运货物可能重复计入。',9,color=MUTED)
band(O,53,2,16,'情景：2 月短暂回落、7 月天气延误、9 月集中到港。完整明细可筛选、修改与重算。',9,color=MUTED)
# Operation efficiency: all ratios use matched totals, not means of per-voyage ratios.
headers(E,7,['货类','货量 / 吨','作业时 / h','吨 / 小时','等泊 / h','按计划完成率'])
for c in range(1,7):E.column_dimensions[col(c)].width=16
for r,cat in enumerate(data['cargo'],8):
 cond=f"'作业明细'!$D$8:$D${last},A{r}"
 table_row(E,r,[cat,f'=SUMIFS(\'作业明细\'!$G$8:$G${last},{cond})',f'=SUMIFS(\'作业明细\'!$H$8:$H${last},{cond})',f'=B{r}/C{r}',f'=AVERAGEIFS(\'作业明细\'!$I$8:$I${last},{cond})',None],{2:'#,##0',3:'#,##0.0',4:'#,##0',5:'0.0',6:'0.0%'})
# In-place source build flags: preserve original input columns and expose calculation separately.
cell(R,7,12,'按计划完成',bold=True,color=WHITE,fill=NAVY,size=9)
for r in range(8,last+1):cell(R,r,12,f'=IF(H{r}<=J{r},1,0)','0')
R.print_area='A1:L46';R.auto_filter.ref=f'A7:L{last}';R.column_dimensions['L'].width=13
for r in range(8,14):cell(E,r,6,f'=AVERAGEIFS(\'作业明细\'!$L$8:$L${last},\'作业明细\'!$D$8:$D${last},A{r})','0.0%')

for j in range(1,13):E.column_dimensions[col(j)].width=16
E.print_area='A1:L52';E.page_setup.orientation='landscape'
bar(E,E,[4],8,13,1,'货类作业效率 / 吨每小时','A17',16,10);bar(E,E,[5],8,13,1,'平均等泊时间 / 小时','G17',16,10)
ch=scatter(E,D,1,[6],8,372,'日度平均等泊时间 / 小时','A36',32,8);ch.x_axis.numFmt='m月';ch.x_axis.majorUnit=61;ch.x_axis.scaling.min=45658;ch.x_axis.scaling.max=46022
E.conditional_formatting.add('E8:E13',ColorScaleRule(start_type='min',start_color='EEF4F8',end_type='max',end_color='DE9C56'))
save()
