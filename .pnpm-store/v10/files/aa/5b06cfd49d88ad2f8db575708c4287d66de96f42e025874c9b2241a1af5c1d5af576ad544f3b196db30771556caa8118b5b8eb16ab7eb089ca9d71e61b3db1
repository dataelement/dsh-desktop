import type * as echarts from 'echarts';
import { SafeXmlNode } from '../../parser/XmlParser';
export interface ChartPixelSize {
    w: number;
    h: number;
}
export declare function applyDefaultFontSizes(option: echarts.EChartsOption, defaultFs: number): void;
export declare function applyDefaultFontFamily(option: echarts.EChartsOption, fontFamily: string): void;
export declare function applyDefaultTextColors(option: echarts.EChartsOption): void;
export declare function applyLegendGridMargins(option: echarts.EChartsOption, chartNode: SafeXmlNode, defaultFs: number | undefined): void;
export declare function applyNiceAxisRange(option: echarts.EChartsOption, chartSize?: ChartPixelSize): void;
export declare function niceAxisMax(dataMax: number, dataMin: number, desiredTicks?: number): number;
export declare function niceAxisInterval(dataMax: number, dataMin: number, desiredTicks?: number): number;
export declare function extractChartDefaultFontSize(chartSpaceNode: SafeXmlNode): number | undefined;
