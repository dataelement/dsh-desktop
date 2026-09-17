import type * as echarts from 'echarts';
import { SafeXmlNode } from '../../parser/XmlParser';
import { RenderContext } from '../RenderContext';
import { type ChartTextStyle, type LegendInfo } from './types';
type LegendDataItem = string | {
    name: string;
    icon?: string;
    marker?: string;
    itemStyle?: Record<string, unknown>;
    lineStyle?: Record<string, unknown>;
};
export declare function extractLegendInfo(chartNode: SafeXmlNode, ctx: RenderContext): LegendInfo | undefined;
export declare function legendIsAtTop(legendInfo: LegendInfo | undefined): boolean;
export declare function getGridTopPx(hasTitle: boolean, legendInfo: LegendInfo | undefined): number;
export declare function getLegendTopPx(hasTitle: boolean, legendInfo: LegendInfo | undefined): number | undefined;
export declare function getLegendPlacement(legendInfo: LegendInfo | undefined): 'left' | 'right' | 'top' | 'bottom' | 'none';
export declare function getGridBottomPx(legendInfo: LegendInfo | undefined): number;
export declare function buildLegendOption(legendOpt: echarts.EChartsOption['legend'] | undefined, legendInfo: LegendInfo | undefined, legendTopPx: number | undefined, data: LegendDataItem[], textStyle: ChartTextStyle & {
    fontWeight?: 'normal' | 'bold' | 'bolder' | 'lighter' | number;
}): echarts.EChartsOption['legend'];
export type LegendOptionObject = {
    show?: boolean;
    data?: (string | {
        name: string;
        icon?: string;
        marker?: string;
    })[];
    orient?: 'horizontal' | 'vertical';
    left?: string | number;
    right?: string | number;
    top?: string | number;
    bottom?: string | number;
    width?: string | number;
    height?: string | number;
    icon?: string;
    itemWidth?: number;
    itemHeight?: number;
    textStyle?: {
        color?: string;
        fontSize?: number;
        fontWeight?: 'normal' | 'bold' | 'bolder' | 'lighter' | number;
        fontFamily?: string;
    };
};
export declare function getLegendOptionObject(legend: echarts.EChartsOption['legend']): LegendOptionObject | null;
export declare function pickSeriesStringColor(color: string | object | undefined, fallback: string): string;
export declare function pickVisualStringColor(visual: Record<string, unknown> | undefined, fallback: string): string;
export declare function lineLegendIconPath(): string;
export {};
