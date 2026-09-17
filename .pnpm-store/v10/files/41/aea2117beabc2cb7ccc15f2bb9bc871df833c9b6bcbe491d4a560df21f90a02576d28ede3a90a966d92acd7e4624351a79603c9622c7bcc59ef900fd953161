import { SafeXmlNode } from '../../parser/XmlParser';
import { RenderContext } from '../RenderContext';
import { type ChartTextStyle } from './types';
type EChartsTextStyle = ChartTextStyle & {
    fontWeight?: 'normal' | 'bold' | 'bolder' | 'lighter' | number;
};
interface ChartRichText {
    text: string;
    rich: Record<string, EChartsTextStyle>;
}
export declare function extractTitleText(title: SafeXmlNode): string | undefined;
export declare function chartTextStyleToEChartsTextStyle(style: ChartTextStyle | undefined): EChartsTextStyle | undefined;
export declare function extractTxPrColor(parentNode: SafeXmlNode, ctx: RenderContext): string | undefined;
export declare function extractTxPrStyle(parentNode: SafeXmlNode, ctx: RenderContext): ChartTextStyle | undefined;
export declare function extractTitleTextStyle(title: SafeXmlNode, ctx: RenderContext): ChartTextStyle | undefined;
export declare function extractTitleRichText(title: SafeXmlNode, ctx: RenderContext): ChartRichText | undefined;
export declare function getChartThemeFontFamily(ctx: RenderContext): string | undefined;
export {};
