import { SafeXmlNode } from '../../parser/XmlParser';
import { RenderContext } from '../RenderContext';
import { type AxisInfo } from './types';
export declare function getChartAxisIds(chartTypeNode?: SafeXmlNode): string[];
export declare function parseAxes(plotArea: SafeXmlNode, ctx: RenderContext, chartTypeNode?: SafeXmlNode): {
    valueAxis: AxisInfo;
    categoryAxis: AxisInfo;
};
export declare function parseScatterAxes(plotArea: SafeXmlNode, ctx: RenderContext): {
    xAxis: AxisInfo;
    yAxis: AxisInfo;
};
export declare function applyAxisInfo(axisDef: Record<string, unknown>, info: AxisInfo, kind: 'value' | 'category'): void;
