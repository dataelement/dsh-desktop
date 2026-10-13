// Keep the Office engine's metric-compatible defaults and explicit CJK aliases.
// Exact installed source faces take priority over every fallback in these groups.
const sansCjk=['Microsoft YaHei','Microsoft YaHei UI','微软雅黑','PingFang SC','Noto Sans CJK SC','Noto Sans SC','Source Han Sans SC','SimHei','黑体','Heiti SC','STHeiti'];
export const templateOfficeFontOptions={
  initialFontFamilies:['Microsoft YaHei','PingFang SC','Noto Sans CJK SC'],
  fontFallbacks:[
    ['Calibri','Carlito'],
    ['Calibri Light','Carlito','Calibri'],
    ['Cambria','Caladea'],
    ['宋体','SimSun','NSimSun','Songti SC','STSong','Noto Serif CJK SC','Noto Serif SC','Source Han Serif SC'],
    ['黑体','SimHei','Heiti SC','STHeiti','Noto Sans CJK SC','Noto Sans SC','Source Han Sans SC'],
    ['微软雅黑','Microsoft YaHei','Microsoft YaHei UI','PingFang SC','Noto Sans CJK SC','Noto Sans SC'],
    ['微软雅黑 Light','微软雅黑Light','Microsoft YaHei Light','Microsoft YaHei UI Light',...sansCjk],
    ['等线','等线 Light','DengXian','DengXian Light',...sansCjk],
    ['楷体','KaiTi','Kaiti SC','STKaiti','LXGW WenKai'],
    ['仿宋','FangSong','STFangsong','Songti SC','Noto Serif CJK SC'],
    ['sans-serif','Arial','Liberation Sans','Helvetica','DejaVu Sans','Calibri','Calibri Light','Carlito',...sansCjk],
    ['serif','Times New Roman','Liberation Serif','Times','DejaVu Serif','Cambria','Caladea','SimSun','NSimSun','宋体','Songti SC','STSong','Noto Serif CJK SC','Noto Serif SC','Source Han Serif SC'],
    ['monospace','Courier New','Liberation Mono','DejaVu Sans Mono','Menlo','Monaco','Courier','NSimSun','Noto Sans Mono CJK SC',...sansCjk]
  ]
};
