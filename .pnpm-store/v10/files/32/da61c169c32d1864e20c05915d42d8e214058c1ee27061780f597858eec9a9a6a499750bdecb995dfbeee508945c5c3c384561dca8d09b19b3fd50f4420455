/**
 * Chart renderer — converts OOXML chart XML into ECharts visualizations.
 */
import type * as EChartsTypes from 'echarts';
import { ChartNodeData } from '../model/nodes/ChartNode';
import { RenderContext } from './RenderContext';
import { SafeXmlNode } from '../parser/XmlParser';
import { type ChartPixelSize } from './chart/postProcess';
import { type ChartFrameStyle, type DataTableInfo } from './chart/types';
export type { ChartFrameStyle } from './chart/types';
/** Result of parsing chart XML: option for ECharts, optional data table info. */
export interface ParseChartResult {
    option: EChartsTypes.EChartsOption;
    dataTable?: DataTableInfo;
    chartFrameStyle?: ChartFrameStyle;
}
export declare function applyZeroCrossingAxisLabelLayout(option: EChartsTypes.EChartsOption, chartSize: {
    w: number;
    h: number;
}): void;
/**
 * Parse a chart XML (chartSpace root) into an ECharts option object and optional data table info.
 * Exported for unit testing.
 */
export declare function parseChartXml(chartXml: SafeXmlNode, ctx: RenderContext, chartPath?: string, chartSize?: ChartPixelSize): ParseChartResult;
/**
 * Render a chart node into an HTML element with an ECharts instance.
 */
export declare function renderChart(node: ChartNodeData, ctx: RenderContext): HTMLElement;
